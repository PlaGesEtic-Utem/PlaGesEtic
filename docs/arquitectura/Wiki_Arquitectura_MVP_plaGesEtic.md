# Arquitectura del MVP de plaGesEtic

Versión documental 1.0. Plataforma de Gestión Ética de Participantes y Datos de Investigación del Observatorio UX / UXLab UTEM. Documentación: Catalina Araniz.

## Alcance y stack

El ADR-001 registra la aceptación de Node.js con Express, PostgreSQL y Docker para el MVP. La aplicación web, la API, la base de datos y el almacenamiento representan los contenedores lógicos del MVP. El frontend y la tecnología de almacenamiento quedan por definir; el almacenamiento separa documentos éticos y datos de investigación.

## Separación de datos

| Esquema | Contenido | Tablas |
| --- | --- | --- |
| identity_schema | Identidad cifrada, UX Lab ID, vínculo y representación legal | 3 |
| ethics_schema | Protocolos CEC, documentos, consentimientos y eventos con evidencia | 4 |
| research_schema | Estudios, participaciones, sesiones, archivos y exportaciones | 7 |
| security_schema | Cuentas, roles, permisos, membresías, sesiones, MFA, autorizaciones y auditoría | 8 |

El modelo v3 reúne 22 tablas. UX Lab ID es interno y no publicable; codigo_seudonimo es propio de una participación. El paquete usa codigo_exportacion y codigo_en_exportacion independientes. No se exporta el mapeo interno entre estos códigos.

## Seguridad y roles

Los seis roles son Director, Soporte, Investigador, Asistente, Estudiante e Invitado. El login combina contraseña y MFA TOTP o código de recuperación de un solo uso. Soporte puede recuperar contraseña y MFA según el procedimiento autorizado.

La cadena prepara auditoría antes de autenticar, valida JWT y sesión vigente, evalúa RBAC por rol y alcance, ejecuta el controlador y filtra PII en la respuesta. La auditoría se inserta al finalizar, incluidos login y denegaciones 401/403. La membresía distingue consulta, carga, modificación, descarga y exportación, con vigencia; las autorizaciones especiales son temporales y auditadas.

## Registro y consentimiento

Investigador y Asistente capturan identidad sin lectura posterior de PII; reciben UX Lab ID para enrolar y el trabajo del estudio usa seudónimos. Leer identidad exige desenmascarar con Director o autorización ver_identidad aprobada por él y justificación auditada.

La decisión referencia el documento exacto y agrega un evento aceptar, negar, retirar o reconsentir en ethics_schema. En menores se requieren asentimiento y consentimiento del representante. El retiro bloquea nuevas sesiones y cargas y excluye esa participación de nuevas exportaciones. La supresión de identidad es un flujo distinto; su plazo y la conservación de evidencia requieren la política del equipo y del CEC.

## Exportación desidentificada

POST /estudios/{id}/exportaciones recibe propósito y filtros. La solicitud del Estudiante requiere aprobación del responsable; PATCH /exportaciones/{id}/aprobacion registra la decisión. El paquete .zip usa códigos propios y excluye PII, fechas exactas, participantes retirados y archivos sensibles identificables sin autorización del CEC.

GET /exportaciones/{id} consulta el estado y GET /exportaciones/{id}/descarga entrega el paquete autorizado y vigente. El diseño lógico revalida elegibilidad antes de publicar y descargar. La política concreta de caducidad, concurrencia y ejecución del procesamiento debe implementarse y probarse. La desidentificación no garantiza anonimato irreversible del contenido audiovisual ni de evidencias firmadas.

## Diagramas y documentos del repositorio

| Entrega | Versión | Archivos en el repositorio |
| --- | --- | --- |
| C4 Nivel 3 | 1.1 | [Draw.io](https://github.com/PlaGesEtic-Utem/PlaGesEtic/blob/main/docs/diagramas/c4/C4_Nivel3_Backend_plaGesEtic.drawio) · [SVG](https://github.com/PlaGesEtic-Utem/PlaGesEtic/blob/main/docs/diagramas/c4/C4_Nivel3_Backend_plaGesEtic.svg) · [PNG](https://github.com/PlaGesEtic-Utem/PlaGesEtic/blob/main/docs/diagramas/c4/C4_Nivel3_Backend_plaGesEtic.png) |
| Registro con consentimiento | 1.1 | [Draw.io](https://github.com/PlaGesEtic-Utem/PlaGesEtic/blob/main/docs/diagramas/uml/UML_Registro_Consentimiento_plaGesEtic.drawio) · [SVG](https://github.com/PlaGesEtic-Utem/PlaGesEtic/blob/main/docs/diagramas/uml/UML_Registro_Consentimiento_plaGesEtic.svg) · [PNG](https://github.com/PlaGesEtic-Utem/PlaGesEtic/blob/main/docs/diagramas/uml/UML_Registro_Consentimiento_plaGesEtic.png) |
| Exportación desidentificada | 1.0 | [Draw.io](https://github.com/PlaGesEtic-Utem/PlaGesEtic/blob/main/docs/diagramas/uml/UML_Exportacion_Desidentificada_plaGesEtic.drawio) · [SVG](https://github.com/PlaGesEtic-Utem/PlaGesEtic/blob/main/docs/diagramas/uml/UML_Exportacion_Desidentificada_plaGesEtic.svg) · [PNG](https://github.com/PlaGesEtic-Utem/PlaGesEtic/blob/main/docs/diagramas/uml/UML_Exportacion_Desidentificada_plaGesEtic.png) |
| Especificación técnica v1.0 | Documentación | [MD](https://github.com/PlaGesEtic-Utem/PlaGesEtic/blob/main/docs/especificacion-tecnica/Especificacion_Tecnica_v1_0_plaGesEtic.md) · [DOCX](https://github.com/PlaGesEtic-Utem/PlaGesEtic/blob/main/docs/especificacion-tecnica/Especificacion_Tecnica_v1_0_plaGesEtic.docx) |
| Autenticación y roles | Documentación | [MD](https://github.com/PlaGesEtic-Utem/PlaGesEtic/blob/main/docs/autenticacion/Documentacion_Autenticacion_Roles_plaGesEtic.md) · [DOCX](https://github.com/PlaGesEtic-Utem/PlaGesEtic/blob/main/docs/autenticacion/Documentacion_Autenticacion_Roles_plaGesEtic.docx) |
| Catálogo API integrado | 1.0 | [60 endpoints](https://github.com/PlaGesEtic-Utem/PlaGesEtic/blob/main/docs/especificacion-tecnica/Catalogo_API_Integrado_v1_0_plaGesEtic.md) |

![C4 Nivel 3](https://github.com/PlaGesEtic-Utem/PlaGesEtic/blob/main/docs/diagramas/c4/C4_Nivel3_Backend_plaGesEtic.png?raw=true)

Los enlaces apuntan a la rama principal `main`. Esta página debe publicarse en la Wiki una vez incorporado el PR de documentación, comprobando entonces los enlaces. La vista C4 describe dependencias lógicas y las secuencias describen el comportamiento esperado; la verificación del código se registra por separado.

El [ADR-001: stack tecnológico](https://github.com/PlaGesEtic-Utem/PlaGesEtic/blob/main/docs/decisiones/ADR-001-stack-tecnologico.md) conserva la decisión aceptada según el registro de origen en Drive. Su [índice](https://github.com/PlaGesEtic-Utem/PlaGesEtic/blob/main/docs/decisiones/README.md) enlaza el registro. La especificación v1.0 concreta el diseño con el DER v3 y sus cuatro esquemas; los temas abiertos se mantienen en su sección 9.

## Validación y decisiones pendientes

Se revisó coherencia documental de cuatro esquemas, 22 tablas, seis roles y 60 rutas. El reporte de validación v2 actualiza los cuatro hallazgos anteriores y conserva la revisión de privacidad a cargo del responsable.

Antes de cerrar implementación: precisar sesión restringida del primer ingreso y enrolamiento MFA; conciliar la devolución de UX Lab ID al capturar con el filtro de PII; verificar permisos y descargas excepcionales del Invitado; fijar seed de permisos; definir llaves, frontend, almacenamiento, procesamiento y recuperación de auditoría. CEC y asesoría jurídica concretan retención y supresión. El cierre de autenticación requiere resultados y evidencia CA-01 a CA-18.

## Registro de cambios

| Versión | Cambio |
| --- | --- |
| 0.2 | Integración inicial de API, consentimiento y matriz de seudonimización |
| 1.0 | Consolidación con DER y diccionario v3, matriz v3 y consentimiento v2; cuatro esquemas, 22 tablas, 60 rutas y seis roles; referencia a ADR-001 y actualización de su índice |
| C4 y registro 1.1 | Ética separada, permisos por operación, auditoría previa, UX Lab ID interno y documentos versionados |
| Exportación 1.0 | Entidades de exportación, aprobación de Estudiante, códigos independientes, .zip y descarga vigente |

## Fuentes del diseño

- [ADR-001 de origen en Drive](https://docs.google.com/document/d/1b1g4W84W3I38m8evO8mB_z9lKB_2METY/edit)
- [DER v3](https://drive.google.com/file/d/1YnhCcu5Atab0iUC53ekw3O7d8CAoG0en/view)
- [Diccionario v3](https://drive.google.com/file/d/1lHu6YkbNk8AL_j4kFryUXEL66SSHzw-S/view)
- [Catálogo API v3](https://drive.google.com/file/d/1E6hF6FkxxDuMAv8JcfXlSu_fw2IyEpau/view)
- [Middlewares v3](https://drive.google.com/file/d/1mJSEWUPjqA2g7kzBd127ka7tVsNWvenG/view)
- [Matriz de seudonimización v3](https://drive.google.com/file/d/1qVsFcW1CLZ77TANQO-3x8EPfsxkwQ-eq/view)
- [Flujo de consentimientos v2](https://drive.google.com/file/d/11o4oVrPt4zyeYwNCllJNZMBq9yPl91OC/view)
- [Validación de endpoints v2](https://drive.google.com/file/d/1Y_FqitvD4NzxGzJ6HNT0hWln_cqChvxn/view)
