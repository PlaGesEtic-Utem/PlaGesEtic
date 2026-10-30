# Interfaz de plaGesEtic

Prototipo navegable conectado a la API real. Solo para desarrollo.

## Archivos

- `prototipo.html`: pantallas del prototipo.
- `flujo-real.js`: conecta las pantallas con la API.
- `demo-flujo.js`: servidor local que muestra el prototipo y reenvía los pedidos `/api` a la API.
- `actividad58-eventos.js`: validaciones para retiro, reconsentimiento, contacto y desenmascaramiento.
- `test/actividad58-eventos.test.js`: pruebas automáticas de estos casos.
- `qrcode.js`: librería para dibujar el código QR del segundo factor (licencia MIT, Kazuhiko Arase).

## Cómo levantarla

1. Levantar la API y la base de datos. En `backend/`:
   `docker compose up -d`
2. Crear los usuarios de prueba (solo la primera vez). En `backend/`:
   `node scripts/usuarios-prueba.js`
3. Levantar la interfaz. En `frontend/`:
   `node demo-flujo.js`
4. Abrir http://localhost:8080 e ingresar con un usuario `@uxlab.test`.
   El código de 6 dígitos aparece en el celular simulado, abajo a la derecha.

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
