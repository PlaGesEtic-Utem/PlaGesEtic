'use strict';
/** Rutas de auditoría: consulta y exportación; nunca modificación de la bitácora. */

const { Router } = require('express');
const { marcarAuditoria } = require('../middlewares/auditoria');
const { requierePermiso } = require('../middlewares/controlAcceso');
const { ErrorApi } = require('../utils/errores');
const controlador = require('../controllers/auditoriaController');
const controladorExportar = require('../controllers/auditoriaExportarController');

const router = Router();

// Act. 57: misma autorización global de lectura que GET /auditoria.
// D17: el controlador registra la auditoría 'exportar' antes de enviar el CSV.
router.get(
  '/auditoria/exportar',
  marcarAuditoria('auditoria', 'exportar'),
  requierePermiso({ recurso: 'auditoria', accion: 'leer' }),
  controladorExportar.exportar
);

router.get(
  '/auditoria',
  marcarAuditoria('auditoria', 'leer'),
  requierePermiso({ recurso: 'auditoria', accion: 'leer' }),
  controlador.listar
);

// Toda escritura sobre la bitácora está prohibida, incluida /auditoria/exportar.
router.all(['/auditoria', '/auditoria/:id'], (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  res.set('Allow', 'GET');
  return next(new ErrorApi(405, 'METODO_NO_PERMITIDO', 'La bitácora de auditoría es de solo lectura.'));
});

module.exports = router;
