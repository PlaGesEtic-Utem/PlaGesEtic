'use strict';
/** Consultas del middleware de autenticación (solo lectura). */
const { obtenerPool } = require('../db/pool');

/**
 * Sesión vigente (sin fecha_cierre y sin vencer) cuya cuenta está activa y sin vencer.
 * Devuelve { id_sesion, id_usuario, debe_cambiar_password, nombre_rol } o null.
 */
async function buscarSesionVigente(tokenHash) {
  const { rows } = await obtenerPool().query(
    `SELECT s.id_sesion, u.id_usuario, u.debe_cambiar_password, r.nombre_rol
       FROM security_schema.sesion_usuario s
       JOIN security_schema.usuario u ON u.id_usuario = s.id_usuario
       JOIN security_schema.rol r     ON r.id_rol = u.id_rol
      WHERE s.token_hash = $1
        AND s.fecha_cierre IS NULL
        AND s.fecha_expiracion > now()
        AND u.activo = true
        AND (u.fecha_expiracion IS NULL OR u.fecha_expiracion > now())`,
    [tokenHash]
  );
  return rows[0] || null;
}

module.exports = { buscarSesionVigente };