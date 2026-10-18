'use strict';
/**
 * Acceso a ethics_schema.documento_consentimiento. Única capa que escribe SQL de documentos.
 * Nunca se devuelve documento_ruta (ruta interna en disco): solo el hash, para verificar integridad.
 */
const db = require('../config/db');

const COLUMNAS = 'id_documento, id_estudio, id_protocolo, tipo, version, documento_hash, vigente, fecha_registro';

async function listarPorEstudio(idEstudio, { tipo = null, soloVigentes = false } = {}) {
  const { rows } = await db.query(
    `SELECT ${COLUMNAS} FROM ethics_schema.documento_consentimiento
      WHERE id_estudio = $1
        AND ($2::varchar IS NULL OR tipo = $2)
        AND ($3::boolean = false OR vigente = true)
      ORDER BY tipo, fecha_registro DESC`,
    [idEstudio, tipo, soloVigentes]);
  return rows;
}

async function existeVersion(idEstudio, tipo, version) {
  const { rows } = await db.query(
    `SELECT 1 FROM ethics_schema.documento_consentimiento
      WHERE id_estudio = $1 AND tipo = $2 AND version = $3`, [idEstudio, tipo, version]);
  return rows.length > 0;
}

/**
 * Registra una versión nueva y la deja como la vigente de ese (estudio, tipo), en UNA transacción:
 * la anterior pasa a vigente = false. Se bloquea la fila del estudio para que dos subidas
 * simultáneas no dejen dos versiones vigentes.
 */
async function registrarNuevaVersion(f) {
  return db.transaccion(async (c) => {
    await c.query('SELECT 1 FROM research_schema.estudio WHERE id_estudio = $1 FOR NO KEY UPDATE', [f.id_estudio]);
    await c.query(
      `UPDATE ethics_schema.documento_consentimiento SET vigente = false
        WHERE id_estudio = $1 AND tipo = $2 AND vigente = true`, [f.id_estudio, f.tipo]);
    const { rows } = await c.query(
      `INSERT INTO ethics_schema.documento_consentimiento
         (id_estudio, id_protocolo, tipo, version, documento_ruta, documento_hash, vigente, fecha_registro)
       VALUES ($1, NULL, $2, $3, $4, $5, true, now())
       RETURNING ${COLUMNAS}`,
      [f.id_estudio, f.tipo, f.version, f.ruta, f.hash]);
    return rows[0];
  });
}

module.exports = { listarPorEstudio, existeVersion, registrarNuevaVersion };
