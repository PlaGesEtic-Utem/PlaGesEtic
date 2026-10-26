# Guía API de consentimientos — Actividad 55

## 1. Alcance y referencia

Guía del contrato implementado en `feature/consentimientos`, commit `85c6133a299848c81d000e5417f40a2dae9dabf9`. Incluye documentos versionados, decisiones, eventos, estados y errores. Los ejemplos son ilustrativos; no constituyen nuevas pruebas ejecutadas.

La actividad permanece abierta por H-14 y H-15, registrados en `docs/pruebas/act55_hallazgos.md`. La documentación distingue el comportamiento actual de las reglas pendientes de corrección.

## 2. Acceso y formato

Enviar `Authorization: Bearer <TOKEN>`. Las rutas se expresan sin prefijo `/api/v1`; ajustar el host al entorno. Los POST con archivos usan `multipart/form-data`; no enviar `evidencia_base64`. Los identificadores se obtienen de respuestas previas.

La autorización combina el permiso del recurso y acción con la membresía del estudio, o el alcance global permitido por el control de acceso. Tener un rol por sí solo no garantiza acceso.

| Método y ruta | Recurso / acción | Permiso de estudio | Respuesta |
|---|---|---|---|
| POST `/estudios/{idEstudio}/documentos-consentimiento` | documento_consentimiento / crear | puede_cargar | 201, documento |
| GET `/estudios/{idEstudio}/documentos-consentimiento` | documento_consentimiento / leer | puede_consultar | 200, arreglo de documentos |
| POST `/participaciones/{idParticipacion}/consentimientos` | consentimiento / crear | puede_cargar | 201, decisión |
| GET `/participaciones/{idParticipacion}/consentimientos` | consentimiento / leer | puede_consultar | 200, estado e historial |
| POST `/consentimientos/{idConsentimiento}/eventos` | consentimiento / crear | puede_cargar | 201, evento |

El plan reserva la carga documental al investigador responsable con `puede_modificar`; el código consulta `puede_cargar`. Esta diferencia debe resolverse con el líder. El reporte de QA registra 403 al asistente que intenta subir documentos y al estudiante que intenta consultar consentimientos. No extender esos resultados a todos los roles sin verificar su configuración.

## 3. Documentos por estudio

### Subir una versión

Campos: `tipo` obligatorio (`consentimiento` o `asentimiento`), `version` obligatoria y `archivo` obligatorio (PDF). La versión admite hasta 20 caracteres, empieza por letra o número y continúa con letras, números, punto, guion o guion bajo. Máximo de archivo: 10 MiB (10 × 1024 × 1024 bytes).

```bash
curl -X POST "$BASE/estudios/$ID_ESTUDIO/documentos-consentimiento" \
  -H "Authorization: Bearer $TOKEN" \
  -F 'tipo=consentimiento' -F 'version=1.0' \
  -F 'archivo=@consentimiento-v1.pdf;type=application/pdf'
```

Respuesta 201, ejemplo con valores ficticios:

```json
{
  "id_documento": "11111111-1111-4111-8111-111111111111",
  "id_estudio": "22222222-2222-4222-8222-222222222222",
  "id_protocolo": null,
  "tipo": "consentimiento",
  "version": "1.0",
  "documento_hash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "vigente": true,
  "fecha_registro": "2026-10-20T12:00:00.000Z"
}
```

Una nueva versión desactiva la anterior del mismo estudio y tipo en una transacción. Repetir la versión devuelve 409 `VERSION_DUPLICADA`. El servicio no recibe `id_protocolo`: el repositorio inserta NULL.

### Consultar versiones

```bash
curl "$BASE/estudios/$ID_ESTUDIO/documentos-consentimiento?tipo=consentimiento&vigente=true" \
  -H "Authorization: Bearer $TOKEN"
```

Devuelve 200 y un arreglo de objetos con los mismos campos del documento anterior; sin resultados devuelve `[]`. `tipo` es opcional; `vigente=true` filtra vigentes. No devuelve rutas internas.

## 4. Registrar la decisión

POST `/participaciones/{idParticipacion}/consentimientos`.

| Campo | Regla actual |
|---|---|
| tipo_evento | Obligatorio: aceptar o negar |
| tipo | consentimiento por defecto; también asentimiento |
| version | Obligatoria; versión vigente del tipo en el estudio |
| evidencia | Archivo PDF, JPEG o PNG; obligatorio para aceptar, opcional para negar |
| id_representacion | UUID de representación vigente; obligatorio para consentimiento de menor |

No enviar `id_documento` como sustituto de `version`. El servidor resuelve el documento por estudio, tipo y versión. Para adultos no se admite asentimiento ni representante; para el asentimiento del menor no se envía representante.

```bash
curl -X POST "$BASE/participaciones/$ID_PARTICIPACION/consentimientos" \
  -H "Authorization: Bearer $TOKEN" \
  -F 'tipo_evento=aceptar' -F 'tipo=consentimiento' -F 'version=1.0' \
  -F 'evidencia=@firma.pdf;type=application/pdf'
```

Respuesta 201 ilustrativa:

```json
{
  "id_evento": "33333333-3333-4333-8333-333333333333",
  "id_consentimiento": "44444444-4444-4444-8444-444444444444",
  "id_participacion": "55555555-5555-4555-8555-555555555555",
  "tipo": "consentimiento",
  "tipo_evento": "aceptar",
  "version": "1.0",
  "fecha": "2026-10-20T12:05:00.000Z",
  "evidencia_hash": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "estado_vigente": "otorgado"
}
```

La participación debe estar activa. Repetir la misma decisión sobre el mismo documento devuelve 409 `SIN_CAMBIOS`; esto no equivale a rechazar cualquier segunda petición. El historial añade eventos y no modifica los anteriores.

## 5. Consultar estado e historial

```bash
curl "$BASE/participaciones/$ID_PARTICIPACION/consentimientos" \
  -H "Authorization: Bearer $TOKEN"
```

Respuesta 200 ilustrativa para una participación sin decisiones:

```json
{
  "id_participacion": "55555555-5555-4555-8555-555555555555",
  "codigo_seudonimo": "P-EJEMPLO",
  "es_menor_al_enrolar": false,
  "completo": false,
  "estado_vigente": [{"tipo": "consentimiento", "estado": "sin_registro"}],
  "historial": []
}
```

Con decisiones, cada estado incluye `tipo`, `estado`, `tipo_evento`, `version`, `documento_vigente` y `fecha`. Cada elemento del historial incluye `id_evento`, `tipo`, `tipo_evento`, `version`, `fecha`, `evidencia_hash`, `id_representacion` e `id_usuario`, ordenado del más reciente al más antiguo. El seudónimo del ejemplo no define un formato normativo.

Para menores se exigen consentimiento y asentimiento. Actualmente `completo` solo comprueba que ambos estados sean `otorgado`; no comprueba vigencia documental. Por H-14, no debe interpretarse por sí solo como autorización para operar con consentimiento actualizado.

## 6. Eventos posteriores

POST `/consentimientos/{idConsentimiento}/eventos` recibe `tipo_evento`: `negar`, `retirar` o `reconsentir`. Para reconsentir exige `version`, evidencia y, en consentimiento de menor, `id_representacion`. Negar y retirar usan el documento de la última decisión y admiten evidencia opcional en el código actual.

```bash
curl -X POST "$BASE/consentimientos/$ID_CONSENTIMIENTO/eventos" \
  -H "Authorization: Bearer $TOKEN" \
  -F 'tipo_evento=retirar' -F 'evidencia=@retiro.pdf;type=application/pdf'
```

Respuesta 201 ilustrativa:

```json
{
  "id_evento": "66666666-6666-4666-8666-666666666666",
  "id_consentimiento": "44444444-4444-4444-8444-444444444444",
  "id_participacion": "55555555-5555-4555-8555-555555555555",
  "tipo": "consentimiento",
  "tipo_evento": "retirar",
  "fecha": "2026-10-20T13:00:00.000Z",
  "evidencia_hash": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  "estado_vigente": "revocado",
  "participacion_estado": "retirado"
}
```

El retiro y el estado de participación se guardan en la misma transacción. En un estudio cerrado solo se permite retirar; otros eventos devuelven 409 `ESTUDIO_CERRADO`.

Ejemplo de petición de reconsentimiento para verificar H-14 después de corregirlo:

```bash
curl -X POST "$BASE/consentimientos/$ID_CONSENTIMIENTO/eventos" \
  -H "Authorization: Bearer $TOKEN" \
  -F 'tipo_evento=reconsentir' -F 'version=1.1' \
  -F 'evidencia=@firma-v1-1.pdf;type=application/pdf'
```

No se presenta como un flujo aprobado: en el escenario de documento reemplazado, QA registró 409 `TRANSICION_INVALIDA`.

## 7. Tabla de estados y diferencias pendientes

| Situación | Resultado actual | Regla esperada / pendiente |
|---|---|---|
| Sin eventos | sin_registro | Sin decisión registrada |
| aceptar | otorgado | Otorgado con documento vigente |
| negar | negado | Decisión negativa |
| retirar | revocado; participación retirado | Unificar nomenclatura con el catálogo |
| Nueva versión después de aceptar | otorgado y documento_vigente=false | pendiente_reconsentir; H-14 |
| reconsentir desde otorgado con versión antigua | 409 TRANSICION_INVALIDA | Permitir actualización válida; H-14 |
| reconsentir después de retirar | Puede devolver 201 | Rechazar cualquier evento posterior con 409; H-15 |

La tabla describe defectos para su seguimiento; no recomienda utilizarlos. El servicio admite negar/retirar desde otorgado y reconsentir desde negado/revocado, lo que no coincide con la regla prevista de retiro definitivo.

## 8. Errores y evidencia

| HTTP | Código o condición |
|---|---|
| 400 | SOLICITUD_INVALIDA: campos, versión, representante o evidencia obligatoria ausentes/inválidos |
| 401 | Autenticación requerida o inválida |
| 403 | SIN_PERMISO: autorización insuficiente |
| 404 | Estudio, participación, consentimiento o versión no encontrados |
| 409 | VERSION_DUPLICADA, SIN_CAMBIOS, DOCUMENTO_NO_VIGENTE, PARTICIPACION_RETIRADA |
| 409 | ASENTIMIENTO_SOLO_MENORES, REPRESENTACION_NO_VALIDA |
| 409 | SIN_DECISION_PREVIA, TRANSICION_INVALIDA, ESTUDIO_CERRADO |
| 413 | ARCHIVO_MUY_GRANDE |
| 415 | Tipo o contenido del archivo no permitido |

Formato de error:

```json
{"error":{"codigo":"SIN_CAMBIOS","mensaje":"Esa misma decisión ya está registrada para este documento."}}
```

Los archivos se validan por tipo y bytes iniciales, se almacenan con nombre generado y hash SHA-256. No se exponen rutas internas ni datos identificatorios directos del participante en estas respuestas. Máximo: un archivo de 10 MiB. Si la transacción falla, el servicio intenta eliminar el archivo recién guardado.

El plan exige evidencia firmada en todos los eventos; el código la exige solo para aceptar y reconsentir. Debe resolverse esta diferencia antes del cierre.

## 9. Validación y alcance posterior

Fuentes de QA: `docs/pruebas/act55_hallazgos.md`, `docs/pruebas/evidencias/` y el [reporte de pruebas en Drive](https://docs.google.com/document/d/1R1s9kTPFzS0AU5NA13hIEuvAVl4cg1RbnJSlLG30p6M/edit). La regresión del commit de referencia indica que H-14 y H-15 persisten. No se ejecutaron pruebas nuevas al preparar esta guía.

Antes del cierre: corregir H-14/H-15 y repetir CP-20b, CP-21 y CP-23; repetir CP-18 con participación activa, porque el resultado anterior fue bloqueado por participación retirada y no probó la regla de documento de otro estudio; acordar nomenclatura, permiso de carga documental y obligatoriedad de evidencia.

- **Actividad 57:** certificado `GET /participaciones/{id}/consentimientos/certificado`, descarga `GET /eventos-consentimiento/{id}/evidencia` y consolidación de auditoría. Se indican como alcance posterior, no como rutas disponibles de esta actividad. Las cinco rutas actuales ya usan `marcarAuditoria`.
- **Actividad 73:** bloqueo de sesiones y archivos cuando falta consentimiento vigente. No considerar ese bloqueo implementado por esta guía.

## 10. Nota de Felipe — texto original

Se conserva a continuación la nota incorporada por Felipe en esta rama. Sus afirmaciones de cumplimiento y referencias legales corresponden al texto original; esta guía no las valida ni certifica. Deben revisarse junto con los hallazgos técnicos antes del cierre.

---

## Cumplimiento de la Ley 20.120 (Investigación Científica en Seres Humanos)

El flujo de consentimientos implementado en este módulo cumple con los requisitos de la Ley 20.120 de Chile:

1. **Consentimiento informado por escrito (Art. 11):**
   - Todo participante debe registrar un evento de tipo `aceptar` vinculado a una versión vigente del documento.
   - Queda registrada la evidencia firmada (archivo con hash SHA-256) como respaldo legal.
   - El historial de eventos es inmutable para garantizar la trazabilidad.

2. **Protección de menores de edad (Art. 12):**
   - Cuando el participante es menor de edad (`es_menor_al_enrolar = true`), el sistema exige un **asentimiento** del menor y un **consentimiento** firmado por su **representante legal** (`id_representacion`).
   - El endpoint `GET /participaciones/{id}/consentimientos` reporta `completo: false` mientras falte alguna firma.

3. **Derecho de retiro en cualquier momento (Art. 14):**
   - El participante puede revocar su consentimiento con el evento `retirar`, lo que cambia el estado de la participación a `retirado`.
   - *(Nota de QA: El bloqueo de eventos posteriores al retiro está siendo asegurado con la corrección del hallazgo H-15).*

4. **Trazabilidad y evidencia:**
   - Cada evento requiere una evidencia firmada, guardada con hash SHA-256 y el archivo físico en un volumen aislado.
