'use strict';
/**
 * Acceso a security_schema.membresia_estudio (Actividad 73).
 * Revocar no borra la fila: deja fecha_fin en ayer, para conservar quién tuvo acceso y cuándo.
 */
const db = require('../config/db');

const COLUMNAS = `m.id_membresia, m.id_usuario, u.nombre, u.correo, r.nombre_rol,
  m.puede_consultar, m.puede_cargar, m.puede_modificar, m.puede_descargar, m.puede_exportar,
  m.fecha_inicio, m.fecha_fin,
  (m.fecha_inicio <= CURRENT_DATE AND (m.fecha_fin IS NULL OR m.fecha_fin >= CURRENT_DATE)) AS vigente`;

const FROM = `FROM security_schema.membresia_estudio m
  JOIN security_schema.usuario u ON u.id_usuario = m.id_usuario
  JOIN security_schema.rol r ON r.id_rol = u.id_rol`;

async function listar(idEstudio, soloVigentes) {
  const { rows } = await db.query(
    `SELECT ${COLUMNAS} ${FROM}
      WHERE m.id_estudio = $1
        AND (NOT $2::boolean OR (m.fecha_inicio <= CURRENT_DATE AND (m.fecha_fin IS NULL OR m.fecha_fin >= CURRENT_DATE)))
      ORDER BY u.nombre`,
    [idEstudio, soloVigentes]);
  return rows;
}

async function obtener(idMembresia) {
  const { rows } = await db.query(`SELECT ${COLUMNAS}, m.id_estudio ${FROM} WHERE m.id_membresia = $1`, [idMembresia]);
  return rows[0] || null;
}

/** La membresía del usuario en el estudio, vigente o no (hay una sola por par usuario-estudio). */
async function buscarPorUsuario(idUsuario, idEstudio) {
  const { rows } = await db.query(
    `SELECT ${COLUMNAS} ${FROM} WHERE m.id_usuario = $1 AND m.id_estudio = $2`, [idUsuario, idEstudio]);
  return rows[0] || null;
}

async function usuarioParaMembresia(idUsuario) {
  const { rows } = await db.query(
    `SELECT u.id_usuario, u.activo, u.fecha_expiracion, r.nombre_rol
       FROM security_schema.usuario u JOIN security_schema.rol r ON r.id_rol = u.id_rol
      WHERE u.id_usuario = $1`, [idUsuario]);
  return rows[0] || null;
}

async function responsableDelEstudio(idEstudio) {
  const { rows } = await db.query('SELECT id_responsable FROM research_schema.estudio WHERE id_estudio = $1', [idEstudio]);
  return rows[0] ? rows[0].id_responsable : null;
}

/** Crea la membresía o reactiva la que estaba vencida (misma fila, permisos nuevos). */
async function guardar(idEstudio, idUsuario, p, idOtorgante, fechaFin, idExistente) {
  const valores = [p.puede_consultar, p.puede_cargar, p.puede_modificar, p.puede_descargar, p.puede_exportar,
    idOtorgante, fechaFin];
  if (idExistente) {
    await db.query(
      `UPDATE security_schema.membresia_estudio
          SET puede_consultar = $1, puede_cargar = $2, puede_modificar = $3, puede_descargar = $4, puede_exportar = $5,
              id_otorgante = $6, fecha_inicio = CURRENT_DATE, fecha_fin = $7
        WHERE id_membresia = $8`, [...valores, idExistente]);
    return idExistente;
  }
  const { rows } = await db.query(
    `INSERT INTO security_schema.membresia_estudio
       (puede_consultar, puede_cargar, puede_modificar, puede_descargar, puede_exportar, id_otorgante, fecha_fin,
        id_estudio, id_usuario, fecha_inicio)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE)
     RETURNING id_membresia`, [...valores, idEstudio, idUsuario]);
  return rows[0].id_membresia;
}

async function revocar(idMembresia) {
  await db.query(
    `UPDATE security_schema.membresia_estudio SET fecha_fin = CURRENT_DATE - 1
      WHERE id_membresia = $1 AND (fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE)`, [idMembresia]);
}

module.exports = { listar, obtener, buscarPorUsuario, usuarioParaMembresia, responsableDelEstudio, guardar, revocar };
