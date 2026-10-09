# Guía API de registro de participantes y estudios

- **Proyecto:** plaGesEtic · UXLab UTEM
- **Actividad:** 45 — Implementación base de registro de participantes y estudios
- **Responsable documental:** Catalina Araniz
- **Versión:** 0.2
- **Estado:** fichas de estudios contrastadas con el código. Ejecución de API y evidencias pendientes.

## 1. Objetivo

Documentar las rutas para gestionar estudios, registrar identidades e inscribir participaciones. Cada ficha describe su propósito, autorización, entrada, salida y errores.

## 2. Base de la revisión

Fuente: `PlaGesEtic-main.zip`, correspondiente al commit:

`ebd44cbac8f0a46b12c5c13621c99606da4d0583`

La revisión se realizó mediante lectura del código. No se ejecutó la API ni se verificó la base de datos. Los ejemplos ilustran las estructuras implementadas y no constituyen evidencia de pruebas ejecutadas.

### Rutas y autenticación

Las rutas se montan directamente en `/estudios`. El archivo `app.js` no incorpora el prefijo `/api/v1`. Un prefijo adicional en el despliegue debe confirmarse.

Las solicitudes requieren:

```http
Authorization: Bearer <JWT_DE_SESION>
Content-Type: application/json
```

`Content-Type` corresponde a las solicitudes que envían un cuerpo JSON.

El middleware valida:

- Firma HS256 y vencimiento del JWT.
- Sesión abierta y vigente.
- Cuenta activa y no vencida.
- Ausencia de cambio obligatorio de contraseña pendiente para acceder a estudios.

El archivo `routes/auth.js` está vacío en la copia revisada y deja pendiente integrar el login y MFA.

### Procesamiento

La cadena implementada comprende:

1. Preparación de auditoría.
2. Autenticación.
3. Instalación del filtro de privacidad sobre la respuesta.
4. Control de permiso cuando la ruta lo declara.
5. Controlador, servicio y repositorio.
6. Filtrado de la salida y registro de auditoría.

El filtro conserva `nombre` cuando corresponde al estudio.

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

Las respuestas exitosas contienen directamente el objeto o arreglo, sin envoltorio `data`.

No se incluyen las propiedades `actualizado` ni `activado`.

Los UUID y fechas de los ejemplos son ficticios. El formato exacto de las fechas debe comprobarse en ejecución: depende de la conversión de PostgreSQL y `pg`. El filtro de privacidad serializa los objetos `Date` mediante `toJSON`.

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
| 400 | `SOLICITUD_INVALIDA` | `El identificador del estudio no es válido.` En controles que reciben un identificador de estudio. |
| 401 | `NO_AUTENTICADO` | `Debes iniciar sesión.` |
| 403 | `CAMBIO_PASSWORD_REQUERIDO` | `Debes cambiar tu contraseña antes de continuar.` |
| 403 | `SIN_PERMISO` | `No tienes permiso para esta acción.` En rutas con `requierePermiso`. |
| 500 | `ERROR_INTERNO` | `Ocurrió un error inesperado. Intenta nuevamente.` Para fallos no traducidos. |

Los controles se ejecutan antes de consultar el recurso. Por ello, una solicitud puede recibir `401` o `403` antes de comprobar si el estudio existe. Un UUID inexistente no garantiza una respuesta `404` para todos los usuarios.

## 4. Rutas de estudios

### 4.1 Crear estudio — `POST /estudios`

#### Propósito

Crea un estudio en estado `borrador` y una membresía del creador con los cinco permisos, dentro de una transacción.

`id_responsable` se obtiene del usuario autenticado, no del cuerpo de la solicitud.

#### Autorización

Requiere el permiso `estudio/crear`.

El script `05_permisos_base.sql` asigna este permiso con alcance global a:

- Director.
- Investigador.

La revisión del script no acredita que los permisos estén cargados en la base de datos del entorno.

#### Entrada

| Campo | Obligatorio | Validación |
| --- | --- | --- |
| `codigo_estudio` | Sí | Texto de hasta 20 caracteres. |
| `nombre` | Sí | Texto de hasta 150 caracteres. |
| `fecha_inicio` | Sí | Fecha con formato `AAAA-MM-DD`. |
| `descripcion` | No | Texto o `null`. |
| `fecha_fin` | No | Fecha con formato `AAAA-MM-DD` o `null`. |
| `retencion_hasta` | No | Fecha con formato `AAAA-MM-DD` o `null`. |

Reglas adicionales:

- Se eliminan espacios al inicio y al final de los textos.
- Los campos opcionales ausentes, nulos o vacíos se convierten a `null`.
- `fecha_fin` no puede ser anterior a `fecha_inicio`.
- `retencion_hasta` no puede ser anterior a `fecha_fin` o, si esta falta, a `fecha_inicio`.
- Las fechas se validan con expresión regular y `Date.parse`; falta verificar su cobertura de fechas calendáricas inválidas.
- El servicio no persiste campos adicionales. Si se envía `id_estudio`, puede activar controles previos del middleware.

Solicitud ilustrativa:

```json
{
  "codigo_estudio": "EST-GUIA-01",
  "nombre": "Estudio de ejemplo",
  "descripcion": "Registro de prueba",
  "fecha_inicio": "2026-10-15"
}
```

#### Respuesta

`201 Created`, con el objeto completo del estudio.

Ejemplo estructural; el formato de las fechas debe validarse en ejecución:

```json
{
  "id_estudio": "11111111-1111-4111-8111-111111111111",
  "codigo_estudio": "EST-GUIA-01",
  "nombre": "Estudio de ejemplo",
  "descripcion": "Registro de prueba",
  "id_responsable": "22222222-2222-4222-8222-222222222222",
  "estado": "borrador",
  "fecha_inicio": "2026-10-15",
  "fecha_fin": null,
  "fecha_cierre": null,
  "retencion_hasta": null
}
```

#### Errores específicos

`400 SOLICITUD_INVALIDA`, con mensajes según el campo:

- `Falta el campo obligatorio «nombre».`
- `«nombre» debe ser texto.`
- `«nombre» admite como máximo 150 caracteres.`
- `«codigo_estudio» admite como máximo 20 caracteres.`
- `«fecha_inicio» debe ser una fecha con formato AAAA-MM-DD.`
- `«fecha_fin» no puede ser anterior a «fecha_inicio».`
- `«retencion_hasta» no puede ser anterior al término del estudio.`

El mensaje de campo obligatorio también se aplica a `codigo_estudio` y `fecha_inicio`.

`409 CODIGO_DUPLICADO`:

```json
{
  "error": {
    "codigo": "CODIGO_DUPLICADO",
    "mensaje": "Ya existe un estudio con ese código."
  }
}
```

La creación traduce cualquier error PostgreSQL `23505` a `CODIGO_DUPLICADO`; debe confirmarse la restricción de origen al investigar un fallo.

También aplican los errores comunes.

### 4.2 Listar estudios — `GET /estudios`

#### Propósito

Lista estudios ordenados por `codigo_estudio`.

- Un rol con permiso `estudio/leer` de alcance global puede ver todos.
- Los demás usuarios reciben estudios con membresía vigente: `fecha_inicio <= CURRENT_DATE` y `fecha_fin` nula o mayor o igual a `CURRENT_DATE`.

#### Autorización

Puede acceder cualquier usuario que supere la autenticación.

**Comportamiento observado:** esta ruta no llama a `requierePermiso`. La consulta por membresía no comprueba `puede_consultar` y no incorpora estudios accesibles únicamente por autorización especial.

Sin membresías ni lectura global, devuelve `[]`.

El script de permisos concede lectura global a Director. Soporte no tiene permiso de lectura de estudios en ese script, pero el listado no rechaza por rol: su resultado depende de las membresías existentes.

#### Entrada

```http
GET /estudios
```

Filtro opcional:

```http
GET /estudios?estado=borrador
```

Valores admitidos para `estado`:

- `borrador`
- `activo`
- `cerrado`

Si el filtro está ausente o es una cadena vacía, no se filtra por estado.

#### Respuesta

`200 OK`, con un arreglo de objetos que contienen los diez campos descritos en la sección 3.

Devuelve `[]` cuando no hay coincidencias. No hay paginación implementada.

#### Errores específicos

`400 SOLICITUD_INVALIDA`:

```json
{
  "error": {
    "codigo": "SOLICITUD_INVALIDA",
    "mensaje": "El filtro «estado» debe ser borrador, activo o cerrado."
  }
}
```

También aplican `401`, `403` por cambio obligatorio de contraseña y errores generales. Esta ruta no implementa un `403` por falta de permiso de lectura.

### 4.3 Consultar estudio — `GET /estudios/{idEstudio}`

#### Propósito

Obtiene el detalle de un estudio.

#### Autorización

Requiere `estudio/leer` con alcance global o de estudio.

Con alcance de estudio, exige:

- Membresía vigente con `puede_consultar`; o
- Autorización aprobada y vigente aplicable al recurso y estudio.

El script de permisos concede:

- Lectura global a Director.
- Lectura por estudio a Investigador, Asistente, Estudiante e Invitado.
- Ningún permiso de lectura de estudio a Soporte.

#### Entrada

```http
GET /estudios/11111111-1111-4111-8111-111111111111
```

`idEstudio` debe tener formato UUID.

#### Respuesta

`200 OK`, con el objeto completo del estudio y los diez campos descritos en la sección 3.

#### Errores específicos

`404 NO_ENCONTRADO`:

```json
{
  "error": {
    "codigo": "NO_ENCONTRADO",
    "mensaje": "El estudio no existe."
  }
}
```

Este resultado corresponde a solicitudes que superan los controles previos y cuyo estudio no se encuentra.

También aplican `400` por UUID inválido y los errores comunes de autenticación, autorización y servidor.

### 4.4 Editar estudio — `PATCH /estudios/{idEstudio}`

#### Propósito

Modifica únicamente los campos recibidos.

No permite editar:

- `codigo_estudio`
- `estado`
- `id_responsable`

#### Autorización

Requiere `estudio/actualizar`.

Según el script de permisos:

- Director tiene alcance global.
- Investigador tiene alcance de estudio y necesita membresía vigente con `puede_modificar` o autorización aplicable.

**Punto pendiente de conciliación:** el código no compara `id_responsable` con el usuario autenticado. Actualmente comprueba permisos y membresía/autorización, pero no exige directamente ser el responsable del estudio.

#### Entrada

Debe incluir al menos uno de estos campos:

- `nombre`
- `descripcion`
- `fecha_inicio`
- `fecha_fin`
- `retencion_hasta`

Ejemplo:

```json
{
  "nombre": "Estudio actualizado",
  "descripcion": "Descripción corregida"
}
```

Se aplican las validaciones de texto y fechas de creación sobre la combinación de los valores existentes y los cambios recibidos.

`descripcion`, `fecha_fin` y `retencion_hasta` pueden limpiarse con `null`. `nombre` y `fecha_inicio` no admiten valores vacíos o nulos.

#### Respuesta

`200 OK`, con el objeto completo del estudio actualizado.

No se devuelve `actualizado: true`.

#### Errores específicos

| HTTP | Código | Mensaje |
| --- | --- | --- |
| 400 | `SOLICITUD_INVALIDA` | `No se envió ningún campo para modificar.` |
| 400 | `SOLICITUD_INVALIDA` | `No se pueden modificar: estado. Campos editables: nombre, descripcion, fecha_inicio, fecha_fin, retencion_hasta.` Ejemplo al enviar `estado`. |
| 409 | `ESTUDIO_CERRADO` | `El estudio está cerrado: no admite nuevos datos ni modificaciones.` Desde el middleware. |
| 409 | `ESTUDIO_CERRADO` | `El estudio está cerrado: no admite modificaciones.` Comprobación adicional del servicio. |
| 404 | `NO_ENCONTRADO` | `El estudio no existe.` Tras superar controles previos. |

También aplican las validaciones de campos y los errores comunes.

### 4.5 Activar estudio — `POST /estudios/{idEstudio}/activar`

#### Propósito

Cambia un estudio de `borrador` a `activo`.

Exige al menos un registro de `protocolo_version` con:

- `estado_cec = 'aprobado'`.
- `fecha_vencimiento_cec` nula o mayor o igual a `CURRENT_DATE`.

#### Autorización

Utiliza los mismos controles de `estudio/actualizar` que la edición mediante `PATCH`.

Se mantiene la observación sobre la ausencia de comprobación directa del responsable.

#### Entrada

```http
POST /estudios/11111111-1111-4111-8111-111111111111/activar
```

No requiere cuerpo. El servicio no utiliza un cuerpo de activación.

#### Respuesta

`200 OK`, con el objeto completo del estudio y `estado` igual a `activo`.

No se devuelve `activado: true`.

#### Errores específicos

| HTTP | Código | Mensaje |
| --- | --- | --- |
| 409 | `SIN_PROTOCOLO_APROBADO` | `El estudio no tiene un protocolo aprobado por el Comité de Ética y vigente: no se puede activar.` |
| 409 | `ESTUDIO_YA_ACTIVO` | `El estudio ya está activo.` |
| 409 | `ESTUDIO_CERRADO` | `El estudio está cerrado: no admite nuevos datos ni modificaciones.` Desde el middleware. |
| 404 | `NO_ENCONTRADO` | `El estudio no existe.` Tras superar controles previos. |

El servicio también contiene el mensaje `Un estudio cerrado no se puede volver a activar.`, aunque normalmente el middleware rechaza primero.

También aplican los errores comunes.

### 4.6 Puntos pendientes de validación con desarrollo

- Confirmar el prefijo del despliegue: el código monta las rutas sin `/api/v1`.
- Conciliar el listado sin comprobación de `puede_consultar` ni `requierePermiso` con el catálogo y la política de acceso.
- Confirmar si modificar o activar exige ser responsable, además de tener membresía o autorización.
- Verificar la serialización real de los campos `DATE`.
- Integrar login y MFA y confirmar la compatibilidad del hash del JWT con `sesion_usuario`.
- Ejecutar las rutas contra una base preparada y registrar versión, solicitudes, respuestas y evidencias.

Las pruebas básicas existentes en el repositorio no acreditan el funcionamiento completo de estas cinco rutas.

## 5. Rutas de identidades — Pendiente

Rutas previstas:

```http
POST /identidades/buscar
POST /identidades
```

Estas fichas corresponden al domingo 11 de octubre.

Las rutas de identidades no están implementadas en el ZIP revisado. Su documentación requiere el código correspondiente y respuestas verificables.

## 6. Rutas de participaciones — Pendiente

Rutas previstas:

```http
POST /estudios/{id}/participaciones
GET /estudios/{id}/participaciones
```

Estas fichas corresponden al domingo 11 de octubre.

Las rutas de participaciones no están implementadas en el ZIP revisado. Su documentación requiere el código correspondiente y respuestas verificables.

## 7. Cómo probar — Pendiente de completar

Orden previsto para el flujo completo:

1. Crear un estudio.
2. Asociar o confirmar un protocolo aprobado y vigente.
3. Activar el estudio.
4. Buscar o registrar una identidad.
5. Inscribir la participación.
6. Consultar las participaciones y verificar los campos devueltos.

El procedimiento ejecutable se completará cuando estén disponibles la autenticación y las rutas necesarias.

## 8. Validación antes del Pull Request

- [ ] Confirmar los campos y formatos con respuestas ejecutadas de la API.
- [ ] Adjuntar solicitudes y respuestas reales; los ejemplos derivados del código no acreditan ejecución.
- [ ] Verificar los mensajes de error en ejecución.
- [ ] Comprobar que las respuestas no exponen datos personales de participantes.
- [ ] Resolver o aceptar expresamente los puntos de acceso de la sección 4.6.
- [ ] Comprobar autenticación, permisos y auditoría en ejecución.
- [ ] Completar identidades, participaciones y el procedimiento de prueba.
- [ ] Incorporar esta guía en `docs/api/registro-participantes-estudios.md`.
