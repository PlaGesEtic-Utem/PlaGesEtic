
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


  router.use(
    '/estudios/:idEstudio/participaciones',
    require('./participaciones')(pool)
  );


  router.use(
    '/estudios/:idEstudio/documentos-consentimiento',
    require('./documentosConsentimiento')(pool)
  );


  router.use(
    '/estudios',
    require('./estudios')(pool)
  );


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


  router.use(
    '/participaciones/:idParticipacion/consentimientos',
    require('./consentimientos')(pool)
  );


  router.use(
    '/consentimientos/:idConsentimiento/eventos',
    require('./eventosConsentimiento')(pool)
  );


  router.use(auditoriaRoutes);

  return router;
};
