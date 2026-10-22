# Reporte de Cierre — Actividad 55 (Pruebas de Consentimientos)

**Responsable:** Felipe Cruz (QA / Investigador)
**Fecha de cierre:** 21 de octubre de 2026
**Rama:** feature/consentimientos

## Resumen de la ejecución
- **Casos planificados:** 12 (CP-14 a CP-25)
- **Casos ejecutados:** 12 + 1 extra (CP-20b)
- **Resultados:** 10 OK / 2 FALLAS / 1 Observación menor.

## Hallazgos reportados a Benjamín Arias
- **H-14 (CRÍTICO):** Estado no pasa a `pendiente_reconsentir` al subir una nueva versión. Bloquea el reconsentimiento.
- **H-15 (CRÍTICO):** Permitir reconsentir después de retirar. Riesgo ético y de trazabilidad.
- **Observación:** Nomenclatura "revocado" en vez de "retirado".

## Estado de los casos fallidos
- [ ] CP-20b: Pendiente de re-ejecución tras fix de H-14.
- [ ] CP-21: Pendiente de re-ejecución tras fix de H-14.
- [ ] CP-23: Pendiente de re-ejecución tras fix de H-15.

## Cumplimiento Ley 20.120
- Se agregó la sección de cumplimiento normativo en `docs/api/consentimientos.md`.
- El flujo cumple con consentimiento por escrito, protección de menores y derecho a retiro. El bloqueo post-retiro se asegurará con el fix de H-15.

## Conclusión
El módulo está funcional en un 80%. Se recomienda **NO unir el PR a develop** hasta que se corrijan H-14 y H-15, y se re-ejecuten las pruebas de regresión.
