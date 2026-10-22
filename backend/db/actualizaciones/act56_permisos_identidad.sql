-- =====================================================================
-- plaGesEtic · Actualización de permisos · Actividad 56 (seudonimización)
-- Para las bases creadas ANTES del 20/10/2026 (los scripts de db/init solo corren
-- la primera vez, con el volumen vacío). Las bases nuevas ya traen estos permisos
-- desde db/init/05_permisos_base.sql.
--
-- Agrega (ADR-002, D12 y D13):
--   · contacto_participante/leer → Director (global) e Investigador (estudio; el servicio
--     exige además que sea el responsable del estudio).
--   · identidad/leer con alcance de estudio → Investigador y Asistente. Solo sirve junto con
--     una autorización ver_identidad aprobada por el Director: la membresía sola no basta.
--
-- Con Docker:
--   docker compose exec -T db psql -U plagesetic_owner -d plagesetic < db/actualizaciones/act56_permisos_identidad.sql
-- Se puede ejecutar más de una vez: no duplica filas.
-- =====================================================================
BEGIN;

INSERT INTO security_schema.permiso (id_rol, recurso, accion, alcance)
SELECT r.id_rol, p.recurso, p.accion, p.alcance
FROM (VALUES
  ('Director','contacto_participante','leer','global'),
  ('Investigador','identidad','leer','estudio'),
  ('Investigador','contacto_participante','leer','estudio'),
  ('Asistente','identidad','leer','estudio')
) AS p(rol, recurso, accion, alcance)
JOIN security_schema.rol r ON r.nombre_rol = p.rol
ON CONFLICT (id_rol, recurso, accion) DO NOTHING;

COMMIT;

-- Verificación:
-- SELECT r.nombre_rol, p.recurso, p.accion, p.alcance FROM security_schema.permiso p
--   JOIN security_schema.rol r USING (id_rol)
--  WHERE p.recurso IN ('identidad', 'contacto_participante') ORDER BY 1, 2, 3;
