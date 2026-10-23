# plaGesEtic · Backend base

API de plaGesEtic (Observatorio UX / UXLab UTEM) en **Node.js + Express + PostgreSQL**, con Docker (ADR-001).
Esqueleto de la Actividad N.º 42 (miércoles 07/10/2026 · Benjamín Barrientos). Rama: `feature/backend-base`.

## Levantar el entorno

Requisitos: Docker Desktop (o Docker Engine con Compose).

```bash
cp .env.example .env          # y cambiar TODAS las contraseñas
docker compose up --build
curl http://localhost:3000/salud
# {"estado":"ok","base_datos":"ok","version":"0.1.0","fecha":"..."}
```

Esto crea dos contenedores: `db` (PostgreSQL 16, con hora de Chile) y `api` (Node 20). La API espera a que la base esté lista antes de arrancar.

La primera vez, PostgreSQL ejecuta en orden los scripts de `db/init/`:

| Script | Qué hace |
|---|---|
| `01_esquema_der_v3.sql` | 22 tablas en 4 esquemas (copia del script de la Actividad 41). |
| `02_restricciones_der_v3.sql` | NOT NULL, UNIQUE compuestos, CHECK, UUID automáticos y auditoría append-only. |
| `03_usuario_aplicacion.sh` | Crea el **usuario de la aplicación** (`DB_USER`): no es dueño de las tablas y no puede hacer UPDATE ni DELETE en `auditoria` ni en `evento_consentimiento`. |
| `04_roles_base.sql` | Los seis roles base. |
| `05_permisos_base.sql` | Permisos base de cada rol. |

Los scripts de `db/init/` corren **solo la primera vez**, con el volumen `pgdata` vacío. Para empezar de cero (borra los datos): `docker compose down -v`.

Si ya tienes PostgreSQL instalado en tu equipo, detenlo o cambia el puerto `5432` en `docker-compose.yml`, porque el contenedor usa el mismo.

Sin Docker: PostgreSQL local con los scripts anteriores (en orden), `npm install` y `npm start`, con `DB_HOST=localhost` en `.env`.

## Variables de entorno

Se definen en `.env` (nunca se sube al repositorio; el modelo es `.env.example`).

| Variable | Para qué sirve |
|---|---|
| `NODE_ENV`, `PORT` | Modo de ejecución y puerto de la API (3000 por defecto). |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Dueño del esquema. Solo las usa Docker para crear la base. |
| `DB_HOST`, `DB_PORT`, `DB_NAME` | Dónde está la base. Con Docker, el compose fija `DB_HOST=db`; sin Docker usa `localhost`. |
| `DB_USER`, `DB_PASSWORD` | Usuario de la aplicación, con el que se conecta el backend. Es restringido: no puede hacer UPDATE ni DELETE en `auditoria`. |
| `JWT_SECRET`, `JWT_EXPIRA_EN` | Firma y duración de la sesión. Genera un secreto propio: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. |
| `CLAVE_CIFRADO` | Clave de 32 bytes en base64 para cifrar datos personales. La API se niega a usar la de ejemplo con `NODE_ENV=production`. |

Si falta una variable obligatoria, la API falla al arrancar.

## Estructura

```
src/
  config/        variables de entorno (falla al arrancar si falta una obligatoria)
  db/            pool de conexiones con el usuario de la aplicación
  middlewares/   auditoria · autenticacion · controlAcceso · filtroPrivacidad · manejadorErrores
  routes/        salud (pública) · auth (pública, Act. 40) · protegidas (Act. 45 en adelante)
  controllers/   reciben la solicitud y responden
  services/      reglas de negocio
  repositories/  únicas capas que escriben SQL
  utils/         errores con formato común
db/init/         scripts de la base que Docker ejecuta la primera vez
test/            pruebas (npm test)
```

## Cadena de middlewares (Middlewares v3)

```
/salud ─────────────────────────────────────────────── pública, sin auditoría
auditoría ─ se arma al entrar, se inserta al terminar (también 401 y 403)
  /auth/* ──────────────────────────────────────────── pública (login y MFA, Act. 40)
  autenticación ─ JWT + sesion_usuario vigente + cuenta activa ───► 401
  filtro de datos personales ─ envuelve res.json (actúa sobre la salida)
  rutas protegidas ─ controlAcceso por ruta ──────────────────────► 403
                     └─ controlador → servicio → repositorio
```

Los middlewares están implementados y cubiertos por `test/seguridad.test.js` (401, 403, auditoría, privacidad y bitácora de solo lectura). Los errores pasan por `manejadorErrores`, que les da formato común sin detalles internos.

## Cómo proteger una ruta nueva

En `src/routes/protegidas.js`:

```js
router.get('/estudios/:idEstudio',
  marcarAuditoria('estudio', 'leer'),
  requierePermiso({ recurso: 'estudio', accion: 'leer', permisoEstudio: 'puede_consultar' }),
  estudiosController.obtener);
```

Pasos:

1. Monta el router **en `src/routes/protegidas.js`**, nunca en `index.js`: lo que se monta ahí hereda auditoría, autenticación y filtro de privacidad. Lo que se monte en `index.js` antes de `autenticacion` queda público.
2. En cada ruta, encadena `marcarAuditoria(recurso, accion)` y luego `requierePermiso({ recurso, accion })` antes del controlador. Agrega `permisoEstudio` si la ruta pertenece a un estudio (`:idEstudio`): además exige que el usuario tenga membresía en ese estudio con ese permiso.
3. El `recurso` + `accion` debe existir en la tabla de permisos y estar asignado al rol (permisos base en `db/init/05_permisos_base.sql`). Si no existe, la ruta responde 403 a todos.
4. Lanza los errores con `new ErrorApi(status, 'CODIGO', 'Mensaje')` y `next(...)`, para que salgan con el formato común.
5. Agrega pruebas siguiendo `test/seguridad.test.js`: 401 sin token, 403 sin permiso, 403 sin membresía y fila de auditoría en éxito y en rechazo.

## Errores

Todas las respuestas de error usan el mismo formato, sin detalles internos:

```json
{ "error": { "codigo": "SIN_PERMISO", "mensaje": "No tienes permiso para esta acción." } }
```

Códigos: `SOLICITUD_INVALIDA` 400 · `NO_AUTENTICADO` 401 · `SIN_PERMISO` 403 · `NO_ENCONTRADO` 404 · `CONFLICTO` 409 · `TIPO_NO_PERMITIDO` 415 · `ERROR_INTERNO` 500 · `SERVICIO_NO_DISPONIBLE` 503.

## Probar a mano (visual, solo desarrollo)

Mientras no esté integrado el login de la Actividad 40, se prueba con una **sesión de prueba**.

1. Instala en Visual Studio Code la extensión **REST Client** (autor: Huachao Mao).
2. Levanta todo: `docker compose up --build` (en otra terminal sigue con los pasos).
3. Carga los datos de prueba (usuarios, estudios, protocolos, documentos de consentimiento, membresías y una autorización especial de los datos sintéticos):
   ```bash
   docker compose exec -T db psql -U plagesetic_owner -d plagesetic < db/dev/datos_prueba.sql
   ```
   (Sin Docker: ejecuta `db/dev/datos_prueba.sql` en pgAdmin sobre la base `plagesetic`.)
   En Windows, si los textos con tilde se ven rotos (por ejemplo «EstrÃ©s»), carga el script con `PGCLIENTENCODING=UTF8` delante del comando `psql`.
4. Pide un token por usuario y cópialo:
   ```bash
   docker compose exec api node scripts/sesion-prueba.js test_investigador@uxlab.test
   docker compose exec api node scripts/sesion-prueba.js test_estudiante@uxlab.test
   docker compose exec api node scripts/sesion-prueba.js test_director@uxlab.test
   docker compose exec api node scripts/sesion-prueba.js test_asistente@uxlab.test
   ```
   (Sin Docker: `node scripts/sesion-prueba.js <correo>` desde la carpeta `backend`.)
5. Abre `pruebas/estudios.http`, luego `pruebas/identidades.http` y `pruebas/participaciones.http`, pega los tokens arriba y haz clic en **Send Request** sobre cada prueba.
   La respuesta (código y JSON) se abre al lado. Cada prueba dice qué resultado esperar.
6. Consentimientos (Actividad 55): `pruebas/consentimientos.http` recorre los casos CP-14 a CP-25 **en orden**
   (también necesita el token de `test_director` para revisar la auditoría). Sube los PDF ficticios de
   `pruebas/archivos/` como formularios multipart; las reglas que prueba están en el ADR-002 (D9 a D11).
7. Seudonimización (Actividad 56): `pruebas/seudonimizacion.http` recorre los casos CP-26 a CP-37 **en orden**
   (contacto del participante, desenmascarar, auditoría y códigos). Usa los tokens de los cuatro usuarios y la
   autorización `ver_identidad` de la Asistente que traen los datos de prueba. Las reglas están en el ADR-002 (D12 a D15).
   Si tu base se creó antes del 20/10, ejecuta una vez la actualización de permisos:
   ```bash
   docker compose exec -T db psql -U plagesetic_owner -d plagesetic < db/actualizaciones/act56_permisos_identidad.sql
   ```

### Ingresar al sistema con el login real (Actividad 46)

`sesion-prueba.js` sigue sirviendo como atajo, pero el ingreso de verdad ya funciona en dos pasos:

1. Después de cargar `datos_prueba.sql`, da contraseña y segundo factor a los usuarios de prueba:
   ```bash
   docker compose exec api node scripts/usuarios-prueba.js
   ```
   Todos quedan con la contraseña **`Plagesetic.2026`**. El script imprime, por usuario, el secreto TOTP
   (se puede escribir a mano en Google Authenticator) y 3 códigos de recuperación de un solo uso.
   Hay que correrlo de nuevo cada vez que se recarga `datos_prueba.sql`.
2. Para no usar el celular, el código de 6 dígitos del momento se obtiene con:
   ```bash
   docker compose exec api node scripts/codigo-totp.js test_investigador@uxlab.test
   ```
3. Abre `pruebas/auth.http` y sigue los pasos en orden.

| Ruta | Qué hace |
|---|---|
| `POST /auth/login` | correo + contraseña → `token_temporal` (5 min, **no** es una sesión) |
| `POST /auth/login/mfa` | `token_temporal` + `codigo` (6 dígitos) **o** `codigo_recuperacion` → `token` de sesión |
| `POST /auth/logout` | cierra la sesión (con `Authorization: Bearer`) |
| `POST /auth/password` | cambia la contraseña (mínimo 12 caracteres) y quita `debe_cambiar_password` |

Reglas: errores de correo, contraseña o cuenta inactiva responden igual (`CREDENCIALES_INVALIDAS`);
5 intentos fallidos en 15 minutos bloquean ese correo o usuario (`DEMASIADOS_INTENTOS`, 429);
más de 20 pedidos por minuto desde una IP también dan 429; la sesión vence a los **30 minutos sin uso**
y nunca dura más de **8 horas**. Fuera del Alfa (Actividad 74): QR para enrolar MFA, regenerar códigos y recuperar contraseña.

Volver a cargar `datos_prueba.sql` deja la base como al inicio: también borra las personas, participaciones, consentimientos y eventos creados al probar (los archivos subidos quedan en el volumen `almacenamiento`).

**Demo en el navegador (Act. 46):** hay una página de demostración del ingreso en dos pasos que usa este backend real (con «celular simulado» y panel de pedidos a la API). **No forma parte del repositorio**: se entrega aparte (`Demo_Login_Act46.zip`, con su `LEEME`) y se corre en el puerto 8080 con la API levantada con Docker y los usuarios de prueba cargados (pasos 1 y 2 de arriba).

**Datos personales:** se cifran con la clave `CLAVE_CIFRADO` del `.env`. El valor de `.env.example` sirve solo para desarrollo; la API se niega a usarlo en producción.

`db/dev/`, `scripts/sesion-prueba.js`, `scripts/usuarios-prueba.js` y `scripts/codigo-totp.js` son **solo para desarrollo**: se niegan a correr en producción.

## Pruebas

```bash
npm test
```

Corre con una base de datos simulada, así que no necesita PostgreSQL. Cubre 401 (sin token, token inválido y sesión cerrada), 403 (sin permiso y sin membresía), fila de auditoría en éxito y en rechazo, respuestas sin datos personales y bitácora de solo lectura.

Para incluir la prueba contra PostgreSQL real (comprueba que UPDATE y DELETE sobre `auditoria` fallan), con la base levantada y el `.env` apuntando a ella:

```bash
TEST_BD_REAL=1 node --env-file=.env --test
```

Esa prueba inserta una fila en `auditoria` que no se puede borrar, así que úsala en una base de desarrollo.

## Pendiente (fuera de este esqueleto)

| Qué | Quién · cuándo |
|---|---|
| ~~Completar los 4 middlewares~~ | Benjamín Arias · listo |
| ~~Login, MFA (TOTP) y sesiones en `routes/auth.js`~~ | Actividad 46 · listo el 11/10 |
| Ruta de contacto del participante `POST /participaciones/{id}/contacto` (ADR-002 D8) | Por asignar |
| Enrolar MFA con QR, regenerar códigos, recuperar contraseña | Actividad 74 |
| ~~`GET /auditoria` (solo Director, con filtros)~~ | Benjamín Arias · listo |
| ~~Pruebas automatizadas de 401, 403, auditoría y filtro~~ | Benjamín Arias · listo |
| ~~Rutas de estudios, identidades y participaciones~~ | Actividad 45 · listas el 10/10 |