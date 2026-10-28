'use strict';
/** Recibe la solicitud ya autenticada y autorizada, llama al servicio y responde. */
const servicio = require('../services/consentimientosService');

const envolver = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const registrar = envolver(async (req, res) => {
  const evento = await servicio.registrar(req.params.idParticipacion, req.usuario, req.body || {}, req.file);
  req.auditoria.id_registro_afectado = evento.id_consentimiento; // nunca la evidencia ni datos personales
  res.status(201).json(evento);
});

const listar = envolver(async (req, res) => {
  res.json(await servicio.listar(req.params.idParticipacion));
});

const registrarEvento = envolver(async (req, res) => {
  const evento = await servicio.registrarEvento(req.params.idConsentimiento, req.usuario, req.body || {}, req.file);
  req.auditoria.id_registro_afectado = evento.id_consentimiento; // nunca la evidencia ni datos personales
  res.status(201).json(evento);
});

module.exports = { registrar, listar, registrarEvento };