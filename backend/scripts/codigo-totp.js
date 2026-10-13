'use strict';
/**
 * SOLO DESARROLLO. Muestra el código de 6 dígitos que mostraría la app del celular para un usuario de prueba,
 * para probar el paso 2 del login sin teléfono.   node scripts/codigo-totp.js test_investigador@uxlab.test
 */
const { cargarConfig } = require('../src/config');
const { iniciarPool, cerrarPool } = require('../src/db/pool');
const { descifrar } = require('../src/utils/cifrado');
const totp = require('../src/utils/totp');

(async () => {
  const correo = process.argv[2];
  if (!correo) { console.error('Uso: node scripts/codigo-totp.js <correo del usuario de prueba>'); process.exit(1); }
  if (process.env.NODE_ENV === 'production') { console.error('No se permite en producción.'); process.exit(1); }
  const pool = iniciarPool(cargarConfig().db);
  try {
    const { rows } = await pool.query('SELECT mfa_secret FROM security_schema.usuario WHERE lower(correo) = lower($1)', [correo]);
    if (!rows[0] || !rows[0].mfa_secret) { console.error('Ese usuario no existe o no tiene MFA. ¿Ejecutaste scripts/usuarios-prueba.js?'); process.exitCode = 1; return; }
    const segundos = 30 - (Math.floor(Date.now() / 1000) % 30);
    console.log(`\nCódigo de ${correo}: ${totp.codigo(descifrar(rows[0].mfa_secret))}  (válido por ${segundos} s más)\n`);
  } catch (err) {
    console.error('No se pudo calcular:', err.code || err.message); process.exitCode = 1;
  } finally { await cerrarPool(); }
})();
