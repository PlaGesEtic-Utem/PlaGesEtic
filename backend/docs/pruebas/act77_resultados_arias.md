# Actividad 77 - Resultados de pruebas funcionales del MVP

## Ejecución del lunes 16 de noviembre de 2026

Se ejecutaron pruebas funcionales de integración del backend
PlaGesEtic, utilizando datos sintéticos y roles de prueba.

## Resultados

- CP-101: PARCIAL. Inscripción correcta; falta completar
  la evidencia del flujo inicial de documento y consentimiento.

- CP-102: APROBADO. El Asistente registró consentimiento
  (HTTP 201) y no pudo crear un estudio (HTTP 403 SIN_PERMISO).

- CP-103: PARCIAL. Retiro correcto (HTTP 201) y bloqueo
  de nuevo consentimiento (HTTP 409 PARTICIPACION_RETIRADA).
  La carga de datos devolvió HTTP 404 porque no existe la ruta.

- CP-104: APROBADO. Publicación de nueva versión,
  transición a pendiente_reconsentir y reconsentimiento
  final con evidencia SHA-256 y estado otorgado.

- CP-105: APROBADO. Solicitud, aprobación y descarga ZIP
  exitosas. Se verificó presencia de código E- y mes
  de enrolamiento, sin códigos P- ni correos detectados.

- CP-106: APROBADO. Después del retiro, la descarga
  anterior devolvió HTTP 409 EXPORTACION_DESACTUALIZADA.

## Verificación de vínculos

Se ejecutó node scripts/verificar-vinculos.js.

Resultado: código de salida 1, con 4 inconsistencias:

- 3 participaciones activas sin consentimiento vigente.
- 1 exportación con retiro posterior, correspondiente a CP-106.

No se detectaron aceptaciones sin evidencia ni eventos de
consentimiento sin auditoría.

## Pendientes

- Completar CP-101.
- Resolver la ausencia del endpoint requerido por CP-103.
- Revisar las 3 participaciones activas sin consentimiento.
- Coordinar la numeración de casos con el CSV del equipo.
- Ejecutar CP-107, auditoría de privacidad.

## Resumen

4 casos aprobados y 2 parcialmente verificados.

No se incluyen tokens, datos de identidad ni paquetes ZIP.
