# ADR-002: Decisiones para el prototipo Alfa

**Estado:** Propuesto el 10/10/2026. D1, D6, D7 y D8 ya están aceptadas; D2 a D5 se revisan en la reunión interna del lunes 12/10 (Actividad 47).
**Versión de la decisión:** 1.0
**Propuesta y registro:** Benjamín Barrientos, Líder de Proyecto
**Relacionado con:** ADR-001, Diccionario de datos v3.1, Catálogo API integrado, Recomendación técnica de autenticación v2 (Felipe Cruz)

## 1. Contexto

Al implementar el backend base (Actividades 42 y 45) aparecieron diferencias entre lo que dicen los documentos de diseño y lo que hace el código. Este registro deja cada decisión en un solo lugar, para que el diseño, el código y el Informe de Avance N.º 2 digan lo mismo.

## 2. Decisiones

| N.º | Tema | Decisión | Estado | Qué cambia |
| --- | --- | --- | --- | --- |
| D1 | Correo y teléfono de la persona | Son **obligatorios** al registrar una identidad, para poder contactarla. Si es menor y no tiene, se registran los de su representante. | Aceptada (06/10, revisión del prototipo) | Diccionario v3.1, `02_restricciones_der_v3.sql` (NOT NULL) y Catálogo API. El código ya los valida. |
| D2 | Prefijo de las rutas | La API del MVP **no usa prefijo** `/api/v1`: no se publica para terceros y el frontend es propio. Si en el futuro se expone a otros sistemas, se versiona en ese momento. | Propuesta | Especificación técnica §3.1 y §5.1. El código no cambia. |
| D3 | Ingreso en el Alfa | Correo y contraseña (argon2id) más código TOTP. Los usuarios de prueba vienen con MFA ya configurado. El enrolamiento con QR, los códigos de recuperación y la recuperación de contraseña se completan en la Actividad 74. | Propuesta | Se implementa el 11/10 (Actividad 46). La documentación indica «diseñado» hasta entonces. |
| D4 | Dónde viaja la sesión | En el Alfa, `Authorization: Bearer`. Cuando exista el frontend (Actividades 58 y 73), se pasa a cookie HttpOnly + SameSite=Strict, como pide la recomendación técnica v2. | Propuesta | Nada en el Alfa; queda registrado como deuda técnica. |
| D5 | Quién edita y activa un estudio | Puede hacerlo quien tenga membresía vigente con `puede_modificar` en ese estudio (el responsable, o a quien el responsable se lo otorgue), además del Director. «Investigador (responsable)» en el catálogo se entiende así. | Propuesta | Nota en el Catálogo API. El código no cambia. Alternativa: exigir además `id_responsable = usuario` (cambio de una línea en el servicio). |
| D6 | Tecnología del frontend | HTML, CSS y JavaScript sin framework, reutilizando el diseño del prototipo navegable v2.3.1, en su propio contenedor Docker (ADR-001). | Aceptada (10/10, Líder) | Especificación técnica §3.1 («framework por definir» queda resuelto). |
| D8 | Quién ve el contacto del participante | Solo el **Investigador responsable** del estudio y el **Director** pueden ver el **nombre, correo y teléfono** de un participante, para contactarlo. Nunca el RUT ni la fecha de nacimiento. Deben elegir un **motivo** (coordinar una sesión, firmar una nueva versión del consentimiento, incidente o seguimiento, gestión de un retiro, u otro con detalle) y cada consulta queda en la auditoría como `desenmascarar`, con su justificación. Si la persona se retiró, solo se acepta el motivo «retiro». Asistentes, Estudiantes, Invitados y Soporte no la ven, salvo con una autorización `ver_identidad` aprobada por el Director. | Aceptada (10/10, Líder) | Nueva ruta `POST /participaciones/{id}/contacto` en el Catálogo API. Complementa la regla A1 de la Matriz de seudonimización v3. Coincide con la pantalla «Datos de contacto» del prototipo v2.3.1. Usa la acción `desenmascarar` y el campo `justificacion` que ya existen en `auditoria`, así que no cambia la base de datos. |
| D7 | Flujo de ramas | Los Pull Request de funcionalidades van a `develop`; `develop` pasa a `main` solo en entregas (por ejemplo `v0.1.0-alfa`). | Aceptada (10/10, Líder) | `develop` alineada con `main` (PR #12). |

## 3. Consecuencias

- D8 respeta el documento del cliente: el Director accede a la identidad solo con justificación registrada, y Asistentes, Estudiantes e Invitados no acceden a datos de contacto sin autorización formal. Al Investigador se le permite solo lo necesario para contactar a la persona, con motivo y registro, aplicando la minimización de datos.
- El Informe de Avance N.º 2 cita este ADR para explicar por qué el código y los documentos v3 difieren en estos puntos.
- Cuando D2 a D5 se aprueben, su estado cambia a «Aceptada» con la fecha de la reunión.
- Las bases ya creadas antes del 10/10 (por ejemplo, la de pgAdmin) deben aplicar D1 con:
  `ALTER TABLE identity_schema.identidad ALTER COLUMN correo_cifrado SET NOT NULL, ALTER COLUMN correo_hash SET NOT NULL, ALTER COLUMN telefono_cifrado SET NOT NULL;`
