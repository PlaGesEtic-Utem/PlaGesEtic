# Guía de API: registro de participantes y estudios

**Proyecto:** plaGesEtic · UXLab UTEM  
**Actividad:** 45 — Implementación base de registro de participantes y estudios  
**Responsable documental:** Catalina Araniz  
**Versión:** 1.0 
**Estado:** Guía contrastada con `feature/backend-base`; incluye resultados de pruebas registrados y pasos para repetirlas.

## 1. Objetivo y alcance

Documentar las rutas disponibles para crear y gestionar estudios, buscar y registrar identidades, e inscribir y consultar participaciones. Los ejemplos de esta guía son ilustrativos; las respuestas dinámicas, como UX Lab ID y código seudónimo, cambian en cada ejecución.

Incluye las rutas implementadas en la rama `feature/backend-base`. No incluye consentimiento, asentimiento, desenmascaramiento de identidades ni pantallas de frontend.

## 2. Fuente y forma de verificación

La revisión se hizo contra la rama `feature/backend-base`, commit `9138804b0fccdbec19af3e171523bf5cee621fa3`, y contra `backend/README.md` y los archivos `backend/pruebas/*.http` de esa rama. El prefijo local es `http://localhost:3000`; las rutas no llevan `/api/v1` en el código revisado.

La evidencia registrada en Drive por Benjamín Barrientos para la Actividad 45 consigna: estudios, 32/32 casos correctos contra PostgreSQL; identidades, 14/14 casos y cero datos personales en texto claro en la base; participaciones, 43/43 casos, además de 15/15 pruebas automáticas al implementar ese módulo. Esta guía no presenta esas ejecuciones como realizadas por la responsable documental.

Como comprobación adicional de esta revisión, se ejecutó `npm test` en el commit indicado: 32 pruebas pasaron y una prueba quedó omitida porque requiere PostgreSQL real (`TEST_BD_REAL=1`). Esa suite utiliza base simulada en sus pruebas automatizadas y no sustituye la comprobación manual de rutas contra PostgreSQL.

## 3. Acceso, auditoría y privacidad

Las rutas protegidas reciben la sesión en `Authorization: Bearer <token>`. En el flujo normal, `POST /auth/login` devuelve un token temporal y `POST /auth/login/mfa` entrega el token de sesión tras validar el segundo factor. El README del backend y `backend/pruebas/auth.http` describen cómo generar usuarios sintéticos y probar el login.

Cadena general: middleware de auditoría → autenticación y sesión vigente → filtro de privacidad de salida → permiso de la ruta → controlador/servicio/repositorio. Las rutas de identidades permiten explícitamente que salgan únicamente los campos `ux_lab_id` y `ux_lab_ids` necesarios para continuar el registro. Las respuestas de participaciones no incluyen el UX Lab ID ni `id_participante`.

Los datos personales de identidad se cifran con AES-256-GCM. El código calcula huellas HMAC-SHA-256 para las búsquedas por RUT o correo. La respuesta de la API no devuelve nombre, RUT, correo, teléfono ni fecha de nacimiento.

Formato común de error:

```json
{
  "error": {
    "codigo": "SIN_PERMISO",
    "mensaje": "No tienes permiso para esta acción."
  }
}
