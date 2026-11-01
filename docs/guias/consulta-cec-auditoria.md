# Cómo responder una consulta del CEC con la auditoría

Dirigido al Director.

Referencia funcional: [Guía de auditoría](../api/auditoria.md).

Esta guía describe el funcionamiento documentado para la Actividad 57. La consulta está implementada en la rama revisada; la exportación CSV y la verificación de integridad siguen pendientes de validación.

## 1. Delimitar la solicitud

Identificar el estudio, el período, la persona o registro consultado y la acción que se necesita revisar.

Usar identificadores internos y seudónimos en las notas de trabajo.

## 2. Consultar los eventos

Consultar `GET /auditoria` utilizando los filtros:

- `id_estudio`: identificador del estudio.
- `desde`: inicio del período.
- `hasta`: término del período.

Para revisar accesos excepcionales a la identidad, añadir `accion=desenmascarar`.

## 3. Revisar los resultados

Revisar en cada evento:

- Usuario.
- Fecha y hora.
- Entidad.
- Registro afectado.
- Resultado.
- Justificación.
- Autorización.

Un evento con `resultado=error` no demuestra que se hayan entregado datos. La auditoría tampoco contiene una copia de todo lo que vio el usuario.

## 4. Relacionar los registros

Para una participación, filtrar por su `id_registro_afectado` sin restringir inicialmente la entidad.

Los accesos a datos de contacto utilizan la entidad `contacto_participante`. Los registros de identidad y consentimiento pueden utilizar UUID distintos.

Relacionar cada consulta con el estudio y los registros correspondientes.

## 5. Revisar todas las páginas

Aumentar `desplazamiento` en el valor de `limite` hasta revisar los resultados indicados en `total`.

La bitácora puede recibir eventos durante la consulta. La paginación no garantiza una instantánea inmutable.

## 6. Preparar la respuesta al CEC

Registrar:

- Alcance de la revisión.
- Filtros utilizados.
- Período consultado y zona horaria `America/Santiago`.
- Identificadores de los eventos relevantes.
- Acciones y resultados encontrados.
- Limitaciones o verificaciones pendientes.

No incluir tokens, contraseñas, evidencia firmada ni datos personales innecesarios.

## 7. Exportación de resultados

La exportación CSV sigue pendiente en la versión revisada.

Cuando esté implementado `GET /auditoria/exportar`, utilizar la descarga autorizada por estudio y fechas y comprobar que la exportación quede auditada.

Mientras esa función no esté disponible, indicar la limitación en la respuesta. No presentar un archivo elaborado manualmente como una exportación oficial del sistema.

## 8. Verificación de integridad

Si se solicita comprobar la integridad de la bitácora, pedir al responsable técnico la verificación de la cadena y su evidencia.

No se encontró el script de verificación en la rama revisada. La existencia de las columnas `secuencia`, `hash_anterior` y `hash` no demuestra por sí sola que la cadena sea íntegra.

## Modelo de respuesta

> Se revisó la auditoría del estudio [ID] entre [desde] y [hasta], considerando la zona horaria America/Santiago. Se identificaron [cantidad] eventos relacionados con [alcance]. Los eventos [IDs] registran [acción y resultado]. Quedan pendientes [limitaciones o verificaciones].

Completar este modelo únicamente con hechos verificados.

## Estado de la documentación

Esta guía forma parte de la documentación de la Actividad 57. Su publicación no acredita la ejecución de pruebas ni el cierre de los pendientes de implementación.
