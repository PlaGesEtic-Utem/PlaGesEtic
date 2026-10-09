'use strict';
/**
 * SOLO DESARROLLO. Crea una sesión de prueba para un usuario y muestra su token,
 * para probar las rutas mientras no esté integrado el login de la Actividad 40.
 *
 *   node scripts/sesion-prueba.js test_investigador@uxlab.test
 *   (con Docker:  docker compose exec api node scripts/sesion-prueba.js test_investigador@uxlab.test)
 *
 * Copia el token que aparece y pégalo en pruebas/estudios.http (variable @token).
 * La sesión dura 8 horas. Se niega a funcionar si NODE_ENV=production.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { cargarConfig } = require('../src/config');
const { iniciarPool, cerrarPool } = require('../src/db/pool');

(async () => {
  const correo = process.argv[2];
  if (!correo) { console.error('Uso: node scripts/sesion-prueba.js <correo del usuario de prueba>'); process.exit(1); }
  if (process.env.NODE_ENV === 'production') { console.error('No se permite en producción.'); process.exit(1); }
  const config = cargarConfig();
  if (!process.env.JWT_SECRET) { console.error('Falta JWT_SECRET en el .env'); process.exit(1); }
  const pool = iniciarPool(config.db);
  try {
    const { rows } = await pool.query(
      `SELECT u.id_usuario, r.nombre_rol FROM security_schema.usuario u
         JOIN security_schema.rol r ON r.id_rol = u.id_rol WHERE u.correo = $1`, [correo]);
    if (!rows[0]) { console.error(`No existe el usuario ${correo}. ¿Cargaste db/dev/datos_prueba.sql?`); process.exit(1); }
    const idSesion = crypto.randomUUID();
    const token = jwt.sign({ id_sesion: idSesion }, process.env.JWT_SECRET, { expiresIn: '8h', algorithm: 'HS256' });
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await pool.query(
      `INSERT INTO security_schema.sesion_usuario (id_sesion, id_usuario, token_hash, fecha_inicio, fecha_expiracion, ip)
       VALUES ($1, $2, $3, now(), now() + interval '8 hours', '127.0.0.1')`,
      [idSesion, rows[0].id_usuario, tokenHash]);
    console.log(`\nSesión de prueba para ${correo} (${rows[0].nombre_rol}), válida por 8 horas:\n\n${token}\n`);
  } catch (err) {
    console.error('No se pudo crear la sesión:', err.code || err.message); process.exitCode = 1;
  } finally { await cerrarPool(); }
})();
