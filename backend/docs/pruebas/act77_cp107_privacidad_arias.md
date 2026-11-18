# Actividad 77 - CP-107: Auditoría de privacidad

## Jornada del martes 17 de noviembre de 2026

### Objetivo

Revisar que las respuestas funcionales del MVP y
el paquete de exportación no expongan información
personal de participantes.

## Resultados de las comprobaciones HTTP

- Listado de participaciones: HTTP 200, sin alertas automáticas.
- Historial de consentimientos: HTTP 200, sin alertas automáticas.
- Documentos de consentimiento: HTTP 200, sin alertas automáticas.
- Auditoría de exportaciones: HTTP 200, sin alertas automáticas.

## Revisión del paquete ZIP

El paquete contiene dos archivos: TXT y CSV.

El análisis inicial produjo una alerta por la palabra
"rut" encontrada en la línea 7 del TXT.

La alerta no correspondió a un encabezado sensible
detectado en el CSV.

Comprobaciones adicionales:

- RUT con formato reconocible detectado: false.
- Correo electrónico detectado: false.
- Código interno P- detectado: false.
- Token JWT detectado: false.
- Encabezados sensibles detectados: 0.
- Código seudónimo E- identificado: sí.
- Mes de enrolamiento identificado: sí.

## Conclusión

**SIN HALLAZGOS CONFIRMADOS EN REVISION AUTOMATICA**

La coincidencia de la palabra "rut" en el archivo TXT
no constituye por sí misma evidencia de exposición
de un identificador personal.

La verificación es automatizada y limitada a los
campos y patrones inspeccionados. No sustituye una
auditoría manual integral ni certifica por completo
la ausencia de información identificatoria.

## Consideraciones

- Se utilizaron datos de prueba sintéticos.
- No se incorporan tokens ni datos de identidad.
- El ZIP original no se incorpora al repositorio.
- Los respaldos permanecen en almacenamiento local.

## Relación con la jornada del lunes

Los resultados CP-101 a CP-106 se documentaron
previamente en la Actividad 77.
