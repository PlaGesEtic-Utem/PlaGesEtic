'use strict';
/**
 * Acceso a la base para middlewares, repositorios y servicios.
 * Usa el pool que abre server.js (src/db/pool.js), con el usuario de la aplicación.
 *   db.query(texto, parametros)   → una consulta
 *   db.transaccion(async (cliente) => { ... })  → varias consultas que se guardan todas o ninguna
 */
const { obtenerPool } = require('../db/pool');

function query(texto, parametros) {
  return obtenerPool().query(texto, parametros);
}

async function transaccion(trabajo) {
  const cliente = await obtenerPool().connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await trabajo(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (err) {
    await cliente.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    cliente.release();
  }
}

module.exports = { query, transaccion };
