
'use strict';

/**
 * Acceso a ethics_schema.consentimiento
 * y ethics_schema.evento_consentimiento.
 *
 * Los eventos son históricos y solo se agregan.
 * El estado efectivo se calcula en el servicio.
 *
 * Nunca se devuelve evidencia_ruta.
 */

const db = require('../config/db');

async function participacionBloqueada(
  cliente,
  idParticipacion
) {
  const { rows } = await cliente.query(
    `SELECT
       id_participacion,
       id_estudio,
       estado,
       es_menor_al_enrolar
     FROM research_schema.participacion
     WHERE id_participacion = $1
     FOR SHARE`,
    [idParticipacion]
  );

  return rows[0] || null;
}

async function documentoPorVersion(
  cliente,
  idEstudio,
  tipo,
  version
) {
  const { rows } = await cliente.query(
    `SELECT id_documento, vigente
     FROM ethics_schema.documento_consentimiento
     WHERE id_estudio = $1
       AND tipo = $2
       AND version = $3
     FOR SHARE`,
    [idEstudio, tipo, version]
  );

  return rows[0] || null;
}

async function consentimientoBloqueado(
  cliente,
  idParticipacion,
  tipo
) {
  await cliente.query(
    `INSERT INTO ethics_schema.consentimiento
       (id_participacion, tipo)
     VALUES ($1, $2)
     ON CONFLICT (id_participacion, tipo)
     DO NOTHING`,
    [idParticipacion, tipo]
  );

  const { rows } = await cliente.query(
    `SELECT id_consentimiento
     FROM ethics_schema.consentimiento
     WHERE id_participacion = $1
       AND tipo = $2
     FOR UPDATE`,
    [idParticipacion, tipo]
  );

  return rows[0].id_consentimiento;
}

/**
 * H-14:
 * Recupera también documento_vigente.
 *
 * Esto permite determinar si un consentimiento
 * otorgado necesita reconsentimiento por una
 * nueva versión documental.
 */
async function ultimoEvento(
  cliente,
  idConsentimiento
) {
  const { rows } = await cliente.query(
    `SELECT
       e.tipo_evento,
       e.id_documento,
       d.vigente AS documento_vigente
     FROM ethics_schema.evento_consentimiento e
     JOIN ethics_schema.documento_consentimiento d
       ON d.id_documento = e.id_documento
     WHERE e.id_consentimiento = $1
     ORDER BY e.fecha DESC, e.id_evento DESC
     LIMIT 1`,
    [idConsentimiento]
  );

  return rows[0] || null;
}

async function agregarEvento(cliente, f) {
  const { rows } = await cliente.query(
    `INSERT INTO ethics_schema.evento_consentimiento
       (
         id_consentimiento,
         id_documento,
         id_representacion,
         tipo_evento,
         fecha,
         evidencia_ruta,
         evidencia_hash,
         id_usuario
       )
     VALUES (
       $1, $2, $3, $4,
       now(), $5, $6, $7
     )
     RETURNING
       id_evento,
       id_consentimiento,
       tipo_evento,
       fecha,
       evidencia_hash`,
    [
      f.id_consentimiento,
      f.id_documento,
      f.id_representacion,
      f.tipo_evento,
      f.evidencia_ruta,
      f.evidencia_hash,
      f.id_usuario,
    ]
  );

  return rows[0];
}

async function participacion(idParticipacion) {
  const { rows } = await db.query(
    `SELECT
       id_participacion,
       codigo_seudonimo,
       estado,
       es_menor_al_enrolar
     FROM research_schema.participacion
     WHERE id_participacion = $1`,
    [idParticipacion]
  );

  return rows[0] || null;
}

/**
 * Historial de eventos de una participación.
 * Del más reciente al más antiguo.
 */
async function eventosDeParticipacion(
  idParticipacion
) {
  const { rows } = await db.query(
    `SELECT
       c.tipo,
       e.id_evento,
       e.tipo_evento,
       e.fecha,
       e.evidencia_hash,
       e.id_representacion,
       e.id_usuario,
       d.version,
       d.vigente AS documento_vigente
     FROM ethics_schema.consentimiento c
     JOIN ethics_schema.evento_consentimiento e
       ON e.id_consentimiento = c.id_consentimiento
     JOIN ethics_schema.documento_consentimiento d
       ON d.id_documento = e.id_documento
     WHERE c.id_participacion = $1
     ORDER BY e.fecha DESC, e.id_evento DESC`,
    [idParticipacion]
  );

  return rows;
}

async function consentimientoConParticipacion(
  cliente,
  idConsentimiento
) {
  const { rows } = await cliente.query(
    `SELECT
       id_consentimiento,
       id_participacion,
       tipo
     FROM ethics_schema.consentimiento
     WHERE id_consentimiento = $1`,
    [idConsentimiento]
  );

  return rows[0] || null;
}

async function participacionBloqueadaParaActualizar(
  cliente,
  idParticipacion
) {
  const { rows } = await cliente.query(
    `SELECT
       id_participacion,
       id_estudio,
       estado,
       es_menor_al_enrolar
     FROM research_schema.participacion
     WHERE id_participacion = $1
     FOR UPDATE`,
    [idParticipacion]
  );

  return rows[0] || null;
}

async function bloquearConsentimiento(
  cliente,
  idConsentimiento
) {
  await cliente.query(
    `SELECT 1
     FROM ethics_schema.consentimiento
     WHERE id_consentimiento = $1
     FOR UPDATE`,
    [idConsentimiento]
  );
}

async function marcarParticipacionRetirada(
  cliente,
  idParticipacion
) {
  await cliente.query(
    `UPDATE research_schema.participacion
     SET estado = 'retirado'
     WHERE id_participacion = $1`,
    [idParticipacion]
  );
}

async function estudioDeConsentimiento(
  idConsentimiento
) {
  const { rows } = await db.query(
    `SELECT p.id_estudio
     FROM ethics_schema.consentimiento c
     JOIN research_schema.participacion p
       ON p.id_participacion = c.id_participacion
     WHERE c.id_consentimiento = $1`,
    [idConsentimiento]
  );

  return rows.length
    ? rows[0].id_estudio
    : null;
}

module.exports = {
  participacionBloqueada,
  documentoPorVersion,
  consentimientoBloqueado,
  ultimoEvento,
  agregarEvento,
  participacion,
  eventosDeParticipacion,
  consentimientoConParticipacion,
  participacionBloqueadaParaActualizar,
  bloquearConsentimiento,
  marcarParticipacionRetirada,
  estudioDeConsentimiento,
};
