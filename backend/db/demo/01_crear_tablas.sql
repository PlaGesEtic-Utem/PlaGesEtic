BEGIN;

-- 1. ESQUEMAS
CREATE SCHEMA IF NOT EXISTS security_schema;
CREATE SCHEMA IF NOT EXISTS identity_schema;
CREATE SCHEMA IF NOT EXISTS research_schema;
CREATE SCHEMA IF NOT EXISTS ethics_schema;

-- 2. SEGURIDAD (security_schema)
CREATE TABLE security_schema.rol (
    id_rol UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_rol VARCHAR(50) NOT NULL CHECK (nombre_rol IN ('Director', 'Soporte', 'Investigador', 'Asistente', 'Estudiante', 'Invitado'))
);

CREATE TABLE security_schema.usuario (
    id_usuario UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    hash_password VARCHAR(255) NOT NULL,
    debe_cambiar_password BOOLEAN DEFAULT true,
    mfa_activo BOOLEAN DEFAULT false,
    id_rol UUID REFERENCES security_schema.rol(id_rol),
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT NOW()
);

-- 3. INVESTIGACIÓN (research_schema - Parte 1)
CREATE TABLE research_schema.estudio (
    id_estudio UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_estudio VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    id_responsable UUID REFERENCES security_schema.usuario(id_usuario),
    estado VARCHAR(50) DEFAULT 'activo',
    fecha_inicio DATE
);

CREATE TABLE research_schema.participante (
    id_participante UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estado VARCHAR(50) DEFAULT 'activo',
    fecha_registro TIMESTAMP DEFAULT NOW()
);

CREATE TABLE research_schema.participacion (
    id_participacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_participante UUID REFERENCES research_schema.participante(id_participante),
    id_estudio UUID REFERENCES research_schema.estudio(id_estudio),
    codigo_seudonimo VARCHAR(50) UNIQUE NOT NULL,
    fecha_inicio DATE,
    es_menor_al_enrolar BOOLEAN NOT NULL,
    estado VARCHAR(50) DEFAULT 'activo'
);

CREATE TABLE research_schema.registro_datos (
    id_registro UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_participacion UUID REFERENCES research_schema.participacion(id_participacion),
    tipo_dato VARCHAR(50) NOT NULL,
    dispositivo_origen VARCHAR(100),
    extension VARCHAR(10),
    formato_mime VARCHAR(50),
    tamano_bytes BIGINT,
    ruta_archivo TEXT NOT NULL,
    hash_sha256 VARCHAR(255),
    version INT DEFAULT 1,
    es_original BOOLEAN DEFAULT true,
    es_sensible BOOLEAN DEFAULT true,
    id_usuario_carga UUID REFERENCES security_schema.usuario(id_usuario),
    fecha_carga TIMESTAMP DEFAULT NOW()
);

-- 4. IDENTIDAD (identity_schema)
CREATE TABLE identity_schema.identidad (
    id_identidad UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ux_lab_id VARCHAR(50) UNIQUE NOT NULL,
    rut_cifrado VARCHAR(255) NOT NULL,
    nombre_cifrado VARCHAR(255) NOT NULL,
    correo_cifrado VARCHAR(255),
    telefono_cifrado VARCHAR(255),
    tipo VARCHAR(50) NOT NULL,
    fecha_nacimiento DATE,
    fecha_registro TIMESTAMP DEFAULT NOW()
);

CREATE TABLE identity_schema.representante_legal (
    id_identidad_representante UUID REFERENCES identity_schema.identidad(id_identidad),
    id_identidad_representado UUID REFERENCES identity_schema.identidad(id_identidad),
    relacion VARCHAR(50) NOT NULL,
    fecha_inicio TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (id_identidad_representante, id_identidad_representado)
);

CREATE TABLE identity_schema.vinculo_identidad (
    id_identidad UUID REFERENCES identity_schema.identidad(id_identidad),
    id_participante UUID REFERENCES research_schema.participante(id_participante),
    PRIMARY KEY (id_identidad, id_participante)
);

-- 5. ÉTICA (ethics_schema)
CREATE TABLE ethics_schema.protocolo_version (
    id_protocolo UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_estudio UUID REFERENCES research_schema.estudio(id_estudio),
    version VARCHAR(20) NOT NULL,
    documento_ruta TEXT,
    documento_hash VARCHAR(255),
    estado_cec VARCHAR(50),
    id_usuario_registro UUID REFERENCES security_schema.usuario(id_usuario),
    fecha_registro TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ethics_schema.documento_consentimiento (
    id_documento UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_estudio UUID REFERENCES research_schema.estudio(id_estudio),
    id_protocolo UUID REFERENCES ethics_schema.protocolo_version(id_protocolo),
    tipo VARCHAR(50) NOT NULL,
    version VARCHAR(20) NOT NULL,
    documento_ruta TEXT,
    documento_hash VARCHAR(255),
    vigente BOOLEAN DEFAULT true,
    fecha_registro TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ethics_schema.consentimiento (
    id_consentimiento UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_participacion UUID REFERENCES research_schema.participacion(id_participacion),
    tipo VARCHAR(50) NOT NULL
);

CREATE TABLE ethics_schema.evento_consentimiento (
    id_evento UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_consentimiento UUID REFERENCES ethics_schema.consentimiento(id_consentimiento),
    id_documento UUID REFERENCES ethics_schema.documento_consentimiento(id_documento),
    tipo_evento VARCHAR(50) NOT NULL,
    fecha TIMESTAMP DEFAULT NOW(),
    evidencia_ruta TEXT,
    id_usuario UUID REFERENCES security_schema.usuario(id_usuario)
);

COMMIT;