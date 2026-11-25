# Controles de seguridad — Actividad 74

## Seguimiento al 17 de noviembre de 2026

**Estado: implementación integrada en `develop`; validación final pendiente.** Corte revisado: `8c48b13`. Esta actualización distingue el estado informado en el Hito 3, el código integrado después y las pruebas de las que se dispone. Las secciones 1 a 6 conservan la revisión inicial; para los pendientes actuales prevalece este seguimiento.

### Contraste con la tabla 7.15

Fuente: [Informe Hito 3, tabla 7.15, corte 04-11-2026](https://docs.google.com/document/d/1bMrvbz5O3hczClvIHnFDmCvxxdDi_20s/edit). De los 18 criterios, el informe registraba 15 como «Cumple», dos como «Parcial» y uno como «Pendiente».

| Criterios | Estado del Hito 3 | Lectura al revisar la actividad 74 |
|---|---|---|
| CA-01 a CA-07, CA-09 a CA-11, CA-13 a CA-16 y CA-18 | Cumple | Conservar como resultado histórico. Las nuevas pruebas de contraseña y MFA amplían la cobertura, pero no constituyen una repetición de los 15 criterios. |
| CA-08 | Parcial | El informe señalaba datos del prototipo en los paneles de Director y Soporte. Las pruebas de seguridad revisadas no validan esos paneles. |
| CA-12 | Parcial | El informe acreditaba la validación del permiso, pero dejaba pendiente el flujo para solicitar y aprobar autorizaciones. La Act. 74 no aporta aquí evidencia para reclasificarlo. |
| CA-17 | Pendiente | El enrolamiento está conectado en frontend y backend. Falta acreditar en navegador el recorrido completo de una cuenta nueva: QR, confirmación, diez códigos de recuperación, cambio obligatorio de contraseña y llegada al panel. |

### Qué cambió y qué falta verificar

| Control | Evidencia incorporada en GitHub | Pendiente actual |
|---|---|---|
| Contraseña | [PR #42](https://github.com/PlaGesEtic-Utem/PlaGesEtic/pull/42): el cambio de contraseña ya compara la nueva clave con el correo. La prueba automática de la Act. 74 comprueba el rechazo de una clave de ocho caracteres con HTTP 400. | Registrar resultados específicos para clave igual al correo y cambio válido. La prueba de clave corta no cubre esos casos. |
| MFA | [PR #39](https://github.com/PlaGesEtic-Utem/PlaGesEtic/pull/39) y [PR #41](https://github.com/PlaGesEtic-Utem/PlaGesEtic/pull/41): cambios de interfaz y seguridad integrados. La prueba de confirmación con código inválido exige 401, sin activación ni emisión de códigos de recuperación. | Evidencia del primer ingreso completo para CA-17. |
| Cabeceras | [Pruebas integradas en el PR #40](https://github.com/PlaGesEtic-Utem/PlaGesEtic/pull/40): comprueban las cuatro cabeceras y la ausencia de X-Powered-By en respuestas 200 y 404. | Conservar la evidencia de ejecución vinculada a la versión probada. |
| CORS | El mismo archivo de pruebas comprueba que solo el origen configurado recibe la cabecera de acceso. | Revalidar O-01 en el entorno desplegado, incluyendo la petición OPTIONS. |
| Dependencias | S-09/H-25 registró un aviso de severidad alta en adm-zip y una aceptación de riesgo. | Adjuntar auditoría actualizada o documentar la decisión del líder frente al criterio de cero avisos altos o críticos. |
| Regresión | [Informe de Arias](../pruebas/act75_avances_arias.md): 151 pruebas de backend, 149 aprobadas, 0 fallidas, 1 omitida y 1 TODO. | Es un resultado global reportado por el equipo, no una prueba del navegador ni una auditoría de dependencias. |

**Resultado documental:** cotejo completado. El documento original ya se integró mediante el PR #38. Esta revisión no ejecutó pruebas nuevas ni cambia el estado del informe histórico. Para cerrar la actividad, incorporar la evidencia pendiente y la decisión sobre H-25.

---

## Revisión inicial (registro histórico)

## 1. Alcance y fuentes

Revisión documental de la rama `feature/act74-seguridad`, commit `e8f96f21b9aafc5dba7c85bc0061140f2afe8772`.

Este documento describe los controles encontrados, su relación con los criterios de aceptación y las comprobaciones pendientes. No acredita integración en `develop` ni cierre de la actividad.

Fuentes:

- [Plan de la Actividad 74 v1.2](https://drive.google.com/file/d/1vALHmobRjxsjdyc-Goy8LKdCJAcNPPCv/view).
- [Criterios de aceptación v2: CA-01 a CA-18](https://drive.google.com/file/d/1M5xgfnfO9tKN4PzDeTlUQhaH5X-a1uVZ/view).
- [Informe Hito 3](https://docs.google.com/document/d/1bMrvbz5O3hczClvIHnFDmCvxxdDi_20s/edit), tabla 7.15. Cotejo posterior disponible al inicio de este documento.
- Resultados de Felipe en `docs/pruebas/act74_casos_prueba.csv`, disponibles en la rama revisada.
- Hallazgos en `docs/pruebas/act74_hallazgos.md`, disponibles en la rama revisada.

Los resultados existentes se citan como pruebas reportadas por el equipo. No fueron ejecutados nuevamente durante esta revisión documental.

## 2. Controles de seguridad

### 2.1. Cabeceras HTTP

**Propósito:** establecer restricciones de seguridad para el navegador y evitar revelar la tecnología del servidor.

**Archivos:**

- `backend/src/middlewares/seguridad.js`
- `backend/src/app.js`

**Comportamiento observado:**

- `X-Content-Type-Options: nosniff`.
- `X-Frame-Options: DENY`.
- `Referrer-Policy: no-referrer`.
- `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`.
- Desactivación de `X-Powered-By`.

**Cómo se comprueba:**

Consultar `/salud` y una ruta protegida sin sesión. Verificar las cuatro cabeceras y la ausencia de `X-Powered-By`, incluso cuando la respuesta sea un error de autenticación.

**Estado:** implementado en la rama. S-01 y S-02 están reportados como OK. Confirmar también la ausencia de `X-Powered-By`.

### 2.2. Orígenes permitidos — CORS

**Propósito:** permitir que el navegador lea respuestas desde el origen del frontend configurado.

**Archivos:**

- `backend/src/middlewares/seguridad.js`
- `backend/src/config/index.js`
- `backend/src/server.js`
- `backend/.env.example`

**Comportamiento observado:**

- Compara `Origin` con `ORIGEN_PERMITIDO`.
- Si coinciden, agrega `Access-Control-Allow-Origin`.
- Declara métodos y cabeceras permitidos.
- Las solicitudes `OPTIONS` responden 204.
- Si el origen no coincide, omite las cabeceras CORS y continúa; no devuelve necesariamente 403.

**Cómo se comprueba:**

1. Configurar el origen exacto del frontend y reiniciar el servidor.
2. Consultar desde ese origen y verificar `Access-Control-Allow-Origin`.
3. Repetir desde otro origen y comprobar que no recibe esa cabecera.
4. Probar una solicitud previa `OPTIONS` con `Authorization` y `Content-Type`.

**Estado:** implementado en la rama. S-03 está reportado como OK. S-04 mantiene la observación O-01 porque no se obtuvo la cabecera para el origen considerado permitido.

CORS no sustituye la autenticación ni impide por sí solo solicitudes desde clientes como curl. Abrir el frontend mediante `file://` tampoco elimina las restricciones del navegador; puede producir `Origin: null`.

### 2.3. Política de contraseña

**Propósito:** exigir contraseñas que cumplan la regla de la Actividad 74.

**Archivos:**

- `backend/src/services/authService.js`
- `backend/src/services/usuariosService.js`

**Regla requerida:**

- Mínimo 12 caracteres.
- Distinta del correo.
- Aplicación en cambio de contraseña y creación de usuarios.

**Comportamiento observado:**

- El cambio exige mínimo 12 caracteres.
- Rechaza una contraseña nueva idéntica a la actual.
- Comprueba la contraseña actual.
- Guarda la nueva contraseña mediante Argon2id.
- El alta y restablecimiento generan una contraseña temporal de 14 caracteres.
- No se encontró una comparación explícita de la nueva contraseña con el correo.

**Cómo se comprueba:**

Con sesión válida y contraseña actual correcta, probar una nueva contraseña:

1. De 8 caracteres: debe rechazarse con 400.
2. Igual a la actual: debe rechazarse.
3. Igual al correo: debe rechazarse conforme al requisito.
4. Válida y distinta: debe permitir el cambio.

Revisar también la generación de contraseñas en alta y restablecimiento.

**Estado:** parcial. Falta completar la comparación con el correo y acreditar las pruebas correspondientes.

S-05 prueba una contraseña corta en `/auth/login`; no valida la regla de cambio en `/auth/password`.

### 2.4. Enrolamiento del segundo factor — MFA

**Propósito:** permitir que una cuenta nueva configure su segundo factor y activarlo únicamente después de validar el primer código.

**Archivos:**

- `backend/src/routes/auth.js`
- `backend/src/controllers/authController.js`
- `backend/src/services/authService.js`
- `backend/src/repositories/authRepository.js`
- `frontend/flujo-real.js`

**Comportamiento observado en el backend:**

1. El login de una cuenta sin MFA activo entrega un token temporal de enrolamiento.
2. `POST /auth/mfa/enrolar` genera un secreto pendiente y devuelve la dirección `otpauth_uri`.
3. El secreto se guarda cifrado y MFA permanece inactivo.
4. `POST /auth/mfa/confirmar` valida el primer TOTP.
5. Una confirmación correcta activa MFA y entrega diez códigos de recuperación.
6. Los códigos se almacenan como hashes.
7. Se entrega un nuevo token temporal para completar el login MFA.
8. Si existe cambio obligatorio de contraseña, debe completarse antes del acceso operativo.

**Cómo se comprueba:**

- Crear una cuenta de prueba sin MFA.
- Generar el QR desde el flujo real.
- Confirmar con un código incorrecto y comprobar que MFA sigue inactivo.
- Confirmar con un código válido y verificar activación y diez códigos de recuperación.
- Completar el ingreso y el cambio obligatorio de contraseña.
- Probar reutilización de un código de recuperación.
- Repetir las comprobaciones con token vencido y cuenta bloqueada.

**Estado:** backend implementado en la rama; integración completa del frontend pendiente.

El frontend revisado todavía consulta `/otpauth`, no llama a las rutas de enrolamiento y confirmación ni distingue `enrolamiento_requerido`.

S-06 prueba `/auth/login/mfa`; no demuestra que la confirmación de enrolamiento rechace un código incorrecto sin activar MFA.

### 2.5. Dependencias

**Propósito:** identificar vulnerabilidades de los paquetes y comprobar que las correcciones no dañen las funciones existentes.

**Archivos:**

- `backend/package.json`
- `backend/package-lock.json`
- `docs/pruebas/act74_hallazgos.md`

**Cómo se comprueba:**

1. Ejecutar `npm audit` dentro de `backend/`.
2. Conservar la salida y la versión revisada.
3. Después de las correcciones, ejecutar `npm test`.
4. Comprobar nuevamente las exportaciones si cambia el paquete utilizado para generar ZIP.

**Estado reportado:**

S-09 registra una vulnerabilidad alta en `adm-zip`. H-25 figura como riesgo aceptado con justificación del equipo.

La aceptación del riesgo no elimina el aviso de la dependencia ni equivale a cumplir el requisito de cero vulnerabilidades altas o críticas. El líder debe resolver y registrar este punto para el cierre.

## 3. Relación con CA-01 a CA-18

La tabla indica qué criterios aborda la Actividad 74. No constituye una aprobación de los criterios.

Una prueba de regresión comprueba que los cambios nuevos no dañen funciones existentes.

| Criterio | Resumen | Relación con la Actividad 74 |
|---|---|---|
| CA-01 | Login y MFA válido; panel del rol. | Regresión del ingreso para los seis roles tras enrolamiento. |
| CA-02 | Contraseña incorrecta, mensaje genérico y bitácora. | Regresión del login y auditoría. No equivale a validar una contraseña nueva. |
| CA-03 | MFA inválido no permite entrar. | Cobertura directa: probar login MFA y confirmación de enrolamiento con código incorrecto. |
| CA-04 | Código de recuperación válido y de un solo uso. | Cobertura directa: comprobar códigos generados, consumo y rechazo de reutilización. |
| CA-05 | Sesión cerrada o expirada exige login. | Regresión de logout, vencimiento y acceso a rutas internas. |
| CA-06 | Contraseña Argon2id y secreto MFA cifrado. | Cobertura directa: revisar persistencia sin publicar secretos. |
| CA-07 | Existen seis roles base. | Sin cambio de roles previsto; comprobarlos si cambia la base. |
| CA-08 | Panel y menú según rol. | Regresión después del enrolamiento y cambio obligatorio de contraseña. Requiere revisar la interfaz. |
| CA-09 | Acceso directo sin permiso denegado. | Regresión de rutas restringidas. El token de enrolamiento no debe servir como sesión. |
| CA-10 | Registro por Investigador/Asistente, UX Lab ID y acceso por estudio. | Fuera del cambio específico; conservar pruebas de permisos, seudónimos y estudios no asignados. |
| CA-11 | Director consulta identidad con justificación registrada. | Fuera del cambio específico; conservar pruebas con justificación vacía y válida. |
| CA-12 | Soporte/Estudiante requieren autorización vigente y justificación. | Fuera del cambio específico; conservar pruebas con y sin autorización. |
| CA-13 | Invitado sin acceso al registro ni solicitud de autorización. | Fuera del cambio específico; conservar pruebas de denegación. |
| CA-14 | Bitácora de ingresos, fallos, accesos y denegaciones. | Regresión directa: incluir enrolamiento, confirmación y cambio de contraseña. |
| CA-15 | Justificación y autorización enlazadas al acceso. | Fuera del cambio específico; conservar pruebas de esos enlaces. |
| CA-16 | La aplicación no modifica ni elimina la bitácora. | Fuera del cambio específico; conservar prueba SQL con usuario de aplicación. |
| CA-17 | Primer ingreso: QR, diez códigos, activación y cambio obligatorio. | Cobertura principal. Pendiente conexión del frontend y evidencia del recorrido completo. |
| CA-18 | Cuenta bloqueada o vencida no ingresa; mensaje genérico y auditoría. | Regresión directa del login, enrolamiento y confirmación con cuentas no utilizables. |

Cabeceras, CORS y revisión de dependencias complementan estos criterios. No se les asignan nuevos IDs CA.

## 4. Evidencia existente y límites

| Evidencia | Resultado reportado | Alcance o pendiente |
|---|---|---|
| S-01 y S-02 | Cabeceras presentes. | Confirmar también ausencia de `X-Powered-By`. |
| S-03 | Origen no autorizado sin cabecera de acceso. | Acredita ese caso reportado; falta comprobar origen permitido. |
| S-04 / O-01 | Origen considerado permitido sin cabecera CORS. | Revisar configuración, reinicio y origen exacto. |
| S-05 | Login con contraseña corta responde 401. | No valida cambio de contraseña corta ni igual al correo. |
| S-06 | Login MFA incorrecto responde 401. | No valida el endpoint de confirmación de enrolamiento. |
| S-07 y S-08 | Solicitudes sin autenticación denegadas. | No demuestran restricciones de método con sesión válida. |
| S-09 / H-25 | Vulnerabilidad alta registrada y riesgo aceptado. | Resolver su tratamiento frente al criterio de ausencia de altas/críticas. |

Esta revisión documental no incluye una nueva ejecución de `npm audit`, `npm test`, pruebas con base de datos ni pruebas de navegador.

## 5. Pendientes para cierre

1. **Benjamín Barrientos:** completar la regla de contraseña distinta del correo y revisar su aplicación en alta, restablecimiento y cambio.
2. **Benjamín Arias:** conectar el frontend a enrolar/confirmar, mostrar los códigos de recuperación y completar el recorrido de una cuenta nueva hasta su panel.
3. **Felipe Cruz y Benjamín Arias:** ejecutar las pruebas pendientes de contraseña, confirmación MFA, CORS, regresión y auditoría.
4. **Líder:** resolver el tratamiento de H-25 frente al requisito de ausencia de vulnerabilidades altas y confirmar O-01 según el despliegue real.
5. **Catalina Araniz:** incorporar los resultados finales y cotejar los estados de la tabla 7.15 del informe con esta matriz.
6. **Equipo:** revisar e integrar el PR en `develop`.

Cada evidencia debe identificar commit, entorno, resultado y responsable. Las capturas no deben mostrar contraseñas, tokens, secretos MFA ni códigos de recuperación.

## 6. Registro de pruebas por completar

| Prueba | Commit / entorno | Resultado esperado | Resultado obtenido | Estado | Evidencia | Responsable |
|---|---|---|---|---|---|---|
| Contraseña corta, igual al correo y válida | Pendiente | Rechazo, rechazo y éxito respectivamente. | Pendiente | Pendiente de evidencia específica | Pendiente | Cruz / Arias |
| Enrolamiento y confirmación MFA | Pendiente | Código incorrecto no activa; correcto activa y entrega diez códigos. | Pendiente | Pendiente de evidencia específica | Pendiente | Cruz / Arias |
| Primer ingreso desde navegador | Pendiente | QR real, MFA, cambio obligatorio y panel. | Pendiente | Pendiente de integración y evidencia | Pendiente | Arias / Cruz |
| CORS permitido, no permitido y OPTIONS | Pendiente | Cabeceras según el origen configurado. | Pendiente | Pendiente de completar evidencia | Pendiente | Cruz / Arias |
| Dependencias y regresión | Pendiente | Criterio de audit resuelto y pruebas sin fallos. | Pendiente | Pendiente de cierre | Pendiente | Cruz / Arias |
