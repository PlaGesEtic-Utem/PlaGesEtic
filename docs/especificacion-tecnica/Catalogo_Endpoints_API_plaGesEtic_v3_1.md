> Actualización documental de la sección 8 (Actividad 55) y de las reglas generales, identidades y contacto (Actividad 56). Se conserva el diseño de las demás secciones. Este catálogo distingue el contrato acordado de la implementación y no acredita cierre de pruebas. [Fuente original](https://drive.google.com/file/d/172V5EtjaF20uoevILh5StJMz4zkU-C_g/view).

> Actividad 73: secciones 3 y 5 contrastadas con el backend de `develop` (`09d266a`). Las demás secciones mantienen su contenido previo.

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

Contrato revisado en `feature/act74-seguridad`, commit `e8f96f21b9aafc5dba7c85bc0061140f2afe8772`.

Describe el código disponible en esa rama. No certifica integración en `develop` ni pruebas aprobadas.

Las rutas se expresan sin prefijo `/api/v1`; el proxy de demostración utiliza `/api`.

### Rutas y respuestas

| Método y ruta | Acceso | Entrada JSON | Respuesta correcta (200) |
|---|---|---|---|
| `POST /auth/login` | Público; cuenta activa y no vencida | `correo`, `password` | Con MFA activo: `token_temporal`, `mfa_requerido: true`, `expira_en_segundos: 300`. Sin MFA activo: `token_temporal`, `enrolamiento_requerido: true`, `expira_en_segundos: 300`. No entrega una sesión en este paso. |
| `POST /auth/mfa/enrolar` | Token temporal de tipo `enrolar` en el cuerpo; no requiere sesión Bearer | `token_temporal` | `otpauth_uri`, `secreto`. El secreto se guarda cifrado y MFA permanece inactivo. El frontend debe representar la URI como QR. |
| `POST /auth/mfa/confirmar` | Token temporal de tipo `enrolar` | `token_temporal`, `codigo` TOTP | `codigos_recuperacion` (diez), nuevo `token_temporal` de tipo `mfa`, `expira_en_segundos: 300`. Activa MFA después de un código válido. No entrega una sesión todavía. |
| `POST /auth/login/mfa` | Token temporal de tipo `mfa` | `token_temporal` y exactamente uno: `codigo` o `codigo_recuperacion` | `token` de sesión, `expira_por_inactividad` y `usuario` con `nombre`, `correo`, `rol`, `debe_cambiar_password`. |
| `POST /auth/password` | `Authorization: Bearer <TOKEN_SESION>`; permitida con cambio obligatorio pendiente | `password_actual`, `password_nueva` | `{"mensaje":"Contraseña actualizada."}`. Elimina la obligación de cambio. |
| `POST /auth/logout` | Sesión Bearer; permitida con cambio obligatorio pendiente | Sin campos obligatorios | `{"mensaje":"Sesión cerrada."}`. Cierra la sesión actual. |

`POST /auth/mfa/codigos` pertenece al diseño previo, pero no está montada en la rama revisada. La regeneración de códigos mediante esa ruta queda pendiente.

### Flujo de primer ingreso

1. Enviar correo y contraseña a `/auth/login`. Si devuelve `enrolamiento_requerido: true`, utilizar el token temporal para enrolar y confirmar.
2. Solicitar el enrolamiento y mostrar el QR generado desde `otpauth_uri`. La respuesta contiene material secreto y no debe incluirse en registros ni capturas compartidas.
3. Enviar el primer TOTP a `/auth/mfa/confirmar`. Un código inválido no activa MFA.
4. La confirmación correcta activa MFA, guarda los hashes de diez códigos de recuperación y entrega esos códigos al usuario para que los conserve de forma segura.
5. Utilizar el nuevo token de tipo `mfa` en `/auth/login/mfa`, junto con un código válido, para obtener la sesión.
6. Si `debe_cambiar_password` es verdadero, cambiar la contraseña antes del acceso operativo. Con esa condición, el middleware permite únicamente `/auth/password` y `/auth/logout`.

Volver a llamar a enrolar mientras MFA sigue inactivo genera un nuevo secreto pendiente; el QR anterior deja de corresponder. La implementación no limita la emisión del QR a una sola llamada. Si MFA ya está activo, responde 409.

El frontend revisado todavía consulta el QR de demostración mediante `/otpauth` y no implementa este flujo completo. La conexión con enrolar y confirmar queda pendiente.

### Política de contraseña

**Regla requerida por la Actividad 74:**

- Mínimo 12 caracteres.
- Distinta del correo.
- Aplicación en cambio de contraseña y creación de usuarios.

**Comportamiento observado:**

- El cambio exige un mínimo de 12 caracteres.
- La contraseña nueva debe ser distinta de la actual.
- Se valida la contraseña actual antes del cambio.
- La contraseña nueva se almacena mediante Argon2id.
- El alta y restablecimiento de usuarios generan una contraseña temporal de 14 caracteres desde el servidor.
- El alta no recibe una contraseña elegida por el administrador.
- La cuenta exige un cambio posterior de contraseña.

**Pendiente:** incorporar la comparación explícita con el correo y verificar la regla completa en alta, restablecimiento y cambio.

### Errores y límites

| HTTP / código | Situación |
|---|---|
| `400 SOLICITUD_INVALIDA` | Campos obligatorios ausentes, contraseña nueva corta o igual a la actual, selección incorrecta entre TOTP y recuperación, o confirmación sin haber generado el QR. |
| `401 CREDENCIALES_INVALIDAS` | Login inválido, incluida cuenta bloqueada o vencida, con mensaje genérico; también contraseña actual incorrecta durante el cambio. |
| `401 TOKEN_TEMPORAL_INVALIDO` | Token temporal inválido o vencido. |
| `401 NO_AUTENTICADO` | Token de tipo incorrecto, cuenta no utilizable en enrolamiento o confirmación, o sesión no válida. |
| `401 CODIGO_INVALIDO` | TOTP incorrecto, código de recuperación inválido o usado en login MFA, o TOTP incorrecto en confirmación. |
| `409 MFA_YA_ACTIVO` | Intento de enrolar o confirmar una cuenta que ya tiene MFA activo. |
| `429` | Límite de solicitudes. `DEMASIADOS_INTENTOS` identifica el control de fallos de autenticación. |

Los tokens temporales duran 300 segundos.

La sesión tiene un límite de 30 minutos de inactividad y una duración máxima de 8 horas.

Login, login MFA, enrolar y confirmar comparten el limitador de rutas configurado a 20 solicitudes por minuto. Login y las verificaciones MFA aplican además el control de cinco fallos en una ventana de 15 minutos.

### Ejemplos de solicitud

Los siguientes ejemplos muestran el formato de las solicitudes. No constituyen pruebas ejecutadas ni contienen credenciales reales.

**Generar el enrolamiento:**

```http
POST /auth/mfa/enrolar
Content-Type: application/json

{
  "token_temporal": "<TOKEN_DE_ENROLAMIENTO>"
}
```

**Confirmar el primer código:**

```http
POST /auth/mfa/confirmar
Content-Type: application/json

{
  "token_temporal": "<TOKEN_DE_ENROLAMIENTO>",
  "codigo": "<TOTP_ACTUAL>"
}
```

**Cambiar la contraseña:**

```http
POST /auth/password
Authorization: Bearer <TOKEN_DE_SESION>
Content-Type: application/json

{
  "password_actual": "<ACTUAL>",
  "password_nueva": "<NUEVA_DE_AL_MENOS_12_CARACTERES>"
}
```

### Trazabilidad y pendientes

El enrolamiento y la confirmación correctos marcan la acción `actualizar` sobre la entidad `usuario`. Un código incorrecto en confirmación marca `login_fallido`.

Debe comprobarse que los registros efectivos y sus resultados queden en la auditoría.

La actualización del catálogo no acredita por sí sola el cierre de CA-17 ni de la Actividad 74. Quedan pendientes la integración del frontend, la comparación de contraseña con correo y las evidencias de las pruebas correspondientes.

Ver [controles de seguridad](../seguridad/controles.md).
</div>

<div class="section">

## 3. Usuarios, sesiones y permisos

### Usuarios — contrato implementado en la Actividad 73

Revisión del código de `develop`, commit `09d266aa356b40cbbbca364ab4e2e540c3845641`. Las rutas se expresan sin prefijo `/api/v1`: la aplicación monta estas rutas en la raíz. En el servidor de demostración del frontend, `/api` es el prefijo del proxy.

Todas requieren `Authorization: Bearer <TOKEN>` de una sesión vigente, cuenta activa y no vencida, sin cambio obligatorio de contraseña pendiente. Las respuestas son JSON. Los permisos indicados corresponden a `backend/db/init/05_permisos_base.sql`; deben contrastarse con la configuración de la base utilizada.

| Método y ruta | Permiso del rol / alcance | Entrada | Respuesta correcta |
|---|---|---|---|
| `GET /usuarios` | Director y Soporte: `usuario/leer`, global | Query opcional: `rol`, `activo` | `200`: arreglo de cuentas, ordenado por nombre; sin paginación implementada. |
| `GET /usuarios/{idUsuario}` | Director y Soporte: `usuario/leer`, global | UUID del usuario | `200`: cuenta con arreglo `membresias` vigentes. |
| `POST /usuarios` | Director y Soporte: `usuario/crear`, global | `nombre`, `correo`, `rol`, `fecha_expiracion` | `201`: cuenta creada y `password_temporal`. |
| `PATCH /usuarios/{idUsuario}` | Director y Soporte: `usuario/actualizar`, global | UUID y al menos un campo admitido de actualización | `200`: cuenta actualizada; incluye `password_temporal` solo si se restableció la contraseña. |

### Entradas y reglas de cuentas

- `nombre`: texto obligatorio, no vacío, máximo 150 caracteres; se recortan espacios en extremos.
- `correo`: obligatorio, máximo 150 caracteres, con formato de correo; se recortan espacios y se convierte a minúsculas.
- `rol`: nombre exacto entre `Director`, `Soporte`, `Investigador`, `Asistente`, `Estudiante` e `Invitado`. Se utiliza `rol`, no `id_rol`, tanto en el alta como en el filtro y la actualización.
- `fecha_expiracion`: fecha `AAAA-MM-DD` posterior a hoy. Puede omitirse o ser `null` para roles no temporales. Es obligatoria para **Estudiante e Invitado**.
- El filtro `activo` admite las cadenas `true` y `false`; omitido o vacío no filtra. `rol` omitido o vacío tampoco filtra.
- El alta genera una contraseña temporal de 14 caracteres y guarda su hash Argon2id. La cuenta nace con `activo: true`, `debe_cambiar_password: true` y `mfa_activo: false`.
- `PATCH` admite `activo` booleano, `rol`, `fecha_expiracion`, `restablecer_password: true` y `reiniciar_mfa: true`. Los dos últimos solo admiten `true` cuando se envían. No implementa edición de nombre ni correo.
- Soporte no puede crear ni modificar cuentas de Director, ni asignar ese rol. Esta restricción es de escritura; la lectura de cuentas sigue disponible según `usuario/leer`.
- No se permite bloquear la propia cuenta ni enviar un cambio de rol sobre ella.
- Bloquear, restablecer la contraseña o reiniciar MFA cierra las sesiones abiertas de la cuenta. El cambio de rol o de fecha de expiración por sí solo no ejecuta ese cierre en el repositorio revisado.
- Reiniciar MFA deja `mfa_activo: false`, elimina el secreto y los códigos de recuperación. No constituye un enrolamiento nuevo.

### Campos de respuesta de cuentas

La cuenta contiene `id_usuario`, `nombre`, `correo`, `nombre_rol`, `activo`, `mfa_activo`, `debe_cambiar_password`, `fecha_expiracion` y `fecha_creacion`. No entrega `hash_password` ni `mfa_secret`. El nombre y el correo corresponden a la cuenta del sistema, no a una identidad de participante.

La consulta individual agrega `membresias`, con `id_membresia`, `id_estudio`, `codigo_estudio`, los cinco permisos `puede_*`, `fecha_inicio` y `fecha_fin`. Incluye las vigentes por fechas.

`password_temporal` se entrega únicamente en la respuesta de creación o restablecimiento; no aparece en consultas posteriores. No incorporarlo a capturas ni reportes de pruebas compartidos.

### Ejemplos de solicitudes

Ejemplos ilustrativos, no evidencias de pruebas ejecutadas. Sustituir los identificadores por UUID existentes y utilizar una fecha futura al momento de probar.

```http
GET /usuarios?rol=Investigador&activo=true
Authorization: Bearer <TOKEN_DIRECTOR_O_SOPORTE>
```

```json
{
  "nombre": "Usuario de prueba",
  "correo": "usuario.ejemplo@example.test",
  "rol": "Estudiante",
  "fecha_expiracion": "2027-12-31"
}
```

El cuerpo anterior corresponde a `POST /usuarios`. Para bloquear una cuenta mediante `PATCH /usuarios/{idUsuario}`:

```json
{ "activo": false }
```

### Errores de cuentas

Formato común: `{ "error": { "codigo": "...", "mensaje": "..." } }`.

| HTTP | Código | Situación |
|---|---|---|
| 400 | `SOLICITUD_INVALIDA` | UUID, filtros, rol, fecha o campos inválidos; falta expiración para un rol temporal; actualización sin cambios admitidos. |
| 401 | `NO_AUTENTICADO` | Falta token válido, sesión vigente o cuenta habilitada. |
| 403 | `CAMBIO_PASSWORD_REQUERIDO` | La cuenta autenticada debe cambiar su contraseña antes de administrar usuarios. |
| 403 | `SIN_PERMISO` | Falta permiso del rol o se intenta administrar una cuenta de Director sin ser Director. |
| 404 | `NO_ENCONTRADO` | El usuario solicitado no existe. |
| 409 | `CORREO_DUPLICADO` | Ya existe una cuenta con el correo indicado. |
| 409 | `CAMBIO_PROPIO` | Se intenta bloquear la propia cuenta o cambiar su rol. |

### Sesiones y permisos del diseño anterior

Las siguientes rutas se conservan como referencia de diseño: **no están montadas en el backend revisado**.

| Ruta prevista | Finalidad prevista |
|---|---|
| `GET /usuarios/{id}/sesiones` | Consultar sesiones de una cuenta. |
| `DELETE /sesiones/{id_sesion}` | Cerrar una sesión seleccionada. |
| `GET /roles/{id}/permisos` | Consultar permisos de un rol. |
| `PUT /roles/{id}/permisos` | Reemplazar permisos de un rol. |

Las rutas separadas `/usuarios/{id}/estado`, `/usuarios/{id}/rol`, `/usuarios/{id}/password/reset` y `/usuarios/{id}/mfa/reset` del diseño anterior se sustituyen, en el contrato implementado, por `PATCH /usuarios/{idUsuario}` con los campos descritos arriba.

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

### Membresías — contrato implementado en la Actividad 73

Misma referencia de código y requisitos de autenticación de la sección 3. El recurso usado por el control de acceso es **`membresia`**; `membresia_estudio` es el nombre de la tabla.

| Método y ruta | Rol y permiso base | Control en el estudio | Entrada | Respuesta correcta |
|---|---|---|---|---|
| `GET /estudios/{idEstudio}/membresias` | Director: `membresia/leer` global; Investigador: `membresia/leer` de estudio | Director sin membresía; Investigador con `puede_consultar` o autorización aplicable | UUID del estudio; query opcional `todas=true` | `200`: arreglo de membresías, ordenado por nombre. |
| `POST /estudios/{idEstudio}/membresias` | Investigador: `membresia/crear` | `puede_modificar` o autorización aplicable; estudio no cerrado | `id_usuario`, cinco permisos `puede_*`, `fecha_fin` | `201`: membresía creada o reactivada. |
| `DELETE /estudios/{idEstudio}/membresias/{idMembresia}` | Investigador: `membresia/actualizar` | `puede_modificar` o autorización aplicable; estudio no cerrado | UUID del estudio y de la membresía; sin cuerpo requerido | `200`: membresía revocada, con `vigente: false`. |

Con los permisos base revisados, **Director solo consulta membresías** y Soporte no tiene permisos sobre este recurso. Una autorización especial no sustituye la necesidad de que el rol tenga el permiso de la acción.

### Entradas, vigencia y revocación

- `id_usuario`: UUID obligatorio de una cuenta existente y activa.
- `puede_consultar`, `puede_cargar`, `puede_modificar`, `puede_descargar` y `puede_exportar`: booleanos. Si se omiten, consultar vale `true` y los otros cuatro valen `false`. `puede_consultar: false` se rechaza.
- `fecha_fin`: opcional o `null`; cuando se envía una fecha, debe tener formato `AAAA-MM-DD` y no ser anterior a hoy.
- Si la cuenta tiene expiración, una fecha final omitida o posterior se ajusta a la expiración de la cuenta.
- Director y Soporte no pueden ser destinatarios de una membresía.
- `fecha_inicio` e `id_otorgante` los asigna el servidor: fecha actual de la base y usuario autenticado. No son entradas configurables del alta.
- La vigencia depende de `fecha_inicio <= CURRENT_DATE` y de una `fecha_fin` nula o igual/posterior a la fecha actual. No equivale por sí sola a que la cuenta esté activa.
- El listado devuelve solo vigentes por defecto. Únicamente `todas=true` incluye también las no vigentes; no implementa paginación.
- Si ya existe una membresía vigente del usuario en el estudio, el alta responde `409`. Si la existente no está vigente, reutiliza su fila e identificador y reemplaza permisos, otorgante y fechas.
- Revocar conserva la fila y fija `fecha_fin` en el día anterior. No se puede revocar la membresía del responsable del estudio.
- No existe `PATCH /estudios/{idEstudio}/membresias/{idMembresia}` en las rutas revisadas. No documentar esa operación como disponible.

### Campos de respuesta de membresías

Cada objeto contiene `id_membresia`, `id_usuario`, `nombre`, `correo`, `nombre_rol`, los cinco permisos `puede_*`, `fecha_inicio`, `fecha_fin` y `vigente`. El listado, el alta y la revocación no incluyen `id_estudio` ni `id_otorgante` en la respuesta del controlador revisado.

### Ejemplo de alta

`POST /estudios/{idEstudio}/membresias`, con token de un Investigador autorizado. Sustituir el UUID por el de una cuenta existente. Ejemplo ilustrativo:

```json
{
  "id_usuario": "11111111-1111-4111-8111-111111111111",
  "puede_consultar": true,
  "puede_cargar": true,
  "puede_modificar": false,
  "puede_descargar": false,
  "puede_exportar": false,
  "fecha_fin": "2027-12-31"
}
```

El servidor puede reducir `fecha_fin` si la cuenta vence antes. Consultar después el listado permite comprobar los permisos y fechas devueltos.

### Errores de membresías

| HTTP | Código | Situación |
|---|---|---|
| 400 | `SOLICITUD_INVALIDA` | UUID o fecha inválidos, permiso no booleano, consultar deshabilitado o destinatario Director/Soporte. |
| 401 | `NO_AUTENTICADO` | Falta autenticación válida. |
| 403 | `CAMBIO_PASSWORD_REQUERIDO` | Cambio obligatorio de contraseña pendiente en la cuenta autenticada. |
| 403 | `SIN_PERMISO` | Falta permiso del rol o acceso suficiente al estudio. |
| 404 | `NO_ENCONTRADO` | Usuario destinatario inexistente; membresía inexistente o de otro estudio al revocar. |
| 409 | `ESTUDIO_CERRADO` | Se intenta otorgar o revocar una membresía en un estudio cerrado. |
| 409 | `USUARIO_BLOQUEADO` | La cuenta destinataria está inactiva. |
| 409 | `MEMBRESIA_EXISTENTE` | El usuario ya tiene una membresía vigente en el estudio. |
| 409 | `MEMBRESIA_NO_VIGENTE` | Se intenta revocar una membresía no vigente. |
| 409 | `RESPONSABLE_DEL_ESTUDIO` | Se intenta revocar la membresía del responsable. |

### Auditoría y diferencias por validar

Las rutas marcan `usuario` con acciones `leer`, `crear` o `actualizar`; las de membresías marcan `membresia` con `leer`, `crear` o `revocar`. Para revocar, el permiso evaluado es `actualizar`, aunque la acción auditada es `revocar`.

Diferencias respecto del diseño anterior que requieren revisión del equipo:

1. El Director no tiene alta ni revocación de membresías en los permisos base actuales.
2. El alta y la revocación verifican el rol y el acceso al estudio, pero no exigen que el actor sea específicamente `id_responsable`. Un Investigador con el permiso requerido puede pasar ese control.
3. El servicio de membresías no restringe al Invitado a solo consultar: acepta los cinco booleanos. El acceso final sigue sujeto a los permisos globales del rol. Confirmar y probar la regla prevista para Invitado.
4. El alta comprueba `activo` del destinatario, pero no rechaza explícitamente una cuenta ya expirada antes de ajustar `fecha_fin`. Revisar este caso con pruebas.
5. No hay actualización directa de una membresía vigente mediante `PATCH`; la reactivación por `POST` solo aplica a una fila no vigente.

Esta actualización documental no acredita ejecución de pruebas ni cierra toda la Actividad 73. La documentación de enrolamiento MFA y la regla de contraseña corresponde a la Actividad 74.

Fuentes del contrato: `backend/src/routes/protegidas.js`, `backend/src/routes/usuarios.js`, `backend/src/controllers/usuariosController.js`, servicios y repositorios `usuarios`/`membresias`, `backend/src/middlewares/controlAcceso.js`, `backend/src/middlewares/autenticacion.js` y `backend/db/init/05_permisos_base.sql`.

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

Actividad 60. Contrato revisado contra el código de `develop`, commit `24f8aaa`. Esta revisión documental no acredita la ejecución ni la aprobación de las pruebas.

Todas las rutas requieren autenticación, permiso de rol para la acción y el control de acceso al estudio correspondiente. Se publican sin el prefijo `/api/v1`.

### Rutas, entradas y salidas

| Recurso | Acceso | Permiso en estudio | Entrada | Respuesta correcta |
| --- | --- | --- | --- | --- |
| POST `/estudios/{id}/exportaciones` | Usuario con permiso `exportacion/crear`; previsto para Investigador y Estudiante | `puede_exportar` | `proposito`: `analisis`, `informe` o `publicacion`. `filtros`: objeto vacío `{}`; puede omitirse. | **201** con los metadatos de la exportación. Si solicita el responsable del estudio, se genera el paquete y se devuelve `lista` cuando la generación termina correctamente. Para otro solicitante autorizado, queda `solicitada`. |
| PATCH `/exportaciones/{id}/aprobacion` | Responsable del estudio con permiso `exportacion/aprobar` | `puede_modificar` | `decision`: `aprobar` o `rechazar`. `motivo`: texto de al menos 5 caracteres después de quitar espacios en los extremos. | **200** con los metadatos. Al aprobar, genera el paquete y devuelve `lista` si termina correctamente; al rechazar, devuelve `rechazada`. Solo admite solicitudes en estado `solicitada`. |
| GET `/exportaciones/{id}` | Solicitante o responsable del estudio, con permiso `exportacion/leer` | `puede_consultar` | Identificador de la exportación en la ruta. | **200** con los metadatos y el estado. Si el paquete estaba `lista` y ya venció, muestra `vencida`. |
| GET `/exportaciones/{id}/descarga` | Solicitante o responsable del estudio, con permiso `exportacion/descargar` | `puede_exportar` | Identificador de la exportación en la ruta. | **200** con el archivo `{codigo_exportacion}.zip`, si está listo, no ha vencido y todas las participaciones incluidas siguen siendo elegibles. |

### Metadatos de respuesta

Las rutas de creación, aprobación y consulta devuelven:

- `id_exportacion`
- `codigo_exportacion`
- `proposito`
- `estado`
- `fecha_solicitud`
- `fecha_aprobacion`
- `fecha_generacion`
- `fecha_vencimiento`

Las fechas de aprobación, generación y vencimiento pueden ser `null`, según el estado y la operación realizada.

La respuesta no incluye la ruta interna del archivo, `hash_paquete` ni la relación entre los códigos del paquete y las identidades.

El motivo de aprobación o rechazo se registra como justificación en la auditoría; no se incluye en estos metadatos.

### Contenido del paquete

El ZIP contiene únicamente:

1. **`participantes.csv`**, con las columnas:
   - `codigo_en_exportacion`: código `E-` generado para este paquete.
   - `estado_consentimiento`: `otorgado` para las participaciones elegibles.
   - `mes_inscripcion`: mes en formato `AAAA-MM`.

2. **`LEEME.txt`**, con el código del paquete, propósito, cantidad de personas incluidas y explicación del contenido y sus límites.

Solo se incluyen participaciones activas con consentimiento aceptado o reconsentido correspondiente a un documento vigente.

El CSV no incluye nombres, RUT, correo, teléfono, fecha de nacimiento, códigos `UXL-` o `P-`, identificadores internos ni fechas exactas. La API de metadatos sí devuelve las fechas de la exportación.

Esta versión no incorpora archivos de sesiones, audio, video ni EEG.

Los códigos `E-` se generan para cada paquete y su relación con las participaciones permanece dentro de la plataforma. La desidentificación reduce el riesgo de identificación, pero no garantiza anonimato total.

### Estados y generación

| Estado | Comportamiento |
| --- | --- |
| `solicitada` | Espera la decisión del responsable del estudio. No permite descargar. |
| `aprobada` | La solicitud fue aprobada y se inicia la generación del paquete. |
| `rechazada` | La solicitud fue rechazada. No permite descargar. |
| `procesando` | Estado previsto en el diseño; el servicio revisado no lo asigna explícitamente. |
| `lista` | El paquete fue generado y puede descargarse si cumple las demás validaciones. |
| `vencida` | Terminó el plazo de descarga. Se debe solicitar otra exportación. |

La generación se realiza dentro de la misma petición que crea una exportación del responsable o aprueba una solicitud.

El código revisado pasa de `aprobada` a `lista` sin registrar explícitamente `procesando`. Si falla la generación, la petición devuelve un error y la exportación puede permanecer `aprobada`; no se identificó una ruta específica de reintento.

### Vencimiento y revalidación

- El paquete tiene una vigencia de **7 días desde su generación**.
- Antes de descargar, se comprueba nuevamente la elegibilidad de las participaciones incluidas.
- Si alguna deja de ser elegible, se bloquea la descarga del paquete completo y se debe solicitar una nueva exportación.
- La consulta puede mostrar `vencida` sin actualizar el estado almacenado. El intento de descarga de un paquete `lista` cuyo plazo terminó registra el estado `vencida`.
- El vencimiento y la revalidación controlan nuevas descargas; no eliminan copias descargadas anteriormente.

### Errores

| HTTP | Código o situación | Cuándo ocurre |
| --- | --- | --- |
| 400 | Solicitud inválida | Propósito no admitido, filtros distintos de `{}`, decisión inválida, motivo insuficiente o identificador inválido. |
| 401 | Autenticación requerida o inválida | No existe una sesión válida. |
| 403 | Acceso denegado | Falta un permiso de rol o acceso al estudio, o el usuario no cumple la condición de responsable o solicitante exigida por la operación. |
| 404 | Recurso no encontrado | No existe el estudio o la exportación solicitada. |
| 409 | `EXPORTACION_YA_DECIDIDA` | Se intenta aprobar o rechazar una exportación que ya no está `solicitada`. |
| 409 | `EXPORTACION_NO_DISPONIBLE` | Se intenta descargar una exportación cuyo estado almacenado no es `lista`. |
| 409 | `EXPORTACION_VENCIDA` | La exportación estaba `lista`, pero su plazo de descarga terminó. |
| 409 | `EXPORTACION_DESACTUALIZADA` | Alguna participación incluida ya no cumple las condiciones de elegibilidad. |

### Auditoría y diferencias pendientes

La descarga se registra como acción `exportar` sobre la entidad `exportacion` **antes de entregar el archivo**, mediante `registrarAhora(req)`. Si ese registro falla, el controlador no continúa con la entrega.

El diseño contempla al Director en la aprobación y consulta. Sin embargo, el servicio revisado exige ser responsable del estudio para decidir, y solicitante o responsable para consultar y descargar; no incorpora una excepción por ser Director. Esta diferencia debe resolverse con el líder y verificarse en pruebas.

La actualización del catálogo no cierra por sí sola la Actividad 60. El cierre requiere los resultados y evidencias de las pruebas, la revisión de las diferencias y la integración correspondiente.

### Documentación relacionada

- [Guía API de exportaciones](../api/exportaciones.md)
- [Qué sale y qué no sale en una exportación](../guias/exportacion-investigador-cec.md)
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

### Actualización de auditoría — Actividad 57

Referencia: feature/auditoria, commit 2cbfc31. [Guía API](../api/auditoria.md) y [guía del Director para el CEC](../guias/consulta-cec-auditoria.md).

| Ruta | Acceso | Entrada | Salida y estado |
|---|---|---|---|
| GET /auditoria | Director; auditoria/leer global | id_usuario, id_estudio, entidad, id_registro_afectado, accion, resultado, desde, hasta, limite, desplazamiento | Implementado: datos y paginacion (total, limite, desplazamiento) |
| GET /auditoria/exportar | Director | Estudio y rango de fechas; contrato exacto pendiente | Previsto: CSV y registro previo exportar sobre auditoria. No encontrado en la rama revisada |

UUID para los tres filtros id_; acciones cerradas a las 13 del diccionario; resultado exito/error. Fechas YYYY-MM-DD inclusivas según America/Santiago. Limite 1–200 (defecto 50), desplazamiento >=0 (defecto 0). Orden fecha_hora e id_auditoria descendentes. Filtros combinados con AND.

Entidad se valida actualmente por formato, no contra la lista D19: pendiente resolver diferencia con CP-46. La consulta no devuelve secuencia/hash_anterior/hash. No filtrar solo por participacion para buscar contactos, porque estos usan contacto_participante.

Errores: 400 validación, 401 autenticación, 403 permisos y 405 escrituras. D17 exige 503 AUDITORIA_NO_DISPONIBLE en acciones sensibles si falla su registro previo. El SQL de cadena existe; aplicación, script de verificación, exportación y evidencia CP-38–CP-49 siguen por verificar/completar.

## 13. Pendiente de validación

### Para revisar con el equipo antes de implementar

- Endpoints de solo lectura para Invitados sobre “resultados o informes seleccionados”: hoy reutilizan `GET /estudios/{id}` y `GET /participaciones/{id}/registros` con `puede_consultar`. Confirmar si basta.
- Formato exacto del paquete de exportación (estructura del .zip, diccionario de variables incluido).
- Límite de tamaño y procesamiento asíncrono de cargas grandes (supuesto RNF-PER-02, archivos de hasta 1 GB).
- Plazo legal entre la solicitud de supresión y el borrado definitivo (con asesoría jurídica).
- Qué pasa con los datos ya recolectados de una persona que se retira de un estudio (definir con el CEC).

</div>

plaGesEtic · Observatorio UX / UXLab UTEM Gestión de Proyectos de Ingeniería (2026-II) · Octubre 2026
