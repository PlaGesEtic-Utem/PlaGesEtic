'use strict';
/** Administración de cuentas y membresías (Actividad 73). */
const usuarios = require('../services/usuariosService');
const membresias = require('../services/membresiasService');
const { errores } = require('../utils/errores');

const envolver = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const idUsuario = (req) => {
  if (!UUID_RE.test(req.params.idUsuario)) throw errores.solicitudInvalida('El identificador del usuario no es válido.');
  return req.params.idUsuario;
};

const listar = envolver(async (req, res) => res.json(await usuarios.listar(req.query)));

const obtener = envolver(async (req, res) => res.json(await usuarios.obtener(idUsuario(req))));

const crear = envolver(async (req, res) => {
  const u = await usuarios.crear(req.body || {}, req.usuario);
  req.auditoria.id_registro_afectado = u.id_usuario;
  res.status(201).json(u);
});

const actualizar = envolver(async (req, res) => {
  const id = idUsuario(req);
  req.auditoria.id_registro_afectado = id;
  res.json(await usuarios.actualizar(id, req.body || {}, req.usuario));
});

const listarMembresias = envolver(async (req, res) => {
  res.json(await membresias.listar(req.params.idEstudio, req.query));
});

const otorgarMembresia = envolver(async (req, res) => {
  const m = await membresias.otorgar(req.params.idEstudio, req.body || {}, req.usuario);
  req.auditoria.id_registro_afectado = m.id_membresia;
  res.status(201).json(m);
});

const revocarMembresia = envolver(async (req, res) => {
  req.auditoria.id_registro_afectado = UUID_RE.test(req.params.idMembresia) ? req.params.idMembresia : null;
  res.json(await membresias.revocar(req.params.idEstudio, req.params.idMembresia));
});

module.exports = { listar, obtener, crear, actualizar, listarMembresias, otorgarMembresia, revocarMembresia };
