'use strict';
const servicio = require('../services/authService');

const envolver = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const login = envolver(async (req, res) => {
  res.json(await servicio.login(req.body || {}, req.auditoria));
});

const loginMfa = envolver(async (req, res) => {
  res.json(await servicio.loginMfa(req.body || {}, req.auditoria, req.ip));
});

const logout = envolver(async (req, res) => {
  await servicio.logout(req.usuario, req.auditoria);
  res.json({ mensaje: 'Sesión cerrada.' });
});

const cambiarPassword = envolver(async (req, res) => {
  await servicio.cambiarPassword(req.body || {}, req.usuario, req.auditoria);
  res.json({ mensaje: 'Contraseña actualizada.' });
});

const enrolarMfa = envolver(async (req, res) => {
  res.json(await servicio.enrolar(req.body || {}, req.auditoria));
});

const confirmarMfa = envolver(async (req, res) => {
  res.json(await servicio.confirmar(req.body || {}, req.auditoria));
});

module.exports = { login, loginMfa, logout, cambiarPassword, enrolarMfa, confirmarMfa };
