#!/bin/sh
# Crea el usuario de la APLICACIÓN con permisos mínimos.
# - Puede leer y escribir las tablas de trabajo.
# - NO es dueño de los esquemas (no puede cambiar la estructura).
# - NO puede hacer UPDATE, DELETE ni TRUNCATE en auditoria ni en evento_consentimiento:
#   ambas son de solo inserción (append-only).
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
     -v app_user="$APP_DB_USER" -v app_pass="$APP_DB_PASSWORD" -v db="$POSTGRES_DB" <<'SQL'
CREATE ROLE :"app_user" LOGIN PASSWORD :'app_pass';
GRANT CONNECT ON DATABASE :"db" TO :"app_user";
GRANT USAGE ON SCHEMA identity_schema, ethics_schema, research_schema, security_schema TO :"app_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA identity_schema, ethics_schema, research_schema, security_schema TO :"app_user";
REVOKE UPDATE, DELETE, TRUNCATE ON security_schema.auditoria, ethics_schema.evento_consentimiento FROM :"app_user";
SQL
