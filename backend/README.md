# plaGesEtic · Backend base

API de plaGesEtic (Observatorio UX / UXLab UTEM) en **Node.js + Express + PostgreSQL**, con Docker (ADR-001).
Esqueleto de la Actividad N.º 42 (miércoles 07/10/2026 · Benjamín Barrientos). Rama: `feature/backend-base`.

## Levantar el entorno

```bash
cp .env.example .env          # y cambiar TODAS las contraseñas
docker compose up --build
curl http://localhost:3000/salud
# {"estado":"ok","base_datos":"ok","version":"0.1.0","fecha":"..."}
```

La primera vez, PostgreSQL ejecuta en orden los scripts de `db/init/`:

| Script | Qué hace |
|---|---|
| `01_esquema_der_v3.sql` | 22 tablas en 4 esquemas (copia del script de la Actividad 41). |
| `02_restricciones_der_v3.sql` | NOT NULL, UNIQUE compuestos, CHECK, UUID automáticos y auditoría append-only. |
| `03_usuario_aplicacion.sh` | Crea el **usuario de la aplicación** (`DB_USER`): no es dueño de las tablas y no puede hacer UPDATE ni DELETE en `auditoria` ni en `evento_consentimiento`. |
| `04_roles_base.sql` | Los seis roles base. |

Para empezar de cero (borra los datos): `docker compose down -v`.

Sin Docker: PostgreSQL local con los scripts anteriores, `npm install` y `npm start`, con `DB_HOST=localhost` en `.env`.

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

Los cuatro middlewares tienen su **entrada y salida definidas** en el comentario de cada archivo y hoy dejan pasar todo.
Los completa Benjamín Arias el jueves 08/10, con la especificación de auditoría y filtro de Felipe Cruz (07/10).

## Cómo proteger una ruta nueva

En `src/routes/protegidas.js`:

```js
router.get('/estudios/:idEstudio',
  marcarAuditoria('estudio', 'leer'),
  requierePermiso({ recurso: 'estudio', accion: 'leer', permisoEstudio: 'puede_consultar' }),
  estudiosController.obtener);
```

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
3. Carga los datos de prueba (usuarios, estudios, protocolos y membresías de los datos sintéticos):
   ```bash
   docker compose exec -T db psql -U plagesetic_owner -d plagesetic < db/dev/datos_prueba.sql
   ```
   (Sin Docker: ejecuta `db/dev/datos_prueba.sql` en pgAdmin sobre la base `plagesetic`.)
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

Volver a cargar `datos_prueba.sql` deja la base como al inicio: también borra las personas y participaciones creadas al probar.

**Datos personales:** se cifran con la clave `CLAVE_CIFRADO` del `.env`. El valor de `.env.example` sirve solo para desarrollo; la API se niega a usarlo en producción.

`db/dev/` y `scripts/sesion-prueba.js` son **solo para desarrollo**: no se usan en producción.

## Pruebas

```bash
npm test
```

## Pendiente (fuera de este esqueleto)

| Qué | Quién · cuándo |
|---|---|
| Completar los 4 middlewares | Benjamín Arias · 08/10 |
| Integrar login, MFA y JWT de la Actividad 40 en `routes/auth.js` | Benjamín Arias · 08/10 |
| `GET /auditoria` (solo Director, con filtros) | Benjamín Arias · 10/10 |
| Pruebas automatizadas de 401, 403, auditoría y filtro | Benjamín Arias · 11/10 |
| ~~Rutas de estudios, identidades y participaciones~~ | Actividad 45 · listas el 10/10 |
