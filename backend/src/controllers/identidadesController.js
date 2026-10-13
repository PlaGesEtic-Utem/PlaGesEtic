'use strict';
const servicio = require('../services/identidadesService');

const envolver = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const buscar = envolver(async (req, res) => {
  res.json(await servicio.buscar(req.body || {}));
});

const crear = envolver(async (req, res) => {
  const { id_identidad: id, ux_lab_id: uxLabId } = await servicio.crear(req.body || {});
  req.auditoria.id_registro_afectado = id; // en la auditoría solo va el identificador interno, nunca datos personales
  res.status(201).json({ ux_lab_id: uxLabId });
});

module.exports = { buscar, crear };
