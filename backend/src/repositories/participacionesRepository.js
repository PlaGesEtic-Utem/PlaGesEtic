'use strict';
/**
 * Acceso a research_schema.participante, research_schema.participacion e identity_schema.vinculo_identidad.
 * Es el único lugar que cruza el «puente de privacidad» (identidad ↔ participante), y solo para crear
 * el vínculo: nunca devuelve id_identidad, id_participante ni datos personales.
 */
const db = require('../config/db');

const COLUMNAS = 'p.id_participacion, p.codigo_seudonimo, p.estado, p.fecha_inicio, p.es_menor_al_enrolar';

/** Estado del estudio, bloqueando la fila para que no cambie mientras se inscribe (null si no existe). */
async function estadoEstudio(cliente, idEstudio) {
  const { rows } = await cliente.query(
    'SELECT estado FROM research_schema.estudio WHERE id_estudio = $1 FOR SHARE', [idEstudio]);
  return rows.length ? rows[0].estado : null;
}

/** Identidad vigente por UX Lab ID: solo lo necesario para inscribir (sin columnas cifradas). */
async function identidadPorUxLabId(cliente, uxLabId) {
  const { rows } = await cliente.query(
    `SELECT id_identidad, tipo, fecha_nacimiento
       FROM identity_schema.identidad
      WHERE ux_lab_id = $1 AND fecha_revocacion IS NULL AND fecha_eliminacion IS NULL`, [uxLabId]);
  return rows[0] || null;
}

/** Participante ya vinculado a esa identidad (si estuvo en otro estudio), o null. */
async function participanteDeIdentidad(cliente, idIdentidad) {
  const { rows } = await cliente.query(
    'SELECT id_participante FROM identity_schema.vinculo_identidad WHERE id_identidad = $1', [idIdentidad]);
  return rows.length ? rows[0].id_participante : null;
}

/** Crea el participante (sin datos personales) y su vínculo 1:1 con la identidad. */
async function crearParticipanteConVinculo(cliente, idIdentidad) {
  const { rows } = await cliente.query(
    `INSERT INTO research_schema.participante (estado, fecha_registro) VALUES ('activo', now())
     RETURNING id_participante`);
  const idParticipante = rows[0].id_participante;
  await cliente.query(
    'INSERT INTO identity_schema.vinculo_identidad (id_identidad, id_participante) VALUES ($1, $2)',
    [idIdentidad, idParticipante]);
  return idParticipante;
}

async function crearParticipacion(cliente, f) {
  const { rows } = await cliente.query(
    `INSERT INTO research_schema.participacion
       (id_participante, id_estudio, codigo_seudonimo, fecha_inicio, es_menor_al_enrolar, estado)
     VALUES ($1, $2, $3, CURRENT_DATE, $4, 'activo')
     RETURNING id_participacion, codigo_seudonimo, estado, fecha_inicio, es_menor_al_enrolar`,
    [f.id_participante, f.id_estudio, f.codigo_seudonimo, f.es_menor_al_enrolar]);
  return rows[0];
}

async function existeEstudio(idEstudio) {
  const { rows } = await db.query('SELECT 1 FROM research_schema.estudio WHERE id_estudio = $1', [idEstudio]);
  return rows.length > 0;
}

/** Participaciones de un estudio: solo código seudónimo, estado, fecha y si era menor. */
async function listarPorEstudio(idEstudio, estado) {
  const { rows } = await db.query(
    `SELECT ${COLUMNAS} FROM research_schema.participacion p
      WHERE p.id_estudio = $1 AND ($2::varchar IS NULL OR p.estado = $2)
      ORDER BY p.fecha_inicio, p.codigo_seudonimo`, [idEstudio, estado]);
  return rows;
}

module.exports = {
  estadoEstudio, identidadPorUxLabId, participanteDeIdentidad, crearParticipanteConVinculo,
  crearParticipacion, existeEstudio, listarPorEstudio,
};
