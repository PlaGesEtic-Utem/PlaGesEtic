'use strict';
/** Acceso a datos para la verificación de salud. */
async function verificarConexion(pool) {
  const r = await pool.query('SELECT 1 AS ok');
  return r.rows[0].ok === 1;
}
module.exports = { verificarConexion };
