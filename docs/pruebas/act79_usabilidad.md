# Actividad 79 · Evaluación de usabilidad de PlaGesEtic

**Período:** 17–18 de noviembre de 2026. **Estado:** informe para revisión de cierre.

## Método y cobertura

El plan v1.1 sustituyó las sesiones externas por una evaluación heurística interna por falta de tiempo para reclutar participantes. Se asignaron pantallas que cada integrante no había programado, diez criterios de Nielsen y una escala de 0 (sin problema) a 4 (bloqueo). La evaluación no mide tiempos de usuarios externos ni tasas de éxito.

Barrientos tenía asignados Investigador y Asistente; su registro incluye también primer ingreso, Director y Estudiante. Cruz tenía asignados Director, Soporte y Estudiante y la consolidación. Arias debía revisar móvil a 390 px, teclado y mensajes de error; la consolidación consultada identifica aportes de Cruz y Barrientos, pero no acredita esa revisión transversal. Araniz tiene a cargo la planilla y el informe.

## Resultados de la consolidación

| Perfil | Hallazgos |
| --- | --- |
| Soporte | 2 |
| Director | 14 |
| Estudiante | 5 |
| Investigador | 3 |

| Criterio | Hallazgos asociados |
| --- | --- |
| C1 | 0 |
| C2 | 0 |
| C3 | 0 |
| C4 | 0 |
| C5 | 0 |
| C6 | 0 |
| C7 | 0 |
| C8 | 0 |
| C9 | 0 |
| C10 | 0 |

Un hallazgo puede afectar dos criterios. Un cero indica ausencia de registros en este consolidado, no cumplimiento demostrado.

## Lista priorizada

Los identificadores U01–U24 identifican las filas de este informe; los H-XX pertenecen al registro de Barrientos. No se suman ambos inventarios porque pueden solaparse.

| ID | Perfil | Pantalla | Observación | Criterio | Severidad | Propuesta registrada | Act. 80 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| U01 | Soporte | Bloquear/Desbloquear usuario | Al bloquear o desbloquear una cuenta, la acción se ejecuta de inmediato sin solicitar confirmación previa, facilitando interrupciones de acceso por error. *(Reportado por Felipe y Benjamín Barrientos)* | C5: Prevención de errores | 3 | Implementar un modal de confirmación ("¿Estás seguro de que deseas bloquear/desbloquear a este usuario?") antes de aplicar el cambio. | **SÍ** |
| U02 | Director | Crear cuenta | La contraseña temporal se muestra una sola vez en texto plano, sin botón para copiarla ni opción de envío por correo; si no se guarda al instante, la persona pierde el acceso. | C5: Prevención de errores / C9: Recuperación de errores | 3 | Agregar un botón "Copiar contraseña" al lado de la clave generada y habilitar un envío automático de credenciales al correo registrado. | **SÍ** |
| U03 | Director | Usuarios y roles | El botón "Guardar rol" aplica la modificación de permisos de forma inmediata sin pedir confirmación, exponiendo a cambios accidentales. | C5: Prevención de errores | 3 | Mostrar un cuadro de diálogo de confirmación ("¿Confirmas el cambio de rol para este usuario?") antes de ejecutar la acción. | **SÍ** |
| U04 | Director | Participantes (estudio existente) | No es posible agregar ni editar participantes en un estudio ya creado y activo (solo se permite al crearlo desde cero), bloqueando la gestión operativa. | C3: Control y libertad del usuario / C7: Flexibilidad y eficiencia de uso | 3 | Habilitar los botones "+ Agregar participante" y "Editar" dentro de la vista de detalle de los estudios activos. | **SÍ** |
| U05 | Estudiante | Mis descargas de datos | La interfaz despliega el mensaje técnico literal "El backend no dispone aún de un endpoint para listar todas las exportaciones", generando confusión y exponiendo detalles internos. | C2: Relación con el mundo real / C8: Diseño estético y minimalista | 3 | Reemplazar el mensaje técnico por un aviso amigable: "El historial automático de descargas estará disponible próximamente. Por ahora, puedes consultar tu solicitud usando tu código de seguimiento". | **SÍ** |
| U06 | Estudiante | Mis descargas de datos | El buscador solicita "Consultar solicitud existente por UUID" con un formato técnico de ejemplo (`XXXXXXXX-XXXX...`), concepto desconocido para el perfil estudiantil. | C2: Relación con el mundo real / C6: Reconocer antes que recordar | 3 | Renombrar la etiqueta a "Buscar por código de solicitud" y usar un texto de ayuda claro indicando dónde encontrar dicho código (ej. enviado al correo). | **SÍ** |
| U07 | Investigador | Dashboard / Mis estudios | No hay indicador visual o contador que muestre cuántos participantes tienen el consentimiento informado firmado versus pendiente sin entrar a cada estudio. *(Reportado por Benjamín Barrientos)* | C1: Visibilidad del estado / C6: Reconocer antes que recordar | 3 | Agregar una columna de progreso o insignia numérica (ej. "12/15 firmados") en la tarjeta o fila de cada estudio. | **SÍ** |
| U08 | Director | Registro de actividad | El filtro temporal solo ofrece el campo "Desde", careciendo del campo "Hasta" para acotar búsquedas en un rango de fechas específico. *(Reportado por Felipe y Benjamín Barrientos)* | C7: Flexibilidad y eficiencia de uso | 2 | Agregar el selector de fecha "Hasta" junto al campo "Desde" para permitir consultas por rangos cerrados. | No |
| U09 | Director | Registro de actividad | No existe un botón para limpiar los filtros aplicados, obligando a borrar manualmente cada campo de búsqueda. *(Reportado por Felipe y Benjamín Barrientos)* | C3: Control y libertad del usuario / C7: Flexibilidad y eficiencia de uso | 2 | Incluir un botón secundario "Limpiar filtros" que restablezca todos los campos de búsqueda a su estado inicial con un clic. | No |
| U10 | Director | Crear cuenta | El aviso "No volverá a mostrarse" aparece como texto plano normal, sin ícono ni color de alerta que destaque su importancia crítica. | C1: Visibilidad del estado / C8: Diseño estético y minimalista | 2 | Enmarcar el mensaje en un banner de advertencia con fondo amarillo suave, borde destacado e ícono de alerta. | No |
| U11 | Director | Usuarios y roles | No existe un buscador ni filtros por rol o estado en el listado de cuentas, lo que dificulta encontrar a una persona cuando la lista crece. | C7: Flexibilidad y eficiencia de uso | 2 | Incorporar una barra de búsqueda rápida por nombre o correo junto con selectores desplegables para filtrar por rol y estado. | No |
| U12 | Director | Participantes (estudio existente) | El enlace de acción "Ver ficha" aparece truncado ("Ver fic...") debido al ancho insuficiente de la columna en la tabla. | C4: Consistencia y estándares / C8: Diseño estético y minimalista | 2 | Ajustar el ancho mínimo de la columna de acciones o aplicar la propiedad CSS `white-space: nowrap` para mostrar el texto completo. | No |
| U13 | Director | Participantes (estudio existente) | La tabla tiene desplazamiento horizontal oculto sin indicadores visuales que adviertan la existencia de más columnas hacia la derecha. | C6: Reconocer antes que recordar / C8: Diseño estético y minimalista | 2 | Añadir una barra de desplazamiento horizontal siempre visible y un degradado sutil en el borde derecho para sugerir continuidad. | No |
| U14 | Director | Registro de actividad | La tabla no indica la cantidad total de registros encontrados ni cuenta con controles de paginación para navegar entre resultados extensos. | C6: Reconocer antes que recordar / C7: Flexibilidad y eficiencia de uso | 2 | Mostrar un contador superior (ej. "Mostrando 12 registros") e implementar controles básicos de paginación al pie de la tabla. | No |
| U15 | Director | Registro de actividad | No hay opción para descargar o exportar el registro de actividad (en CSV o PDF) para respaldos o auditorías externas. | C7: Flexibilidad y eficiencia de uso | 2 | Incorporar un botón "Exportar CSV" en la esquina superior derecha de la tabla que descargue los registros filtrados. | No |
| U16 | Estudiante | Mis descargas de datos | El encabezado de la sección dice "Exportaciones del estudio", un término administrativo ajeno a un estudiante que solo revisa su propia información. | C2: Relación con el mundo real | 2 | Cambiar el título de la sección a "Mis datos personales" o "Mis solicitudes de descarga". | No |
| U17 | Estudiante | Mis descargas de datos | El estado vacío indica "No hay solicitudes consultadas en esta sesión", lo que resulta ambiguo respecto a si existen descargas previas. | C2: Relación con el mundo real | 2 | Actualizar el mensaje de estado vacío a: "Aún no has consultado ninguna solicitud de descarga". | No |
| U18 | Soporte | Reiniciar MFA | Tras reiniciar la autenticación en dos pasos (MFA) de una cuenta, no se muestra información que indique los pasos que deberá seguir la persona afectada. | C10: Ayuda y documentación | 2 | Mostrar una notificación de éxito acompañada de la instrucción: "MFA reiniciado. En su próximo inicio de sesión, el usuario deberá configurar nuevamente su aplicación autenticadora". | No |
| U19 | Investigador | Crear estudio | Al crear un estudio nuevo, los campos obligatorios no están marcados con un asterisco (`*`) ni leyenda previa, provocando errores de validación al intentar guardar. *(Reportado por Benjamín Barrientos)* | C5: Prevención de errores | 2 | Marcar visualmente con asterisco rojo (`*`) los campos obligatorios e incluir la nota "Los campos marcados con \* son obligatorios". | No |
| U20 | Investigador | Exportar datos | Al solicitar una exportación de datos anonimizados, no se indica el formato del archivo resultante (CSV, JSON o Excel) antes de generar la descarga. *(Reportado por Benjamín Barrientos)* | C1: Visibilidad del estado / C6: Reconocer antes que recordar | 2 | Especificar explícitamente el formato en el botón o etiqueta (ej. "Generar exportación (.CSV)"). | No |
| U21 | Director | Usuarios y roles | Se muestra el mensaje interno "Cuentas obtenidas de la API real. Los cambios se auditan en el servidor", exponiendo jerga técnica innecesaria para el rol. | C2: Relación con el mundo real | 1 | Reemplazar el texto técnico por un mensaje orientado al usuario: "Los cambios realizados en los permisos quedan registrados en el historial de auditoría". | No |
| U22 | Director | Registro de actividad | El texto de ejemplo del filtro de usuario dice "test\_...", asumiendo que quien evalúa conoce el prefijo de las cuentas de prueba. | C2: Relación con el mundo real | 1 | Cambiar el placeholder por un ejemplo genérico y comprensible, como "Ej: [nombre@correo.cl](mailto:nombre@correo.cl)". | No |
| U23 | Director | Registro de actividad | La columna "Motivo" muestra múltiples guiones ("—") sin una leyenda o mensaje emergente que aclare qué significan. | C10: Ayuda y documentación | 1 | Añadir un tooltip al pasar el cursor sobre el guion que indique "No se requiere motivo para esta acción". | No |
| U24 | Estudiante | Mis descargas de datos | La nota al pie señala "El servidor solo permite consultar solicitudes propias... con los permisos correspondientes", empleando vocabulario técnico innecesario. | C2: Relación con el mundo real | 1 | Simplificar el texto de ayuda a: "Por seguridad, solo puedes consultar el estado de tus propias solicitudes". | No |

## Qué falta para cerrar

El registro individual incluye H-13 (sev. 4, el Investigador no ve las solicitudes del Estudiante que debe aprobar) y H-03, H-07, H-11 y H-17 (sev. 3). Felipe debe conciliar estos cinco con las 24 filas: indicar su equivalencia, mantenerlos o documentar por qué se derivan. En particular H-03 depende de una decisión sobre el registro de la aprobación ética. Confirmar la revisión de Arias y el recorrido completo de los cinco perfiles. La corrección efectiva y su verificación corresponden a la actividad de destino.

[Consolidación del equipo](https://drive.google.com/open?id=1OKI26jHUDFbW7wNoYYltDEq4tkNUCwJ9) · [Registro de Barrientos](https://drive.google.com/open?id=1qeFC5UVPpNL8FIhkwIwHc2ooryimIlgo) · [Plan v1.1](https://drive.google.com/open?id=1TsjECNXFED9yoZWeb_ezXK_61MjlOc91)

