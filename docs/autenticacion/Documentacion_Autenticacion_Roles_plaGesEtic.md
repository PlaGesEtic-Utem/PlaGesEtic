# Autenticación y roles base de plaGesEtic

Documentación de alcance ingreso recuperación y permisos

Proyecto plaGesEtic · Observatorio UX / UXLab UTEM · Documentación Catalina Araniz

> **Estado de la implementación (10/10/2026):** este documento describe el **diseño** aprobado. Están implementados los seis roles y sus permisos en la base (`04_roles_base.sql`, `05_permisos_base.sql`) y la validación de sesión en la API. El ingreso con contraseña y TOTP se implementa en el prototipo Alfa (11/10); el panel por rol, con el frontend (Actividad 58); y las pruebas CA-01 a CA-16, en la Actividad 48. Ver [ADR-002](../decisiones/ADR-002-decisiones-prototipo-alfa.md).

## 1 Alcance de la implementación

La actividad 40 establece ingreso con correo, contraseña y MFA, control de sesiones, seis roles, panel por rol y trazabilidad de accesos y denegaciones. La documentación reúne los entregables del jueves 1, viernes 2 y sábado 3 de octubre; el cierre del domingo 4 se completa con los resultados de aceptación.

Roles globales: Director, Soporte, Investigador, Asistente, Estudiante e Invitado. La creación de la base de datos corresponde a la actividad 41; los flujos completos de registro, estudios y archivos se documentan en la arquitectura del MVP.

## 2 Definiciones técnicas de la base actual

| Aspecto | Definición documental |
| --- | --- |
| Credenciales | usuario.hash_password con argon2id; semilla TOTP cifrada. Nunca se devuelven contraseñas persistidas ni secretos en las consultas de usuarios. |
| MFA | TOTP configurado mediante QR; enrolamiento confirmado con el primer código. Diez códigos de recuperación, mostrados una sola vez y almacenados como hash. |
| Recuperación | Un código de respaldo se consume una sola vez. Regenerar códigos invalida los anteriores. Soporte puede restablecer contraseña o MFA. |
| Sesiones | sesion_usuario guarda hash del token, inicio, expiración, cierre e IP. JWT válido requiere sesión abierta y cuenta activa no vencida. |
| Autorización | Rol global y permiso con alcance; membresía con cinco flags y vigencia; autorizaciones excepcionales temporales y auditadas. |
| Auditoría | Se prepara antes de autenticar y se inserta al finalizar. Registra login, login fallido, acceso, denegación, justificación y autorización utilizada. |

## 3 Continuidad de las decisiones del día

Los criterios del líder fijan 16 casos de aceptación. El diseño v3 actualiza propuestas de la matriz inicial: Soporte gestiona y recupera cuentas; Estudiante puede solicitar exportaciones con permiso y aprobación; Invitado tiene consulta temporal de contenido permitido. La aprobación operativa del seed de permisos y el procedimiento del primer ingreso deben quedar registrados antes del cierre.

## 4 Ingreso de cada rol y recuperación de acceso

### Ingreso común a los seis roles

1. Una cuenta activa dispone de correo, rol y contraseña. Soporte o Director puede crearla; Invitado requiere fecha de expiración.

2. POST /auth/login recibe correo y contraseña. Un error devuelve mensaje genérico y 401, y registra el intento.

3. El token temporal permite continuar el segundo factor. Si debe cambiar contraseña o enrolar MFA, se completa el proceso inicial autorizado antes del acceso operativo.

4. La aplicación de autenticación genera el código TOTP. El QR se usa para configurarla, no se escanea en cada login.

5. POST /auth/login/mfa valida TOTP o un código de recuperación, crea sesion_usuario y emite el JWT de sesión.

6. La aplicación muestra el panel del rol y únicamente sus funciones autorizadas. Cada petición vuelve a comprobar permiso, cuenta, sesión y estudio; ocultar el menú no concede seguridad por sí solo.

| Rol | Destino funcional tras MFA |
| --- | --- |
| Director | Supervisión de estudios y auditoría; administración de permisos. |
| Soporte | Cuentas y sesiones; restablecimiento de contraseña y MFA. |
| Investigador | Estudios propios, participantes seudonimizados, documentos y exportaciones. |
| Asistente | Estudios asignados, registro y archivos según sus permisos. |
| Estudiante | Consulta de estudios asignados y solicitudes de exportación permitidas. |
| Invitado | Consulta temporal del contenido seleccionado autorizado. |

### Recuperación y cierre

Sin el dispositivo MFA: usar un código de recuperación disponible; queda consumido. Con TOTP disponible se pueden generar códigos nuevos mediante POST /auth/mfa/codigos. Si no queda código o se olvidó la contraseña, Soporte ejecuta el reset correspondiente: contraseña temporal con cambio obligatorio, o reinicio de MFA con nuevo enrolamiento. El canal y la verificación de identidad de esa atención deben acordarse.

POST /auth/logout cierra la sesión actual. Bloquear la cuenta cierra sus sesiones; la expiración de sesión o cuenta exige volver al login. El mecanismo de sesión restringida para el primer cambio de contraseña y enrolamiento MFA queda por concretar en el contrato.

## 5 Matriz de roles y contenido del panel

La matriz describe las capacidades del diseño v3. El contenido indicado es la organización funcional esperada del panel; su implementación se verifica mediante CA-08. Todo acceso por estudio requiere permiso, membresía vigente o autorización aplicable.

| Rol | Qué ve y puede hacer | Límites principales |
| --- | --- | --- |
| Director | Supervisa estudios; crea y cierra estudios; administra roles/permisos; consulta auditoría; resuelve autorizaciones. | Identidad solo con justificación auditada. Bitácora solo lectura. Las evidencias y descargas mantienen sus controles específicos. |
| Soporte | Crea/activa/bloquea cuentas, recupera contraseña/MFA y administra sesiones. | Sin acceso ordinario a investigación o identidad. Operaciones excepcionales requieren autorización vigente y trazabilidad. |
| Investigador | Gestiona sus estudios y accesos; registra participantes, decisiones, sesiones y archivos; solicita y aprueba exportaciones. | Datos operativos seudonimizados. Captura de identidad sin lectura; desenmascarar requiere autorización del Director. |
| Asistente | Trabaja en estudios asignados; registra identidad sin lectura, participación, consentimiento, sesiones y archivos. | Cada operación requiere su flag de membresía. No gestiona estudios/accesos ni solicita exportación en el catálogo v3. |
| Estudiante | Consulta datos seudonimizados y metadatos permitidos; solicita exportación si tiene puede_exportar. | Exportación sujeta a aprobación. Sin consentimiento completo ni evidencia firmada. Originales sensibles solo con autorización. |
| Invitado | Consulta temporal de estudios y contenido seleccionado permitido; membresía solo puede_consultar. | Sin registro de participantes ni evidencia. Cuenta y membresía vencen; acceso sensible excepcional requiere autorización y contrato conciliado. |

### Reglas para datos identificables

Registrar identidad y leerla son permisos distintos. POST /identidades admite Investigador y Asistente, cifra los datos y devuelve solo UX Lab ID para enrolar. Desenmascarar exige Director o autorización ver_identidad aprobada por él y justificación. Soporte y Estudiante no tienen acceso ordinario a identidad; Invitado no dispone de registro de participantes.

### Actualización frente a la matriz del jueves

Las celdas marcadas como propuestas en el documento del líder se contrastan con el catálogo v3. Se documentan cinco permisos por estudio en lugar de solo_ver/ver_y_editar. Antes de cerrar, el líder debe confirmar la matriz seed, las excepciones y los paneles efectivamente implementados.

## 6 Registro de aceptación y cierre

Estado del cierre: pendiente de evidencia de ejecución. Los 16 criterios CA-01 a CA-16 conservan su identificación del documento del líder; no se asigna un resultado aprobado sin registro de prueba. Para cada caso se adjunta evidencia, versión probada, resultado y observación de corrección.

| ID | Comprobación esperada | Resultado |
| --- | --- | --- |
| CA-01 | Ingreso correcto y MFA válido con los seis roles. | Pendiente de evidencia |
| CA-02 | Contraseña incorrecta: mensaje genérico e intento auditado. | Pendiente de evidencia |
| CA-03 | MFA inválido: acceso rechazado y reintento controlado. | Pendiente de evidencia |
| CA-04 | Código de recuperación válido y rechazo al reutilizarlo. | Pendiente de evidencia |
| CA-05 | Logout y expiración invalidan el acceso a rutas internas. | Pendiente de evidencia |
| CA-06 | Hash de contraseña y secreto MFA cifrado, sin texto plano persistido. | Pendiente de evidencia |
| CA-07 | Exactamente seis roles base cargados. | Pendiente de evidencia |
| CA-08 | Cada rol ve el panel y menú que corresponde a su matriz. | Pendiente de evidencia |
| CA-09 | Dirección directa o llamada API sin permiso: acceso denegado. | Pendiente de evidencia |
| CA-10 | Investigador/Asistente: registro en estudio permitido; rechazo fuera de él. | Pendiente de evidencia |
| CA-11 | Director: identidad con justificación obligatoria y registro de motivo. | Pendiente de evidencia |
| CA-12 | Soporte/Estudiante: acceso excepcional solo autorizado y vigente. | Pendiente de evidencia |
| CA-13 | Invitado: sin acceso al registro identificable de participantes. | Pendiente de evidencia |
| CA-14 | Login, fallos, accesos y denegaciones quedan en auditoría. | Pendiente de evidencia |
| CA-15 | Accesos especiales enlazados a autorización y justificación. | Pendiente de evidencia |
| CA-16 | Usuario de aplicación sin UPDATE ni DELETE sobre auditoría. | Pendiente de evidencia |

Datos de prueba: ocho cuentas sintéticas, una por rol más Soporte y Estudiante autorizados, y estudios A/B. Se comprueba también el vencimiento de autorización, la cuenta Invitado y cada permiso de membresía. El cierre requiere los casos aprobados, correcciones verificadas y referencia de la versión final.

### Referencias

[Planificación de autenticación](https://drive.google.com/file/d/1EypTZbWTTwrv2u_Cphrr9BMIsewE6O_z/view)

[Criterios de aceptación del líder](https://drive.google.com/file/d/1K8cMjb4yym7bkhdDM-FssplNwwSDairc/view)

[Diccionario de datos v3](https://drive.google.com/file/d/1lHu6YkbNk8AL_j4kFryUXEL66SSHzw-S/view)

[Catálogo de endpoints v3](https://drive.google.com/file/d/1E6hF6FkxxDuMAv8JcfXlSu_fw2IyEpau/view)

[Middlewares de seguridad v3](https://drive.google.com/file/d/1mJSEWUPjqA2g7kzBd127ka7tVsNWvenG/view)
