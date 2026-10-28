'use strict';
/**
 * Consultas del ingreso al sistema (Actividad 46): usuarios, sesiones, códigos de recuperación
 * y conteo de intentos fallidos. Los intentos se cuentan desde la auditoría, que ya registra
 * cada login_fallido: no hace falta una tabla nueva.
 */
const { obtenerPool } = require('../db/pool');

const query = (texto, params) => obtenerPool().query(texto, params);

const COLUMNAS = `u.id_usuario, u.nombre, u.correo, u.hash_password, u.debe_cambiar_password,
  u.mfa_secret, u.mfa_activo, u.activo, u.fecha_expiracion, r.nombre_rol`;

async function usuarioPorCorreo(correo) {
  const { rows } = await query(
    `SELECT ${COLUMNAS} FROM security_schema.usuario u JOIN security_schema.rol r ON r.id_rol = u.id_rol
      WHERE lower(u.correo) = lower($1)`, [correo]);
  return rows[0] || null;
}

async function usuarioPorId(idUsuario) {
  const { rows } = await query(
    `SELECT ${COLUMNAS} FROM security_schema.usuario u JOIN security_schema.rol r ON r.id_rol = u.id_rol
      WHERE u.id_usuario = $1`, [idUsuario]);
  return rows[0] || null;
}

/**
 * Intentos fallidos recientes, por correo (paso 1) o por usuario (paso 2).
 * «desde» se calcula en Node y se compara con la hora que la misma API escribió en auditoria.fecha_hora.
 */
async function contarFallosPorCorreo(correo, desde) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS n FROM security_schema.auditoria
      WHERE accion = 'login_fallido' AND lower(correo_intentado) = lower($1) AND fecha_hora > $2`, [correo, desde]);
  return rows[0].n;
}

async function contarFallosPorUsuario(idUsuario, desde) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS n FROM security_schema.auditoria
      WHERE accion = 'login_fallido' AND id_usuario = $1 AND fecha_hora > $2`, [idUsuario, desde]);
  return rows[0].n;
}

/** Crea la sesión: vence a los 30 minutos sin uso (se renueva en cada pedido) y nunca después de 8 horas. */
async function crearSesion({ idSesion, idUsuario, tokenHash, ip, minutosInactividad }) {
  const { rows } = await query(
    `INSERT INTO security_schema.sesion_usuario (id_sesion, id_usuario, token_hash, fecha_inicio, fecha_expiracion, ip)
     VALUES ($1, $2, $3, now(), now() + make_interval(mins => $4), $5)
     RETURNING fecha_expiracion`,
    [idSesion, idUsuario, tokenHash, minutosInactividad, ip]);
  return rows[0];
}

async function cerrarSesion(idSesion) {
  await query('UPDATE security_schema.sesion_usuario SET fecha_cierre = now() WHERE id_sesion = $1 AND fecha_cierre IS NULL', [idSesion]);
}

/** Consume un código de recuperación (una sola vez). Devuelve true si existía y estaba sin usar. */
async function consumirCodigoRecuperacion(idUsuario, codigoHash) {
  const { rowCount } = await query(
    `UPDATE security_schema.mfa_codigo_recuperacion SET usado = true, fecha_uso = now()
      WHERE id_usuario = $1 AND codigo_hash = $2 AND usado = false`, [idUsuario, codigoHash]);
  return rowCount === 1;
}

async function cambiarPassword(idUsuario, hash) {
  await query(
    'UPDATE security_schema.usuario SET hash_password = $2, debe_cambiar_password = false WHERE id_usuario = $1',
    [idUsuario, hash]);
}

module.exports = {
  usuarioPorCorreo, usuarioPorId, contarFallosPorCorreo, contarFallosPorUsuario,
  crearSesion, cerrarSesion, consumirCodigoRecuperacion, cambiarPassword,
};
