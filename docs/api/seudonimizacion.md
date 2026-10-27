# Guía API de seudonimización — Actividad 56

## 1. Alcance y estado

Documenta los códigos de identidad y las dos consultas excepcionales de datos personales. Fuentes: plan de la Actividad 56, Matriz de seudonimización v3 y ADR-002 D12–D15.

Revisión de código: `feature/seudonimizacion` (ddbbe23) contiene decisiones, permisos y la planilla de pruebas, pero no monta las dos rutas nuevas. La implementación consultada está en `feature/desenmascarar` (d03b836). Esta guía no acredita que esos cambios estén integrados en la rama de entrega ni desplegados.

La planilla `docs/pruebas/act56_casos_prueba.csv` tiene CP-26 a CP-37 con resultados y estados vacíos. El informe `act56_validacion_filtro.md` aprueba la revisión del filtro; no equivale a aprobar los doce casos funcionales. No se ejecutaron nuevas pruebas al redactar este documento.

## 2. Reglas generales

- Autenticación: `Authorization: Bearer <TOKEN>`; solicitudes JSON con `Content-Type: application/json`.
- Rutas sin prefijo `/api/v1` en el código revisado. Ajustar el host al entorno.
- Las consultas ordinarias usan el seudónimo por estudio. El vínculo identidad–participante permanece interno.
- Las dos rutas excepcionales responden con `Cache-Control: no-store` y registran la acción `desenmascarar` con justificación y estudio.
- No incluir nombres, RUT, correos ni teléfonos en las justificaciones ni en los registros de auditoría.
- Los ejemplos son ficticios y describen el contrato; no son evidencias de ejecución.

## 3. Rutas y acceso

| Método y ruta | Quién puede | Entrada | Salida prevista |
|---|---|---|---|
| POST `/participaciones/{id}/contacto` | Director o Investigador responsable del estudio | motivo; detalle obligatorio si motivo=otro | 200: codigo_seudonimo, nombre, correo, telefono |
| POST `/identidades/{ux_lab_id}/desenmascarar` | Director; Investigador o Asistente con autorización ver_identidad aprobada y vigente del estudio | id_estudio y justificacion | 200: ux_lab_id, rut, nombre, correo, telefono, fecha_nacimiento |

Contacto usa `contacto_participante/leer`; el investigador debe ser el responsable, no basta con pertenecer al estudio. Desenmascarar usa `identidad/leer`: para Investigador y Asistente, la membresía por sí sola no sustituye la autorización especial. Estudiante, Invitado y Soporte quedan excluidos según D13.

## 4. Contacto de una participación

### Motivos

| Valor | Uso |
|---|---|
| coordinar_sesion | Coordinar una sesión de investigación |
| reconsentimiento | Solicitar una nueva aceptación de consentimiento |
| incidente | Gestionar un incidente o seguimiento |
| retiro | Gestionar el retiro de la persona |
| otro | Otro propósito, que debe explicarse en detalle |

Si la participación está retirada, solo se admite `retiro`. Cualquier otro motivo produce 409. Un motivo fuera de la lista o `otro` sin detalle produce 400.

Petición:

```http
POST /participaciones/55555555-5555-4555-8555-555555555555/contacto
Authorization: Bearer <TOKEN>
Content-Type: application/json

{"motivo":"coordinar_sesion"}
```

Respuesta 200 ilustrativa:

```json
{
  "codigo_seudonimo": "P-7K3QX9",
  "nombre": "Persona de prueba",
  "correo": "persona@example.org",
  "telefono": "+56912345678"
}
```

Nunca devuelve RUT, fecha de nacimiento, UX Lab ID ni el vínculo interno. Ejemplo para otro motivo:

```json
{"motivo":"otro","detalle":"Confirmar disponibilidad para una reunión del estudio"}
```

## 5. Desenmascarar una identidad

`justificacion` debe tener al menos 20 caracteres; la implementación revisada admite hasta 2000, eliminando espacios externos. `id_estudio` debe identificar el estudio en el que participa la persona. Si no existe esa relación, el contrato exige 404 sin revelar si la identidad existe en otro estudio.

Petición:

```http
POST /identidades/UXL-7K3QX9AB/desenmascarar
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "id_estudio": "22222222-2222-4222-8222-222222222222",
  "justificacion": "Verificar antecedentes para una consulta formal del CEC"
}
```

Respuesta 200 ilustrativa (persona sin RUT):

```json
{
  "ux_lab_id": "UXL-7K3QX9AB",
  "rut": null,
  "nombre": "Persona de prueba",
  "correo": "persona@example.org",
  "telefono": "+56912345678",
  "fecha_nacimiento": "1995-06-15"
}
```

Una autorización para EST-01 no permite desenmascarar en EST-02. Debe estar aprobada, vigente y corresponder al recurso identidad y al estudio consultado.

## 6. Qué ve cada rol

Tabla basada en Matriz v3, complementada por D12 y D13. Los accesos ordinarios siguen sujetos a permisos, membresía o alcance global.

| Rol | Datos ordinarios de estudio | Ruta contacto | Ruta desenmascarar |
|---|---|---|---|
| Director | Consulta según alcance global | Sí, con motivo | Sí, con justificación y estudio |
| Investigador | Seudónimos y datos autorizados del estudio | Solo si es responsable | Solo con ver_identidad aprobada y vigente |
| Asistente | Seudónimos y datos autorizados del estudio | No | Solo con ver_identidad aprobada y vigente |
| Estudiante | Seudónimos y datos autorizados; no consentimientos completos | No | No |
| Invitado | Información seleccionada según membresía; no consentimientos completos | No | No |
| Soporte | Cuentas y sesiones según su función; sin identidad de participantes por estas rutas | No | No |

Investigador y Asistente reciben el UX Lab ID al registrar/buscar personas para enrolarlas (A2). Ese identificador no debe aparecer en listados de estudio ni exportaciones. Los datos de integrantes del equipo no se confunden con la identidad de participantes.

## 7. Códigos independientes

| Código | Formato definido | Uso |
|---|---|---|
| UX Lab ID | UXL-XXXXXXXX | Identidad interna de una persona |
| Seudónimo | P-XXXXXX | Persona dentro de un estudio |
| Exportación | X-XXXXXX | Paquete de exportación; integración Act. 60 |
| Persona exportada | E-XXXXXX | Persona dentro de un paquete; integración Act. 60 |

Cada X representa un carácter aleatorio. Los códigos no derivan de datos personales ni unos de otros. La misma persona tiene seudónimos distintos en estudios diferentes; las colisiones se resuelven con reintento y restricciones de unicidad.

Diferencia detectada: D14 dice que el alfabeto excluye 0, O, 1, I y L. El generador de `feature/desenmascarar` usa `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, que sí incluye L y contiene 32 símbolos. No afirmar que el código cumple la exclusión de L hasta resolver esta discrepancia con el líder. El generador expone funciones específicas para UXL- y P-; no se acredita aquí la implementación del flujo de exportación.

## 8. Errores y auditoría

| HTTP | Situación |
|---|---|
| 400 | Identificador, motivo o justificación inválidos; falta detalle para otro |
| 401 | Sesión o autenticación inválida |
| 403 | Rol, responsabilidad o autorización insuficientes |
| 404 | Recurso no encontrado o identidad no vinculada al estudio |
| 409 | Participación retirada y motivo diferente de retiro |
| 503 | Auditoría no disponible: la implementación de desenmascarar debe impedir entregar datos |

Los errores usan la estructura `error.codigo` y `error.mensaje`; confirmar el código específico con la respuesta de cada caso.

El código revisado de desenmascarar registra auditoría antes de responder y contempla 503 si falla. La acción es `desenmascarar`; la ruta de contacto marca recurso `contacto_participante` y la otra `identidad`. Registrar justificación, estudio, actor y resultado sin copiar los datos descifrados. Verificar estos controles con CP-31 y las pruebas de fallo de auditoría.

## 9. Filtro de privacidad

D15 prohíbe en respuestas ordinarias: `rut`, `rut_cifrado`, `rut_hash`, `nombre_cifrado`, `correo_cifrado`, `correo_hash`, `telefono_cifrado`, `fecha_nacimiento`, `id_identidad`, `ux_lab_id`, `id_participante`, `id_vinculo`, `evidencia_ruta`, `documento_ruta`, `ruta_archivo`, `hash_password`, `mfa_secret`, `codigo_hash` y `token_hash`; también nombre, correo y teléfono cuando pertenecen a una identidad.

Las excepciones se declaran por ruta. La revisión de Felipe aprueba el filtro, pero el barrido con una persona canario requiere evidencia de ejecución para demostrar que ninguna ruta ordinaria filtra esos datos.

## 10. Validación y pendientes

- Integrar las rutas de feature/desenmascarar en la rama de entrega acordada por el equipo.
- Completar resultados y evidencia de CP-26 a CP-37; la planilla revisada aún está vacía en esas columnas.
- En CP-32 usar una justificación de 20 caracteres o más: el ejemplo «auditoria etica» de la planilla no alcanza el mínimo.
- Resolver la discrepancia del alfabeto respecto a L y alinear D14 y CP-37.
- Incorporar la nota de revisión de cumplimiento de Felipe cuando esté disponible. Esta guía no certifica cumplimiento legal.
- Act. 60: exportaciones y códigos X-/E-. Act. 73: supresión. Act. 74: solicitud y aprobación de autorizaciones. No se presentan como implementadas por esta actividad.

## Fuentes

- [Plan Act. 56](https://drive.google.com/file/d/1CwQEvrycLrEDDnv0Iim9cmJCPa6arH3v/view).
- [Matriz de seudonimización v3](https://drive.google.com/file/d/1qVsFcW1CLZ77TANQO-3x8EPfsxkwQ-eq/view).
- ADR-002 D12–D15, código de rutas/servicios y generador de códigos de las ramas indicadas.
- docs/pruebas/act56_casos_prueba.csv y docs/pruebas/act56_validacion_filtro.md.
