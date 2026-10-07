'use strict';
const saludService = require('../services/saludService');

/** GET /salud · pública, no requiere sesión. */
function crearSaludController(pool) {
  return async function salud(req, res, next) {
    try {
      res.json(await saludService.obtenerEstado(pool));
    } catch (err) { next(err); }
  };
}
module.exports = { crearSaludController };
