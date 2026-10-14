# ADR-001: Selección del stack tecnológico del MVP

**Estado:** Aceptado, según el registro de origen.  
**Versión de la decisión:** 1.0  
**Documentación:** Catalina Araniz  
**Propuesta técnica:** Benjamín Arias  
**Aprobación registrada:** Benjamín Barrientos, Líder de Proyecto

## 1. Contexto de la decisión

El MVP de plaGesEtic gestionará participantes, estudios, consentimientos y datos de investigación del Observatorio UX y UX Lab UTEM. La arquitectura cliente-servidor con API REST definida previamente requiere un stack que permita implementar seguridad y separación lógica de datos, con una complejidad adecuada para el equipo y los plazos del proyecto.

Durante el desarrollo y las pruebas se utilizarán datos sintéticos en un entorno aislado de los repositorios productivos de la universidad. La selección se evaluó según seguridad, costo, mantenibilidad y despliegue.

## 2. Stack aceptado

Se adopta Node.js con Express para el backend, PostgreSQL para la base de datos y Docker para organizar el entorno del MVP.

| Elemento | Tecnología | Uso previsto |
| --- | --- | --- |
| Backend | Node.js + Express | API REST y lógica de aplicación. |
| Base de datos | PostgreSQL | Persistencia relacional y separación lógica de información. |
| Entorno | Docker | Contenedores independientes para frontend, backend, base de datos y almacenamiento. |

## 3. Alternativas evaluadas

Para el backend se compararon Node.js + Express, Python + Django/DRF y Java + Spring Boot. Para la base de datos se evaluaron PostgreSQL y SQLite. La propuesta favoreció Node.js por la continuidad de lenguaje y el ecosistema disponible, y PostgreSQL por sus esquemas, permisos y restricciones de integridad.

Docker responde al requisito de contenedorización RNF-ARC-01. Los documentos de la comparación no incluyen una evaluación de otros entornos de contenedores.

## 4. Justificación de la selección

- Seguridad. El stack permite implementar MFA, autorización por rol y por estudio, auditoría y separación lógica de identidades y datos experimentales.
- Costo. Las tecnologías no requieren pago de licencias para el uso previsto. Los costos de infraestructura y operación se estimarán por separado.
- Mantenibilidad. Node.js y Express favorecen el uso de JavaScript en frontend y backend y un ecosistema conocido por el desarrollador a cargo.
- Despliegue. Docker permite reproducir el entorno y mantener servicios independientes conforme a los requisitos del MVP.

## 5. Consecuencias para la implementación

La decisión define la base para el diseño de contenedores C4 Nivel 2 y la implementación. PostgreSQL se organizará en esquemas de identidades, control de acceso y datos experimentales, manteniendo consistencia con el DER que revise el equipo.

Express requiere configurar explícitamente los middlewares de autenticación, autorización, auditoría y seudonimización. También deberán definirse las migraciones, los respaldos, las credenciales y permisos de PostgreSQL, junto con las redes, los volúmenes y los secretos de los contenedores.

Los controles de cifrado, integridad de archivos y acceso deberán verificarse durante la implementación. El frontend, el producto de almacenamiento, las versiones de dependencias y el hosting se documentarán en sus diseños específicos.

## 6. Supuestos por validar

El documento actualizado de requisitos no funcionales mantiene como referencias de trabajo un máximo de 2 segundos para operaciones habituales, archivos de hasta 1 GB y al menos 50 usuarios concurrentes. La aceptación del stack no confirma estos valores como compromisos de capacidad.

## 7. Aprobación y continuidad

La decisión tiene estado Aceptado por el Líder de Proyecto, Benjamín Barrientos. La propuesta técnica corresponde al 29 de septiembre de 2026. El registro de origen no consigna una fecha específica de aprobación.

El registro corresponde a `docs/decisiones/ADR-001-stack-tecnologico.md`. Si el stack cambia, un nuevo ADR deberá enlazar y sustituir esta decisión, conservando su historial.

## 8. Documentos de referencia

- Comparar Alternativas.
- Propuesta Final de Stack.
- Requisitos NF que condicionan el Stack V2.
- [Registro ADR-001 de origen en Drive](https://docs.google.com/document/d/1b1g4W84W3I38m8evO8mB_z9lKB_2METY/edit).

## 9. Integración con la especificación técnica v1.0

La especificación y el DER v3 concretan la separación funcional del registro original en cuatro esquemas: `identity_schema`, `ethics_schema`, `research_schema` y `security_schema`, con 22 tablas. Esta nota documenta la correspondencia con el diseño consolidado; la selección de Node.js, Express, PostgreSQL y Docker se mantiene.

[Especificación técnica v1.0](../especificacion-tecnica/Especificacion_Tecnica_v1_0_plaGesEtic.md) · [DER v3](https://drive.google.com/file/d/1YnhCcu5Atab0iUC53ekw3O7d8CAoG0en/view).
