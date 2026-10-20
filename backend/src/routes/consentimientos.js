'use strict';
/**
 * Consentimientos de una participación. Se montan en /participaciones/:idParticipacion/consentimientos
 * (mergeParams). El control de acceso decide por ESTUDIO, así que primero se obtiene el estudio de la
 * participación (resolverEstudioDeParticipacion) y recién después se revisa el permiso.
 *  - Registrar (aceptar o negar): membresía con puede_cargar. Multipart; evidencia en el campo «evidencia».
 *  - Consultar estado vigente e historial: membresía con puede_consultar.
 */
const { Router } = require('express');
const { requierePermiso } = require('../middlewares/controlAcceso');
const { marcarAuditoria } = require('../middlewares/auditoria');
const { resolverEstudioDeParticipacion } = require('../middlewares/estudioDeParticipacion');
const { subirEvidencia } = require('../middlewares/subidaArchivo');
const c = require('../controllers/consentimientosController');

module.exports = () => {
  const r = Router({ mergeParams: true });

  r.get('/', marcarAuditoria('consentimiento', 'leer'), resolverEstudioDeParticipacion,
    requierePermiso({ recurso: 'consentimiento', accion: 'leer', permisoEstudio: 'puede_consultar' }), c.listar);

  r.post('/', marcarAuditoria('consentimiento', 'crear'), resolverEstudioDeParticipacion,
    requierePermiso({ recurso: 'consentimiento', accion: 'crear', permisoEstudio: 'puede_cargar' }),
    subirEvidencia, c.registrar);

  return r;
};
