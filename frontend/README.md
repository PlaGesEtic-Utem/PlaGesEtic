# Interfaz de plaGesEtic

Prototipo navegable conectado a la API real. Solo para desarrollo.

## Archivos

- `prototipo.html`: pantallas del prototipo.
- `flujo-real.js`: conecta las pantallas con la API.
- `demo-flujo.js`: servidor local que muestra el prototipo y reenvía los pedidos `/api` a la API.
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
| Crear y activar estudio, consentimientos, contacto, desenmascarar | Actividad 58 (en curso) |
| Sesiones, archivos, exportación, administración | Pendientes |