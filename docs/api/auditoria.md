# Guía API de auditoría — Actividad 57

## 1. Alcance y estado

Referencia: `feature/auditoria`, commit `2cbfc312f288a34fe9291a048470b070105326bd`. Fuentes: código de rutas, controlador y repositorio, SQL `act57_cadena_auditoria.sql`, plan de Act. 57 y ADR-002 D16–D19.

La consulta y los filtros están presentes. Existe el SQL de encadenamiento, pero su presencia no acredita aplicación en una base. En esta revisión no se encontraron `GET /auditoria/exportar`, `scripts/verificar-auditoria.js` ni la planilla `act57_casos_prueba.csv` en esta rama. No se ejecutaron pruebas nuevas. La actividad no se declara cerrada.

## 2. Rutas y autorización

| Método y ruta | Acceso | Estado |
|---|---|---|
| GET /auditoria | Director, permiso auditoria/leer global | Implementado en la rama revisada |
| GET /auditoria/exportar | Director | Previsto; todavía no encontrado |
| POST, PUT, PATCH, DELETE /auditoria o /auditoria/{id} | No permitido | 405; bitácora de solo lectura |

Enviar `Authorization: Bearer <TOKEN>`. No se usa prefijo `/api/v1` en las rutas revisadas. GET /auditoria/{id} no es una consulta de detalle implementada: usar el filtro id_registro_afectado para el registro de negocio.

## 3. Filtros combinables

| Parámetro | Validación / valor por defecto |
|---|---|
| id_usuario | UUID del usuario |
| id_estudio | UUID del estudio |
| id_registro_afectado | UUID del registro de negocio |
| entidad | 1–64 caracteres; inicia con letra minúscula; después letras minúsculas, números o guion bajo |
| accion | Una de las 13 acciones de la sección 5 |
| resultado | exito o error |
| desde, hasta | Fechas reales YYYY-MM-DD; desde no puede superar hasta |
| limite | Entero 1–200; por defecto 50 |
| desplazamiento | Entero no negativo; por defecto 0 |

Los filtros se combinan con AND. El rango incluye ambos días según America/Santiago: desde las 00:00 del día inicial hasta antes de las 00:00 del día siguiente a hasta. Orden: fecha_hora descendente y luego id_auditoria descendente.

Diferencia por validar: el código comprueba la forma de entidad, pero no su pertenencia a la lista D19. Una entidad desconocida de formato válido puede producir una lista vacía, en vez del 400 previsto por CP-46.

## 4. Ejemplos

Petición ilustrativa para un estudio:

```http
GET /auditoria?id_estudio=22222222-2222-4222-8222-222222222222&accion=desenmascarar&desde=2026-10-19&hasta=2026-10-25&limite=50&desplazamiento=0
Authorization: Bearer <TOKEN>
```

Respuesta 200 ilustrativa sin coincidencias:

```json
{"datos":[],"paginacion":{"total":0,"limite":50,"desplazamiento":0}}
```

Cada fila del repositorio contiene id_auditoria, id_usuario, correo_intentado, id_sesion, ip, entidad, id_registro_afectado, id_estudio, accion, resultado, justificacion, id_autorizacion y fecha_hora. El filtro de privacidad puede suprimir campos sensibles según su configuración. Esta consulta no selecciona secuencia, hash_anterior ni hash, aunque existan en la base.

Para rastrear una participación:

```http
GET /auditoria?id_registro_afectado=55555555-5555-4555-8555-555555555555&id_estudio=22222222-2222-4222-8222-222222222222
Authorization: Bearer <TOKEN>
```

No limitar inicialmente a entidad=participacion si también se buscan consultas de contacto: estas usan contacto_participante. Los consentimientos e identidades pueden registrar otros UUID; consultar esos identificadores por separado y contrastar el estudio.

## 5. Entidades y acciones (D19)

Ejemplos semánticos: no acreditan que todas las rutas correspondientes estén implementadas o cubiertas por pruebas.

| Entidad | Ejemplo |
|---|---|
| auth | Intento de inicio de sesión |
| estudio | Creación de un estudio |
| protocolo | Registro de una versión de protocolo |
| membresia | Cambio de acceso a un estudio |
| participacion | Inscripción en un estudio |
| identidad | Consulta excepcional de identidad |
| contacto_participante | Consulta de contacto con motivo |
| consentimiento | Registro de una decisión |
| documento_consentimiento | Carga de una versión documental |
| registro_datos | Consulta o descarga de un archivo |
| exportacion | Solicitud de un paquete |
| autorizacion | Aprobación de un acceso especial |
| usuario | Cambio de estado de una cuenta |
| auditoria | Consulta o exportación de la bitácora |

| Acción | Ejemplo |
|---|---|
| crear | Registrar un estudio |
| leer | Consultar una participación |
| actualizar | Modificar un estudio |
| eliminar | Eliminar un recurso cuando su módulo lo permita; nunca la bitácora |
| descargar | Descargar evidencia (alcance posterior) |
| exportar | Exportar auditoría o datos (según módulo) |
| desenmascarar | Consultar contacto o identidad |
| aprobar | Aprobar una autorización (Act. 74) |
| rechazar | Rechazar una autorización (Act. 74) |
| revocar | Revocar un acceso |
| login_exitoso | Ingreso correcto |
| login_fallido | Intento de ingreso rechazado |
| cierre_sesion | Cerrar la sesión |

## 6. Errores

| HTTP | Significado |
|---|---|
| 400 SOLICITUD_INVALIDA | UUID, fecha, acción, resultado, formato de entidad o paginación inválidos; filtros repetidos/vacíos |
| 401 | Autenticación inválida |
| 403 | Sin permiso para consultar auditoría |
| 405 METODO_NO_PERMITIDO | Intento de escritura por la API |
| 503 AUDITORIA_NO_DISPONIBLE | Fallo de auditoría previa en una acción sensible, según D17; no describe cualquier fallo de GET /auditoria |

Ejemplo ilustrativo:

```json
{"error":{"codigo":"SOLICITUD_INVALIDA","mensaje":"desde no puede ser posterior a hasta."}}
```

## 7. Registro previo e integridad

D17 exige registrar antes de entregar datos en contacto, desenmascarar y, cuando existan, descargas, exportaciones y decisiones de autorización. Ante fallo, 503 sin datos. Las demás rutas registran después de responder. La cobertura efectiva debe comprobarse por ruta; tener el middleware no demuestra que todas lo invoquen.

El SQL D18 agrega secuencia BIGINT, hash_anterior CHAR(64) y hash CHAR(64), todos NOT NULL; secuencia tiene índice UNIQUE. La primera fila usa 64 ceros como hash_anterior. Un trigger BEFORE INSERT usa bloqueo de transacción, asigna secuencia y calcula SHA-256 sobre un arreglo JSONB ordenado de los campos y el hash anterior. La cadena detecta modificaciones bajo sus condiciones de verificación; no sustituye permisos ni triggers de inmutabilidad, ni acredita por sí sola protección frente a quien pueda reescribir la cadena completa.

No asumir secuencias consecutivas sin huecos: una secuencia PostgreSQL puede avanzar aunque una transacción falle. La función de verificación debe usar el orden de secuencia y los hashes, no solo diferencias de uno.

## 8. Exportación prevista y conservación

GET /auditoria/exportar se reserva para CSV por estudio y rango de fechas, solo Director, con registro previo de exportar sobre auditoria. El contrato exacto de columnas, límites y encabezados queda pendiente de implementación; no se proporciona una respuesta exitosa ficticia como evidencia.

D19 plantea al menos un año de conservación, por validar. La aplicación no borra la bitácora. No registrar datos personales de participantes en justificaciones. correo_intentado corresponde al ingreso fallido de una cuenta, con acceso y conservación restringidos.

## 9. Pendientes de cierre

Aplicar y validar el SQL; completar el script de integridad y la exportación; resolver la validación de entidad; ejecutar CP-38 a CP-49 con evidencias; revisar cobertura de entidades y auditoría previa; revisar e integrar el PR. La documentación no reemplaza estas verificaciones.

Guía operativa: [Cómo responder una consulta del CEC](../guias/consulta-cec-auditoria.md).

Fuente de planificación: https://drive.google.com/file/d/1raysTaQNpoZDtbS3Bves_STTBp68l6QO/view
