# Base de datos de ejemplo de plaGesEtic

Scripts para crear desde cero una base PostgreSQL con el modelo de datos del proyecto y datos de ejemplo.

| Archivo | Qué hace |
| --- | --- |
| `01_crear_tablas.sql` | Crea los 4 esquemas y las 13 tablas |
| `02_datos_ejemplo.sql` | Carga datos ficticios para probar el modelo |

## Qué incluye

**Esquemas y tablas**

| Esquema | Tablas |
| --- | --- |
| `security_schema` | `rol`, `usuario` |
| `identity_schema` | `identidad`, `representante_legal`, `vinculo_identidad` |
| `research_schema` | `estudio`, `participante`, `participacion`, `registro_datos` |
| `ethics_schema` | `protocolo_version`, `documento_consentimiento`, `consentimiento`, `evento_consentimiento` |

Los datos personales (`identity_schema`) están separados de los datos de estudio (`research_schema`). La única conexión entre ambos es la tabla puente `vinculo_identidad`.

**Datos de ejemplo:** 6 roles, 6 usuarios, 2 estudios, 4 identidades (una es representante legal de un menor), 3 participantes con sus participaciones y códigos seudónimos, 2 protocolos, 2 documentos de consentimiento, 3 consentimientos y 3 eventos de consentimiento. `registro_datos` queda vacía.

## Requisitos

- PostgreSQL 13 o superior (los scripts usan `gen_random_uuid()`).
- El cliente `psql` disponible en la terminal.
- Un usuario con permiso para crear bases de datos. En los comandos de abajo se usa `postgres`; cambia el usuario, el host (`-h`) o el puerto (`-p`) si los tuyos son distintos.

## Crear la base desde cero

Ejecuta los comandos en este orden, desde la carpeta que contiene los scripts.

**1. Crear la base de datos vacía**

```bash
psql -U postgres -c "CREATE DATABASE plagesetic_demo;"
```

**2. Crear los esquemas y las tablas**

```bash
psql -U postgres -d plagesetic_demo -v ON_ERROR_STOP=1 -f 01_crear_tablas.sql
```

**3. Cargar los datos de ejemplo**

```bash
psql -U postgres -d plagesetic_demo -v ON_ERROR_STOP=1 -f 02_datos_ejemplo.sql
```

Cada script va dentro de una transacción (`BEGIN` / `COMMIT`): si algo falla, no queda nada a medias. Con `ON_ERROR_STOP` el proceso se detiene en el primer error.

Si prefieres una interfaz gráfica (pgAdmin, DBeaver), crea la base `plagesetic_demo`, abre cada script en el editor de consultas y ejecútalos en el mismo orden: primero el `01` y luego el `02`.

## Verificar que quedó bien

```bash
psql -U postgres -d plagesetic_demo
```

```sql
SELECT 'security_schema.rol' AS tabla, COUNT(*) AS filas FROM security_schema.rol
UNION ALL SELECT 'security_schema.usuario', COUNT(*) FROM security_schema.usuario
UNION ALL SELECT 'research_schema.estudio', COUNT(*) FROM research_schema.estudio
UNION ALL SELECT 'identity_schema.identidad', COUNT(*) FROM identity_schema.identidad
UNION ALL SELECT 'identity_schema.representante_legal', COUNT(*) FROM identity_schema.representante_legal
UNION ALL SELECT 'research_schema.participante', COUNT(*) FROM research_schema.participante
UNION ALL SELECT 'identity_schema.vinculo_identidad', COUNT(*) FROM identity_schema.vinculo_identidad
UNION ALL SELECT 'research_schema.participacion', COUNT(*) FROM research_schema.participacion
UNION ALL SELECT 'ethics_schema.protocolo_version', COUNT(*) FROM ethics_schema.protocolo_version
UNION ALL SELECT 'ethics_schema.documento_consentimiento', COUNT(*) FROM ethics_schema.documento_consentimiento
UNION ALL SELECT 'ethics_schema.consentimiento', COUNT(*) FROM ethics_schema.consentimiento
UNION ALL SELECT 'ethics_schema.evento_consentimiento', COUNT(*) FROM ethics_schema.evento_consentimiento;
```

Resultado esperado: 6, 6, 2, 4, 1, 3, 3, 3, 2, 2, 3 y 3 filas, en ese orden.

Para comprobar que los datos de estudio no contienen datos personales, esta consulta solo muestra códigos seudónimos:

```sql
SELECT codigo_seudonimo, es_menor_al_enrolar, estado FROM research_schema.participacion;
```

## Volver a empezar

Los scripts no borran nada antes de crear. Si ejecutas el `01` dos veces sobre la misma base, falla porque las tablas ya existen. Para repetir el proceso, borra la base y créala de nuevo:

```bash
psql -U postgres -c "DROP DATABASE IF EXISTS plagesetic_demo;"
```

Luego repite los pasos 1 a 3. Si otra conexión tiene la base abierta, ciérrala antes (por ejemplo, la pestaña de pgAdmin).

## Alcance y advertencias

- **Son datos ficticios.** Los campos `*_cifrado` contienen texto de ejemplo sin cifrar y los campos `hash_*` son valores de relleno. No uses estos scripts con datos reales de participantes.
- **No es la base del backend.** Esta base incluye 13 tablas del modelo. El backend necesita además las tablas de sesiones, permisos, membresías, auditoría, autorizaciones y otras del DER v3. Para ejecutar el backend, usa los scripts de `backend/db/init/` y los datos de `backend/db/dev/`, siguiendo el README de `backend/`.
- **Contraseñas.** Los valores de `hash_password` no son hashes reales: estos usuarios no pueden iniciar sesión.
