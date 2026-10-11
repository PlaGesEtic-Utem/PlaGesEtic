# Catálogo integrado de API de plaGesEtic

Anexo de la especificación documental v1.0. Transcripción estructurada del catálogo v3: 60 rutas en 11 grupos. Conserva roles, flags, entradas y salidas; los pendientes de coherencia están en la especificación.

[Fuente: catálogo v3.1](https://drive.google.com/file/d/172V5EtjaF20uoevILh5StJMz4zkU-C_g/view)

> **Notas de coherencia con el código (10/10/2026, ver [ADR-002](../decisiones/ADR-002-decisiones-prototipo-alfa.md)):**
> - Las rutas se publican **sin prefijo** `/api/v1` (D2, propuesta).
> - En `POST /identidades`, **correo y teléfono son obligatorios** (D1, aceptada).
> - «Investigador (responsable)» significa membresía vigente con el permiso indicado en la columna «Permiso en estudio»; el responsable puede otorgarlo a otro investigador (D5, propuesta).
> - Contactar a un participante: solo el Investigador responsable y el Director, con motivo registrado (`POST /participaciones/{id}/contacto`, D8, aceptada).
> - Implementadas en `feature/backend-base` al 10/10: estudios (5 rutas), identidades (2) y participaciones (2). El ingreso (`/auth/*`) se implementa el 11/10 (D3).

## Autenticación y MFA

| Recurso | Rol autorizado | Permiso en estudio | Entrada | Salida |
| --- | --- | --- | --- | --- |
| POST /auth/login | Público | — (público) | correo, contraseña | token_temporal para el paso MFA, o error 401. Indica si debe_cambiar_password o si falta enrolar el MFA. |
| POST /auth/login/mfa | Público (con token_temporal) | — (público) | token_temporal, codigo_totp o codigo_recuperacion | JWT de sesión; crea la fila en sesion_usuario. Un código de recuperación queda marcado como usado. |
| POST /auth/mfa/enrolar | Cualquier usuario autenticado | — (global) | — | QR de enrolamiento + 10 códigos de recuperación (se muestran una sola vez); mfa_activo: true al confirmar el primer código. |
| POST /auth/mfa/codigos | Cualquier usuario autenticado | — (global) | codigo_totp | Nuevos códigos de recuperación; invalida los anteriores. |
| POST /auth/password | Cualquier usuario autenticado | — (global) | password_actual, password_nueva | Confirmación; debe_cambiar_password: false. |
| POST /auth/logout | Cualquier usuario autenticado | — (global) | — | Cierra la sesion_usuario actual (fecha_cierre). |

## Usuarios sesiones y permisos

| Recurso | Rol autorizado | Permiso en estudio | Entrada | Salida |
| --- | --- | --- | --- | --- |
| GET /usuarios | Director, Soporte | — (global) | filtros: id_rol, activo | Lista de usuarios (id, nombre, correo, rol, activo, mfa_activo, fecha_expiracion). |
| POST /usuarios | Director, Soporte | — (global) | nombre, correo, id_rol, fecha_expiracion (obligatoria para Invitado) | Usuario creado con contraseña temporal y debe_cambiar_password: true. |
| PATCH /usuarios/{id}/estado | Director, Soporte | — (global) | activo (true / false) | Usuario activado o bloqueado; al bloquear se cierran sus sesiones. |
| PATCH /usuarios/{id}/rol | Director | — (global) | id_rol | Usuario con nuevo rol. |
| POST /usuarios/{id}/password/reset | Soporte | — (global) | — | Contraseña temporal (recuperación de cuenta). |
| POST /usuarios/{id}/mfa/reset | Soporte | — (global) | — | Borra mfa_secret y los códigos de recuperación; el usuario debe enrolar de nuevo. |
| GET /usuarios/{id}/sesiones | Director, Soporte, el propio usuario | — (global) | — | Sesiones de login activas y recientes (inicio, expiración, IP). |
| DELETE /sesiones/{id_sesion} | Director, Soporte, el propio usuario | — (global) | — | Sesión cerrada (fecha_cierre). |
| GET /roles/{id}/permisos | Director | — (global) | — | Filas de permiso del rol. |
| PUT /roles/{id}/permisos | Director | — (global) | lista de (recurso, accion, alcance) | Permisos del rol reemplazados. |

## Estudios protocolos y CEC

| Recurso | Rol autorizado | Permiso en estudio | Entrada | Salida |
| --- | --- | --- | --- | --- |
| GET /estudios | Todos | — (filtra por membresía; Director ve todos) | filtro: estado | Estudios accesibles para el usuario. |
| POST /estudios | Investigador, Director | — (crea el estudio) | codigo_estudio, nombre, descripcion, fecha_inicio, fecha_fin, retencion_hasta | Estudio en borrador; el creador queda como id_responsable y con membresía completa. |
| GET /estudios/{id} | Roles con membresía; Director | puede_consultar | — | Detalle del estudio. |
| PATCH /estudios/{id} | Investigador (responsable), Director | puede_modificar | nombre, descripcion, fechas, retencion_hasta | Estudio actualizado. |
| POST /estudios/{id}/activar | Investigador (responsable), Director | puede_modificar | — | Estudio activo; error 409 si no hay protocolo aprobado. |
| POST /estudios/{id}/cerrar | Director | — (global) | motivo | Estudio cerrado con fecha_cierre; bloquea nuevas cargas. |
| GET /estudios/{id}/protocolos | Investigador, Asistente, Director | puede_consultar | — | Versiones de protocolo y su estado CEC. |
| POST /estudios/{id}/protocolos | Investigador (responsable) | puede_modificar | version, documento (PDF) | protocolo_version con estado_cec: pendiente. |
| PATCH /protocolos/{id}/cec | Investigador (responsable), Director | puede_modificar | estado_cec, codigo_aprobacion_cec, fecha_aprobacion_cec, fecha_vencimiento_cec | Protocolo actualizado. |

## Membresías

| Recurso | Rol autorizado | Permiso en estudio | Entrada | Salida |
| --- | --- | --- | --- | --- |
| GET /estudios/{id}/membresias | Investigador (responsable), Director | puede_consultar | — | Membresías con sus cinco permisos y vigencia. |
| POST /estudios/{id}/membresias | Investigador (responsable), Director | puede_modificar | id_usuario, puede_consultar, puede_cargar, puede_modificar, puede_descargar, puede_exportar, fecha_inicio, fecha_fin | Membresía creada (id_otorgante = usuario actual). A un Invitado solo se le puede dar puede_consultar, y fecha_fin es obligatoria. |
| PATCH /estudios/{id}/membresias/{id_membresia} | Investigador (responsable), Director | puede_modificar | permisos, fecha_fin | Membresía actualizada. |
| DELETE /estudios/{id}/membresias/{id_membresia} | Investigador (responsable), Director | puede_modificar | — | Acceso revocado. |

## Identidades y representación

| Recurso | Rol autorizado | Permiso en estudio | Entrada | Salida |
| --- | --- | --- | --- | --- |
| POST /identidades | Investigador, Asistente | — (sin estudio) | rut (opcional), nombre, correo, telefono, fecha_nacimiento, tipo | Solo el ux_lab_id generado. El servidor cifra nombre, correo, teléfono y RUT y calcula sus hashes; el cliente nunca envía ni recibe datos cifrados. |
| POST /identidades/buscar | Investigador, Asistente | — (sin estudio) | rut o correo | Solo el ux_lab_id si la persona ya existe (para no duplicarla), sin ningún dato personal. |
| POST /representaciones | Investigador, Asistente | — (sin estudio) | ux_lab_id_representante, ux_lab_id_representado, relacion, fecha_inicio | id_representacion. |
| POST /identidades/{ux_lab_id}/desenmascarar | Director; o quien tenga una autorización ver_identidad aprobada y vigente | — (global) | justificacion (obligatoria), id_estudio | Datos personales descifrados. Queda en auditoria con accion: desenmascarar y la justificación. |
| POST /identidades/{ux_lab_id}/supresion | Director | — (global) | motivo, evidencia de la solicitud | Registra fecha_revocacion y programa fecha_eliminacion; al vencer, un proceso borra vinculo_identidad e identidad. Auditado como revocar. |

## Participaciones y sesiones de investigación

| Recurso | Rol autorizado | Permiso en estudio | Entrada | Salida |
| --- | --- | --- | --- | --- |
| POST /estudios/{id}/participaciones | Investigador, Asistente | puede_cargar | ux_lab_id | id_participacion y codigo_seudonimo aleatorio (ej. P-7K3QX9). Si la persona aún no es participante, crea participante y vinculo_identidad. Calcula es_menor_al_enrolar. |
| GET /estudios/{id}/participaciones | Investigador, Asistente, Estudiante | puede_consultar | filtro: estado | Participaciones con seudónimo, estado y si era menor al enrolar. |
| PATCH /participaciones/{id}/estado | Investigador, Asistente | puede_modificar | estado (activo / retirado) | Participación actualizada; no afecta participante.estado. |
| POST /participaciones/{id}/contacto | Investigador responsable del estudio, Director | — (responsable del estudio o alcance global) | motivo (coordinar_sesion / reconsentimiento / incidente / retiro / otro), detalle (obligatorio si motivo = otro) | Solo nombre, correo y teléfono de la persona, para contactarla; nunca RUT ni fecha de nacimiento. Exige motivo; queda en auditoría como desenmascarar, con la justificación. Si la participación está retirada, solo se acepta el motivo retiro. Ver ADR-002, D8. |
| GET /participaciones/{id}/sesiones | Investigador, Asistente, Estudiante | puede_consultar | — | Sesiones de investigación de la participación. |
| POST /participaciones/{id}/sesiones | Investigador, Asistente | puede_modificar | fecha_programada, tecnicas, id_responsable | sesion_investigacion en estado programada. Rechaza con 409 si no hay consentimiento vigente. |
| PATCH /sesiones-investigacion/{id} | Investigador, Asistente | puede_modificar | estado, fecha_realizada, observaciones | Sesión actualizada. |

## Consentimientos y asentimientos

| Recurso | Rol autorizado | Permiso en estudio | Entrada | Salida |
| --- | --- | --- | --- | --- |
| GET /estudios/{id}/documentos-consentimiento | Investigador, Asistente | puede_consultar | — | Versiones de documentos de consentimiento y asentimiento. |
| POST /estudios/{id}/documentos-consentimiento | Investigador (responsable) | puede_modificar | tipo, version, documento, id_protocolo | documento_consentimiento vigente; la versión anterior del mismo tipo queda vigente: false. |
| POST /participaciones/{id}/consentimientos | Investigador, Asistente | puede_cargar | tipo, id_documento, tipo_evento (aceptar / negar), evidencia firmada, id_representacion (si firma un representante) | consentimiento + primer evento_consentimiento. |
| GET /participaciones/{id}/consentimientos | Investigador, Asistente | puede_consultar | — | Estado vigente de cada consentimiento/asentimiento (otorgado, revocado, negado o pendiente de reconsentimiento si existe una versión vigente del documento más nueva que la aceptada) y su historial de eventos, sin la evidencia. |
| POST /consentimientos/{id}/eventos | Investigador, Asistente | puede_cargar | tipo_evento (negar / retirar / reconsentir), id_documento, evidencia | Nuevo evento. Un retirar marca la participación como retirado. |
| GET /participaciones/{id}/consentimientos/certificado | Investigador (responsable), Director | puede_descargar | — | Certificado PDF con la trazabilidad de consentimientos de la participación (seudónimo, eventos, versiones y hashes de evidencia), para auditorías éticas. No incluye datos personales. |
| GET /eventos-consentimiento/{id}/evidencia | Investigador, Asistente | puede_descargar | — | Archivo de evidencia firmada (stream). Auditado como descargar. |

## Archivos de investigación

| Recurso | Rol autorizado | Permiso en estudio | Entrada | Salida |
| --- | --- | --- | --- | --- |
| POST /participaciones/{id}/registros | Investigador, Asistente; Soporte con autorización | puede_cargar | archivo (multipart), tipo_dato, dispositivo_origen, id_sesion_investigacion, es_sensible | Metadatos del registro: extensión y MIME validados por el servidor, tamaño, hash, versión 1. Rechaza con 415 las extensiones fuera de la lista permitida y con 409 si la participación no tiene consentimiento vigente (ver regla de consentimiento). |
| POST /registros/{id}/versiones | Investigador, Asistente | puede_cargar | archivo (multipart) | Nueva versión (id_registro_anterior); el original queda intacto. |
| GET /participaciones/{id}/registros | Investigador, Asistente, Estudiante, Invitado | puede_consultar | filtros: tipo_dato, sesión | Metadatos de los archivos. Para Estudiante e Invitado, los archivos es_sensible solo aparecen si tienen una autorización vigente. |
| GET /registros/{id}/descarga | Investigador, Asistente; Estudiante o Invitado con autorización descarga_original | puede_descargar | — | Archivo (stream). Auditado como descargar. |

## Exportaciones

| Recurso | Rol autorizado | Permiso en estudio | Entrada | Salida |
| --- | --- | --- | --- | --- |
| POST /estudios/{id}/exportaciones | Investigador, Estudiante | puede_exportar | proposito, filtros | exportacion con codigo_exportacion aleatorio. Estado aprobada si la pide el Investigador responsable; solicitada en otro caso. Excluye siempre las participaciones retirado, los datos personales, las fechas exactas de sesión y los archivos sensibles identificables (salvo autorización del CEC). |
| PATCH /exportaciones/{id}/aprobacion | Investigador (responsable), Director | puede_modificar | decision (aprobar / rechazar), motivo | Exportación aprobada (pasa a procesando) o rechazada. |
| GET /exportaciones/{id} | Solicitante, Investigador (responsable), Director | puede_consultar | — | Estado del paquete. |
| GET /exportaciones/{id}/descarga | Solicitante, Investigador (responsable) | puede_exportar | — | Paquete .zip con los datos y un codigo_en_exportacion por participante; sin seudónimos ni identidades. Auditado como exportar. |

## Autorizaciones especiales

| Recurso | Rol autorizado | Permiso en estudio | Entrada | Salida |
| --- | --- | --- | --- | --- |
| POST /autorizaciones | Cualquier usuario autenticado | — (se valida al aprobar) | id_estudio, tipo, recurso, id_registro_objetivo, motivo, fecha_vencimiento | autorizacion en estado pendiente. |
| GET /autorizaciones | Director (todas), Investigador (las de sus estudios), solicitante (las propias) | — (global) | filtros: estado, id_estudio | Lista de autorizaciones. |
| PATCH /autorizaciones/{id} | Investigador (responsable del estudio), Director; ver_identidad solo el Director | — (global) | decision (aprobar / rechazar) | Autorización aprobada o rechazada, con id_autorizador y fecha_resolucion. |

## Auditoría y plantillas

| Recurso | Rol autorizado | Permiso en estudio | Entrada | Salida |
| --- | --- | --- | --- | --- |
| GET /auditoria | Director | — (global) | filtros: id_usuario, id_estudio, accion, resultado, rango de fechas | Registros de auditoría (solo lectura; no existe PUT ni DELETE). |
| GET /plantillas/importacion-participantes | Investigador, Asistente | — (global) | — | Archivo .xlsx con las columnas que aceptará la futura importación. La importación en sí queda para una etapa posterior. |
