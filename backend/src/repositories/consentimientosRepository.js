'use strict';
/**
 * Acceso a ethics_schema.consentimiento y ethics_schema.evento_consentimiento.
 * Los eventos solo se AGREGAN (sin UPDATE ni DELETE): el estado vigente se calcula con el último evento.
 * Nunca se devuelve evidencia_ruta (ruta interna en disco): solo el hash.
 * Las funciones que reciben «cliente» corren dentro de la transacción del servicio.
 */
const db = require('../config/db');

/** Participación bloqueada en modo compartido mientras dura la transacción (null si no existe). */
async function participacionBloqueada(cliente, idParticipacion) {
  const { rows } = await cliente.query(
    `SELECT id_participacion, id_estudio, estado, es_menor_al_enrolar
       FROM research_schema.participacion WHERE id_participacion = $1 FOR SHARE`, [idParticipacion]);
  return rows[0] || null;
}

/** Documento del estudio por tipo y versión, bloqueado para que no deje de ser vigente a mitad de la operación. */
async function documentoPorVersion(cliente, idEstudio, tipo, version) {
  const { rows } = await cliente.query(
    `SELECT id_documento, vigente FROM ethics_schema.documento_consentimiento
      WHERE id_estudio = $1 AND tipo = $2 AND version = $3 FOR SHARE`, [idEstudio, tipo, version]);
  return rows[0] || null;
}

/** Crea el consentimiento (participación + tipo) si no existe y lo bloquea: serializa los eventos de ese par. */
async function consentimientoBloqueado(cliente, idParticipacion, tipo) {
  await cliente.query(
    `INSERT INTO ethics_schema.consentimiento (id_participacion, tipo) VALUES ($1, $2)
     ON CONFLICT (id_participacion, tipo) DO NOTHING`, [idParticipacion, tipo]);
  const { rows } = await cliente.query(
    `SELECT id_consentimiento FROM ethics_schema.consentimiento
      WHERE id_participacion = $1 AND tipo = $2 FOR UPDATE`, [idParticipacion, tipo]);
  return rows[0].id_consentimiento;
}

async function ultimoEvento(cliente, idConsentimiento) {
  const { rows } = await cliente.query(
    `SELECT tipo_evento, id_documento FROM ethics_schema.evento_consentimiento
      WHERE id_consentimiento = $1 ORDER BY fecha DESC, id_evento DESC LIMIT 1`, [idConsentimiento]);
  return rows[0] || null;
}

async function agregarEvento(cliente, f) {
  const { rows } = await cliente.query(
    `INSERT INTO ethics_schema.evento_consentimiento
       (id_consentimiento, id_documento, id_representacion, tipo_evento, fecha, evidencia_ruta, evidencia_hash, id_usuario)
     VALUES ($1, $2, $3, $4, now(), $5, $6, $7)
     RETURNING id_evento, id_consentimiento, tipo_evento, fecha, evidencia_hash`,
    [f.id_consentimiento, f.id_documento, f.id_representacion, f.tipo_evento, f.evidencia_ruta, f.evidencia_hash, f.id_usuario]);
  return rows[0];
}

async function participacion(idParticipacion) {
  const { rows } = await db.query(
    `SELECT id_participacion, codigo_seudonimo, estado, es_menor_al_enrolar
       FROM research_schema.participacion WHERE id_participacion = $1`, [idParticipacion]);
  return rows[0] || null;
}

/** Todos los eventos de la participación, del más nuevo al más antiguo, con la versión del documento. */
async function eventosDeParticipacion(idParticipacion) {
  const { rows } = await db.query(
    `SELECT c.tipo, e.id_evento, e.tipo_evento, e.fecha, e.evidencia_hash, e.id_representacion, e.id_usuario,
            d.version, d.vigente AS documento_vigente
       FROM ethics_schema.consentimiento c
       JOIN ethics_schema.evento_consentimiento e ON e.id_consentimiento = c.id_consentimiento
       JOIN ethics_schema.documento_consentimiento d ON d.id_documento = e.id_documento
      WHERE c.id_participacion = $1
      ORDER BY e.fecha DESC, e.id_evento DESC`, [idParticipacion]);
  return rows;
}

/** Consentimiento con su participación (sin bloqueo), o null si no existe. */
async function consentimientoConParticipacion(cliente, idConsentimiento) {
  const { rows } = await cliente.query(
    `SELECT id_consentimiento, id_participacion, tipo
       FROM ethics_schema.consentimiento WHERE id_consentimiento = $1`, [idConsentimiento]);
  return rows[0] || null;
}

/** Participación bloqueada para modificarla (el retiro cambia su estado). */
async function participacionBloqueadaParaActualizar(cliente, idParticipacion) {
  const { rows } = await cliente.query(
    `SELECT id_participacion, id_estudio, estado, es_menor_al_enrolar
       FROM research_schema.participacion WHERE id_participacion = $1 FOR UPDATE`, [idParticipacion]);
  return rows[0] || null;
}

/** Bloquea el consentimiento: serializa los eventos de ese par (participación + tipo). */
async function bloquearConsentimiento(cliente, idConsentimiento) {
  await cliente.query(
    'SELECT 1 FROM ethics_schema.consentimiento WHERE id_consentimiento = $1 FOR UPDATE', [idConsentimiento]);
}

async function marcarParticipacionRetirada(cliente, idParticipacion) {
  await cliente.query(
    `UPDATE research_schema.participacion SET estado = 'retirado' WHERE id_participacion = $1`, [idParticipacion]);
}

/** Estudio al que pertenece un consentimiento (para el control de acceso), o null si no existe. */
async function estudioDeConsentimiento(idConsentimiento) {
  const { rows } = await db.query(
    `SELECT p.id_estudio
       FROM ethics_schema.consentimiento c
       JOIN research_schema.participacion p ON p.id_participacion = c.id_participacion
      WHERE c.id_consentimiento = $1`, [idConsentimiento]);
  return rows.length ? rows[0].id_estudio : null;
}

module.exports = {
  participacionBloqueada, documentoPorVersion, consentimientoBloqueado, ultimoEvento, agregarEvento,
  participacion, eventosDeParticipacion,
  consentimientoConParticipacion, participacionBloqueadaParaActualizar, bloquearConsentimiento,
  marcarParticipacionRetirada, estudioDeConsentimiento,
};