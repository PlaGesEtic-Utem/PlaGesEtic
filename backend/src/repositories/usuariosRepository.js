'use strict';
/**
 * Acceso a security_schema.usuario para la administración de cuentas (Actividad 73).
 * Nunca devuelve hash_password ni mfa_secret.
 */
const db = require('../config/db');

const COLUMNAS = `u.id_usuario, u.nombre, u.correo, r.nombre_rol, u.activo, u.mfa_activo,
  u.debe_cambiar_password, u.fecha_expiracion, u.fecha_creacion`;

async function listar({ rol = null, activo = null } = {}) {
  const { rows } = await db.query(
    `SELECT ${COLUMNAS}
       FROM security_schema.usuario u JOIN security_schema.rol r ON r.id_rol = u.id_rol
      WHERE ($1::varchar IS NULL OR r.nombre_rol = $1)
        AND ($2::boolean IS NULL OR u.activo = $2)
      ORDER BY u.nombre`,
    [rol, activo]);
  return rows;
}

async function obtener(idUsuario) {
  const { rows } = await db.query(
    `SELECT ${COLUMNAS}
       FROM security_schema.usuario u JOIN security_schema.rol r ON r.id_rol = u.id_rol
      WHERE u.id_usuario = $1`,
    [idUsuario]);
  return rows[0] || null;
}

/** Estudios donde el usuario tiene membresía vigente (para la ficha del usuario). */
async function membresiasVigentes(idUsuario) {
  const { rows } = await db.query(
    `SELECT m.id_membresia, e.id_estudio, e.codigo_estudio, m.puede_consultar, m.puede_cargar,
            m.puede_modificar, m.puede_descargar, m.puede_exportar, m.fecha_inicio, m.fecha_fin
       FROM security_schema.membresia_estudio m
       JOIN research_schema.estudio e ON e.id_estudio = m.id_estudio
      WHERE m.id_usuario = $1
        AND m.fecha_inicio <= CURRENT_DATE AND (m.fecha_fin IS NULL OR m.fecha_fin >= CURRENT_DATE)
      ORDER BY e.codigo_estudio`,
    [idUsuario]);
  return rows;
}

async function idRol(nombreRol) {
  const { rows } = await db.query('SELECT id_rol FROM security_schema.rol WHERE nombre_rol = $1', [nombreRol]);
  return rows[0] ? rows[0].id_rol : null;
}

async function crear({ nombre, correo, hashPassword, idRol: rol, fechaExpiracion }) {
  const { rows } = await db.query(
    `INSERT INTO security_schema.usuario
       (nombre, correo, hash_password, debe_cambiar_password, mfa_activo, id_rol, activo, fecha_expiracion, fecha_creacion)
     VALUES ($1, $2, $3, true, false, $4, true, $5, now())
     RETURNING id_usuario`,
    [nombre, correo, hashPassword, rol, fechaExpiracion]);
  return rows[0].id_usuario;
}

/**
 * Aplica los cambios en una transacción. Si se bloquea la cuenta, se cambia la contraseña
 * o se reinicia el MFA, se cierran las sesiones abiertas del usuario.
 */
async function actualizar(idUsuario, cambios) {
  return db.transaccion(async (c) => {
    const sets = [];
    const p = [idUsuario];
    const poner = (columna, valor) => { p.push(valor); sets.push(`${columna} = $${p.length}`); };

    if (cambios.activo !== undefined) poner('activo', cambios.activo);
    if (cambios.idRol !== undefined) poner('id_rol', cambios.idRol);
    if (cambios.fechaExpiracion !== undefined) poner('fecha_expiracion', cambios.fechaExpiracion);
    if (cambios.hashPassword !== undefined) {
      poner('hash_password', cambios.hashPassword);
      sets.push('debe_cambiar_password = true');
    }
    if (cambios.reiniciarMfa) sets.push('mfa_activo = false', 'mfa_secret = NULL');

    if (sets.length) {
      await c.query(`UPDATE security_schema.usuario SET ${sets.join(', ')} WHERE id_usuario = $1`, p);
    }
    if (cambios.reiniciarMfa) {
      await c.query('DELETE FROM security_schema.mfa_codigo_recuperacion WHERE id_usuario = $1', [idUsuario]);
    }
    if (cambios.activo === false || cambios.hashPassword !== undefined || cambios.reiniciarMfa) {
      await c.query(
        'UPDATE security_schema.sesion_usuario SET fecha_cierre = now() WHERE id_usuario = $1 AND fecha_cierre IS NULL',
        [idUsuario]);
    }
  });
}

module.exports = { listar, obtener, membresiasVigentes, idRol, crear, actualizar };
