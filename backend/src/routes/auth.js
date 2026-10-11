'use strict';
/**
 * Rutas de ingreso al sistema (Actividad 46 · Catálogo v3.1 · ADR-002 D3).
 * Van ANTES del middleware general de autenticación (para entrar todavía no hay sesión),
 * pero sí pasan por la auditoría: cada ingreso, fallo y cierre queda registrado.
 *
 *   POST /auth/login       público   correo + contraseña        → token_temporal
 *   POST /auth/login/mfa   público   token_temporal + código    → token de sesión
 *   POST /auth/logout      con sesión                            → cierra la sesión
 *   POST /auth/password    con sesión (también si debe cambiarla) → cambia la contraseña
 */
const { Router } = require('express');
const { autenticacion } = require('../middlewares/autenticacion');
const { limiteSolicitudes } = require('../middlewares/limiteSolicitudes');
const c = require('../controllers/authController');

module.exports = () => {
  const r = Router();
  const limite = limiteSolicitudes({ maximo: 20, ventanaMs: 60 * 1000 });
  r.post('/login', limite, c.login);
  r.post('/login/mfa', limite, c.loginMfa);
  r.post('/logout', autenticacion, c.logout);
  r.post('/password', autenticacion, c.cambiarPassword);
  return r;
};
