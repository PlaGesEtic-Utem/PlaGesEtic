# Modelo de datos — plaGesEtic

Versión vigente del modelo, la misma que implementan los scripts de `backend/db/init`.

| Documento | Versión | Qué contiene |
| --- | --- | --- |
| [DER v3](der-v3.html) | 3 (05/10/2026) | 22 tablas en 4 esquemas (`identity_schema`, `ethics_schema`, `research_schema`, `security_schema`), relaciones y trazabilidad con el documento del cliente. |
| [Diccionario de datos v3.1](diccionario-datos-v3.1.html) | 3.1 (10/10/2026) | Tabla, campo, tipo, restricciones y descripción. |
| [Middlewares de seguridad v3](https://drive.google.com/file/d/1mJSEWUPjqA2g7kzBd127ka7tVsNWvenG/view) | 3 (Drive) | Orden y responsabilidad de cada middleware. |
| [Matriz de seudonimización v3](https://drive.google.com/file/d/1qVsFcW1CLZ77TANQO-3x8EPfsxkwQ-eq/view) | 3 (Drive) | Clasificación de cada dato personal y dónde se guarda. |

## Historial

| Versión | Fecha | Cambio |
| --- | --- | --- |
| 3.1 | 10/10/2026 | `identidad.correo_cifrado`, `correo_hash` y `telefono_cifrado` pasan a NOT NULL (ADR-002, D1). El DER no cambia. |
| 3 | 05/10/2026 | Modelo completo del MVP (Benjamín Arias, con revisión del Líder). |
| 2 | 02/10/2026 | Primera versión unida al repositorio (PR #7). Archivada en [`archivo/`](archivo/). |
