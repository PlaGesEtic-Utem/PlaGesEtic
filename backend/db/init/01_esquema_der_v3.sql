-- Copia del script de creación de la Actividad 41 (Benjamín Arias, 06/10/2026).
-- La fuente oficial es la carpeta de la base de datos; aquí se usa para levantar el entorno con Docker.

-- Creación de esquemas del modelo DER v3
CREATE SCHEMA IF NOT EXISTS identity_schema;
CREATE SCHEMA IF NOT EXISTS ethics_schema;
CREATE SCHEMA IF NOT EXISTS research_schema;
CREATE SCHEMA IF NOT EXISTS security_schema;

-- ==========================================
-- 1. SECURITY SCHEMA (Control de Acceso y Auditoría)
-- ==========================================
CREATE TABLE security_schema.rol (
    id_rol UUID PRIMARY KEY,
    nombre_rol VARCHAR(50) UNIQUE
);

CREATE TABLE security_schema.usuario (
    id_usuario UUID PRIMARY KEY,
    nombre VARCHAR(150),
    correo VARCHAR(150) UNIQUE,
    hash_password VARCHAR(255),
    debe_cambiar_password BOOLEAN,
    mfa_secret VARCHAR(255),
    mfa_activo BOOLEAN,
    id_rol UUID REFERENCES security_schema.rol(id_rol),
    activo BOOLEAN,
    fecha_expiracion TIMESTAMP,
    fecha_creacion TIMESTAMP
);

CREATE TABLE security_schema.permiso (
    id_permiso UUID PRIMARY KEY,
    id_rol UUID REFERENCES security_schema.rol(id_rol),
    recurso VARCHAR(50),
    accion VARCHAR(20),
    alcance VARCHAR(10)
);

CREATE TABLE security_schema.sesion_usuario (
    id_sesion UUID PRIMARY KEY,
    id_usuario UUID REFERENCES security_schema.usuario(id_usuario),
    token_hash CHAR(64) UNIQUE,
    fecha_inicio TIMESTAMP,
    fecha_expiracion TIMESTAMP,
    fecha_cierre TIMESTAMP,
    ip VARCHAR(45)
);

CREATE TABLE security_schema.mfa_codigo_recuperacion (
    id_codigo UUID PRIMARY KEY,
    id_usuario UUID REFERENCES security_schema.usuario(id_usuario),
    codigo_hash CHAR(64),
    usado BOOLEAN,
    fecha_uso TIMESTAMP
);

-- ==========================================
-- 2. IDENTITY SCHEMA (Datos Identificables / PII)
-- ==========================================
CREATE TABLE identity_schema.identidad (
    id_identidad UUID PRIMARY KEY,
    ux_lab_id VARCHAR(12) UNIQUE,
    rut_cifrado VARCHAR(255),
    rut_hash CHAR(64) UNIQUE,
    nombre_cifrado VARCHAR(512),
    correo_cifrado VARCHAR(512),
    correo_hash CHAR(64),
    telefono_cifrado VARCHAR(255),
    tipo VARCHAR(20),
    fecha_nacimiento DATE,
    fecha_registro TIMESTAMP,
    fecha_revocacion TIMESTAMP,
    fecha_eliminacion TIMESTAMP
);

CREATE TABLE identity_schema.representante_legal (
    id_representacion UUID PRIMARY KEY,
    id_identidad_representante UUID REFERENCES identity_schema.identidad(id_identidad),
    id_identidad_representado UUID REFERENCES identity_schema.identidad(id_identidad),
    relacion VARCHAR(20),
    fecha_inicio DATE,
    fecha_fin DATE
);

-- ==========================================
-- 3. RESEARCH SCHEMA (Estudios y Datos Experimentales)
-- ==========================================
CREATE TABLE research_schema.estudio (
    id_estudio UUID PRIMARY KEY,
    codigo_estudio VARCHAR(20) UNIQUE,
    nombre VARCHAR(150),
    descripcion TEXT,
    id_responsable UUID REFERENCES security_schema.usuario(id_usuario),
    estado VARCHAR(20),
    fecha_inicio DATE,
    fecha_fin DATE,
    fecha_cierre TIMESTAMP,
    retencion_hasta DATE
);

CREATE TABLE research_schema.participante (
    id_participante UUID PRIMARY KEY,
    estado VARCHAR(20),
    fecha_registro TIMESTAMP
);

CREATE TABLE research_schema.participacion (
    id_participacion UUID PRIMARY KEY,
    id_participante UUID REFERENCES research_schema.participante(id_participante),
    id_estudio UUID REFERENCES research_schema.estudio(id_estudio),
    codigo_seudonimo VARCHAR(12) UNIQUE,
    fecha_inicio DATE,
    es_menor_al_enrolar BOOLEAN,
    estado VARCHAR(20)
);

-- Puente de Privacidad 1:1 (Aislamiento PII)
CREATE TABLE identity_schema.vinculo_identidad (
    id_vinculo UUID PRIMARY KEY,
    id_identidad UUID UNIQUE REFERENCES identity_schema.identidad(id_identidad),
    id_participante UUID UNIQUE REFERENCES research_schema.participante(id_participante)
);

CREATE TABLE research_schema.sesion_investigacion (
    id_sesion_investigacion UUID PRIMARY KEY,
    id_participacion UUID REFERENCES research_schema.participacion(id_participacion),
    numero_sesion SMALLINT,
    tecnicas TEXT,
    fecha_programada TIMESTAMP,
    fecha_realizada TIMESTAMP,
    estado VARCHAR(20),
    id_responsable UUID REFERENCES security_schema.usuario(id_usuario),
    observaciones TEXT
);

CREATE TABLE research_schema.registro_datos (
    id_registro UUID PRIMARY KEY,
    id_participacion UUID REFERENCES research_schema.participacion(id_participacion),
    id_sesion_investigacion UUID REFERENCES research_schema.sesion_investigacion(id_sesion_investigacion),
    tipo_dato VARCHAR(30),
    dispositivo_origen VARCHAR(30),
    extension VARCHAR(10),
    formato_mime VARCHAR(100),
    tamano_bytes BIGINT,
    ruta_archivo VARCHAR(255),
    hash_sha256 CHAR(64),
    version INTEGER,
    id_registro_anterior UUID REFERENCES research_schema.registro_datos(id_registro),
    es_original BOOLEAN,
    es_sensible BOOLEAN,
    id_usuario_carga UUID REFERENCES security_schema.usuario(id_usuario),
    fecha_carga TIMESTAMP
);

CREATE TABLE research_schema.exportacion (
    id_exportacion UUID PRIMARY KEY,
    id_estudio UUID REFERENCES research_schema.estudio(id_estudio),
    codigo_exportacion VARCHAR(12) UNIQUE,
    proposito VARCHAR(20),
    filtros JSONB,
    estado VARCHAR(20),
    id_solicitante UUID REFERENCES security_schema.usuario(id_usuario),
    id_aprobador UUID REFERENCES security_schema.usuario(id_usuario),
    fecha_solicitud TIMESTAMP,
    fecha_aprobacion TIMESTAMP,
    fecha_generacion TIMESTAMP,
    ruta_paquete VARCHAR(255),
    hash_paquete CHAR(64),
    fecha_vencimiento TIMESTAMP
);

CREATE TABLE research_schema.exportacion_participacion (
    id_exportacion UUID REFERENCES research_schema.exportacion(id_exportacion),
    id_participacion UUID REFERENCES research_schema.participacion(id_participacion),
    codigo_en_exportacion VARCHAR(12),
    PRIMARY KEY (id_exportacion, id_participacion)
);

-- ==========================================
-- 4. ETHICS SCHEMA (Documentación y Protocolos CEC)
-- ==========================================
CREATE TABLE ethics_schema.protocolo_version (
    id_protocolo UUID PRIMARY KEY,
    id_estudio UUID REFERENCES research_schema.estudio(id_estudio),
    version VARCHAR(20),
    documento_ruta VARCHAR(255),
    documento_hash CHAR(64),
    estado_cec VARCHAR(20),
    codigo_aprobacion_cec VARCHAR(50),
    fecha_aprobacion_cec DATE,
    fecha_vencimiento_cec DATE,
    id_usuario_registro UUID REFERENCES security_schema.usuario(id_usuario),
    fecha_registro TIMESTAMP
);

CREATE TABLE ethics_schema.documento_consentimiento (
    id_documento UUID PRIMARY KEY,
    id_estudio UUID REFERENCES research_schema.estudio(id_estudio),
    id_protocolo UUID REFERENCES ethics_schema.protocolo_version(id_protocolo),
    tipo VARCHAR(20),
    version VARCHAR(20),
    documento_ruta VARCHAR(255),
    documento_hash CHAR(64),
    vigente BOOLEAN,
    fecha_registro TIMESTAMP
);

CREATE TABLE ethics_schema.consentimiento (
    id_consentimiento UUID PRIMARY KEY,
    id_participacion UUID REFERENCES research_schema.participacion(id_participacion),
    tipo VARCHAR(20)
);

CREATE TABLE ethics_schema.evento_consentimiento (
    id_evento UUID PRIMARY KEY,
    id_consentimiento UUID REFERENCES ethics_schema.consentimiento(id_consentimiento),
    id_documento UUID REFERENCES ethics_schema.documento_consentimiento(id_documento),
    id_representacion UUID REFERENCES identity_schema.representante_legal(id_representacion),
    tipo_evento VARCHAR(20),
    fecha TIMESTAMP,
    evidencia_ruta VARCHAR(255),
    evidencia_hash CHAR(64),
    id_usuario UUID REFERENCES security_schema.usuario(id_usuario)
);

-- ==========================================
-- 5. COMPLEMENTARIOS DE SEGURIDAD (Membresías, Autorizaciones y Auditoría)
-- ==========================================
CREATE TABLE security_schema.membresia_estudio (
    id_membresia UUID PRIMARY KEY,
    id_usuario UUID REFERENCES security_schema.usuario(id_usuario),
    id_estudio UUID REFERENCES research_schema.estudio(id_estudio),
    puede_consultar BOOLEAN,
    puede_cargar BOOLEAN,
    puede_modificar BOOLEAN,
    puede_descargar BOOLEAN,
    puede_exportar BOOLEAN,
    id_otorgante UUID REFERENCES security_schema.usuario(id_usuario),
    fecha_inicio DATE,
    fecha_fin DATE
);

CREATE TABLE security_schema.autorizacion (
    id_autorizacion UUID PRIMARY KEY,
    id_usuario UUID REFERENCES security_schema.usuario(id_usuario),
    id_estudio UUID REFERENCES research_schema.estudio(id_estudio),
    tipo VARCHAR(30),
    recurso VARCHAR(50),
    id_registro_objetivo UUID,
    motivo TEXT,
    estado VARCHAR(20),
    id_autorizador UUID REFERENCES security_schema.usuario(id_usuario),
    fecha_solicitud TIMESTAMP,
    fecha_resolucion TIMESTAMP,
    fecha_vencimiento TIMESTAMP
);

CREATE TABLE security_schema.auditoria (
    id_auditoria UUID PRIMARY KEY,
    id_usuario UUID,
    correo_intentado VARCHAR(150),
    id_sesion UUID,
    ip VARCHAR(45),
    entidad VARCHAR(50),
    id_registro_afectado UUID,
    id_estudio UUID,
    accion VARCHAR(20),
    resultado VARCHAR(10),
    justificacion TEXT,
    id_autorizacion UUID,
    fecha_hora TIMESTAMP
);