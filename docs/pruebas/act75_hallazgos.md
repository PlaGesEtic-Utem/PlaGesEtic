# Hallazgos y verificación - Actividad 75

## Resultado de la búsqueda: ruta que recibe nuevos datos de investigación

**La ruta no existe en el backend actual.**

Las tablas `research_schema.registro_datos` y `research_schema.sesion_investigacion` existen en el DER v3, pero **no tienen endpoints HTTP implementados**:
- `POST /participaciones/:id/registros` → 404
- `POST /participaciones/:id/sesiones` → 404

El `test.todo` "cargar datos después de retiro debe responder 409" no puede implementarse hasta que esas rutas existan.

## Verificación de las rutas existentes que deben dar 409

| # | Ruta probada | Esperado | Obtenido | Estado |
|---|---|---|---|---|
| RUTA 1 | `POST /participaciones/:id/consentimientos` (participación retirada) | 409 | 409 `PARTICIPACION_RETIRADA` | OK |
| RUTA 2 | `POST /participaciones/:id/contacto` (motivo `coordinar_sesion` con participación retirada) | 409 | 409 `PARTICIPACION_RETIRADA` | OK |
| RUTA 3 | `POST /estudios/:id/exportaciones` (con participación retirada) | 201 (se revalida al descargar) | 201 | OK (correcto por diseño) |
| RUTA 4 | `POST /participaciones/:id/registros` (no existe) | 404 | 404 | OK (no implementada) |
| RUTA 5 | `POST /participaciones/:id/sesiones` (no existe) | 404 | 404 | OK (no implementada) |

## Nota sobre RUTA 3 (crear exportación)

La creación de la exportación devuelve 201 aunque haya participantes retirados. Esto es correcto por diseño: el test `Act75: exportacion con participante retirado responde 409` verifica que la revalidación ocurre al **descargar** (`prepararDescarga`), no al crear. Así se cubre el caso en que un participante se retire entre la creación y la descarga del paquete.

## Conclusión

- Las 2 rutas existentes que deben dar 409 (consentimientos y contacto) lo hacen correctamente.
- La exportación se revalida al descargar, como está diseñado.
- Las 2 rutas de "datos de investigación" no existen todavía. Se sugiere crear una actividad nueva para implementar `registro_datos` y `sesion_investigacion`, y agregar ahí la validación de retiro.

## Evidencias

- `docs/pruebas/evidencias/RUTA1_consentimiento.json`
- `docs/pruebas/evidencias/RUTA2_contacto.json`
- `docs/pruebas/evidencias/RUTA3_exportacion.json`
- `docs/pruebas/evidencias/RUTA4_registros.json`
- `docs/pruebas/evidencias/RUTA5_sesiones.json`
