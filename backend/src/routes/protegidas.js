'use strict';
/**
 * Rutas PROTEGIDAS. Todo lo que se monte aquí ya pasa por:
 *   auditoría → autenticación → filtro de datos personales (sobre la salida)
 * y cada ruta agrega su control de acceso y su marca de auditoría.
 *
 * Ejemplo para la Actividad 45 (registro de participantes y estudios):
 *
 *   const { requierePermiso } = require('../middlewares/controlAcceso');
 *   const { marcarAuditoria } = require('../middlewares/auditoria');
 *   router.get('/estudios/:idEstudio',
 *     marcarAuditoria('estudio', 'leer'),
 *     requierePermiso({ recurso: 'estudio', accion: 'leer', permisoEstudio: 'puede_consultar' }),
 *     estudiosController.obtener);
 *
 * El sábado 10/10 se agrega aquí GET /auditoria (solo Director, solo lectura).
 */
const { Router } = require('express');

module.exports = (/* pool */) => {
  const router = Router();
  // Las rutas de la Actividad 45 se montan aquí.
  return router;
};
