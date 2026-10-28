'use strict';
/**
 * Documentos de consentimiento de un estudio. Se montan en /estudios/:idEstudio/documentos-consentimiento
 * (mergeParams para que el control de acceso vea idEstudio y revise la membresía de ESE estudio).
 *  - Listar: membresía con puede_consultar (o alcance global).
 *  - Subir una versión: membresía con puede_cargar (o alcance global). Multipart, campo «archivo» (PDF).
 */
const { Router } = require('express');
const { requierePermiso } = require('../middlewares/controlAcceso');
const { marcarAuditoria } = require('../middlewares/auditoria');
const { subirPdf } = require('../middlewares/subidaArchivo');
const c = require('../controllers/documentosConsentimientoController');

module.exports = () => {
  const r = Router({ mergeParams: true });

  r.get('/', marcarAuditoria('documento_consentimiento', 'leer'),
    requierePermiso({ recurso: 'documento_consentimiento', accion: 'leer', permisoEstudio: 'puede_consultar' }), c.listar);

  r.post('/', marcarAuditoria('documento_consentimiento', 'crear'),
    requierePermiso({ recurso: 'documento_consentimiento', accion: 'crear', permisoEstudio: 'puede_cargar' }),
    subirPdf, c.subir);

  return r;
};
