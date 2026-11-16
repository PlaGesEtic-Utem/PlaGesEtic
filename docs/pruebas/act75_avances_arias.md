# Actividad 75 - Avances de desarrollo

**Proyecto:** PlaGesEtic - UX Lab UTEM  
**Responsable:** Benjamin Arias  
**Rol:** Desarrollador  
**Periodo:** 12 al 15 de noviembre de 2026

## 1. Objetivo

Validar la vinculacion entre consentimientos y datos de
investigacion, comprobando las restricciones asociadas
al retiro, reconsentimiento y exportacion de datos.

## 2. Jueves 12 - Pruebas automaticas

Se creo la rama feature/act75-vinculos y se incorporo
el archivo backend/test/act75-vinculos.test.js.

Se implementaron pruebas para:

- Estado pendiente al reemplazar el documento de consentimiento.
- Rechazo de exportaciones desactualizadas mediante HTTP 409.
- Identificacion de la prueba pendiente sobre carga de datos
  posteriores al retiro.

Las dos primeras pruebas aprobaron utilizando servicios
reales y repositorios simulados.

La tercera permanece como TODO porque los endpoints
de carga de registros y sesiones no estan implementados.

**Commit:** e61a847.

## 3. Sabado 14 - Revision de hallazgos

Se revisaron los resultados publicados por Felipe Cruz
y el script verificar-vinculos.js de Benjamin Barrientos.

Las rutas existentes revisadas funcionaron conforme
a los resultados esperados.

El script detecto tres participaciones activas sin
consentimiento vigente:

| Participacion | Situacion |
|---|---|
| P-SXXZ48 | Aceptacion de una version anterior |
| P-SXBU77 | Sin evento de consentimiento |
| P-4R7SHF | Consentimiento rechazado |

Se realizaron consultas de solo lectura a PostgreSQL.

Para las tres participaciones se confirmo:

- Cero registros en research_schema.registro_datos.
- Cero sesiones en research_schema.sesion_investigacion.
- Exclusión de la elegibilidad actual de exportaciones.
- Cero inclusiones en paquetes de exportacion vigentes.

No se identificaron defectos confirmados que justificaran
modificar las rutas existentes ni los registros analizados.

## 4. Domingo 15 - Verificacion final

Se ejecutaron las pruebas completas del backend:

| Indicador | Resultado |
|---|---:|
| Pruebas totales | 151 |
| Aprobadas | 149 |
| Fallidas | 0 |
| Omitidas | 1 |
| TODO | 1 |

npm test finalizo con codigo de salida 0.

Se verifico la sintaxis de:

- backend/scripts/verificar-vinculos.js
- backend/test/act75-vinculos.test.js

El script de vinculacion obtuvo:

| Consulta | Casos detectados |
|---|---:|
| Participaciones activas sin consentimiento vigente | 3 |
| Aceptaciones sin documento o evidencia | 0 |
| Exportaciones con retiros posteriores | 0 |
| Eventos sin auditoria | 0 |

El script termino con codigo 1, correspondiente
a las tres alertas de la primera consulta.

## 5. Estado de integracion

Se verifico que los siguientes aportes se encuentran
integrados en develop:

- Pruebas de Arias: e61a847.
- Script de Barrientos: 77d800e.
- Hallazgos de Felipe: 75c4549.

## 6. Pendientes y observaciones

1. Definir con el lider si las tres participaciones
   detectadas por la primera consulta representan
   inconsistencias o estados legitimos del proceso.

2. Completar la prueba de carga posterior al retiro
   cuando exista un endpoint para registrar datos
   de investigacion.

3. Mantener documentado que la primera consulta
   todavia no cumple el criterio de cero hallazgos.

No se modificaron consentimientos ni datos para
alterar artificialmente los resultados.

## 7. Conclusion

La revision de las rutas existentes y la ejecucion
de las pruebas no identificaron defectos que
requirieran correcciones en el codigo analizado.

La suite automatica finalizo sin pruebas fallidas.

Persisten los pendientes descritos anteriormente,
por lo que la validacion integral de la Actividad 75
no debe declararse completamente cerrada.
