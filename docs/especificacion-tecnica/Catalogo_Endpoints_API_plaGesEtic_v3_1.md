> Actualización documental de la sección 8 (Actividad 55) y de las reglas generales, identidades y contacto (Actividad 56). Se conserva el diseño de las demás secciones. Este catálogo distingue el contrato acordado de la implementación y no acredita cierre de pruebas. [Fuente original](https://drive.google.com/file/d/172V5EtjaF20uoevILh5StJMz4zkU-C_g/view).

<div>

UX Observatorio UX · UXLab UTEM Diseño técnico · v3.1Alineado con el documento del cliente

# Catálogo de Endpoints de la API de plaGesEtic

Recurso, método HTTP, rol autorizado, permiso requerido en el estudio y datos de entrada/salida de cada endpoint, alineados con el DER v3 y los Middlewares v3.

11grupos de recursos 60endpoints catalogados 1endpoint que devuelve datos personales 05 oct2026

</div>

Proyecto  
Plataforma de Gestión Ética de Participantes y Datos de Investigación (plaGesEtic) — Observatorio UX / UXLab UTEM

Documentos base  
Documento del cliente · DER v3 · Diccionario v3 · Middlewares v3 · ADR-001

Stack  
Node.js + Express · PostgreSQL

Responsable  
Benjamín Arias (Desarrollador)

Fecha  
01 de octubre de 2026 · v3 del 05 de octubre de 2026 · v3.1 del 10 de octubre de 2026 (correo y teléfono obligatorios; contacto del participante)

<div class="section">

## 1. Contexto y reglas generales

Cada endpoint protegido pasa por la cadena de Middlewares v3: **auditoría** → **autenticación** (JWT + sesión vigente + cuenta activa) → **control de acceso** → controlador → **seudonimización**. El control de acceso exige dos cosas: que el rol global tenga el permiso en la tabla `permiso` y, en rutas de un estudio, que la membresía del usuario tenga el flag indicado en la columna **Permiso en estudio** (o que exista una `autorizacion` aprobada y vigente). Los permisos con alcance `global` (por ejemplo, la supervisión del Director) no requieren membresía.

| Regla                       | Qué significa                                                                                                                                                                                                                                                                                                                                                                                                |
|-----------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Datos personales | Las respuestas ordinarias de estudio usan seudónimos. Hay dos vías excepcionales: contacto (solo seudónimo, nombre, correo y teléfono) y desenmascarar (seis campos de identidad). Ambas exigen autorización, motivo o justificación y auditoría. El UX Lab ID también se recibe al registrar/buscar una identidad para enrolarla; no aparece en datos de estudio ni exportaciones. |
| Códigos | UXL-XXXXXXXX: identidad interna; P-XXXXXX: persona por estudio; X-XXXXXX: paquete de exportación; E-XXXXXX: persona dentro del paquete. Son aleatorios e independientes, con unicidad y reintento por colisión. X-/E- se integran con la Act. 60. Ver discrepancia del alfabeto en la nota de Act. 56. |
| Consentimiento vigente      | Antes de crear una sesión de investigación o cargar archivos de una participación, el controlador verifica que su último evento de consentimiento sea `aceptar` o `reconsentir` (y, si era menor al enrolar, que también exista un asentimiento vigente). Si el último evento es `negar` o `retirar`, o la participación está `retirado`, responde 409. Hallazgo 3 del Reporte de Validación de Felipe Cruz. |
| Columna “Rol autorizado”    | Describe las filas que debe tener la tabla `permiso` (fuente única de verdad); no se programa aparte.                                                                                                                                                                                                                                                                                                        |
| Permiso en estudio          | `puede_consultar` (leer), `puede_cargar` (crear datos), `puede_modificar` (editar), `puede_descargar` (bajar archivos) o `puede_exportar`. “— (global)” = no depende de un estudio.                                                                                                                                                                                                                          |
| Recursos (catálogo cerrado) | `identidad`, `representante_legal`, `estudio`, `protocolo_version`, `documento_consentimiento`, `consentimiento`, `participacion`, `sesion_investigacion`, `registro_datos`, `exportacion`, `membresia_estudio`, `autorizacion`, `usuario`, `permiso`, `sesion_usuario`, `auditoria`.                                                                                                                        |

**Cambios desde v2 (05 oct.), tras comparar con el documento del cliente:**

- Investigadores y Asistentes ya no ven datos personales en `GET /estudios/{id}/participaciones`: el cliente pide que trabajen con seudónimos.
- Soporte crea y recupera cuentas (`POST /usuarios`, reset de contraseña); el Director crea, cierra y supervisa todos los estudios.
- Seudónimos aleatorios (antes `EXP-001`, secuencial y confundible con las exportaciones).
- La columna “Nivel mínimo” (`solo_ver` / `ver_y_editar`) se reemplaza por “Permiso en estudio” (5 permisos).
- Endpoints nuevos: protocolos y CEC, sesiones de investigación, documentos de consentimiento y asentimiento, representación legal, supresión de identidad, códigos MFA, sesiones de login, permisos de rol, autorizaciones, aprobación de exportaciones, versiones de archivos y plantilla de importación.

**Supuesto por validar:** prefijo de ruta `/api/v1` para todos los endpoints (omitido por brevedad) y formato JSON, salvo cargas multipart y descargas en stream.

</div>

<div class="section">

### Actualización de seudonimización — Actividad 56

Contrato según ADR-002 D12–D15 y Matriz v3. Ejemplos y tabla de roles: [Guía de seudonimización](../api/seudonimizacion.md).

- **Implementación revisada:** las dos rutas están en `feature/desenmascarar` (d03b836), pero no en `feature/seudonimizacion` (ddbbe23). Su publicación depende de integrar los cambios en la rama acordada por el equipo.
- **Permisos:** `ver_identidad` exige permiso de rol `identidad/leer` y autorización aprobada, vigente, del recurso identidad y del mismo estudio para Investigador/Asistente. No habilita la ruta de contacto a un Asistente. Director dispone de alcance global.
- **Códigos:** D14 pide excluir 0, O, 1, I y L; el generador revisado usa `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` y permite L. Resolver la diferencia antes de dar el alfabeto por validado. Los formatos UXL- y P- se conservan.
- **Auditoría y privacidad:** no guardar datos personales descifrados en logs o auditoría; las excepciones del filtro se declaran por ruta. Desenmascarar debe bloquear la entrega si falla el registro previo de auditoría (503 en la implementación revisada).
- **Validación:** Felipe aprobó la revisión del filtro, pero CP-26 a CP-37 siguen sin resultados en la planilla revisada. No se acredita aprobación funcional. En CP-32, sustituir la justificación corta del ejemplo por una de al menos 20 caracteres.
- **Alcance posterior:** exportaciones X-/E- (Act. 60), supresión de identidad (Act. 73), solicitud y aprobación de autorizaciones (Act. 74).

## 2. Autenticación y MFA

Login en dos pasos (contraseña + TOTP), códigos de recuperación y control de sesiones (objetivo 7, RNF-SEC-04). No pasan por el RBAC por estudio.

| Recurso                 | Rol autorizado                | Permiso en estudio | Entrada                                             | Salida                                                                                                                        |
|-------------------------|-------------------------------|--------------------|-----------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------|
| POST`/auth/login`       | Público                       | — (público)        | correo, contraseña                                  | token_temporal para el paso MFA, o error 401. Indica si `debe_cambiar_password` o si falta enrolar el MFA.                    |
| POST`/auth/login/mfa`   | Público (con token_temporal)  | — (público)        | token_temporal, codigo_totp *o* codigo_recuperacion | JWT de sesión; crea la fila en `sesion_usuario`. Un código de recuperación queda marcado como `usado`.                        |
| POST`/auth/mfa/enrolar` | Cualquier usuario autenticado | — (global)         | —                                                   | QR de enrolamiento + 10 códigos de recuperación (se muestran una sola vez); `mfa_activo: true` al confirmar el primer código. |
| POST`/auth/mfa/codigos` | Cualquier usuario autenticado | — (global)         | codigo_totp                                         | Nuevos códigos de recuperación; invalida los anteriores.                                                                      |
| POST`/auth/password`    | Cualquier usuario autenticado | — (global)         | password_actual, password_nueva                     | Confirmación; `debe_cambiar_password: false`.                                                                                 |
| POST`/auth/logout`      | Cualquier usuario autenticado | — (global)         | —                                                   | Cierra la `sesion_usuario` actual (`fecha_cierre`).                                                                           |

</div>

<div class="section">

## 3. Usuarios, sesiones y permisos

Administración global de cuentas. Soporte crea, activa, bloquea y recupera cuentas; el Director administra roles y permisos (perfiles del documento del cliente).

| Recurso                             | Rol autorizado                       | Permiso en estudio | Entrada                                                              | Salida                                                                              |
|-------------------------------------|--------------------------------------|--------------------|----------------------------------------------------------------------|-------------------------------------------------------------------------------------|
| GET`/usuarios`                      | Director, Soporte                    | — (global)         | filtros: id_rol, activo                                              | Lista de usuarios (id, nombre, correo, rol, activo, mfa_activo, fecha_expiracion).  |
| POST`/usuarios`                     | Director, Soporte                    | — (global)         | nombre, correo, id_rol, fecha_expiracion (obligatoria para Invitado) | Usuario creado con contraseña temporal y `debe_cambiar_password: true`.             |
| PATCH`/usuarios/{id}/estado`        | Director, Soporte                    | — (global)         | activo (true / false)                                                | Usuario activado o bloqueado; al bloquear se cierran sus sesiones.                  |
| PATCH`/usuarios/{id}/rol`           | Director                             | — (global)         | id_rol                                                               | Usuario con nuevo rol.                                                              |
| POST`/usuarios/{id}/password/reset` | Soporte                              | — (global)         | —                                                                    | Contraseña temporal (recuperación de cuenta).                                       |
| POST`/usuarios/{id}/mfa/reset`      | Soporte                              | — (global)         | —                                                                    | Borra `mfa_secret` y los códigos de recuperación; el usuario debe enrolar de nuevo. |
| GET`/usuarios/{id}/sesiones`        | Director, Soporte, el propio usuario | — (global)         | —                                                                    | Sesiones de login activas y recientes (inicio, expiración, IP).                     |
| DELETE`/sesiones/{id_sesion}`       | Director, Soporte, el propio usuario | — (global)         | —                                                                    | Sesión cerrada (`fecha_cierre`).                                                    |
| GET`/roles/{id}/permisos`           | Director                             | — (global)         | —                                                                    | Filas de `permiso` del rol.                                                         |
| PUT`/roles/{id}/permisos`           | Director                             | — (global)         | lista de (recurso, accion, alcance)                                  | Permisos del rol reemplazados.                                                      |

</div>

<div class="section">

## 4. Estudios, protocolos y CEC

Ciclo de vida del estudio y aprobación ética (objetivo 4). Un estudio solo pasa a `activo` si tiene una versión de protocolo aprobada por el CEC.

| Recurso                         | Rol autorizado                       | Permiso en estudio                          | Entrada                                                                        | Salida                                                                                  |
|---------------------------------|--------------------------------------|---------------------------------------------|--------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------|
| GET`/estudios`                  | Todos                                | — (filtra por membresía; Director ve todos) | filtro: estado                                                                 | Estudios accesibles para el usuario.                                                    |
| POST`/estudios`                 | Investigador, Director               | — (crea el estudio)                         | codigo_estudio, nombre, descripcion, fecha_inicio, fecha_fin, retencion_hasta  | Estudio en `borrador`; el creador queda como `id_responsable` y con membresía completa. |
| GET`/estudios/{id}`             | Roles con membresía; Director        | puede_consultar                             | —                                                                              | Detalle del estudio.                                                                    |
| PATCH`/estudios/{id}`           | Investigador (responsable), Director | puede_modificar                             | nombre, descripcion, fechas, retencion_hasta                                   | Estudio actualizado.                                                                    |
| POST`/estudios/{id}/activar`    | Investigador (responsable), Director | puede_modificar                             | —                                                                              | Estudio `activo`; error 409 si no hay protocolo aprobado.                               |
| POST`/estudios/{id}/cerrar`     | Director                             | — (global)                                  | motivo                                                                         | Estudio `cerrado` con `fecha_cierre`; bloquea nuevas cargas.                            |
| GET`/estudios/{id}/protocolos`  | Investigador, Asistente, Director    | puede_consultar                             | —                                                                              | Versiones de protocolo y su estado CEC.                                                 |
| POST`/estudios/{id}/protocolos` | Investigador (responsable)           | puede_modificar                             | version, documento (PDF)                                                       | `protocolo_version` con `estado_cec: pendiente`.                                        |
| PATCH`/protocolos/{id}/cec`     | Investigador (responsable), Director | puede_modificar                             | estado_cec, codigo_aprobacion_cec, fecha_aprobacion_cec, fecha_vencimiento_cec | Protocolo actualizado.                                                                  |

</div>

<div class="section">

## 5. Membresías de estudio

El Investigador responsable administra el acceso de asistentes, estudiantes e invitados a sus estudios, con permisos diferenciados (objetivo 8, RNF-SEC-05).

| Recurso                                          | Rol autorizado                       | Permiso en estudio | Entrada                                                                                                              | Salida                                                                                                                                  |
|--------------------------------------------------|--------------------------------------|--------------------|----------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| GET`/estudios/{id}/membresias`                   | Investigador (responsable), Director | puede_consultar    | —                                                                                                                    | Membresías con sus cinco permisos y vigencia.                                                                                           |
| POST`/estudios/{id}/membresias`                  | Investigador (responsable), Director | puede_modificar    | id_usuario, puede_consultar, puede_cargar, puede_modificar, puede_descargar, puede_exportar, fecha_inicio, fecha_fin | Membresía creada (`id_otorgante` = usuario actual). A un Invitado solo se le puede dar `puede_consultar`, y `fecha_fin` es obligatoria. |
| PATCH`/estudios/{id}/membresias/{id_membresia}`  | Investigador (responsable), Director | puede_modificar    | permisos, fecha_fin                                                                                                  | Membresía actualizada.                                                                                                                  |
| DELETE`/estudios/{id}/membresias/{id_membresia}` | Investigador (responsable), Director | puede_modificar    | —                                                                                                                    | Acceso revocado.                                                                                                                        |

</div>

<div class="section">

## 6. Identidades (UX Lab ID) y representación legal

Único módulo que escribe en `identity_schema` (objetivo 2). Ningún endpoint de esta sección devuelve datos personales, salvo *desenmascarar*.

<table>
<colgroup>
<col style="width: 20%" />
<col style="width: 20%" />
<col style="width: 20%" />
<col style="width: 20%" />
<col style="width: 20%" />
</colgroup>
<thead>
<tr class="header">
<th>Recurso</th>
<th>Rol autorizado</th>
<th>Permiso en estudio</th>
<th>Entrada</th>
<th>Salida</th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td>POST<code>/identidades</code></td>
<td>Investigador, Asistente</td>
<td>— (sin estudio)</td>
<td>rut (opcional), nombre, <strong>correo</strong>, <strong>telefono</strong>, fecha_nacimiento, tipo<br />
<span class="small">v3.1: correo y teléfono obligatorios (decisión del 06/10, ADR-002 D1). Si es menor sin datos propios, se ingresan los de su representante.</span></td>
<td>Solo el <code>ux_lab_id</code> generado. El servidor cifra nombre, correo, teléfono y RUT y calcula sus hashes; el cliente nunca envía ni recibe datos cifrados.</td>
</tr>
<tr class="even">
<td>POST<code>/identidades/buscar</code></td>
<td>Investigador, Asistente</td>
<td>— (sin estudio)</td>
<td>rut <em>o</em> correo</td>
<td>Solo el <code>ux_lab_id</code> si la persona ya existe (para no duplicarla), sin ningún dato personal.</td>
</tr>
<tr class="odd">
<td>POST<code>/representaciones</code></td>
<td>Investigador, Asistente</td>
<td>— (sin estudio)</td>
<td>ux_lab_id_representante, ux_lab_id_representado, relacion, fecha_inicio</td>
<td><code>id_representacion</code>.</td>
</tr>
<tr class="even">
<td>POST<code>/identidades/{ux_lab_id}/desenmascarar</code></td>
<td>Director; Investigador o Asistente con autorización <code>ver_identidad</code> aprobada y vigente del mismo estudio</td>
<td><code>identidad/leer</code>: Director global; Investigador/Asistente con alcance de estudio más autorización especial. La membresía sola no basta.</td>
<td>JSON: justificacion (20 a 2000 caracteres en el código revisado), id_estudio</td>
<td>200: ux_lab_id, rut, nombre, correo, telefono y fecha_nacimiento. La identidad debe participar en el estudio; si no, 404 sin revelar su existencia. Auditoría desenmascarar con justificación y estudio; Cache-Control: no-store. Estudiante, Invitado y Soporte excluidos (D13).</td>
</tr>
<tr class="odd">
<td>POST<code>/identidades/{ux_lab_id}/supresion</code></td>
<td>Director</td>
<td>— (global)</td>
<td>motivo, evidencia de la solicitud</td>
<td>Registra <code>fecha_revocacion</code> y programa <code>fecha_eliminacion</code>; al vencer, un proceso borra <code>vinculo_identidad</code> e <code>identidad</code>. Auditado como <code>revocar</code>.</td>
</tr>
</tbody>
</table>

</div>

<div class="section">

## 7. Participaciones y sesiones de investigación

Trabajo diario del equipo, siempre con códigos seudónimos (objetivos 3 y 6). Ninguna respuesta incluye datos personales ni el `ux_lab_id`.

<table>
<colgroup>
<col style="width: 20%" />
<col style="width: 20%" />
<col style="width: 20%" />
<col style="width: 20%" />
<col style="width: 20%" />
</colgroup>
<thead>
<tr class="header">
<th>Recurso</th>
<th>Rol autorizado</th>
<th>Permiso en estudio</th>
<th>Entrada</th>
<th>Salida</th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td>POST<code>/estudios/{id}/participaciones</code></td>
<td>Investigador, Asistente</td>
<td>puede_cargar</td>
<td>ux_lab_id</td>
<td><code>id_participacion</code> y <code>codigo_seudonimo</code> aleatorio (ej. <code>P-7K3QX9</code>). Si la persona aún no es participante, crea <code>participante</code> y <code>vinculo_identidad</code>. Calcula <code>es_menor_al_enrolar</code>.</td>
</tr>
<tr class="even">
<td>GET<code>/estudios/{id}/participaciones</code></td>
<td>Investigador, Asistente, Estudiante</td>
<td>puede_consultar</td>
<td>filtro: estado</td>
<td>Participaciones con seudónimo, estado y si era menor al enrolar.</td>
</tr>
<tr class="odd">
<td>PATCH<code>/participaciones/{id}/estado</code></td>
<td>Investigador, Asistente</td>
<td>puede_modificar</td>
<td>estado (activo / retirado)</td>
<td>Participación actualizada; no afecta <code>participante.estado</code>.</td>
</tr>
<tr class="even">
<td>POST<code>/participaciones/{id}/contacto</code></td>
<td>Investigador responsable del estudio, Director</td>
<td><code>contacto_participante/leer</code>: Investigador responsable del estudio o Director con alcance global</td>
<td>motivo (coordinar_sesion / reconsentimiento / incidente / retiro / otro), detalle (obligatorio si es otro)</td>
<td>Solo <strong>codigo_seudonimo, nombre, correo y telefono</strong> para contactar a la persona; nunca RUT ni fecha de nacimiento. Motivo obligatorio; queda en auditoría como <code>desenmascarar</code> con la justificación. Si la participación está retirada, solo se acepta el motivo <em>retiro</em>.<br />
<span class="small">v3.1: ADR-002 D8 y D12. Cache-Control: no-store. Motivo inválido u otro sin detalle: 400; participación retirada con motivo distinto de retiro: 409.</span></td>
</tr>
<tr class="odd">
<td>GET<code>/participaciones/{id}/sesiones</code></td>
<td>Investigador, Asistente, Estudiante</td>
<td>puede_consultar</td>
<td>—</td>
<td>Sesiones de investigación de la participación.</td>
</tr>
<tr class="even">
<td>POST<code>/participaciones/{id}/sesiones</code></td>
<td>Investigador, Asistente</td>
<td>puede_modificar</td>
<td>fecha_programada, tecnicas, id_responsable</td>
<td><code>sesion_investigacion</code> en estado <code>programada</code>. Rechaza con 409 si no hay consentimiento vigente.</td>
</tr>
<tr class="odd">
<td>PATCH<code>/sesiones-investigacion/{id}</code></td>
<td>Investigador, Asistente</td>
<td>puede_modificar</td>
<td>estado, fecha_realizada, observaciones</td>
<td>Sesión actualizada.</td>
</tr>
</tbody>
</table>

</div>

<div class="section">

## 8. Consentimientos y asentimientos


Referencia: rama `feature/consentimientos`, commit `85c6133a299848c81d000e5417f40a2dae9dabf9`. Contrato detallado y ejemplos en [consentimientos.md](../api/consentimientos.md).

| Método | Ruta | Entrada / filtros | Salida |
|---|---|---|---|
| POST | /estudios/{idEstudio}/documentos-consentimiento | multipart: tipo, version, archivo PDF | 201 documento, hash y vigencia |
| GET | /estudios/{idEstudio}/documentos-consentimiento | tipo opcional; vigente=true opcional | 200 arreglo de documentos |
| POST | /participaciones/{idParticipacion}/consentimientos | multipart: tipo_evento aceptar/negar, tipo, version, evidencia, id_representacion cuando corresponde | 201 decisión, hash y estado |
| GET | /participaciones/{idParticipacion}/consentimientos | idParticipacion | 200 seudónimo, completo, estados e historial |
| POST | /consentimientos/{idConsentimiento}/eventos | multipart: tipo_evento negar/retirar/reconsentir; version y evidencia para reconsentir; representante cuando corresponde | 201 evento, estado y participacion_estado |

Autenticación Bearer. GET requiere permiso leer y puede_consultar; POST requiere crear y puede_cargar, sujeto al control de alcance global. Para documentos, el plan pide investigador responsable con puede_modificar: mantener esta discrepancia identificada hasta la decisión del líder.

Documentos PDF y evidencias PDF/JPEG/PNG de máximo 10 MiB. La API usa archivos multipart, no evidencia_base64 ni id_documento como entrada de la decisión. La versión vigente se resuelve por estudio y tipo. El campo id_protocolo se devuelve actualmente como NULL. Las respuestas no exponen rutas físicas.

Estados actuales: sin_registro, otorgado, negado y revocado. Estado de participación tras retiro: retirado. Pendientes: pendiente_reconsentir (H-14), bloqueo de eventos tras retiro (H-15) y unificación revocado/retirado. El valor completo no garantiza vigencia documental mientras exista H-14.

Evidencia obligatoria en el código para aceptar/reconsentir; opcional para negar/retirar. El plan exige evidencia en todos los eventos: diferencia pendiente de resolución.

Errores: 400 datos inválidos; 401 autenticación; 403 permisos; 404 recurso/versión; 409 duplicados, versión no vigente, representación, participación retirada o transición inválida; 413 tamaño; 415 formato.

### Alcance reservado

- Act. 57: certificado GET /participaciones/{id}/consentimientos/certificado, descarga GET /eventos-consentimiento/{id}/evidencia y consolidación de auditoría. No documentarlos como disponibles en Act. 55.
- Act. 73: bloqueo de sesiones/archivos sin consentimiento vigente.

### Condiciones para cerrar

Corregir H-14/H-15 y repetir CP-20b/CP-21/CP-23; repetir CP-18 con participación activa; resolver permisos, evidencia y nomenclatura. Conservar la nota de Felipe al final de la guía, identificada como texto original pendiente de revisión de sus afirmaciones legales.

### Roles y permisos previstos para Act. 57

| Ruta prevista | Roles previstos en v3.1 | Permiso | Salida prevista |
|---|---|---|---|
| GET /participaciones/{id}/consentimientos/certificado | Investigador responsable, Director | puede_descargar | PDF de trazabilidad sin datos personales |
| GET /eventos-consentimiento/{id}/evidencia | Investigador, Asistente | puede_descargar | Archivo en stream; auditoría descargar |

Estos endpoints conservan su carácter planificado; esta actualización no acredita su implementación.

## 9. Archivos de investigación

Repositorio de archivos con metadatos, versiones y validación de extensiones (objetivo 9). El hash SHA-256 se calcula en streaming al recibir (RNF-SEC-03); los originales nunca se sobrescriben.

| Recurso                               | Rol autorizado                                                                      | Permiso en estudio | Entrada                                                                                  | Salida                                                                                                                                                                                                                                                |
|---------------------------------------|-------------------------------------------------------------------------------------|--------------------|------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| POST`/participaciones/{id}/registros` | Investigador, Asistente; Soporte con autorización                                   | puede_cargar       | archivo (multipart), tipo_dato, dispositivo_origen, id_sesion_investigacion, es_sensible | Metadatos del registro: extensión y MIME validados por el servidor, tamaño, hash, versión 1. Rechaza con 415 las extensiones fuera de la lista permitida y con 409 si la participación no tiene consentimiento vigente (ver regla de consentimiento). |
| POST`/registros/{id}/versiones`       | Investigador, Asistente                                                             | puede_cargar       | archivo (multipart)                                                                      | Nueva versión (`id_registro_anterior`); el original queda intacto.                                                                                                                                                                                    |
| GET`/participaciones/{id}/registros`  | Investigador, Asistente, Estudiante, Invitado                                       | puede_consultar    | filtros: tipo_dato, sesión                                                               | Metadatos de los archivos. Para Estudiante e Invitado, los archivos `es_sensible` solo aparecen si tienen una autorización vigente.                                                                                                                   |
| GET`/registros/{id}/descarga`         | Investigador, Asistente; Estudiante o Invitado con autorización `descarga_original` | puede_descargar    | —                                                                                        | Archivo (stream). Auditado como `descargar`.                                                                                                                                                                                                          |

</div>

<div class="section">

## 10. Exportaciones desidentificadas

Paquetes con códigos independientes del seudónimo (objetivo 11). Un Estudiante no exporta sin aprobación del Investigador responsable.

| Recurso                               | Rol autorizado                                    | Permiso en estudio | Entrada                               | Salida                                                                                                                                                                                                                                                                                                          |
|---------------------------------------|---------------------------------------------------|--------------------|---------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| POST`/estudios/{id}/exportaciones`    | Investigador, Estudiante                          | puede_exportar     | proposito, filtros                    | `exportacion` con `codigo_exportacion` aleatorio. Estado `aprobada` si la pide el Investigador responsable; `solicitada` en otro caso. Excluye siempre las participaciones `retirado`, los datos personales, las fechas exactas de sesión y los archivos sensibles identificables (salvo autorización del CEC). |
| PATCH`/exportaciones/{id}/aprobacion` | Investigador (responsable), Director              | puede_modificar    | decision (aprobar / rechazar), motivo | Exportación `aprobada` (pasa a `procesando`) o `rechazada`.                                                                                                                                                                                                                                                     |
| GET`/exportaciones/{id}`              | Solicitante, Investigador (responsable), Director | puede_consultar    | —                                     | Estado del paquete.                                                                                                                                                                                                                                                                                             |
| GET`/exportaciones/{id}/descarga`     | Solicitante, Investigador (responsable)           | puede_exportar     | —                                     | Paquete .zip con los datos y un `codigo_en_exportacion` por participante; sin seudónimos ni identidades. Auditado como `exportar`.                                                                                                                                                                              |

</div>

<div class="section">

## 11. Autorizaciones especiales

Accesos expresos, temporales y auditados para Soporte, Asistentes, Estudiantes e Invitados (perfiles del cliente).

| Recurso                     | Rol autorizado                                                                     | Permiso en estudio       | Entrada                                                                    | Salida                                                                            |
|-----------------------------|------------------------------------------------------------------------------------|--------------------------|----------------------------------------------------------------------------|-----------------------------------------------------------------------------------|
| POST`/autorizaciones`       | Cualquier usuario autenticado                                                      | — (se valida al aprobar) | id_estudio, tipo, recurso, id_registro_objetivo, motivo, fecha_vencimiento | `autorizacion` en estado `pendiente`.                                             |
| GET`/autorizaciones`        | Director (todas), Investigador (las de sus estudios), solicitante (las propias)    | — (global)               | filtros: estado, id_estudio                                                | Lista de autorizaciones.                                                          |
| PATCH`/autorizaciones/{id}` | Investigador (responsable del estudio), Director; `ver_identidad` solo el Director | — (global)               | decision (aprobar / rechazar)                                              | Autorización `aprobada` o `rechazada`, con `id_autorizador` y `fecha_resolucion`. |

</div>

<div class="section">

## 12. Auditoría y plantillas

Consulta de la bitácora append-only (objetivo 10) y plantilla para la futura importación desde Excel (alcance).

| Recurso                                    | Rol autorizado          | Permiso en estudio | Entrada                                                             | Salida                                                                                                                  |
|--------------------------------------------|-------------------------|--------------------|---------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------|
| GET`/auditoria`                            | Director                | — (global)         | filtros: id_usuario, id_estudio, accion, resultado, rango de fechas | Registros de auditoría (solo lectura; no existe PUT ni DELETE).                                                         |
| GET`/plantillas/importacion-participantes` | Investigador, Asistente | — (global)         | —                                                                   | Archivo .xlsx con las columnas que aceptará la futura importación. La importación en sí queda para una etapa posterior. |

</div>

<div class="section">

## 13. Pendiente de validación

### Para revisar con el equipo antes de implementar

- Endpoints de solo lectura para Invitados sobre “resultados o informes seleccionados”: hoy reutilizan `GET /estudios/{id}` y `GET /participaciones/{id}/registros` con `puede_consultar`. Confirmar si basta.
- Formato exacto del paquete de exportación (estructura del .zip, diccionario de variables incluido).
- Límite de tamaño y procesamiento asíncrono de cargas grandes (supuesto RNF-PER-02, archivos de hasta 1 GB).
- Plazo legal entre la solicitud de supresión y el borrado definitivo (con asesoría jurídica).
- Qué pasa con los datos ya recolectados de una persona que se retira de un estudio (definir con el CEC).

</div>

plaGesEtic · Observatorio UX / UXLab UTEM Gestión de Proyectos de Ingeniería (2026-II) · Octubre 2026
