## Hallazgos derivados de la Actividad 79

Pendientes de corrección o verificación. Los siete siguientes están marcados para Act. 80 en la consolidación. Las propuestas no cambian la política de permisos ni los canales autorizados para entregar credenciales.

| Referencia | Perfil y pantalla | Problema observado | Severidad |
| --- | --- | --- | --- |
| U01 | Soporte · Bloquear/Desbloquear usuario | Al bloquear o desbloquear una cuenta, la acción se ejecuta de inmediato sin solicitar confirmación previa, facilitando interrupciones de acceso por error. *(Reportado por Felipe y Benjamín Barrientos)* | 3 |
| U02 | Director · Crear cuenta | La contraseña temporal se muestra una sola vez en texto plano, sin botón para copiarla ni opción de envío por correo; si no se guarda al instante, la persona pierde el acceso. | 3 |
| U03 | Director · Usuarios y roles | El botón "Guardar rol" aplica la modificación de permisos de forma inmediata sin pedir confirmación, exponiendo a cambios accidentales. | 3 |
| U04 | Director · Participantes (estudio existente) | No es posible agregar ni editar participantes en un estudio ya creado y activo (solo se permite al crearlo desde cero), bloqueando la gestión operativa. | 3 |
| U05 | Estudiante · Mis descargas de datos | La interfaz despliega el mensaje técnico literal "El backend no dispone aún de un endpoint para listar todas las exportaciones", generando confusión y exponiendo detalles internos. | 3 |
| U06 | Estudiante · Mis descargas de datos | El buscador solicita "Consultar solicitud existente por UUID" con un formato técnico de ejemplo (`XXXXXXXX-XXXX...`), concepto desconocido para el perfil estudiantil. | 3 |
| U07 | Investigador · Dashboard / Mis estudios | No hay indicador visual o contador que muestre cuántos participantes tienen el consentimiento informado firmado versus pendiente sin entrar a cada estudio. *(Reportado por Benjamín Barrientos)* | 3 |

### Diferencias por conciliar con Felipe

| ID original | Severidad | Hallazgo y tratamiento registrado |
|---|---:|---|
| H-13 | 4 | Investigador no ve exportaciones pendientes de aprobación. Prioridad Act. 80. |
| H-07 | 3 | Búsqueda de estudios local sin paginación. Act. 80. |
| H-11 | 3 | «Pedir datos» abre Archivos sin permiso. Act. 80. |
| H-17 | 3 | Retiro irreversible sin confirmación. Act. 80. |
| H-03 | 3 | No se puede registrar la aprobación del comité para activar el estudio. El registro original deriva la decisión al cliente y la implementación a la Act. 91. |

Antes de agregar un ticket, contrastar perfil, pantalla y comportamiento con el registro existente para evitar duplicados. [Consolidación del equipo](https://drive.google.com/open?id=1OKI26jHUDFbW7wNoYYltDEq4tkNUCwJ9) · [Registro de Barrientos](https://drive.google.com/open?id=1qeFC5UVPpNL8FIhkwIwHc2ooryimIlgo) · [Plan v1.1](https://drive.google.com/open?id=1TsjECNXFED9yoZWeb_ezXK_61MjlOc91)

