-- =====================================================================
-- plaGesEtic · 05_permisos_base.sql
-- Carga de security_schema.permiso: qué puede hacer cada rol (recurso, acción, alcance).
-- Fuente: matriz de permisos de la Actividad 40 (v2) y Catálogo de endpoints v3.
--
--   alcance 'global'  → vale sin membresía (ej.: supervisión del Director, crear un estudio).
--   alcance 'estudio' → además exige membresía vigente con el permiso puede_* que
--                       corresponda, o una autorización aprobada y vigente.
--
-- Requiere 01 (tablas), 02 (restricciones) y los seis roles cargados.
-- Se puede ejecutar más de una vez: no duplica filas.
-- =====================================================================
BEGIN;

INSERT INTO security_schema.permiso (id_rol, recurso, accion, alcance)
SELECT r.id_rol, p.recurso, p.accion, p.alcance
FROM (VALUES
  -- ---------- Director: supervisión global ----------
  ('Director','estudio','crear','global'),
  ('Director','estudio','leer','global'),
  ('Director','estudio','actualizar','global'),          -- incluye activar y cerrar
  ('Director','protocolo','leer','global'),
  ('Director','protocolo','actualizar','global'),        -- registrar la aprobación del CEC
  ('Director','participacion','leer','global'),          -- solo seudónimos
  ('Director','membresia','leer','global'),
  ('Director','identidad','leer','global'),              -- desenmascarar, siempre con justificación
  ('Director','usuario','crear','global'),
  ('Director','usuario','leer','global'),
  ('Director','usuario','actualizar','global'),          -- bloquear y cambiar rol
  ('Director','autorizacion','leer','global'),
  ('Director','autorizacion','aprobar','global'),        -- única que aprueba ver_identidad
  ('Director','auditoria','leer','global'),

  -- ---------- Soporte: cuentas, sin datos de estudio ----------
  ('Soporte','usuario','crear','global'),
  ('Soporte','usuario','leer','global'),
  ('Soporte','usuario','actualizar','global'),           -- bloquear, contraseña temporal, reiniciar MFA
  ('Soporte','autorizacion','crear','global'),           -- solicitar
  ('Soporte','registro_datos','crear','estudio'),        -- solo con autorización aprobada y vigente

  -- ---------- Investigador: sus estudios ----------
  ('Investigador','estudio','crear','global'),           -- al crearlo queda con membresía completa
  ('Investigador','estudio','leer','estudio'),
  ('Investigador','estudio','actualizar','estudio'),
  ('Investigador','protocolo','crear','estudio'),
  ('Investigador','protocolo','leer','estudio'),
  ('Investigador','protocolo','actualizar','estudio'),
  ('Investigador','documento_consentimiento','crear','estudio'),
  ('Investigador','documento_consentimiento','leer','estudio'),
  ('Investigador','membresia','crear','estudio'),
  ('Investigador','membresia','leer','estudio'),
  ('Investigador','membresia','actualizar','estudio'),
  ('Investigador','identidad','crear','global'),         -- registrar y buscar (devuelve solo el UX Lab ID)
  ('Investigador','representacion','crear','global'),
  ('Investigador','participacion','crear','estudio'),
  ('Investigador','participacion','leer','estudio'),
  ('Investigador','participacion','actualizar','estudio'),
  ('Investigador','sesion_investigacion','crear','estudio'),
  ('Investigador','sesion_investigacion','leer','estudio'),
  ('Investigador','sesion_investigacion','actualizar','estudio'),
  ('Investigador','consentimiento','crear','estudio'),
  ('Investigador','consentimiento','leer','estudio'),
  ('Investigador','registro_datos','crear','estudio'),
  ('Investigador','registro_datos','leer','estudio'),
  ('Investigador','registro_datos','actualizar','estudio'),
  ('Investigador','registro_datos','descargar','estudio'),
  ('Investigador','exportacion','crear','estudio'),
  ('Investigador','exportacion','leer','estudio'),
  ('Investigador','exportacion','descargar','estudio'),
  ('Investigador','exportacion','aprobar','estudio'),    -- las del Estudiante
  ('Investigador','autorizacion','leer','estudio'),
  ('Investigador','autorizacion','aprobar','estudio'),   -- de sus estudios, salvo ver_identidad

  -- ---------- Asistente: estudios asignados ----------
  ('Asistente','estudio','leer','estudio'),
  ('Asistente','protocolo','leer','estudio'),
  ('Asistente','documento_consentimiento','leer','estudio'),
  ('Asistente','identidad','crear','global'),
  ('Asistente','representacion','crear','global'),
  ('Asistente','participacion','crear','estudio'),
  ('Asistente','participacion','leer','estudio'),
  ('Asistente','participacion','actualizar','estudio'),
  ('Asistente','sesion_investigacion','crear','estudio'),
  ('Asistente','sesion_investigacion','leer','estudio'),
  ('Asistente','sesion_investigacion','actualizar','estudio'),
  ('Asistente','consentimiento','crear','estudio'),
  ('Asistente','consentimiento','leer','estudio'),
  ('Asistente','registro_datos','crear','estudio'),
  ('Asistente','registro_datos','leer','estudio'),
  ('Asistente','registro_datos','actualizar','estudio'),
  ('Asistente','registro_datos','descargar','estudio'),
  ('Asistente','autorizacion','crear','global'),

  -- ---------- Estudiante: datos sin nombres de sus estudios ----------
  ('Estudiante','estudio','leer','estudio'),
  ('Estudiante','participacion','leer','estudio'),
  ('Estudiante','sesion_investigacion','leer','estudio'),
  ('Estudiante','registro_datos','leer','estudio'),
  ('Estudiante','registro_datos','descargar','estudio'),
  ('Estudiante','exportacion','crear','estudio'),        -- queda «solicitada» hasta que la apruebe el Investigador
  ('Estudiante','exportacion','leer','estudio'),
  ('Estudiante','exportacion','descargar','estudio'),
  ('Estudiante','autorizacion','crear','global'),

  -- ---------- Invitado: solo lectura, con fecha de término ----------
  ('Invitado','estudio','leer','estudio'),
  ('Invitado','registro_datos','leer','estudio')         -- solo metadatos
) AS p(rol, recurso, accion, alcance)
JOIN security_schema.rol r ON r.nombre_rol = p.rol
ON CONFLICT (id_rol, recurso, accion) DO NOTHING;

COMMIT;

-- Verificación: cantidad de permisos por rol
-- SELECT r.nombre_rol, count(*) FROM security_schema.permiso p
--   JOIN security_schema.rol r USING (id_rol) GROUP BY r.nombre_rol ORDER BY 1;
