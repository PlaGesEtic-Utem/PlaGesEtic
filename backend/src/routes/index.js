'use strict';
/**
 * Orden de la cadena (Middlewares v3 / C4 nivel 3):
 *
 *   /salud            → pública, sin auditoría (la usa Docker para saber si la API está viva)
 *   auditoría         → se arma al entrar y se inserta al terminar (también 401/403)
 *   /auth/*           → pública (login y MFA de la Actividad 40)
 *   autenticación     → JWT + sesion_usuario vigente + cuenta activa      (401)
 *   filtro privacidad → envuelve res.json para limpiar la SALIDA
 *   rutas protegidas  → cada una con controlAcceso (403) y su controlador
 */
const { Router } = require('express');
const { auditoria } = require('../middlewares/auditoria');
const { autenticacion } = require('../middlewares/autenticacion');
const { filtroPrivacidad } = require('../middlewares/filtroPrivacidad');

module.exports = (pool) => {
  const router = Router();
  router.use('/salud', require('./salud')(pool));
  router.use(auditoria);
  router.use('/auth', require('./auth')(pool));
  router.use(autenticacion);
  router.use(filtroPrivacidad);
  router.use(require('./protegidas')(pool));
  return router;
};
