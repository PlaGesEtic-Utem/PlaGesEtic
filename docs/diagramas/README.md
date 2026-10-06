# Diagramas — plaGesEtic

Esta carpeta reúne los diagramas de arquitectura y las secuencias UML del MVP de plaGesEtic.

## Diagramas disponibles

| Diagrama | Versión | Archivos |
| --- | --- | --- |
| C4 Nivel 3 | 1.1 | [Draw.io](c4/C4_Nivel3_Backend_plaGesEtic.drawio) · [SVG](c4/C4_Nivel3_Backend_plaGesEtic.svg) · [PNG](c4/C4_Nivel3_Backend_plaGesEtic.png) |
| Registro con consentimiento | 1.1 | [Draw.io](uml/UML_Registro_Consentimiento_plaGesEtic.drawio) · [SVG](uml/UML_Registro_Consentimiento_plaGesEtic.svg) · [PNG](uml/UML_Registro_Consentimiento_plaGesEtic.png) |
| Exportación desidentificada | 1.0 | [Draw.io](uml/UML_Exportacion_Desidentificada_plaGesEtic.drawio) · [SVG](uml/UML_Exportacion_Desidentificada_plaGesEtic.svg) · [PNG](uml/UML_Exportacion_Desidentificada_plaGesEtic.png) |

## Organización

- `c4/`: diagrama C4 nivel 3 de componentes del backend.
- `uml/`: secuencias de registro con consentimiento y exportación desidentificada.

## Formatos

- **Draw.io (`.drawio`):** archivo editable para mantener el diagrama.
- **SVG (`.svg`):** imagen vectorial para documentación.
- **PNG (`.png`):** imagen para visualización y presentaciones.

## Alcance de los diagramas

El C4 nivel 3 describe los componentes lógicos del backend y sus dependencias, con PostgreSQL separado en cuatro esquemas y almacenamiento independiente para evidencias éticas y archivos de investigación.

La secuencia de registro documenta la captura de identidad, el enrolamiento y los eventos de consentimiento y asentimiento. La secuencia de exportación documenta la solicitud, aprobación, generación y descarga de paquetes con códigos independientes.

## Referencias

- [Especificación técnica v1.0](../especificacion-tecnica/Especificacion_Tecnica_v1_0_plaGesEtic.md)
- [ADR-001: stack tecnológico](../decisiones/ADR-001-stack-tecnologico.md)

## Mantenimiento

Al modificar un diagrama, actualiza el archivo Draw.io y vuelve a exportar sus versiones SVG y PNG. Mantén el mismo nombre base y registra la versión correspondiente en este índice y en la especificación técnica.
