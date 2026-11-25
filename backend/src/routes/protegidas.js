
'use strict';

/**
 * Rutas protegidas de PlaGesEtic.
 *
 * Las rutas ya pasan por autenticación,
 * auditoría general y filtro de privacidad.
 *
 * Cada operación mantiene sus controles
 * de acceso correspondientes.
 */

const { Router } = require('express');

const auditoriaRoutes = require('./auditoriaRoutes');

const { marcarAuditoria } =
  require('../middlewares/auditoria');

const { permitirEnRespuesta } =
  require('../middlewares/filtroPrivacidad');

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
   * Participaciones de estudios.
   */
  router.use(
    '/estudios/:idEstudio/participaciones',
    require('./participaciones')(pool)
  );

  /**
   * Documentos de consentimiento.
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
   * Membresías de un estudio y administración de cuentas (Actividad 73).
   */
  router.use(
    '/estudios/:idEstudio/membresias',
    require('./usuarios').membresias()
  );
  router.use(
    '/usuarios',
    require('./usuarios').usuarios()
  );

  /**
   * Gestión de estudios.
   */
  router.use(
    '/estudios',
    require('./estudios')(pool)
  );

  /**
   * Gestión de identidades.
   */
  router.use(
    '/identidades',
    require('./identidades')(pool)
  );

  /**
   * ACTIVIDAD 56 + D17
   *
   * POST /participaciones/:idParticipacion/contacto
   *
   * Requisitos:
   * - Evitar almacenamiento en caché.
   * - Auditar como contacto_participante.
   * - Resolver el estudio correspondiente.
   * - Verificar autorización.
   * - Permitir únicamente los cuatro campos
   *   requeridos en la respuesta.
   *
   * El controlador ejecuta la auditoría previa
   * obligatoria mediante registrarAhora(req).
   *
   * Si falla la auditoría, responde HTTP 503
   * sin entregar datos personales.
   */
  router.post(
    '/participaciones/:idParticipacion/contacto',
    noAlmacenar,
    marcarAuditoria(
      'contacto_participante',
      'desenmascarar'
    ),
    resolverEstudioDeParticipacion,
    accesoContacto,
    permitirEnRespuesta(
      'codigo_seudonimo',
      'nombre',
      'correo',
      'telefono'
    ),
    participacionesController.contacto
  );

  /**
   * Consulta y registro de consentimientos.
   */
  router.use(
    '/participaciones/:idParticipacion/consentimientos',
    require('./consentimientos')(pool)
  );

  /**
   * Eventos: retiro y reconsentimiento.
   */
  router.use(
    '/consentimientos/:idConsentimiento/eventos',
    require('./eventosConsentimiento')(pool)
  );

  /**
   * Consulta y exportación de auditoría.
   */
  router.use(auditoriaRoutes);

  return router;
};
