'use strict';
/**
 * Rutas de identidades (Actividad 45 · viernes 9). Investigador y Asistente (permiso 'identidad/crear', global).
 * Estas dos rutas son la única excepción al filtro para el campo ux_lab_id: el catálogo v3 dice que
 * se devuelve SOLO el UX Lab ID, para luego inscribir a la persona en un estudio.
 */
const { Router } = require('express');
const { requierePermiso } = require('../middlewares/controlAcceso');
const { marcarAuditoria } = require('../middlewares/auditoria');
const { permitirEnRespuesta } = require('../middlewares/filtroPrivacidad');
const c = require('../controllers/identidadesController');

module.exports = () => {
  const r = Router();
  const puedeRegistrar = requierePermiso({ recurso: 'identidad', accion: 'crear' });
  r.post('/buscar', marcarAuditoria('identidad', 'leer'), puedeRegistrar, permitirEnRespuesta('ux_lab_id', 'ux_lab_ids'), c.buscar);
  r.post('/', marcarAuditoria('identidad', 'crear'), puedeRegistrar, permitirEnRespuesta('ux_lab_id'), c.crear);
  return r;
};
