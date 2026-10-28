# Qué sale y qué no sale en una exportación

Guía para el Investigador y el CEC — Actividad 60.

Basada en las decisiones D23 a D25 y en la revisión del código de la rama `feature/exportacion`, commit `4f01f6b`, del 28 de octubre de 2026.

Describe el alcance implementado. Las pruebas de aceptación y la revisión final están pendientes.

## 1. Qué contiene el paquete

La exportación genera un archivo ZIP con:

- **participantes.csv:** un código `E-` por participante dentro del paquete, el estado de su consentimiento y el mes de inscripción, expresado como `AAAA-MM`.
- **LEEME.txt:** código `X-` del paquete, propósito, cantidad de personas y explicación del contenido.

Solo se seleccionan participaciones activas cuyo último evento de consentimiento sea aceptar o reconsentir y esté asociado a un documento vigente.

Una persona retirada o con consentimiento negado no debe incluirse.

## 2. Qué no contiene

El CSV no incluye:

- Nombres ni RUT.
- Correo electrónico ni teléfono.
- Fecha de nacimiento.
- UX Lab ID ni seudónimos `P-`.
- Identificadores internos.
- Fechas exactas.

El paquete tampoco incluye audio, video, EEG ni otros archivos de las sesiones.

La relación entre los códigos `E-` y las participaciones permanece dentro de la plataforma. Cada nuevo paquete genera nuevos códigos.

La desidentificación reduce el riesgo de identificación, pero no garantiza anonimato total.

## 3. Cómo solicitar una exportación

1. Identificar el estudio y contar con los permisos correspondientes.
2. Indicar el propósito: `analisis`, `informe` o `publicacion`.
3. Enviar los filtros como un objeto vacío: `{}`. Esta versión no admite filtros adicionales.
4. Si solicita el Investigador responsable, el paquete se genera directamente.
5. Si solicita un Estudiante autorizado, queda pendiente de aprobación.
6. El responsable aprueba o rechaza con un motivo. No debe escribir nombres, RUT u otros datos personales en ese texto.
7. Consultar el estado y descargar cuando esté `lista`.

Las pantallas de exportación se conectan en una etapa posterior. La guía técnica explica cómo operar mediante la API.

## 4. Quién puede consultar y descargar

Además de los permisos del rol y del estudio, el servicio exige ser el solicitante de la exportación o el responsable del estudio para consultar y descargar.

Para aprobar o rechazar, el servicio exige ser el responsable del estudio.

El plan contempla al Director en consulta y aprobación, pero el código revisado no incluye una excepción por ese rol. Esta diferencia debe resolverse y probarse antes de dar ese acceso por confirmado.

## 5. Vigencia y retiro de participantes

El paquete está disponible durante siete días desde su generación. Si vence, debe solicitarse otro.

Antes de cada descarga, se comprueba que quienes integran el paquete sigan siendo elegibles.

Si alguna persona dejó de ser elegible, se bloquea la descarga del paquete completo y se debe solicitar uno nuevo. Esto puede ocurrir, por ejemplo, si retiró su consentimiento.

Este control no elimina ni revoca copias descargadas previamente. Los archivos obtenidos deben manejarse conforme al protocolo y las autorizaciones del estudio.

## 6. Trazabilidad

La descarga se registra en la auditoría como acción `exportar`, sobre la entidad `exportacion`, antes de entregar el archivo.

El comportamiento ante una falla del registro debe verificarse en las pruebas. La regla D17 exige bloquear la entrega cuando no se puede guardar la auditoría.

Para responder una consulta del CEC, registrar:

- Código `X-` del paquete.
- Propósito de la exportación.
- Período revisado.
- Eventos de auditoría pertinentes.
- Limitaciones o verificaciones pendientes.

No adjuntar correspondencias de identidad ni datos personales innecesarios.

## 7. Estado y límites de esta guía

Esta guía describe el código revisado. No acredita por sí sola la aprobación ética, el cumplimiento normativo ni la ejecución satisfactoria de las pruebas.

Quedan pendientes:

- Resolver la diferencia sobre el acceso del Director.
- Verificar permisos, vencimiento y bloqueo por pérdida de elegibilidad.
- Comprobar el contenido completo del ZIP.
- Verificar el registro de auditoría y su comportamiento ante fallas.
- Registrar los resultados y las evidencias de los casos CP-62 a CP-71.

## Referencia técnica

[Guía API de exportaciones](../api/exportaciones.md)
