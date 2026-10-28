'use strict';
/**
 * Rutas de exportación desidentificada (Actividad 60). Se montan dentro de las rutas protegidas.
 *  - porEstudio: POST /estudios/:idEstudio/exportaciones (pedir una exportación).
 *  - porExportacion: GET /exportaciones/:id, PATCH /exportaciones/:id/aprobacion y
 *    GET /exportaciones/:id/descarga.
 */
const { Router } = require('express');
const { requierePermiso } = require('../middlewares/controlAcceso');
const { marcarAuditoria } = require('../middlewares/auditoria');
const { resolverExportacion } = require('../middlewares/estudioDeExportacion');
const { noAlmacenar } = require('../middlewares/accesoIdentidad');
const c = require('../controllers/exportacionesController');

function porEstudio() {
  const r = Router({ mergeParams: true });
  r.post('/', marcarAuditoria('exportacion', 'crear'),
    requierePermiso({ recurso: 'exportacion', accion: 'crear', permisoEstudio: 'puede_exportar' }), c.solicitar);
  return r;
}

function porExportacion() {
  const r = Router();
  r.get('/:idExportacion', marcarAuditoria('exportacion', 'leer'), resolverExportacion,
    requierePermiso({ recurso: 'exportacion', accion: 'leer', permisoEstudio: 'puede_consultar' }), c.consultar);
  r.patch('/:idExportacion/aprobacion', marcarAuditoria('exportacion', 'aprobar'), resolverExportacion,
    requierePermiso({ recurso: 'exportacion', accion: 'aprobar', permisoEstudio: 'puede_modificar' }), c.decidir);
  r.get('/:idExportacion/descarga', noAlmacenar, marcarAuditoria('exportacion', 'exportar'), resolverExportacion,
    requierePermiso({ recurso: 'exportacion', accion: 'descargar', permisoEstudio: 'puede_exportar' }), c.descargar);
  return r;
}

module.exports = { porEstudio, porExportacion };