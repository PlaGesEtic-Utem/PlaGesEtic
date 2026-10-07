'use strict';
/**
 * Rutas PÚBLICAS de autenticación (Actividad 40): /auth/login, /auth/login/mfa, etc.
 * Pasan por el middleware de auditoría (login_exitoso / login_fallido) pero NO por
 * autenticación ni control de acceso.
 *
 * TODO: montar aquí el router del login y MFA de la Actividad 40 cuando se integre su rama:
 *   module.exports = (pool) => require('../modules/auth/routes')(pool);
 */
const { Router } = require('express');
module.exports = (/* pool */) => Router();
