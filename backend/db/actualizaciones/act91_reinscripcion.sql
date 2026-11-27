-- Act. 91 · D11 (ADR-002 v1.7): reinscripción después de un retiro.
-- Antes había una sola participación por persona y estudio. Ahora puede haber varias,
-- pero solo una activa. Se puede ejecutar más de una vez.
ALTER TABLE research_schema.participacion
  DROP CONSTRAINT IF EXISTS uq_participacion_participante_estudio;

CREATE UNIQUE INDEX IF NOT EXISTS uq_participacion_participante_estudio_activa
  ON research_schema.participacion (id_participante, id_estudio)
  WHERE estado = 'activo';