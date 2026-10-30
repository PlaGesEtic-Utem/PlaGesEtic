
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
