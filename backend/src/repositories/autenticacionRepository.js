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

/**
 * Renueva la sesión en cada pedido: vence 30 minutos después del último uso y nunca
 * más de 8 horas después de iniciada (Recomendación técnica v2). Todo con la hora de la base.
 */
async function renovarSesion(idSesion, minutosInactividad = 30, horasMaximo = 8) {
  await obtenerPool().query(
    `UPDATE security_schema.sesion_usuario
        SET fecha_expiracion = LEAST(now() + make_interval(mins => $2), fecha_inicio + make_interval(hours => $3))
      WHERE id_sesion = $1`,
    [idSesion, minutosInactividad, horasMaximo]);
}

module.exports = { buscarSesionVigente, renovarSesion };