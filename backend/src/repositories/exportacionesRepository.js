'use strict';
/** 
 * Acesso a research_schema.exportacion y exportacion_participacion(Actividad 60)
 * Nunca devuelve datos personales: solo codigos, estados, fechas.
 */
const db = require('../config/db');

/** Guarda una exportacion nueva y devuelve su id, codigo y estado. */
async function crear(cliente,f) {
    const {rows} = await cliente.query(
    `INSERT INTO research_schema.exportacion
       (id_estudio, codigo_exportacion, proposito, filtros, estado, id_solicitante, fecha_solicitud)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     RETURNING id_exportacion, codigo_exportacion, proposito, estado, fecha_solicitud`,
    [f.id_estudio, f.codigo_exportacion, f.proposito, f.filtros, f.estado, f.id_solicitante]);
    return rows[0];
}

/** Busca una exportación por su id, con el responsable de su estudio. */
async function buscarPorId(idExportacion) {
  const { rows } = await db.query(
    `SELECT e.*, es.id_responsable
       FROM research_schema.exportacion e
       JOIN research_schema.estudio es ON es.id_estudio = e.id_estudio
      WHERE e.id_exportacion = $1`,
    [idExportacion]);
    return rows[0] || null;
}

/**
 * Participaciones que pueden ir en un paquete (D23): activas y con su último
 * consentimiento otorgado sobre el documento vigente. Orden aleatorio.
 */
async function participacionesElegibles(cliente, idEstudio) {
  const { rows } = await cliente.query(
    `SELECT p.id_participacion,
            to_char(p.fecha_inicio, 'YYYY-MM') AS mes_inscripcion
       FROM research_schema.participacion p
       JOIN ethics_schema.consentimiento c
         ON c.id_participacion = p.id_participacion AND c.tipo = 'consentimiento'
       JOIN LATERAL (
            SELECT e.tipo_evento, d.vigente
              FROM ethics_schema.evento_consentimiento e
              JOIN ethics_schema.documento_consentimiento d ON d.id_documento = e.id_documento
             WHERE e.id_consentimiento = c.id_consentimiento
             ORDER BY e.fecha DESC, e.id_evento DESC
             LIMIT 1
       ) ultimo ON true
      WHERE p.id_estudio = $1
        AND p.estado = 'activo'
        AND ultimo.tipo_evento IN ('aceptar', 'reconsentir')
        AND ultimo.vigente
      ORDER BY random()`,
    [idEstudio]);
  return rows;
}

module.exports = { crear, buscarPorId, participacionesElegibles };
