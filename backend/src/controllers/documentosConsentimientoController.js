'use strict';
/** Recibe la solicitud ya autenticada y autorizada, llama al servicio y responde. */
const servicio = require('../services/documentosConsentimientoService');

const envolver = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const subir = envolver(async (req, res) => {
  const documento = await servicio.subir(req.params.idEstudio, req.body || {}, req.file);
  req.auditoria.id_registro_afectado = documento.id_documento;
  res.status(201).json(documento);
});

const listar = envolver(async (req, res) => {
  res.json(await servicio.listar(req.params.idEstudio, req.query));
});

module.exports = { subir, listar };
