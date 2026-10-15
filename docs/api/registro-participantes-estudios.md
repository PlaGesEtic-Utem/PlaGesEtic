# Guía de API: registro de participantes y estudios

**Proyecto:** plaGesEtic · UXLab UTEM
**Actividad:** 45 — Implementación base de registro de participantes y estudios
**Responsable documental:** Catalina Araniz
**Versión:** 1.0
**Estado:** Guía contrastada con `feature/backend-base`; incluye resultados de pruebas registrados y pasos para repetirlas.

## 1. Objetivo y alcance

Documentar las rutas disponibles para crear y gestionar estudios, buscar y registrar identidades, e inscribir y consultar participaciones. Los ejemplos de esta guía son ilustrativos; las respuestas dinámicas, como UX Lab ID y código seudónimo, cambian en cada ejecución.

Incluye las rutas implementadas en la rama `feature/backend-base`. No incluye consentimiento, asentimiento, desenmascaramiento de identidades ni pantallas de frontend.

## 2. Base de la revisión y verificación

La primera revisión de esta guía (v0.2) se hizo leyendo el código a partir de un ZIP estático (commit `ebd44cbac8f0a46b12c5c13621c99606da4d0583`), sin ejecutar la API. Esta versión (v1.0) se revisó directamente contra la rama `feature/backend-base`, commit `9138804b0fccdbec19af3e171523bf5cee621fa3`, contrastando `backend/README.md` y los archivos `backend/pruebas/*.http`. El prefijo local es `http://localhost:3000`; las rutas no llevan `/api/v1` en el código revisado — pendiente confirmar si el despliegue agrega uno.

La evidencia registrada en Drive por Benjamín Barrientos para la Actividad 45 consigna: estudios, 32/32 casos correctos contra PostgreSQL; identidades, 14/14 casos y cero datos personales en texto claro en la base; participaciones, 43/43 casos, además de 15/15 pruebas automáticas al implementar ese módulo. Esta guía no presenta esas ejecuciones como realizadas por la responsable documental.

Como comprobación adicional, se ejecutó `npm test` en el commit indicado: 32 pruebas pasaron y una quedó omitida por requerir PostgreSQL real (`TEST_BD_REAL=1`). Esa suite usa base simulada y no sustituye la comprobación manual contra PostgreSQL.

El 13 de octubre de 2026, Felipe Cruz ejecutó 13 casos de prueba adicionales contra la API real de esta misma rama, con la base cargada con `datos_prueba.sql` (ver `act45_resultados_casos_prueba.xlsx`). Las secciones 5 y 6, antes marcadas como "Pendiente", se completan aquí con esa evidencia.

### Rutas y autenticación

Las rutas se montan directamente en `/estudios`, `/identidades` y `/estudios/{id}/participaciones`. El archivo `app.js` no incorpora el prefijo `/api/v1`.

Las solicitudes a rutas protegidas requieren:

```http
Authorization: Bearer <JWT_DE_SESION>
Content-Type: application/json
```

`Content-Type` corresponde a las solicitudes que envían un cuerpo JSON.

El middleware de autenticación valida:

- Firma HS256 y vencimiento del JWT.
- Sesión abierta y vigente.
- Cuenta activa y no vencida.
- Ausencia de cambio obligatorio de contraseña pendiente para acceder a estudios.

A diferencia del borrador v0.2 (que señalaba `routes/auth.js` vacío), en `feature/backend-base` el login ya está implementado: `POST /auth/login` devuelve un token temporal y `POST /auth/login/mfa` entrega el token de sesión tras validar el segundo factor (TOTP). El README del backend y `backend/pruebas/auth.http` describen cómo generar usuarios sintéticos y probar el login. Director, Investigador y Soporte tienen MFA activo; Asistente, Estudiante e Invitado no (Actividad 45, hallazgo H-09).

### Procesamiento

La cadena implementada comprende:

1. Preparación de auditoría.
2. Autenticación y verificación de sesión vigente.
3. Instalación del filtro de privacidad sobre la respuesta.
4. Control de permiso cuando la ruta lo declara (y de membresía/autorización por estudio, en las rutas que lo exigen).
5. Controlador, servicio y repositorio.
6. Filtrado de la salida y registro de auditoría.

El filtro conserva `nombre` cuando corresponde al estudio. En las rutas de identidades, el filtro permite explícitamente que salgan únicamente los campos `ux_lab_id` y `ux_lab_ids`; las respuestas de participaciones no incluyen el UX Lab ID ni `id_participante`.

Los datos personales de identidad se cifran con AES-256-GCM, y el código calcula huellas HMAC-SHA-256 para las búsquedas por RUT o correo. La respuesta de la API no devuelve nombre, RUT, correo, teléfono ni fecha de nacimiento.

## 3. Respuestas y errores comunes

### Respuesta de estudio

El repositorio devuelve estos diez campos:

- `id_estudio`
- `codigo_estudio`
- `nombre`
- `descripcion`
- `id_responsable`
- `estado`
- `fecha_inicio`
- `fecha_fin`
- `fecha_cierre`
- `retencion_hasta`

Las respuestas exitosas contienen directamente el objeto o arreglo, sin envoltorio `data`. No se incluyen las propiedades `actualizado` ni `activado`.

> **Hallazgo H-12 (Actividad 45, 13-oct-2026):** el formato de fecha es inconsistente entre rutas — `/estudios` devuelve `2026-10-13T03:00:00.000Z` y `/participaciones` devuelve `2026-10-13`. Pendiente de corrección: normalizar a `AAAA-MM-DD` para campos `DATE`.

### Formato de error

```json
{
  "error": {
    "codigo": "NO_AUTENTICADO",
    "mensaje": "Debes iniciar sesión."
  }
}
```

| HTTP | Código | Mensaje y condición |
| --- | --- | --- |
| 400 | `SOLICITUD_INVALIDA` | `El cuerpo de la solicitud no es JSON válido.` |
| 400 | `SOLICITUD_INVALIDA` | `El identificador del estudio no es válido.` |
| 401 | `NO_AUTENTICADO` | `Debes iniciar sesión.` |
| 403 | `CAMBIO_PASSWORD_REQUERIDO` | `Debes cambiar tu contraseña antes de continuar.` |
| 403 | `SIN_PERMISO` | `No tienes permiso para esta acción.` |
| 500 | `ERROR_INTERNO` | `Ocurrió un error inesperado. Intenta nuevamente.` |

Los controles se ejecutan antes de consultar el recurso: una solicitud puede recibir `401` o `403` antes de comprobar si el estudio existe.

## 4. Rutas de estudios

### 4.1 Crear estudio — `POST /estudios`

#### Propósito
Crea un estudio en estado `borrador` y una membresía del creador con los cinco permisos, dentro de una transacción. `id_responsable` se obtiene del usuario autenticado, no del cuerpo.

#### Autorización
Requiere el permiso `estudio/crear` (Director e Investigador, según `05_permisos_base.sql`).

#### Entrada
| Campo | Obligatorio | Validación |
| --- | --- | --- |
| `codigo_estudio` | Sí | Hasta 20 caracteres. |
| `nombre` | Sí | Hasta 150 caracteres. |
| `fecha_inicio` | Sí | `AAAA-MM-DD`. |
| `descripcion` | No | Texto o `null`. |
| `fecha_fin` | No | `AAAA-MM-DD` o `null`. |
| `retencion_hasta` | No | `AAAA-MM-DD` o `null`. |

`fecha_fin` no puede ser anterior a `fecha_inicio`; `retencion_hasta` no puede ser anterior a `fecha_fin` (o `fecha_inicio`, si falta).

#### Respuesta
`201 Created`, con el objeto completo del estudio (10 campos de la sección 3). Confirmado en ejecución: CP-01, 13-oct-2026 (`codigo_estudio=EST-30`, `estado=borrador`).

#### Errores específicos
`400 SOLICITUD_INVALIDA` por campo faltante o inválido. `409 CODIGO_DUPLICADO` si el código ya existe.

### 4.2 Listar estudios — `GET /estudios`

#### Propósito
Lista estudios ordenados por `codigo_estudio`. Alcance global ve todos; el resto ve solo los de su membresía vigente.

#### Autorización
Esta ruta no llama a `requierePermiso`: el filtrado es por membresía, no por permiso declarado (decisión de diseño).

#### Entrada
`GET /estudios`, con filtro opcional `?estado=borrador|activo|cerrado`.

#### Errores específicos
`400 SOLICITUD_INVALIDA` si el filtro no es uno de los tres valores válidos.

### 4.3 Consultar estudio — `GET /estudios/{idEstudio}`

#### Propósito
Detalle de un estudio. Requiere `estudio/leer` global, o membresía vigente con `puede_consultar`, o autorización especial aprobada.

#### Errores específicos
`404 NO_ENCONTRADO` si no existe, tras superar los controles previos.

### 4.4 Editar estudio — `PATCH /estudios/{idEstudio}`

#### Propósito
Modifica solo los campos recibidos (`nombre`, `descripcion`, `fecha_inicio`, `fecha_fin`, `retencion_hasta`). No permite editar `codigo_estudio`, `estado` ni `id_responsable`.

#### Autorización
Requiere `estudio/actualizar`. **Punto pendiente:** el código no compara `id_responsable` con el usuario autenticado — valida permiso y membresía/autorización, pero no exige directamente ser el responsable.

#### Errores específicos
`409 ESTUDIO_CERRADO`, `404 NO_ENCONTRADO`, además de validaciones de campos.

### 4.5 Activar estudio — `POST /estudios/{idEstudio}/activar`

#### Propósito
Cambia un estudio de `borrador` a `activo`. Exige un `protocolo_version` con `estado_cec='aprobado'` y vigente.

#### Respuesta
`200 OK`, `estado=activo`. Confirmado en ejecución: CP-02 (`409 SIN_PROTOCOLO_APROBADO` sin protocolo) y CP-03 (`200` tras aprobar protocolo), 13-oct-2026.

#### Errores específicos
`409 SIN_PROTOCOLO_APROBADO`, `409 ESTUDIO_YA_ACTIVO`, `409 ESTUDIO_CERRADO`, `404 NO_ENCONTRADO`.

### 4.6 Puntos pendientes de validación con desarrollo

- [x] Integrar login y MFA — resuelto, ver sección 2.
- [x] Ejecutar las rutas contra una base preparada y registrar evidencias — resuelto (32/32, 14/14, 43/43, más 13 casos del 13-oct-2026).
- [x] Verificar la serialización real de los campos `DATE` — confirmado inconsistente (hallazgo H-12, pendiente de corrección en código).
- [ ] Conciliar el listado de estudios sin `puede_consultar`/`requierePermiso` con la política de acceso.
- [ ] Confirmar si modificar o activar exige ser responsable del estudio.
- [ ] Confirmar el prefijo `/api/v1` en el despliegue.

## 5. Rutas de identidades

### 5.1 Registrar identidad — `POST /identidades`

#### Propósito
Registra una identidad real nueva y devuelve su UX Lab ID.

#### Autorización
Requiere el permiso `identidad/crear` (Investigador y Asistente).

#### Entrada
Confirmado en ejecución (CP-04, hallazgo H-05):

| Campo | Obligatorio | Nota |
| --- | --- | --- |
| `rut` | Sí | Debe incluir dígito verificador válido. |
| `nombre` | Sí | |
| `correo` | Sí | |
| `telefono` | Sí | |
| `fecha_nacimiento` | Sí | `NOT NULL` en la base. |
| `tipo` | Sí | `NOT NULL` en la base. |

No existe el campo `apellidos`: la tabla `identity_schema.identidad` no tiene esa columna (solo `nombre_cifrado`). Pendiente confirmar con desarrollo cómo se envía el nombre completo.

#### Respuesta
`201 Created`:
```json
{ "ux_lab_id": "UXL-45CKXAJ9" }
```
Solo devuelve el `ux_lab_id`. Los datos quedan cifrados (`nombre_cifrado`, `correo_cifrado`, prefijo `v1:`); `rut_hash` respalda el control de duplicados.

#### Errores específicos
`400 SOLICITUD_INVALIDA` por campo faltante. `409 PERSONA_YA_REGISTRADA` si el RUT ya existe (sugiere usar `/identidades/buscar`).

### 5.2 Buscar identidad — `POST /identidades/buscar`

#### Propósito
Confirma si una persona ya está registrada, sin exponer datos personales.

#### Autorización
Exige el mismo permiso `identidad/crear`, aunque sea una lectura (decisión declarada a propósito en el código; conviene que el Líder la valide). Tiene límite de 20 solicitudes por minuto por IP.

#### Entrada
```json
{ "rut": "12345678-5" }
```

#### Respuesta
`200 OK`:
```json
{ "existe": true, "ux_lab_ids": ["UXL-45CKXAJ9"] }
```
Devuelve un arreglo `ux_lab_ids`, no un único valor — una identidad puede tener más de un registro histórico (hallazgo H-11, confirmado en CP-06).

#### Errores específicos
`429` si se supera el límite de solicitudes.

## 6. Rutas de participaciones

### 6.1 Inscribir participación — `POST /estudios/{idEstudio}/participaciones`

#### Propósito
Inscribe una identidad en un estudio activo, generando un código seudónimo exclusivo de esa inscripción.

#### Entrada
```json
{ "ux_lab_id": "UXL-45CKXAJ9" }
```

#### Respuesta
`201 Created`, con `codigo_seudonimo` en formato `P-XXXXXX` (confirmado en ejecución; el formato `EXP-001` solo existe en datos de respaldo antiguos — hallazgo H-07). Una misma identidad puede inscribirse en distintos estudios con un código propio e independiente por cada uno (CP-07).

#### Errores específicos
`409 ESTUDIO_NO_ACTIVO` si el estudio está en `borrador`. `409 YA_PARTICIPA` si ya tiene una participación activa en ese estudio.

### 6.2 Listar participaciones — `GET /estudios/{idEstudio}/participaciones`

#### Propósito
Lista las participaciones de un estudio sin exponer datos personales.

#### Respuesta
`200 OK`, confirmado en ejecución (CP-12):
- `id_participacion`
- `codigo_seudonimo`
- `estado`
- `fecha_inicio`
- `es_menor_al_enrolar`

No incluye `ux_lab_id`, nombre, RUT ni ningún otro dato personal.

## 7. Cómo probar

Flujo verificado el 13-oct-2026 contra `feature/backend-base` con la base `datos_prueba.sql`:

1. Iniciar sesión con una cuenta de prueba (p. ej. `investigador@uxlab.utem.cl`, con MFA — el código TOTP se obtiene con `scripts/codigo-totp.js`; las cuentas `test_*@uxlab.test` no tienen MFA).
2. Crear un estudio (`POST /estudios`) → queda en `borrador`.
3. Intentar activarlo sin protocolo aprobado → `409 SIN_PROTOCOLO_APROBADO`.
4. Insertar un protocolo con `estado_cec='aprobado'` para ese estudio.
5. Activar el estudio (`POST /estudios/{id}/activar`) → `200`, `estado=activo`.
6. Registrar una identidad nueva (`POST /identidades`) o buscar una existente (`POST /identidades/buscar`).
7. Inscribir la participación (`POST /estudios/{id}/participaciones`).
8. Listar las participaciones y verificar que la respuesta no trae datos personales.
9. Verificar en `security_schema.auditoria` que la acción quedó registrada con `accion='crear'` (no `'CREATE'`) y el `id_registro_afectado` correspondiente.

Detalle completo de los 13 casos ejecutados: `act45_resultados_casos_prueba.xlsx` (hoja *Casos y resultados*).

## 8. Validación antes del Pull Request

- [x] Confirmar los campos y formatos con respuestas ejecutadas de la API.
- [x] Adjuntar solicitudes y respuestas reales (`act45_resultados_casos_prueba.xlsx`).
- [x] Verificar los mensajes de error en ejecución.
- [x] Comprobar que las respuestas no exponen datos personales de participantes.
- [ ] Resolver o aceptar expresamente los puntos de la sección 4.6.
- [x] Comprobar autenticación, permisos y auditoría en ejecución.
- [x] Completar identidades, participaciones y el procedimiento de prueba.
- [ ] Corregir hallazgo H-12 (formato de fechas inconsistente) antes de cerrar el PR.
- [ ] Confirmar con Felipe Cruz si son 13 o 16 los casos de prueba totales (hallazgo H-08).