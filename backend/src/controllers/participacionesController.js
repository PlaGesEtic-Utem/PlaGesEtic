'use strict';
const servicio = require('../services/participacionesService');

const envolver = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const inscribir = envolver(async (req, res) => {
  const participacion = await servicio.inscribir(req.params.idEstudio, req.body || {});
  req.auditoria.id_registro_afectado = participacion.id_participacion; // nunca el UX Lab ID ni datos personales
  res.status(201).json(participacion);
});

const listar = envolver(async (req, res) => {
  res.json(await servicio.listar(req.params.idEstudio, req.query.estado));
});

module.exports = { inscribir, listar };
