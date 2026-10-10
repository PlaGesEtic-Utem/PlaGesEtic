'use strict';
const saludRepository = require('../repositories/saludRepository');
const { errores } = require('../utils/errores');
const { version } = require('../../package.json');

/** Lógica de negocio de /salud: la API está bien si responde y llega a la base. */
async function obtenerEstado(pool) {
  try {
    await saludRepository.verificarConexion(pool);
  } catch (err) {
    console.error('[salud] sin conexión a la base de datos:', err.code || err.message);
    throw errores.servicioNoDisponible('La base de datos no está disponible.');
  }
  return { estado: 'ok', base_datos: 'ok', version, fecha: new Date().toISOString() };
}
module.exports = { obtenerEstado };
