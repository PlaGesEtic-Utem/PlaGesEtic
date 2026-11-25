# Interfaz de plaGesEtic

Prototipo navegable conectado a la API real. Solo para desarrollo.

## Archivos

- `prototipo.html`: pantallas del prototipo.
- `flujo-real.js`: conecta las pantallas con la API.
- `demo-flujo.js`: servidor local que muestra el prototipo y reenvía los pedidos `/api` a la API.
- `consentimiento-integracion.js`: flujo de alta y validación del consentimiento.
- `test/consentimiento-integracion.test.js`: pruebas del flujo de alta.
- `actividad58-eventos.js`: validaciones para retiro, reconsentimiento, contacto y desenmascaramiento.
- `test/actividad58-eventos.test.js`: pruebas automáticas de estos casos.
- `qrcode.js`: librería para dibujar el código QR del segundo factor (licencia MIT, Kazuhiko Arase).

## Preparar el entorno de desarrollo

Requisitos: Node.js 20 o superior y Docker con Compose para el backend. El servidor del frontend usa módulos incluidos en Node.js; no requiere instalar paquetes.

1. En `backend/`, copiar `.env.example` como `.env` y configurar sus valores siguiendo el [README del backend](../backend/README.md). No subir `.env` a GitHub.
2. Desde `backend/`, iniciar los servicios:

   ```sh
   docker compose up --build -d
   ```

3. Si la base de desarrollo todavía no tiene datos de prueba, cargar `backend/db/dev/datos_prueba.sql` según el README del backend. No recargarlo sobre una base con información que se necesite conservar.
4. Desde `backend/`, preparar las credenciales de los usuarios de prueba:

   ```sh
   docker compose exec api node scripts/usuarios-prueba.js
   ```

   El script requiere los usuarios de prueba existentes y modifica sus credenciales y códigos de recuperación. Ejecutarlo al preparar o restablecer el entorno de prueba; no en producción. La salida muestra los datos para ingresar.
5. Desde `frontend/`, iniciar la interfaz:

   ```sh
   node demo-flujo.js
   ```

6. Abrir `http://localhost:8080`. Ingresar con una cuenta `@uxlab.test` habilitada para MFA. El código aparece en el celular simulado; también se puede usar el autenticador configurado para esa cuenta.

Abrir `prototipo.html` directamente no carga la integración con la API. Utilizar el servidor anterior.

| Variable del servidor frontend | Valor predeterminado | Uso |
|---|---|---|
| `PUERTO_DEMO` | `8080` | Puerto de la interfaz |
| `API` | `http://localhost:3000` | Dirección del backend |
| `HOST` | `127.0.0.1` | Dirección local de escucha |

El servidor reenvía `/api` al backend. El indicador comprueba la disponibilidad al iniciar; no realiza monitoreo continuo. El servidor de demostración rechaza `NODE_ENV=production`.

## Qué pantallas usan la API

| Pantalla | Estado |
|---|---|
| Ingreso, panel, mis estudios, participantes, alta de participante | Conectadas |
| Alta B4, ficha, retiro, reconsentimiento, contacto y desenmascarar | Conectadas; validar con API y BD de desarrollo |
| Sesiones, archivos, exportación, administración | Pendientes |
## Actividad 58 · jueves 29/10

Desde una ficha de consentimiento hay botones para **Registrar retiro**, **Reconsentir (nueva versión)**, **Datos de contacto** y **Desenmascarar (acceso excepcional)**.

- **Retiro**: sobre consentimiento otorgado o pendiente de nueva versión; puede llevar evidencia opcional. Usa `POST /consentimientos/:id/eventos`; actualiza ficha y lista C3.
- **Reconsentimiento**: requiere una versión vigente distinta de la ya registrada y evidencia firmada PDF/JPEG/PNG (máx. 10 MB). Una identidad retirada no se reconsiente.
- **Contacto**: requiere motivo (`coordinar_sesion`, `retiro`, `otro` con detalle). Solo expone seudónimo, nombre, correo y teléfono cuando la API autoriza.
- **Desenmascaramiento**: requiere UX Lab ID, estudio y justificación de mínimo 20 caracteres; solo se concede con autorización real del backend.
- **D21**: los campos de motivo/justificación avisan no incluir nombres ni RUT; los datos sensibles se eliminan al salir, sin persistir en storage.
- **Backend**: se incorpora `GET /participaciones/:idParticipacion/consentimientos/identificador` para recuperar únicamente el UUID opaco del consentimiento, usando el mismo control de acceso de lectura de la ficha.

Pruebas desde la raíz del repositorio: `node --test frontend/test/*.test.js`. También ejecutar `npm test` dentro de `backend/`.

**Solo para desarrollo**: los códigos QR, usuarios y documentos de prueba no deben usarse con datos reales.

## Actividad 73 · Textos y mensajes

Referencia de revisión: rama `develop`, commit `b8fef3ebd83828d2c1b87e18c753a403ad28c188`.

- El ingreso distingue credenciales incorrectas, MFA pendiente, exceso de intentos y fallos de conexión o servicio.
- Las confirmaciones de retiro y reconsentimiento describen la acción realizada.
- La salida de la interfaz no asegura que el servidor haya invalidado el token: la solicitud de cierre no comprueba su respuesta. Esta limitación requiere revisión funcional.
- El estado de una cuenta se muestra como «Activa», sin confundirlo con una conexión en curso.
- Las pantallas pendientes de integración conservan comportamientos de prototipo; sus mensajes no acreditan operaciones reales del backend.

### Verificación

Desde la raíz del repositorio:

```sh
node --test frontend/test/*.test.js
node --check frontend/flujo-real.js
```

Además, verificar en el entorno de desarrollo: ingreso válido, contraseña incorrecta, servidor no disponible, segundo factor, retiro y reconsentimiento. Las pruebas de módulos no sustituyen estas comprobaciones en navegador con API y base de datos.

### Pendientes de la actividad

- Validar los mensajes en navegador con el equipo y registrar evidencias.
- Completar y comprobar los flujos que aún usan datos de ejemplo.
- Agregar usuarios y membresías al catálogo de endpoints, contrastando rutas, permisos y respuestas con el backend (tarea del martes 10).

Esta actualización cubre textos y README; no declara cerrada toda la Actividad 73.
