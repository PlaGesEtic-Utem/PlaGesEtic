'use strict';
/**
 * Pool de conexiones a PostgreSQL con el usuario de la aplicación.
 * Los repositorios (src/repositories) son los únicos que lo usan directamente.
 */
const { Pool } = require('pg');

let pool = null;

function iniciarPool(configDb) {
  if (!pool) {
    pool = new Pool({ ...configDb, max: 10, idleTimeoutMillis: 30000 });
    pool.on('error', (err) => {
      // Error de una conexión inactiva: se registra sin datos sensibles.
      console.error('[db] error en conexión inactiva:', err.code || err.message);
    });
  }
  return pool;
}

function obtenerPool() {
  if (!pool) throw new Error('El pool de base de datos no está iniciado');
  return pool;
}

async function cerrarPool() {
  if (pool) { await pool.end(); pool = null; }
}

module.exports = { iniciarPool, obtenerPool, cerrarPool };
