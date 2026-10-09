'use strict';
/** Recibe la solicitud ya autenticada y autorizada, llama al servicio y responde. */
const servicio = require('../services/estudiosService');

const envolver = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const crear = envolver(async (req, res) => {
  const estudio = await servicio.crear(req.body || {}, req.usuario);
  req.auditoria.id_estudio = estudio.id_estudio;
  req.auditoria.id_registro_afectado = estudio.id_estudio;
  res.status(201).json(estudio);
});

const listar = envolver(async (req, res) => {
  res.json(await servicio.listar(req.usuario, req.query.estado));
});

const obtener = envolver(async (req, res) => {
  res.json(await servicio.obtener(req.params.idEstudio));
});

const actualizar = envolver(async (req, res) => {
  req.auditoria.id_registro_afectado = req.params.idEstudio;
  res.json(await servicio.actualizar(req.params.idEstudio, req.body || {}));
});

const activar = envolver(async (req, res) => {
  req.auditoria.id_registro_afectado = req.params.idEstudio;
  res.json(await servicio.activar(req.params.idEstudio));
});

module.exports = { crear, listar, obtener, actualizar, activar };
