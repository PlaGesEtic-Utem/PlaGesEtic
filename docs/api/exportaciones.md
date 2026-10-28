# Guía API de exportaciones desidentificadas — Actividad 60

## Alcance y referencia

Revisión estática de `feature/exportacion`, commit `4f01f6b`, realizada el 28/10/2026. Referencias: ADR-002, D23 a D25; rutas, controlador, servicio y repositorio de exportaciones; `backend/pruebas/exportaciones.http`.

Esta versión exporta un ZIP con `participantes.csv` y `LEEME.txt`. No incluye archivos de sesiones, audio, video ni EEG. Los ejemplos son ilustrativos: no son resultados de pruebas ejecutadas. La revisión final y el cierre requieren las pruebas CP-62 a CP-71.

## Acceso y permisos

Enviar `Authorization: Bearer <TOKEN>`. Para POST y PATCH, usar `Content-Type: application/json`. Las rutas se expresan sin prefijo `/api/v1`.

Se combinan el permiso del rol, el alcance de estudio y las restricciones del servicio.

| Operación | Permiso de rol | Permiso del estudio | Restricción adicional |
| --- | --- | --- | --- |
| Solicitar | exportacion/crear | puede_exportar | Investigador o Estudiante según permisos base. Si es responsable, genera de inmediato; en otro caso queda solicitada. |
| Consultar | exportacion/leer | puede_consultar | Ser solicitante o responsable del estudio. |
| Aprobar o rechazar | exportacion/aprobar | puede_modificar | El servicio exige ser responsable del estudio. |
| Descargar | exportacion/descargar | puede_exportar | Ser solicitante o responsable; paquete listo, vigente y con participantes aún elegibles. |

El plan contempla al Director en consulta y aprobación, pero el servicio no incluye una excepción por ese rol: compara la identidad del usuario con el solicitante o responsable. No asumir acceso del Director solo por su rol; esta diferencia requiere resolución y pruebas.

## Rutas

### Solicitar una exportación

`POST /estudios/{idEstudio}/exportaciones`

Entrada: `proposito` obligatorio, uno de `analisis`, `informe` o `publicacion`; `filtros` opcional, solo admite `{}` y ese es su valor por defecto.

```json
{"proposito":"analisis","filtros":{}}
```

Respuesta HTTP 201. Para el responsable, tras generar correctamente el paquete:

```json
{
  "id_exportacion": "11111111-1111-4111-8111-111111111111",
  "codigo_exportacion": "X-ABCDEF",
  "proposito": "analisis",
  "estado": "lista",
  "fecha_solicitud": "2026-10-28T15:00:00.000Z",
  "fecha_aprobacion": null,
  "fecha_generacion": "2026-10-28T15:00:01.000Z",
  "fecha_vencimiento": "2026-11-04T15:00:01.000Z"
}
```

En la generación automática, el código no asigna `fecha_aprobacion`; puede ser null. Para un Estudiante autorizado, la respuesta tiene `estado: solicitada` y las fechas de aprobación, generación y vencimiento en null.

### Aprobar o rechazar

`PATCH /exportaciones/{idExportacion}/aprobacion`

`decision`: `aprobar` o `rechazar`. `motivo`: texto de al menos cinco caracteres después de quitar espacios de los extremos. No escribir datos personales.

```json
{"decision":"aprobar","motivo":"Análisis para el informe del estudio"}
```

Respuesta HTTP 200 con el objeto de exportación. Al aprobar, se genera el paquete y queda `lista`; al rechazar, queda `rechazada`. Solo se decide una solicitud en estado `solicitada`. El motivo se registra como justificación de auditoría; no se incluye en la vista de respuesta.

### Consultar

`GET /exportaciones/{idExportacion}`

Respuesta HTTP 200 con los mismos ocho campos del ejemplo de solicitud. No incluye ruta de almacenamiento, hash del paquete, listado de participantes ni correspondencias entre códigos.

Si el paquete listo está vencido, la consulta presenta `vencida`; esta consulta no persiste ese cambio en la base.

### Descargar

`GET /exportaciones/{idExportacion}/descarga`

Respuesta HTTP 200 con un archivo `X-XXXXXX.zip`, no con JSON. La ruta aplica `noAlmacenar`. Antes de enviarlo, revisa acceso, estado, vencimiento y elegibilidad de quienes integran el paquete, y llama a `registrarAhora(req)` para auditar.

Si una persona dejó de ser elegible, se bloquea el paquete completo y se debe solicitar uno nuevo. La descarga no reescribe el ZIP anterior.

## Contenido del paquete

| Archivo | Contenido |
| --- | --- |
| participantes.csv | codigo_en_exportacion, estado_consentimiento, mes_inscripcion |
| LEEME.txt | Código del paquete, propósito, cantidad de personas, explicación de los campos y limitación del anonimato. |

Ejemplo ficticio de CSV:

```csv
codigo_en_exportacion,estado_consentimiento,mes_inscripcion
E-ABCDEF,otorgado,2026-10
```

Se incluyen participaciones activas cuyo último evento de consentimiento sea aceptar o reconsentir y esté asociado a un documento vigente. El mes deriva de la fecha de inicio de la participación. El CSV no incluye nombres, RUT, correo, teléfono, fecha de nacimiento, UXL-, P-, UUID internos ni fechas exactas.

Cada paquete recibe un código X- y genera códigos E- para sus participantes. La correspondencia con las participaciones permanece en la base. Generar códigos nuevos por paquete no equivale a garantizar anonimato total.

Las fechas exactas del objeto de control de la API no forman parte del CSV. La exclusión descrita se refiere al contenido de datos del paquete.

## Estados

| Estado | Significado y comportamiento observado |
| --- | --- |
| solicitada | Pendiente de decisión del responsable. |
| aprobada | Aprobación registrada, antes de terminar la generación. Puede permanecer así si la generación falla. |
| rechazada | Solicitud rechazada; no descargable. |
| procesando | Previsto en el diseño; el servicio revisado no lo asigna explícitamente. |
| lista | Paquete generado, descargable durante siete días si conserva su elegibilidad. |
| vencida | Plazo superado. GET lo presenta; la descarga de una exportación lista vencida lo persiste. |

Flujo actual: solicitada → aprobada → lista, o solicitada → rechazada. El responsable inicia directamente en aprobada y genera hasta lista. No se identificó una ruta de reintento para una generación fallida.

## Errores

Formato común:

```json
{"error":{"codigo":"SOLICITUD_INVALIDA","mensaje":"Por ahora «filtros» debe ser un objeto vacío: {}."}}
```

| HTTP | Código | Causa |
| --- | --- | --- |
| 400 | SOLICITUD_INVALIDA | Propósito, filtros, decisión o motivo inválido; UUID de exportación mal formado. |
| 401 | NO_AUTENTICADO | Sin sesión válida. |
| 403 | SIN_PERMISO | Falta permiso o no cumple la relación exigida con el estudio/exportación. |
| 404 | NO_ENCONTRADO | Estudio o exportación no encontrados. |
| 409 | EXPORTACION_YA_DECIDIDA | Se intenta decidir una exportación que no está solicitada. |
| 409 | EXPORTACION_NO_DISPONIBLE | Se intenta descargar un estado distinto de lista. |
| 409 | EXPORTACION_VENCIDA | La descarga detecta que una exportación lista superó su vencimiento. |
| 409 | EXPORTACION_DESACTUALIZADA | Algún integrante del paquete dejó de ser elegible. |

Si ya está persistida como vencida, la comprobación inicial de estado devuelve EXPORTACION_NO_DISPONIBLE. D17 exige 503 AUDITORIA_NO_DISPONIBLE cuando no se puede registrar una descarga; verificar esta condición con pruebas antes de darla por validada.

## Auditoría y pruebas pendientes

Entidad `exportacion`; acciones crear, leer, aprobar, rechazar y exportar. La descarga registra antes de entregar; no debe interpretarse una descarga fallida como entrega efectiva.

CP-62 a CP-71 cubren solicitud, aprobación, rechazo, entradas inválidas, permisos, contenido, códigos por paquete, retiro y auditoría. El archivo .http contiene pedidos y expectativas, no acredita su ejecución.

Pendientes de revisión:

- Resolver la diferencia del acceso del Director entre plan y servicio.
- Alinear el estado procesando y el tratamiento de fallos de generación.
- Comprobar permisos, vencimiento, revalidación y fallo de auditoría en ejecución.
- Verificar el contenido completo del ZIP y la ausencia de datos personales.
- Registrar resultados y evidencias de CP-62 a CP-71 antes del cierre.

Guía complementaria: [Qué sale y qué no sale en una exportación](../guias/exportacion-investigador-cec.md).
