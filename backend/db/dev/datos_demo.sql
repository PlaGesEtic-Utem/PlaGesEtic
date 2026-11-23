-- ============================================================
-- plaGesEtic - Actividad 83 - Datos sinteticos para Hito 4
-- Responsable: Benjamin Arias
-- Uso exclusivo: desarrollo y demostracion local
--
-- Requisitos:
--   1. Esquema DER v3 inicializado.
--   2. db/dev/datos_prueba.sql cargado previamente.
--
-- Este script:
--   - No borra registros.
--   - No guarda informacion personal.
--   - No fabrica consentimientos ni exportaciones.
--   - Es reutilizable con los mismos identificadores.
-- ============================================================

BEGIN;

-- Verificar que exista el estudio base con aprobacion CEC.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM research_schema.estudio e
    JOIN ethics_schema.protocolo_version p
      ON p.id_estudio = e.id_estudio
    WHERE e.codigo_estudio = 'EST-01'
      AND e.estado = 'activo'
      AND p.estado_cec = 'aprobado'
  ) THEN
    RAISE EXCEPTION
      'ACT83: EST-01 no existe, no esta activo o no tiene CEC aprobado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM ethics_schema.documento_consentimiento d
    JOIN research_schema.estudio e
      ON e.id_estudio = d.id_estudio
    WHERE e.codigo_estudio = 'EST-01'
      AND d.vigente = TRUE
      AND d.tipo = 'consentimiento'
  ) THEN
    RAISE EXCEPTION
      'ACT83: falta documento de consentimiento vigente para EST-01.';
  END IF;
END
$$;

-- Participantes sinteticos, sin datos personales.
INSERT INTO research_schema.participante
  (id_participante, estado, fecha_registro)
VALUES
  ('83000000-0000-4000-8000-000000000101', 'activo', NOW()),
  ('83000000-0000-4000-8000-000000000102', 'activo', NOW()),
  ('83000000-0000-4000-8000-000000000103', 'activo', NOW()),
  ('83000000-0000-4000-8000-000000000104', 'activo', NOW())
ON CONFLICT (id_participante) DO NOTHING;

-- Participaciones de demostracion.
-- La cuarta corresponde al escenario del menor de edad.
-- Su representante y los consentimientos se registraran
-- mediante los flujos del sistema, no simulando su aceptacion.
INSERT INTO research_schema.participacion (
  id_participacion,
  id_participante,
  id_estudio,
  codigo_seudonimo,
  fecha_inicio,
  es_menor_al_enrolar,
  estado
)
SELECT
  d.id_participacion::uuid,
  d.id_participante::uuid,
  e.id_estudio,
  d.codigo,
  CURRENT_DATE,
  d.es_menor,
  'activo'
FROM (
  VALUES
    (
      '83000000-0000-4000-8000-000000000201',
      '83000000-0000-4000-8000-000000000101',
      'EXP-901',
      FALSE
    ),
    (
      '83000000-0000-4000-8000-000000000202',
      '83000000-0000-4000-8000-000000000102',
      'EXP-902',
      FALSE
    ),
    (
      '83000000-0000-4000-8000-000000000203',
      '83000000-0000-4000-8000-000000000103',
      'EXP-903',
      FALSE
    ),
    (
      '83000000-0000-4000-8000-000000000204',
      '83000000-0000-4000-8000-000000000104',
      'EXP-904',
      TRUE
    )
) AS d(
  id_participacion,
  id_participante,
  codigo,
  es_menor
)
CROSS JOIN research_schema.estudio e
WHERE e.codigo_estudio = 'EST-01'
ON CONFLICT (id_participacion) DO NOTHING;

COMMIT;

-- Resumen de los registros preparados.
SELECT
  p.codigo_seudonimo,
  e.codigo_estudio,
  p.es_menor_al_enrolar,
  p.estado
FROM research_schema.participacion p
JOIN research_schema.estudio e
  ON e.id_estudio = p.id_estudio
WHERE p.id_participacion IN (
  '83000000-0000-4000-8000-000000000201',
  '83000000-0000-4000-8000-000000000202',
  '83000000-0000-4000-8000-000000000203',
  '83000000-0000-4000-8000-000000000204'
)
ORDER BY p.codigo_seudonimo;
