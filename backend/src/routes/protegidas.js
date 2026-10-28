
'use strict';

/**
 * Rutas protegidas de PlaGesEtic.
 *
 * Todas las rutas montadas aquí ya pasan por
 * autenticación, auditoría general y filtro
 * de privacidad.
 *
 * Cada operación incorpora sus controles
 * de acceso específicos.
 */

const { Router } = require('express');

const auditoriaRoutes = require('./auditoriaRoutes');

const { marcarAuditoria } =
  require('../middlewares/auditoria');

const {
  resolverEstudioDeParticipacion,
} = require('../middlewares/estudioDeParticipacion');

const {
  noAlmacenar,
  accesoContacto,
} = require('../middlewares/accesoIdentidad');

const participacionesController =
  require('../controllers/participacionesController');

module.exports = (pool) => {
  const router = Router();

  /**
   * Registro y listado de participaciones.
   *
   * Estas rutas conservan sus permisos existentes.
   */
  router.use(
    '/estudios/:idEstudio/participaciones',
    require('./participaciones')(pool)
  );

  /**
   * Documentos de consentimiento de un estudio.
   */
  router.use(
    '/estudios/:idEstudio/documentos-consentimiento',
    require('./documentosConsentimiento')(pool)
  );

    /**
   * Exportación desidentificada (Actividad 60).
   */
  router.use(
    '/estudios/:idEstudio/exportaciones',
    require('./exportaciones').porEstudio()
  );
  router.use(
    '/exportaciones',
    require('./exportaciones').porExportacion()
  );
  
  /**
   * Administración y consulta de estudios.
   */
  router.use(
    '/estudios',
    require('./estudios')(pool)
  );

  /**
   * Registro, búsqueda y desenmascaramiento
   * autorizado de identidades.
   */
  router.use(
    '/identidades',
    require('./identidades')(pool)
  );

  /**
   * POST /participaciones/:idParticipacion/contacto
   *
   * Consulta excepcional de datos de contacto.
   *
   * Orden de ejecución:
   *
   * 1. Impedir almacenamiento en caché.
   * 2. Marcar la auditoría como desenmascaramiento.
   * 3. Resolver el estudio de la participación.
   * 4. Verificar permisos de acceso a identidad.
   * 5. Validar motivo y consultar contacto.
   *
   * La respuesta contiene únicamente:
   * nombre, correo y telefono.
   */
 router.post(
  '/participaciones/:idParticipacion/contacto',
  noAlmacenar,
  marcarAuditoria('contacto_participante', 'desenmascarar'),
  resolverEstudioDeParticipacion,
  accesoContacto,
  participacionesController.contacto
);

  /**
   * Gestión de consentimientos por participación.
   */
  router.use(
    '/participaciones/:idParticipacion/consentimientos',
    require('./consentimientos')(pool)
  );

  /**
   * Eventos de un consentimiento.
   */
  router.use(
    '/consentimientos/:idConsentimiento/eventos',
    require('./eventosConsentimiento')(pool)
  );

  /**
   * Consulta de auditoría.
   */
  router.use(auditoriaRoutes);

  return router;
};
