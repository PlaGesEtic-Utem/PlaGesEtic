# plaGesEtic

plaGesEtic es una aplicación web desarrollada para el Observatorio UX / UX Lab de la UTEM.

El proyecto busca apoyar la gestión segura de información asociada a estudios de experiencia de usuario, incluyendo participantes, consentimientos informados y datos experimentales.

La solución considera principios de privacidad desde el diseño y mecanismos de seudonimización para proteger la información de los participantes.

---

## Descripción del proyecto

plaGesEtic corresponde a un Producto Mínimo Viable (MVP) orientado a centralizar y gestionar información utilizada en estudios realizados por el Observatorio UX / UX Lab de la UTEM.

La plataforma considera una arquitectura cliente-servidor, separando el frontend, el backend y la base de datos.

Durante la etapa de desarrollo del MVP se utilizarán únicamente datos sintéticos o ficticios.

---

## Arquitectura

El sistema utiliza una arquitectura Cliente-Servidor mediante una API REST.

La solución se divide principalmente en:

- Frontend
- Backend
- Base de datos

Esta separación permite mantener independientes las responsabilidades de cada componente del sistema.

---

## Tecnologías

### Frontend

React

### Backend

Ruby on Rails

### Base de datos

PostgreSQL

### Entorno de desarrollo

Docker

### Control de versiones

Git y GitHub

---

## Estructura del proyecto

La estructura definitiva del repositorio será definida durante la configuración inicial del entorno de desarrollo.

De forma preliminar se considera una separación similar a la siguiente:

```text
plagestic/
├── frontend/
├── backend/
├── docs/
├── docker/
├── docker-compose.yml
└── README.md
```

Esta estructura podrá modificarse de acuerdo con las decisiones tomadas por el equipo de Desarrollo.

---

## Requisitos previos

Para trabajar con el proyecto será necesario contar con:

- Git
- Docker
- Docker Compose

Las versiones específicas de las herramientas serán definidas una vez configurado el entorno base del proyecto.

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
```

### 2. Ingresar al proyecto

```bash
cd plagestic
```

### 3. Levantar el entorno

```bash
docker compose up
```

Las instrucciones podrán actualizarse cuando se encuentre disponible la configuración definitiva de Docker.

---

## Flujo de trabajo

El código fuente será gestionado mediante GitHub.

El trabajo se realizará utilizando ramas independientes para las distintas tareas o funcionalidades.

Los cambios deberán ser revisados antes de ser incorporados a la rama principal utilizando Pull Requests.

Las convenciones específicas para nombres de ramas y mensajes de commits serán documentadas por separado.

---

## Seguridad y privacidad

Debido a la naturaleza de la información que puede gestionar plaGesEtic, el proyecto considera la privacidad y seguridad como aspectos relevantes desde su diseño.

Durante el desarrollo del MVP:

- Se utilizarán datos sintéticos o ficticios.
- No se almacenarán datos personales reales dentro del repositorio.
- No deberán publicarse credenciales, claves o secretos.
- Los cambios relacionados con seguridad deberán ser revisados mediante Pull Requests.

---

## Documentación

La documentación técnica y funcional del proyecto podrá mantenerse dentro del directorio:

```text
/docs
```

Esta documentación podrá incluir:

- Arquitectura del sistema.
- Modelo de datos.
- Requisitos.
- Decisiones técnicas.
- Evidencias de desarrollo.
- Documentación de funcionalidades.

---

## Estado del proyecto

Proyecto actualmente en etapa de desarrollo del MVP.

La configuración del repositorio y del entorno base se encuentra en proceso.

---

## Equipo

Proyecto desarrollado en el contexto de la asignatura Gestión de Proyectos Informáticos.

**Proyecto:** plaGesEtic  
**Institución:** Universidad Tecnológica Metropolitana  
**Unidad asociada:** Observatorio UX / UX Lab UTEM
