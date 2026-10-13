'use strict';
/**
 * SOLO DESARROLLO. Deja listos para entrar a los usuarios de prueba (@uxlab.test) de db/dev/datos_prueba.sql:
 *   - contraseña de prueba (guardada con argon2id),
 *   - segundo factor (TOTP) con un secreto FIJO por usuario, guardado cifrado,
 *   - 3 códigos de recuperación nuevos (se muestran una sola vez).
 *
 *   node scripts/usuarios-prueba.js
 *   (con Docker:  docker compose exec api node scripts/usuarios-prueba.js)
 *
 * Ejecútalo cada vez que vuelvas a cargar datos_prueba.sql. Se niega a funcionar si NODE_ENV=production.
 * El secreto es fijo para que puedas agregarlo una sola vez en Google Authenticator; o usa scripts/codigo-totp.js.
 */
const crypto = require('crypto');
const argon2 = require('argon2');
const { cargarConfig } = require('../src/config');
const { iniciarPool, cerrarPool } = require('../src/db/pool');
const { cifrar } = require('../src/utils/cifrado');
const totp = require('../src/utils/totp');

const CONTRASENA_PRUEBA = 'Plagesetic.2026';

/** Secreto TOTP fijo y solo de desarrollo, derivado del correo. */
const secretoDePrueba = (correo) =>
  totp.base32Codificar(crypto.createHmac('sha1', 'plagesetic-solo-desarrollo').update(correo).digest());

function codigoRecuperacion() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const s = Array.from(crypto.randomBytes(12), (b) => A[b % A.length]).join('');
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

(async () => {
  if (process.env.NODE_ENV === 'production') { console.error('No se permite en producción.'); process.exit(1); }
  const pool = iniciarPool(cargarConfig().db);
  try {
    const hash = await argon2.hash(CONTRASENA_PRUEBA, { type: argon2.argon2id });
    const { rows } = await pool.query(
      `SELECT id_usuario, correo, mfa_activo FROM security_schema.usuario WHERE correo LIKE '%@uxlab.test' ORDER BY correo`);
    if (!rows.length) { console.error('No hay usuarios de prueba. Carga primero db/dev/datos_prueba.sql.'); process.exitCode = 1; return; }
    console.log(`\nContraseña de todos los usuarios de prueba: ${CONTRASENA_PRUEBA}\n`);
    for (const u of rows) {
      const secreto = u.mfa_activo ? secretoDePrueba(u.correo) : null;
      await pool.query('UPDATE security_schema.usuario SET hash_password = $2, mfa_secret = $3 WHERE id_usuario = $1',
        [u.id_usuario, hash, secreto ? cifrar(secreto) : null]);
      await pool.query('DELETE FROM security_schema.mfa_codigo_recuperacion WHERE id_usuario = $1', [u.id_usuario]);
      const codigos = [];
      if (secreto) {
        for (let i = 0; i < 3; i++) {
          const c = codigoRecuperacion();
          codigos.push(c);
          await pool.query(
            'INSERT INTO security_schema.mfa_codigo_recuperacion (id_usuario, codigo_hash, usado) VALUES ($1, $2, false)',
            [u.id_usuario, crypto.createHash('sha256').update(c.replace(/-/g, '')).digest('hex')]);
        }
      }
      console.log(u.correo.padEnd(34), secreto ? `secreto TOTP: ${secreto}` : 'sin MFA (cuenta nueva: responde MFA_PENDIENTE)');
      if (codigos.length) console.log(' '.repeat(34), `recuperación: ${codigos.join('  ')}`);
    }
    console.log('\nCódigo actual de un usuario:  node scripts/codigo-totp.js test_investigador@uxlab.test\n');
  } catch (err) {
    console.error('No se pudo preparar:', err.code || err.message); process.exitCode = 1;
  } finally { await cerrarPool(); }
})();
