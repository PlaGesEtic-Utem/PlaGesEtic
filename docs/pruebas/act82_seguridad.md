# Actividad 82 · Pruebas básicas de seguridad y privacidad

**Proyecto:** PlaGesEtic · UX Lab UTEM  
**Fechas planificadas:** 18 y 19 de noviembre de 2026  
**Responsable de las pruebas:** Felipe Cruz  
**Documentación:** Catalina Araniz  
**Rama de referencia:** `develop`

## Resumen para el Informe de Avance N.º 4

La Actividad 82 contempla 18 pruebas para verificar los controles de acceso, permisos por rol, validación de archivos y protección de datos personales del MVP. El plan indica que deben ejecutarse en un entorno local con cuentas y datos de prueba.

Al 24 de noviembre de 2026, este informe recoge los resultados esperados del plan. Está pendiente incorporar los resultados observados y sus evidencias. Por ese motivo, todavía no se informa una tasa de aprobación ni se da por cerrada la actividad.

## Registro de pruebas

«Pendiente» significa que el resultado aún no se ha verificado en este informe. No significa que la prueba haya fallado. Para completar cada fila, registrar el código o mensaje observado y enlazar la captura o el archivo de evidencia, sin exponer credenciales ni datos personales.

| ID | Caso | Resultado esperado | Responsable | Resultado obtenido | Estado | Evidencia |
|---|---|---|---|---|---|---|
| S-01 | Primer ingreso | El panel se habilita solo después de cambiar la contraseña y activar MFA. | Felipe Cruz | — | Pendiente | — |
| S-02 | Nueva contraseña igual al correo | Se rechaza con código 400. | Felipe Cruz | — | Pendiente | — |
| S-03 | Cuenta con dominio de correo no permitido | Se rechaza con código 400 y se indican los dominios permitidos. | Felipe Cruz | — | Pendiente | — |
| S-04 | Cinco errores consecutivos en MFA | Se aplica un bloqueo temporal y se rechaza el sexto intento aunque el código sea correcto. | Felipe Cruz | — | Pendiente | — |
| S-05 | Reutilización de un código de recuperación | El primer uso permite ingresar; el segundo se rechaza. | Felipe Cruz | — | Pendiente | — |
| S-06 | Bloqueo y desbloqueo por Soporte | La cuenta bloqueada no puede ingresar y recupera el acceso tras el desbloqueo. | Felipe Cruz | — | Pendiente | — |
| S-07 | Cuenta de Invitado vencida | Se rechaza el ingreso. | Felipe Cruz | — | Pendiente | — |
| S-08 | Creación de un estudio desde el perfil Estudiante | Se deniega la acción con código 403. | Felipe Cruz | — | Pendiente | — |
| S-09 | Token de sesión alterado | Se rechaza con código 401. | Benjamín Arias | — | Pendiente | — |
| S-10 | Token de sesión vencido | Se rechaza con código 401. | Benjamín Arias | — | Pendiente | — |
| S-11 | Acceso de Estudiante a un estudio sin membresía | Se deniega el acceso con código 403. | Benjamín Arias | — | Pendiente | — |
| S-12 | Archivo que no es PDF presentado como evidencia | Se rechaza con código 400 aunque la extensión sea `.pdf`. | Benjamín Arias | — | Pendiente | — |
| S-13 | PDF de más de 10 MB | Se rechaza con código 413 o 400. | Benjamín Arias | — | Pendiente | — |
| S-14 | Entrada no válida en la búsqueda de estudios | No se devuelven resultados adicionales ni se produce un error 500. | Benjamín Arias | — | Pendiente | — |
| S-15 | Intentos fallidos consecutivos de inicio de sesión | Se bloquea el sexto intento. | Benjamín Arias | — | Pendiente | — |
| S-16 | Cabeceras de seguridad de la API | Las respuestas incluyen las protecciones previstas: `nosniff`, `DENY`, `no-referrer` y CSP. | Felipe Cruz | — | Pendiente | — |
| S-17 | Solicitud desde un origen no permitido | La respuesta no incluye la cabecera `Access-Control-Allow-Origin`. | Felipe Cruz | — | Pendiente | — |
| S-18 | Privacidad en las respuestas ordinarias | En estudios, participantes, consentimientos y exportaciones no se exponen RUT, nombre, correo ni teléfono. | Felipe Cruz | — | Pendiente | — |

## Verificaciones complementarias

| Verificación | Responsable | Resultado y evidencia |
|---|---|---|
| Auditoría de dependencias con `npm audit` | Benjamín Arias | Pendiente. Registrar si hay alertas altas o críticas e indicar su tratamiento. |
| Integridad de auditoría con `verificar-auditoria.js` | Benjamín Barrientos | Pendiente. Adjuntar el resultado posterior a las pruebas. |
| Integridad de vínculos con `verificar-vinculos.js` | Benjamín Barrientos | Pendiente. Adjuntar el resultado posterior a las pruebas. |
| Revisión de `.env` y posibles claves en el historial | Benjamín Barrientos | Pendiente. Documentar la conclusión sin copiar claves ni contraseñas. |

## Criterio de cierre

La actividad queda lista para cierre cuando los 18 casos tengan resultado y evidencia, se documenten las verificaciones complementarias y cada falla confirmada tenga una referencia en el registro de correcciones de la Actividad 80.

**Fuente:** [Plan de la Actividad 82 en Drive](https://drive.google.com/open?id=1LEC1gKSupw37_EoNMwkwuZoo91nuvHJo).
