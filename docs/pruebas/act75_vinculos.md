# Actividad 75 — Validación de vínculos entre consentimientos y datos

## 1. Objetivo y alcance

Consolidar la revisión de vínculos entre participaciones, consentimientos, documentos versionados, evidencias, exportaciones y auditoría. Documentar las restricciones ante retiro y cambio de versión, las verificaciones realizadas y los pendientes de cierre.

**Estado: revisión consolidada con pendientes; actividad no cerrada al 100 %.**

Se contrastó el código de `develop`, commit `8c48b13`, con el plan y las evidencias del equipo. Los resultados de PostgreSQL y de la suite completa que se presentan aquí fueron reportados por Arias; no se ejecutaron nuevamente durante esta consolidación documental.

## 2. Fuentes y versiones

- [Plan de la Actividad 75 v1.2](https://drive.google.com/file/d/1bnMLI1memD8OvWwpL0dskc26T6SrAgWn/view), del 12 al 15 de noviembre de 2026.
- Script: `backend/scripts/verificar-vinculos.js`, aporte `77d800e` de Barrientos.
- Pruebas: `backend/test/act75-vinculos.test.js`, aporte `e61a847` de Arias.
- [Casos de Felipe](act75_casos_prueba.csv) y [hallazgos](act75_hallazgos.md), aporte `75c4549`.
- [Avances y verificación final de Arias](https://github.com/PlaGesEtic-Utem/PlaGesEtic/blob/7215011f54b4b785f270cf777dfad7eda11895b3/docs/pruebas/act75_avances_arias.md), integrado en `develop` mediante el PR #47.

Los aportes de script, pruebas y hallazgos están en el `develop` revisado. Su historial incluye la integración de los PR #44 (script) y #45 (vínculos). Esto acredita integración de esos aportes, no cumplimiento de todos los criterios de cierre.

## 3. Script de verificación

### Ubicación y ejecución

Ruta real: `backend/scripts/verificar-vinculos.js`.

Desde `backend/`, con las variables de conexión a la base de prueba configuradas:

```bash
node scripts/verificar-vinculos.js
```

El script ejecuta consultas de solo lectura. No corrige datos ni cambia estados de exportaciones.

Códigos de salida: `0` sin alertas, `1` con casos que revisar y `2` ante error de ejecución/conexión.

### Resultados iniciales reportados por Arias (15 de noviembre)

| N.º | Verificación | Esperado en el plan | Resultado reportado | Estado documental |
|---|---|---|---|---|
| 1 | Participaciones activas sin consentimiento vigente | 0 filas | 3 casos | No cumple el umbral; requiere decisión del líder. |
| 2 | Aceptaciones/reconsentimientos sin documento, versión o huella de evidencia; evidencia con ruta pero sin huella | 0 filas | 0 casos | Sin alertas reportadas dentro del alcance de la consulta. |
| 3 | Exportaciones listas y no vencidas con retiros posteriores a su generación | Identificar exportaciones desactualizadas | 0 casos | Sin alertas reportadas; no demuestra por sí solo la detección ante un caso positivo. |
| 4 | Eventos sin registro de auditoría asociado según la consulta | 0 filas | 0 casos | Sin alertas reportadas dentro del alcance de la consulta. |

**Resultado final reportado del script: código de salida 1**, por los tres casos de la consulta 1.

### Alcance y límites de las consultas

- La consulta 1 contrasta estado activo con el último evento y la vigencia del documento. No demuestra por sí sola que existan datos de investigación sin respaldo.
- La consulta 2 revisa presencia de documento, versión y huella. No recalcula el SHA-256 del archivo ni verifica que coincida con el valor guardado.
- La consulta 3 lista los paquetes afectados; no persiste una marca de desactualización. La protección en la descarga corresponde a la revalidación de elegibilidad del servicio de exportaciones.
- La consulta 4 busca auditoría exitosa para el mismo consentimiento dentro de una ventana de cinco minutos antes o después del evento. No es una comprobación individual mediante ID del evento; requiere corroboración si hay varios eventos cercanos.

## 4. Rutas revisadas

“Sí” indica evidencia del escenario señalado. “No aplica” indica que ese HTTP no corresponde a esa operación o que la ruta no existe; no equivale a aprobar la funcionalidad pendiente.

| Operación y escenario | ¿409 corresponde? | Resultado disponible | Evidencia / conclusión |
|---|---|---|---|
| `POST /participaciones/{id}/consentimientos`, participación retirada | Sí | 409 `PARTICIPACION_RETIRADA` | [RUTA 1](evidencias/RUTA1_consentimiento.json). Rechazo acreditado en la evidencia del equipo. |
| `POST /participaciones/{id}/contacto`, retirada y motivo `coordinar_sesion` | Sí | 409 `PARTICIPACION_RETIRADA` | [RUTA 2](evidencias/RUTA2_contacto.json). La respuesta permite distinguir la excepción de contacto por motivo de retiro. |
| `POST /estudios/{id}/exportaciones`, estudio con participación retirada | No aplica exigir 409 solo por ese hecho | 201 | [RUTA 3](evidencias/RUTA3_exportacion.json). Crear un paquete no acredita inclusión de la persona retirada ni sustituye la revalidación al descargar. |
| `GET /exportaciones/{id}/descarga`, paquete con participación que dejó de ser elegible | Sí | Prueba de servicio exige 409 `EXPORTACION_DESACTUALIZADA` | `act75-vinculos.test.js` simula una participación no elegible. CP-106 confirma además el bloqueo en la prueba de integración del 16 de noviembre. |
| `POST /participaciones/{id}/registros` | No evaluable: ruta inexistente | 404 `NO_ENCONTRADO` | [RUTA 4](evidencias/RUTA4_registros.json). La regla de carga posterior al retiro sigue pendiente. |
| `POST /participaciones/{id}/sesiones` | No evaluable: ruta inexistente | 404 `NO_ENCONTRADO` | [RUTA 5](evidencias/RUTA5_sesiones.json). No demuestra rechazo por consentimiento. |

El router protegido del commit revisado no monta las dos rutas anteriores de registros y sesiones de investigación. No deben reemplazarse por rutas ficticias ni considerarse aprobadas porque respondan 404.

Las evidencias disponibles no constituyen un barrido completo de todas las rutas ante ausencia de consentimiento vigente. Ese escenario debe distinguirse del retiro y completarse donde corresponda.

## 5. Pruebas automáticas

Archivo: `backend/test/act75-vinculos.test.js`. Utiliza servicios reales y repositorios simulados; no modifica PostgreSQL ni archivos de participantes.

| Regla del plan | Cobertura encontrada | Resultado reportado / límite |
|---|---|---|
| Nueva versión deja pendiente hasta reconsentir | Simula aceptación de v1 no vigente y comprueba `pendiente_reconsentir`; luego simula reconsentimiento de v2 vigente y comprueba `otorgado`. | Aprobada según Arias. No prueba publicación HTTP de una nueva versión ni persistencia real del reconsentimiento. |
| Exportación con participante retirado responde 409 al descargar | Simula un participante no elegible y comprueba que `prepararDescarga` rechace con `EXPORTACION_DESACTUALIZADA`. | Aprobada según Arias. La elegibilidad SQL y el retiro real no se ejecutan en esta prueba. |
| Carga nueva después de retiro responde 409 | Declarada mediante `test.todo`. | Pendiente por falta del endpoint de carga de datos. |

### Suite completa reportada por Arias

| Indicador | Resultado |
|---|---:|
| Pruebas totales | 151 |
| Aprobadas | 149 |
| Fallidas | 0 |
| Omitidas | 1 |
| TODO | 1 |
| Código de salida de `npm test` | 0 |

Una suite sin fallos no significa que la prueba TODO o la omitida estén aprobadas. El reporte también indica verificación de sintaxis del script y del archivo de pruebas. Queda por adjuntar el log de ejecución con commit probado y entorno de base, sin credenciales, para reforzar la trazabilidad del resultado.

## 6. Hallazgos y correcciones

### 6.1. Tres participaciones activas sin consentimiento vigente

| Participación | Situación reportada |
|---|---|
| `P-SXXZ48` | Aceptación de una versión anterior. |
| `P-SXBU77` | Sin evento de consentimiento. |
| `P-4R7SHF` | Consentimiento rechazado. |

Arias reporta consultas de solo lectura que encontraron, para esas tres participaciones:

- Cero registros en `research_schema.registro_datos`.
- Cero sesiones en `research_schema.sesion_investigacion`.
- Exclusión de la elegibilidad actual de exportación.
- Cero inclusiones en paquetes de exportación vigentes.

**Tratamiento:** mantener los casos visibles. El líder debe decidir si son inconsistencias o estados legítimos del proceso y cómo se concilian con el criterio de cero filas. No se modificaron datos para obtener artificialmente un resultado sin alertas.

### 6.2. Carga de datos de investigación no implementada

Las tablas existen, pero las rutas HTTP revisadas no. La verificación de bloqueo de nuevas cargas después del retiro queda pendiente hasta implementar el endpoint y su prueba correspondiente.

**Tratamiento:** registrar la dependencia y asignar su implementación. No cerrar la regla mediante el 404 de una ruta inexistente.

### 6.3. Correcciones realizadas

El informe de Arias no identifica defectos confirmados que justificaran modificar las rutas existentes o los tres registros analizados. Los aportes comprobados consisten en script, pruebas y evidencias. No se atribuyen correcciones funcionales que no estén respaldadas.

## 7. Actualización al 17 de noviembre de 2026

El [informe de integración de Arias](https://github.com/PlaGesEtic-Utem/PlaGesEtic/blob/fea3d0093ab3e7190b1d95e96135084af1c0dbdd/backend/docs/pruebas/act77_resultados_arias.md), integrado mediante el PR #48, aporta evidencia de la ejecución del 16 de noviembre con datos sintéticos. Se reproducen sus resultados; para este informe no se volvieron a ejecutar las pruebas.

| Caso | Resultado observado | Qué acredita para la actividad 75 |
|---|---|---|
| CP-103 | Retiro: 201. Nuevo consentimiento: 409. Carga de datos: 404. | El retiro impide registrar un nuevo consentimiento. La ruta de carga no existe: el 404 no demuestra el bloqueo por retiro exigido (409). |
| CP-104 | Al publicar una nueva versión, la participación pasó a reconsentimiento pendiente. Después de reconsentir quedó en estado otorgado con evidencia SHA-256. | Regla de reconsentimiento verificada en integración. |
| CP-106 | La descarga de una exportación anterior al retiro devolvió 409 EXPORTACION_DESACTUALIZADA. | Regla de bloqueo de descarga verificada en integración. |

En esta segunda ejecución, las consultas 1 a 4 devolvieron **3, 0, 1 y 0 casos**, respectivamente (salida 1). La alerta adicional corresponde al paquete utilizado en CP-106: el script detectó el retiro posterior y la API bloqueó la descarga. Persisten las tres participaciones activas sin consentimiento vigente de la primera consulta.

El [plan v1.1 de la actividad 80](https://drive.google.com/file/d/1m_qhWmK-l25eBQszyNwMCv2KrMl20Zea/view) encarga registrar el seguimiento de los hallazgos de las actividades 75, 77 y 79. No acredita una decisión de cierre de la 75.

## 8. Resultado y pendientes de cierre

Se consolidaron los resultados del script, las rutas revisadas, las pruebas automáticas y los hallazgos. Los aportes técnicos revisados están integrados en `develop`.

**La Actividad 75 permanece abierta:** la consulta 1 reporta tres casos, una de las tres reglas automáticas permanece TODO y no se acredita todavía una revisión completa de rutas ante ausencia de consentimiento vigente.

| Pendiente | Responsable según reparto / decisión requerida |
|---|---|
| Resolver los tres casos y documentar su clasificación frente al criterio de cero filas | Líder, con apoyo de Arias. |
| Definir implementación de carga de datos y ejecutar la prueba posterior al retiro | Líder y Arias. |
| Completar los escenarios de rutas sin consentimiento vigente; el bloqueo de descarga tras retiro ya fue reportado en CP-106 | Cruz y Arias. |
| Corroborar consultas con casos positivos controlados y conservar salidas de ejecución | Barrientos y Arias. |
| Adjuntar commit probado, entorno y logs del resultado final | Responsables de ejecución. |
| Incorporar decisiones, resultados definitivos y revisión del PR documental | Catalina y líder. |

El cierre requiere resultados verificables o una modificación explícita del alcance aprobada por el líder. Este documento registra el estado disponible; no declara aprobadas las verificaciones pendientes.
