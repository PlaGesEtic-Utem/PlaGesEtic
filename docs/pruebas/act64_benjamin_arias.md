# Actividad 64 — Pruebas funcionales intermedias
## Resultados individuales: Benjamín Arias

**Proyecto:** PlaGesEtic — UX Lab UTEM
**Período de ejecución:** 2 y 3 de noviembre de 2026
**Entorno:** Backend Node.js local, PostgreSQL 16 en Docker Desktop
**Estudio de pruebas:** EST-01
**Rama:** `feature/act64-pruebas`

### 1. Alcance

Se ejecutaron los casos CP-78, CP-79, CP-80, CP-81, CP-85 y CP-86, además de una revisión parcial de privacidad correspondiente a CP-87.

Las pruebas se realizaron mediante solicitudes HTTP y consultas a las respuestas de la API. Para los retiros se crearon participantes ficticios exclusivos, evitando modificar participantes preexistentes.

### 2. Resultados

| Caso | Comprobación realizada | Resultado |
|---|---|---|
| CP-78 | Retiro de consentimiento y consulta posterior del historial | Conforme por API |
| CP-79 | Intento de reconsentimiento después del retiro | Conforme |
| CP-80 | Consulta de contacto autorizada y registro en auditoría | Conforme por API |
| CP-81 | Rechazo de desenmascaramiento con justificación menor a 20 caracteres | Conforme por API |
| CP-85 | Solicitud, aprobación y descarga de exportación desidentificada | Conforme |
| CP-86 | Bloqueo de descarga de exportación después del retiro | Conforme |
| CP-87 | Revisión de privacidad de respuestas y auditoría | Conforme en el alcance revisado; pendiente consolidación general |

### 3. Evidencias por caso

#### CP-78 — Retiro de consentimiento

Se utilizó el participante ficticio `P-H78XTX`, creado para las pruebas.

- Retiro: HTTP 201 Created.
- Evento registrado: `retirar`.
- Estado del consentimiento: `revocado`.
- Estado de la participación: `retirado`.
- Consulta posterior: HTTP 200 OK.
- Historial verificado: eventos `aceptar` y `retirar`.

**Resultado:** conforme por API. Pendiente verificar la representación del estado en la lista y ficha de la interfaz.

#### CP-79 — Reconsentimiento posterior al retiro

Se intentó registrar un nuevo evento `reconsentir` sobre el consentimiento revocado en CP-78.

- HTTP 409 Conflict.
- Código: `TRANSICION_INVALIDA`.
- Mensaje: "La participación retirada no admite nuevas decisiones de consentimiento."

**Resultado:** conforme. Se impide la transición prohibida.

#### CP-80 — Contacto autorizado y auditoría

El Investigador responsable realizó una solicitud de contacto con motivo `coordinar_sesion`.

- Solicitud de contacto: HTTP 200 OK.
- Encabezado: `Cache-Control: no-store`.
- Respuesta autorizada: código seudónimo y cuatro campos totales (`codigo_seudonimo`, `nombre`, `correo`, `telefono`).
- Auditoría: operación `desenmascarar` sobre `contacto_participante`, con resultado `exito` y motivo registrado.
- La respuesta de auditoría revisada no expuso los datos de contacto.

**Resultado:** conforme por API. Pendiente verificar el flujo en la interfaz.

#### CP-81 — Justificación insuficiente

Se intentó desenmascarar una identidad existente utilizando la justificación `Prueba breve`.

- HTTP 400 Bad Request.
- Código: `SOLICITUD_INVALIDA`.
- Mensaje: "La justificación debe tener al menos 20 caracteres."
- Encabezado: `Cache-Control: no-store`.

**Resultado:** conforme.

#### CP-85 — Exportación desidentificada

El Estudiante autorizado solicitó una exportación del estudio EST-01 y el Investigador responsable la aprobó.

- Solicitud: HTTP 201 Created; estado `solicitada`.
- Aprobación: HTTP 200 OK; estado `lista`.
- Código: `X-RGE6ML`.
- Descarga: HTTP 200 OK; archivo ZIP.
- Archivos revisados: `LEEME.txt` y `participantes.csv`.
- Participantes incluidos: 1.
- Columnas del CSV: `codigo_en_exportacion`, `estado_consentimiento`, `mes_inscripcion`.
- Fila observada: código `E-`, consentimiento `otorgado`, mes `2026-10`.
- No se observaron nombres, RUT, correos, teléfonos ni fechas exactas en el CSV.

**Resultado:** conforme.

#### CP-86 — Exportación desactualizada tras retiro

Se creó el participante ficticio `P-9S34T7`, se aceptó su consentimiento y se generó una exportación antes del retiro.

- Aceptación: HTTP 201 Created; consentimiento `otorgado`.
- Exportación generada: `X-9YH8UJ`; estado `lista`.
- Descarga inicial: HTTP 200 OK.
- Paquete inicial: dos participantes, incluido el registro ficticio con mes `2026-11`.
- Retiro posterior: HTTP 201 Created; consentimiento `revocado`; participación `retirado`.
- Segunda descarga del mismo paquete: HTTP 409 Conflict.
- Código: `EXPORTACION_DESACTUALIZADA`.
- Encabezado: `Cache-Control: no-store`.

**Resultado:** conforme. Se impide descargar un paquete que quedó desactualizado por el retiro de un participante.

#### CP-87 — Revisión de privacidad

Se revisaron las respuestas obtenidas durante los casos ejecutados por Benjamín Arias y los registros de auditoría correspondientes.

- Los errores de CP-79, CP-81 y CP-86 no revelaron identidades de participantes.
- Las exportaciones de CP-85 y CP-86 utilizaron códigos `E-`, estado de consentimiento y mes de inscripción.
- La auditoría del contacto de CP-80 no incluyó los datos de contacto en sus registros revisados.
- La consulta de auditoría de exportaciones respondió HTTP 200 OK, con 11 registros.
- Se verificaron operaciones `crear`, `aprobar` y `exportar`, tanto exitosas como rechazadas.
- No se observaron nombres, RUT, correos o teléfonos de participantes en dichos registros.
- La auditoría incluye identificadores de usuarios y sesiones, direcciones IP y otros metadatos de trazabilidad; su acceso debe mantenerse restringido a roles autorizados.

**Resultado:** conforme en las respuestas revisadas. La validación global de CP-87 requiere integrar las evidencias de CP-72 a CP-77 y CP-82 a CP-84, ejecutados por otros integrantes.

### 4. Observaciones del entorno

Durante CP-85 se detectó que el Estudiante de prueba tenía `puede_exportar = false` en la base local, aunque el archivo `db/dev/datos_prueba.sql` establece `true`.

Se habilitó temporalmente el permiso únicamente para la membresía ficticia de EST-01, se ejecutó la prueba y después se restauró su valor original `false`, confirmado mediante `UPDATE 1`.

No se modificaron los scripts de inicialización ni los permisos de otros usuarios.

### 5. Pendientes

- Comprobar visualmente en la interfaz las operaciones contempladas en CP-78 y CP-80.
- Integrar la evidencia de los demás responsables para cerrar completamente CP-87.
- Consolidar los resultados individuales en el informe general de la Actividad 64.

### 6. Archivo de pruebas

Las solicitudes HTTP utilizadas se encuentran en:

`backend/pruebas/act64_pruebas.http`

El archivo de entrega no debe contener tokens JWT reales. Los identificadores de exportaciones y participantes corresponden a pruebas del entorno local.
