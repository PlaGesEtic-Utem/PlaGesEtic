'use strict';
/**
 * Rutas de auditoría. Solo lectura: no existe PUT, PATCH, POST ni DELETE sobre la bitácora.
 *
 * Cadena completa (auditoria y autenticacion se montan antes, a nivel de app):
 *   auditoria → autenticacion → marcarAuditoria → requierePermiso (Director) → controlador → filtroPrivacidad
 * El permiso 'auditoria' + 'leer' con alcance 'global' solo debe existir para el rol Director
 * (ver db/auditoria_permiso_e_indices.sql).
 */
const { Router } = require('express');
const { marcarAuditoria } = require('../middlewares/auditoria');
const { requierePermiso } = require('../middlewares/controlAcceso');
const { ErrorApi } = require('../utils/errores');
const controlador = require('../controllers/auditoriaController');

const router = Router();

router.get(
  '/auditoria',
  marcarAuditoria('auditoria', 'leer'),
  requierePermiso({ recurso: 'auditoria', accion: 'leer' }),
  controlador.listar
);

// Cualquier método de escritura sobre la bitácora responde 405 (y queda auditado como error).
router.all(['/auditoria', '/auditoria/:id'], (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next(); // GET /auditoria/:id → 404 normal
  res.set('Allow', 'GET');
  return next(new ErrorApi(405, 'METODO_NO_PERMITIDO', 'La bitácora de auditoría es de solo lectura.'));
});

module.exports = router;