# Hallazgos de la Actividad 55

## H-14 (CRÍTICO) — El estado no cambia a "pendiente_reconsentir"
**Caso:** CP-20b y CP-21
**Descripción:** Al subir una versión más nueva de un documento (v1.1) sobre un consentimiento ya otorgado (v1.0), el endpoint `GET /participaciones/{id}/consentimientos` sigue devolviendo `estado: "otorgado"` con `documento_vigente: false`. No cambia a `pendiente_reconsentir`.
**Consecuencia:** El endpoint `POST /consentimientos/{id}/eventos` rechaza `reconsentir` con `409 TRANSICION_INVALIDA`, porque cree que sigue "otorgado". Impide el flujo normal de reconsentimiento.
**Evidencia:** docs/pruebas/evidencias/CP-20b.json y CP-21.json
**Sugerencia:** Revisar la función que calcula el estado vigente. Debería devolver `pendiente_reconsentir` cuando el consentimiento está otorgado en una versión que ya no es la vigente.

## H-15 (CRÍTICO) — Se puede "revivir" un consentimiento retirado
**Caso:** CP-23
**Descripción:** Después de emitir un evento `retirar`, se puede emitir un `reconsentir` y el consentimiento vuelve a quedar `otorgado` (HTTP 201). Según las reglas de la actividad, después de retirado no se aceptan más eventos (debe ser 409).
**Riesgo ético/legal:** Permitiría al participante "volver" a participar sin un acto formal nuevo, o a un tercero manipular el historial.
**Evidencia:** docs/pruebas/evidencias/CP-23.json
**Sugerencia:** Validar en el servicio que, si la participación está `retirado`, cualquier nuevo evento devuelva 409.

## Observación menor
En CP-22, el campo `estado_vigente` devuelve `"revocado"` en vez de `"retirado"`. Preguntar a Benjamín Arias cuál es la nomenclatura oficial del catálogo v3.1.
