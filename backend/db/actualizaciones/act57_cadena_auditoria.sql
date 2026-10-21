-- Actividad 57: cadena de huellas en security_schema.auditoria (ADR-002, D18).
-- Para bases creadas antes del 21/10/2026. Se puede ejecutar más de una vez.
--   docker compose exec -T db psql -U plagesetic_owner -d plagesetic < db/actualizaciones/act57_cadena_auditoria.sql
--
-- Cada fila guarda su número de secuencia, la huella de la fila anterior y su propia huella
-- (SHA-256). Si alguien cambia o borra una fila por fuera de la aplicación, la cadena se rompe.
-- Revisión (debe devolver 0 filas):
--   SELECT secuencia FROM (
--     SELECT secuencia, hash, hash_anterior, security_schema.fn_auditoria_huella(a) AS calculado,
--            lag(hash) OVER (ORDER BY secuencia) AS previo
--       FROM security_schema.auditoria a) x
--    WHERE hash <> calculado OR hash_anterior <> coalesce(previo, repeat('0', 64));

BEGIN;

ALTER TABLE security_schema.auditoria
  ADD COLUMN IF NOT EXISTS secuencia BIGINT,
  ADD COLUMN IF NOT EXISTS hash_anterior CHAR(64),
  ADD COLUMN IF NOT EXISTS hash CHAR(64);

CREATE SEQUENCE IF NOT EXISTS security_schema.auditoria_secuencia;

CREATE OR REPLACE FUNCTION security_schema.fn_auditoria_huella(a security_schema.auditoria)
RETURNS CHAR(64) LANGUAGE sql IMMUTABLE AS $$
  SELECT encode(sha256(convert_to(jsonb_build_array(
    a.secuencia, a.id_auditoria, a.id_usuario, a.correo_intentado, a.id_sesion, a.ip, a.entidad,
    a.id_registro_afectado, a.id_estudio, a.accion, a.resultado, a.justificacion, a.id_autorizacion,
    a.fecha_hora, a.hash_anterior)::text, 'UTF8')), 'hex')
$$;

-- El bloqueo evita que dos inserciones simultáneas tomen la misma fila anterior.
CREATE OR REPLACE FUNCTION security_schema.fn_auditoria_cadena() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, security_schema AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(570057);
  NEW.secuencia := nextval('security_schema.auditoria_secuencia');
  SELECT a.hash INTO NEW.hash_anterior FROM security_schema.auditoria a ORDER BY a.secuencia DESC LIMIT 1;
  NEW.hash_anterior := coalesce(NEW.hash_anterior, repeat('0', 64));
  NEW.hash := security_schema.fn_auditoria_huella(NEW);
  RETURN NEW;
END;
$$;

-- Encadenar las filas que ya existen, en el orden en que se registraron.
LOCK TABLE security_schema.auditoria IN EXCLUSIVE MODE;
ALTER TABLE security_schema.auditoria DISABLE TRIGGER tr_auditoria_inmutable;
DO $$
DECLARE
  fila RECORD;
  previo CHAR(64);
BEGIN
  SELECT hash INTO previo FROM security_schema.auditoria WHERE secuencia IS NOT NULL ORDER BY secuencia DESC LIMIT 1;
  FOR fila IN SELECT id_auditoria FROM security_schema.auditoria WHERE secuencia IS NULL ORDER BY fecha_hora, id_auditoria LOOP
    UPDATE security_schema.auditoria
       SET secuencia = nextval('security_schema.auditoria_secuencia'), hash_anterior = coalesce(previo, repeat('0', 64))
     WHERE id_auditoria = fila.id_auditoria;
    UPDATE security_schema.auditoria a SET hash = security_schema.fn_auditoria_huella(a)
     WHERE a.id_auditoria = fila.id_auditoria
    RETURNING a.hash INTO previo;
  END LOOP;
END;
$$;
ALTER TABLE security_schema.auditoria ENABLE TRIGGER tr_auditoria_inmutable;

ALTER TABLE security_schema.auditoria
  ALTER COLUMN secuencia SET NOT NULL, ALTER COLUMN hash_anterior SET NOT NULL, ALTER COLUMN hash SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_auditoria_secuencia ON security_schema.auditoria (secuencia);

DROP TRIGGER IF EXISTS tr_auditoria_cadena ON security_schema.auditoria;
CREATE TRIGGER tr_auditoria_cadena
  BEFORE INSERT ON security_schema.auditoria
  FOR EACH ROW EXECUTE FUNCTION security_schema.fn_auditoria_cadena();

COMMIT;
