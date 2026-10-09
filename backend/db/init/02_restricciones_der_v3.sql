-- =====================================================================
-- plaGesEtic · 02_restricciones_der_v3.sql
-- Complemento del script de creación (01) ejecutado el 06/10/2026.
-- Agrega las restricciones del Diccionario de Datos v3 que faltaban:
--   1) NOT NULL   2) UNIQUE compuestos   3) CHECK de valores permitidos
--   4) DEFAULT gen_random_uuid() en las PK   5) auditoría append-only
-- Se ejecuta UNA vez, sobre la base recién creada (tablas vacías).
-- Todo va en una transacción: si algo falla, no queda nada a medias.
-- =====================================================================

BEGIN;

-- 1) NOT NULL (según columna «Restricciones» del diccionario v3)
ALTER TABLE identity_schema.identidad ALTER COLUMN ux_lab_id SET NOT NULL, ALTER COLUMN nombre_cifrado SET NOT NULL, ALTER COLUMN tipo SET NOT NULL, ALTER COLUMN fecha_nacimiento SET NOT NULL, ALTER COLUMN fecha_registro SET NOT NULL;
ALTER TABLE identity_schema.vinculo_identidad ALTER COLUMN id_identidad SET NOT NULL, ALTER COLUMN id_participante SET NOT NULL;
ALTER TABLE identity_schema.representante_legal ALTER COLUMN id_identidad_representante SET NOT NULL, ALTER COLUMN id_identidad_representado SET NOT NULL, ALTER COLUMN relacion SET NOT NULL, ALTER COLUMN fecha_inicio SET NOT NULL;
ALTER TABLE ethics_schema.protocolo_version ALTER COLUMN id_estudio SET NOT NULL, ALTER COLUMN version SET NOT NULL, ALTER COLUMN documento_ruta SET NOT NULL, ALTER COLUMN documento_hash SET NOT NULL, ALTER COLUMN estado_cec SET NOT NULL, ALTER COLUMN id_usuario_registro SET NOT NULL, ALTER COLUMN fecha_registro SET NOT NULL;
ALTER TABLE ethics_schema.documento_consentimiento ALTER COLUMN id_estudio SET NOT NULL, ALTER COLUMN tipo SET NOT NULL, ALTER COLUMN version SET NOT NULL, ALTER COLUMN documento_ruta SET NOT NULL, ALTER COLUMN documento_hash SET NOT NULL, ALTER COLUMN vigente SET NOT NULL, ALTER COLUMN fecha_registro SET NOT NULL;
ALTER TABLE ethics_schema.consentimiento ALTER COLUMN id_participacion SET NOT NULL, ALTER COLUMN tipo SET NOT NULL;
ALTER TABLE ethics_schema.evento_consentimiento ALTER COLUMN id_consentimiento SET NOT NULL, ALTER COLUMN id_documento SET NOT NULL, ALTER COLUMN tipo_evento SET NOT NULL, ALTER COLUMN fecha SET NOT NULL, ALTER COLUMN id_usuario SET NOT NULL;
ALTER TABLE research_schema.estudio ALTER COLUMN codigo_estudio SET NOT NULL, ALTER COLUMN nombre SET NOT NULL, ALTER COLUMN id_responsable SET NOT NULL, ALTER COLUMN estado SET NOT NULL, ALTER COLUMN fecha_inicio SET NOT NULL;
ALTER TABLE research_schema.participante ALTER COLUMN estado SET NOT NULL, ALTER COLUMN fecha_registro SET NOT NULL;
ALTER TABLE research_schema.participacion ALTER COLUMN id_participante SET NOT NULL, ALTER COLUMN id_estudio SET NOT NULL, ALTER COLUMN codigo_seudonimo SET NOT NULL, ALTER COLUMN fecha_inicio SET NOT NULL, ALTER COLUMN es_menor_al_enrolar SET NOT NULL, ALTER COLUMN estado SET NOT NULL;
ALTER TABLE research_schema.sesion_investigacion ALTER COLUMN id_participacion SET NOT NULL, ALTER COLUMN numero_sesion SET NOT NULL, ALTER COLUMN fecha_programada SET NOT NULL, ALTER COLUMN estado SET NOT NULL, ALTER COLUMN id_responsable SET NOT NULL;
ALTER TABLE research_schema.registro_datos ALTER COLUMN id_participacion SET NOT NULL, ALTER COLUMN tipo_dato SET NOT NULL, ALTER COLUMN dispositivo_origen SET NOT NULL, ALTER COLUMN extension SET NOT NULL, ALTER COLUMN formato_mime SET NOT NULL, ALTER COLUMN tamano_bytes SET NOT NULL, ALTER COLUMN ruta_archivo SET NOT NULL, ALTER COLUMN hash_sha256 SET NOT NULL, ALTER COLUMN version SET NOT NULL, ALTER COLUMN es_original SET NOT NULL, ALTER COLUMN es_sensible SET NOT NULL, ALTER COLUMN id_usuario_carga SET NOT NULL, ALTER COLUMN fecha_carga SET NOT NULL;
ALTER TABLE research_schema.exportacion ALTER COLUMN id_estudio SET NOT NULL, ALTER COLUMN codigo_exportacion SET NOT NULL, ALTER COLUMN proposito SET NOT NULL, ALTER COLUMN filtros SET NOT NULL, ALTER COLUMN estado SET NOT NULL, ALTER COLUMN id_solicitante SET NOT NULL, ALTER COLUMN fecha_solicitud SET NOT NULL;
ALTER TABLE research_schema.exportacion_participacion ALTER COLUMN codigo_en_exportacion SET NOT NULL;
ALTER TABLE security_schema.usuario ALTER COLUMN nombre SET NOT NULL, ALTER COLUMN correo SET NOT NULL, ALTER COLUMN hash_password SET NOT NULL, ALTER COLUMN debe_cambiar_password SET NOT NULL, ALTER COLUMN mfa_activo SET NOT NULL, ALTER COLUMN id_rol SET NOT NULL, ALTER COLUMN activo SET NOT NULL, ALTER COLUMN fecha_creacion SET NOT NULL;
ALTER TABLE security_schema.rol ALTER COLUMN nombre_rol SET NOT NULL;
ALTER TABLE security_schema.permiso ALTER COLUMN id_rol SET NOT NULL, ALTER COLUMN recurso SET NOT NULL, ALTER COLUMN accion SET NOT NULL, ALTER COLUMN alcance SET NOT NULL;
ALTER TABLE security_schema.membresia_estudio ALTER COLUMN id_usuario SET NOT NULL, ALTER COLUMN id_estudio SET NOT NULL, ALTER COLUMN puede_consultar SET NOT NULL, ALTER COLUMN puede_cargar SET NOT NULL, ALTER COLUMN puede_modificar SET NOT NULL, ALTER COLUMN puede_descargar SET NOT NULL, ALTER COLUMN puede_exportar SET NOT NULL, ALTER COLUMN id_otorgante SET NOT NULL, ALTER COLUMN fecha_inicio SET NOT NULL;
ALTER TABLE security_schema.sesion_usuario ALTER COLUMN id_usuario SET NOT NULL, ALTER COLUMN token_hash SET NOT NULL, ALTER COLUMN fecha_inicio SET NOT NULL, ALTER COLUMN fecha_expiracion SET NOT NULL, ALTER COLUMN ip SET NOT NULL;
ALTER TABLE security_schema.mfa_codigo_recuperacion ALTER COLUMN id_usuario SET NOT NULL, ALTER COLUMN codigo_hash SET NOT NULL, ALTER COLUMN usado SET NOT NULL;
ALTER TABLE security_schema.autorizacion ALTER COLUMN id_usuario SET NOT NULL, ALTER COLUMN id_estudio SET NOT NULL, ALTER COLUMN tipo SET NOT NULL, ALTER COLUMN recurso SET NOT NULL, ALTER COLUMN motivo SET NOT NULL, ALTER COLUMN estado SET NOT NULL, ALTER COLUMN fecha_solicitud SET NOT NULL, ALTER COLUMN fecha_vencimiento SET NOT NULL;
ALTER TABLE security_schema.auditoria ALTER COLUMN accion SET NOT NULL, ALTER COLUMN resultado SET NOT NULL, ALTER COLUMN fecha_hora SET NOT NULL;

-- 2) UNIQUE compuestos (notas «Restricción:» del diccionario v3)
ALTER TABLE identity_schema.representante_legal ADD CONSTRAINT uq_representante_legal_par UNIQUE (id_identidad_representante, id_identidad_representado);
ALTER TABLE ethics_schema.protocolo_version ADD CONSTRAINT uq_protocolo_version_estudio_version UNIQUE (id_estudio, version);
ALTER TABLE ethics_schema.documento_consentimiento ADD CONSTRAINT uq_documento_consentimiento_estudio_tipo_version UNIQUE (id_estudio, tipo, version);
ALTER TABLE ethics_schema.consentimiento ADD CONSTRAINT uq_consentimiento_participacion_tipo UNIQUE (id_participacion, tipo);
ALTER TABLE research_schema.participacion ADD CONSTRAINT uq_participacion_participante_estudio UNIQUE (id_participante, id_estudio);
ALTER TABLE research_schema.exportacion_participacion ADD CONSTRAINT uq_exportacion_participacion_exportacion_codigo_en_exportacion UNIQUE (id_exportacion, codigo_en_exportacion);
ALTER TABLE security_schema.permiso ADD CONSTRAINT uq_permiso_rol_recurso_accion UNIQUE (id_rol, recurso, accion);
ALTER TABLE security_schema.membresia_estudio ADD CONSTRAINT uq_membresia_estudio_usuario_estudio UNIQUE (id_usuario, id_estudio);

-- 3) CHECK de valores permitidos (catálogo de ENUMs del diccionario v3)
ALTER TABLE identity_schema.identidad ADD CONSTRAINT ck_identidad_tipo CHECK (tipo IN ('participante', 'representante'));
ALTER TABLE identity_schema.representante_legal ADD CONSTRAINT ck_representante_legal_relacion CHECK (relacion IN ('madre', 'padre', 'tutor_legal', 'otro'));
ALTER TABLE ethics_schema.protocolo_version ADD CONSTRAINT ck_protocolo_version_estado_cec CHECK (estado_cec IN ('pendiente', 'aprobado', 'observado', 'rechazado'));
ALTER TABLE ethics_schema.documento_consentimiento ADD CONSTRAINT ck_documento_consentimiento_tipo CHECK (tipo IN ('consentimiento', 'asentimiento'));
ALTER TABLE ethics_schema.consentimiento ADD CONSTRAINT ck_consentimiento_tipo CHECK (tipo IN ('consentimiento', 'asentimiento'));
ALTER TABLE ethics_schema.evento_consentimiento ADD CONSTRAINT ck_evento_consentimiento_tipo_evento CHECK (tipo_evento IN ('aceptar', 'negar', 'retirar', 'reconsentir'));
ALTER TABLE research_schema.estudio ADD CONSTRAINT ck_estudio_estado CHECK (estado IN ('borrador', 'activo', 'cerrado'));
ALTER TABLE research_schema.participante ADD CONSTRAINT ck_participante_estado CHECK (estado IN ('activo', 'inactivo'));
ALTER TABLE research_schema.participacion ADD CONSTRAINT ck_participacion_estado CHECK (estado IN ('activo', 'retirado'));
ALTER TABLE research_schema.sesion_investigacion ADD CONSTRAINT ck_sesion_investigacion_estado CHECK (estado IN ('programada', 'realizada', 'cancelada', 'no_asistio'));
ALTER TABLE research_schema.registro_datos ADD CONSTRAINT ck_registro_datos_tipo_dato CHECK (tipo_dato IN ('video', 'audio', 'captura_pantalla', 'eye_tracking', 'pupilometria', 'eeg', 'gsr_eda', 'frecuencia_cardiaca', 'log_sensor', 'cuestionario', 'documento', 'planilla', 'imagen', 'otro'));
ALTER TABLE research_schema.registro_datos ADD CONSTRAINT ck_registro_datos_dispositivo_origen CHECK (dispositivo_origen IN ('bitbrain_diadem', 'bitbrain_ring', 'tobii_pro_spark', 'sennslab', 'sennsmetrics', 'software_externo', 'carga_manual', 'otro'));
ALTER TABLE research_schema.exportacion ADD CONSTRAINT ck_exportacion_proposito CHECK (proposito IN ('analisis', 'informe', 'publicacion'));
ALTER TABLE research_schema.exportacion ADD CONSTRAINT ck_exportacion_estado CHECK (estado IN ('solicitada', 'aprobada', 'rechazada', 'procesando', 'lista', 'vencida'));
ALTER TABLE security_schema.rol ADD CONSTRAINT ck_rol_nombre_rol CHECK (nombre_rol IN ('Director', 'Soporte', 'Investigador', 'Asistente', 'Estudiante', 'Invitado'));
ALTER TABLE security_schema.permiso ADD CONSTRAINT ck_permiso_accion CHECK (accion IN ('crear', 'leer', 'actualizar', 'eliminar', 'descargar', 'exportar', 'aprobar'));
ALTER TABLE security_schema.permiso ADD CONSTRAINT ck_permiso_alcance CHECK (alcance IN ('global', 'estudio'));
ALTER TABLE security_schema.autorizacion ADD CONSTRAINT ck_autorizacion_tipo CHECK (tipo IN ('ver_identidad', 'acceso_contenido_sensible', 'descarga_original', 'exportacion', 'acceso_temporal'));
ALTER TABLE security_schema.autorizacion ADD CONSTRAINT ck_autorizacion_estado CHECK (estado IN ('pendiente', 'aprobada', 'rechazada', 'vencida'));
ALTER TABLE security_schema.auditoria ADD CONSTRAINT ck_auditoria_accion CHECK (accion IN ('crear', 'leer', 'actualizar', 'eliminar', 'descargar', 'exportar', 'desenmascarar', 'aprobar', 'rechazar', 'revocar', 'login_exitoso', 'login_fallido', 'cierre_sesion'));
ALTER TABLE security_schema.auditoria ADD CONSTRAINT ck_auditoria_resultado CHECK (resultado IN ('exito', 'error'));

-- 4) Los UUID de las PK se generan solos (gen_random_uuid() viene en PostgreSQL 13+)
ALTER TABLE identity_schema.identidad ALTER COLUMN id_identidad SET DEFAULT gen_random_uuid();
ALTER TABLE identity_schema.vinculo_identidad ALTER COLUMN id_vinculo SET DEFAULT gen_random_uuid();
ALTER TABLE identity_schema.representante_legal ALTER COLUMN id_representacion SET DEFAULT gen_random_uuid();
ALTER TABLE ethics_schema.protocolo_version ALTER COLUMN id_protocolo SET DEFAULT gen_random_uuid();
ALTER TABLE ethics_schema.documento_consentimiento ALTER COLUMN id_documento SET DEFAULT gen_random_uuid();
ALTER TABLE ethics_schema.consentimiento ALTER COLUMN id_consentimiento SET DEFAULT gen_random_uuid();
ALTER TABLE ethics_schema.evento_consentimiento ALTER COLUMN id_evento SET DEFAULT gen_random_uuid();
ALTER TABLE research_schema.estudio ALTER COLUMN id_estudio SET DEFAULT gen_random_uuid();
ALTER TABLE research_schema.participante ALTER COLUMN id_participante SET DEFAULT gen_random_uuid();
ALTER TABLE research_schema.participacion ALTER COLUMN id_participacion SET DEFAULT gen_random_uuid();
ALTER TABLE research_schema.sesion_investigacion ALTER COLUMN id_sesion_investigacion SET DEFAULT gen_random_uuid();
ALTER TABLE research_schema.registro_datos ALTER COLUMN id_registro SET DEFAULT gen_random_uuid();
ALTER TABLE research_schema.exportacion ALTER COLUMN id_exportacion SET DEFAULT gen_random_uuid();
ALTER TABLE security_schema.usuario ALTER COLUMN id_usuario SET DEFAULT gen_random_uuid();
ALTER TABLE security_schema.rol ALTER COLUMN id_rol SET DEFAULT gen_random_uuid();
ALTER TABLE security_schema.permiso ALTER COLUMN id_permiso SET DEFAULT gen_random_uuid();
ALTER TABLE security_schema.membresia_estudio ALTER COLUMN id_membresia SET DEFAULT gen_random_uuid();
ALTER TABLE security_schema.sesion_usuario ALTER COLUMN id_sesion SET DEFAULT gen_random_uuid();
ALTER TABLE security_schema.mfa_codigo_recuperacion ALTER COLUMN id_codigo SET DEFAULT gen_random_uuid();
ALTER TABLE security_schema.autorizacion ALTER COLUMN id_autorizacion SET DEFAULT gen_random_uuid();
ALTER TABLE security_schema.auditoria ALTER COLUMN id_auditoria SET DEFAULT gen_random_uuid();

-- 5) Auditoría append-only: solo INSERT; UPDATE y DELETE se rechazan siempre
CREATE OR REPLACE FUNCTION security_schema.fn_auditoria_inmutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'La tabla auditoria es append-only: no se permite %', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_auditoria_inmutable
  BEFORE UPDATE OR DELETE ON security_schema.auditoria
  FOR EACH ROW EXECUTE FUNCTION security_schema.fn_auditoria_inmutable();

CREATE TRIGGER tr_auditoria_no_truncate
  BEFORE TRUNCATE ON security_schema.auditoria
  FOR EACH STATEMENT EXECUTE FUNCTION security_schema.fn_auditoria_inmutable();

COMMIT;

-- PENDIENTE (no incluido a propósito, requiere decisión del equipo):
--  * ON DELETE para la supresión de identidad: hoy, borrar una fila de identity_schema.identidad
--    falla si la referencian representante_legal o evento_consentimiento.id_representacion.
--  * Cambios aprobados hoy en el prototipo: correo_cifrado y telefono_cifrado NOT NULL
--    (identidad), y la acción 'ver_contacto' en auditoria.accion. Se agregan cuando se
--    actualice el diccionario a v3.1.
