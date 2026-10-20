# Decisiones de Arquitectura — plaGesEtic

Esta sección contiene los registros de decisiones de arquitectura (ADR) del proyecto plaGesEtic.

Los ADR permitirán documentar las principales decisiones técnicas tomadas durante el desarrollo del MVP, incluyendo su contexto, alternativas consideradas y justificación.

## Decisiones registradas

| ADR | Decisión | Estado registrado |
| --- | --- | --- |
| [ADR-001](ADR-001-stack-tecnologico.md) | Node.js + Express, PostgreSQL y Docker para el MVP. | Aceptado por Benjamín Barrientos, según el registro de origen en Drive. |
| [ADR-002](ADR-002-decisiones-prototipo-alfa.md) | Decisiones para el prototipo Alfa: correo y teléfono obligatorios, rutas sin prefijo, ingreso y sesión, edición del estudio, frontend, ramas, contacto del participante y consentimientos digitales (subida de archivos, estado vigente y eventos válidos) y seudonimización (reidentificación, `ver_identidad`, códigos y filtro de privacidad). | Propuesto el 10/10/2026; D1, D6, D7 y D8 aceptadas; D9 a D11 aceptadas el 19/10/2026; D12 a D14 aceptadas el 20/10/2026; D15 propuesta. |

El ADR conserva la decisión del registro de origen y añade una nota de correspondencia con el DER v3. Los temas pendientes de implementación permanecen en la [especificación técnica](../especificacion-tecnica/Especificacion_Tecnica_v1_0_plaGesEtic.md#9-decisiones-de-arquitectura).

## Convención de nombres

Los registros de decisiones de arquitectura utilizarán la siguiente estructura:

`ADR-XXX-nombre-de-la-decision.md`

Ejemplo:

`ADR-001-stack-tecnologico.md`

---

> Esta sección será actualizada conforme se definan y validen las decisiones de arquitectura del proyecto.
