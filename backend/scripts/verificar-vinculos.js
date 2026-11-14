#!/usr/bin/env node
'use strict';
/**
 * Act. 75 - Revisa que consentimientos, evidencias, exportaciones y auditoría
 * estén bien vinculados. Solo lee; no modifica datos.
 *
 * Ejecutar desde backend: node scripts/verificar-vinculos.js
 * Código 0: sin inconsistencias; 1: hay inconsistencias; 2: problema de conexión.
 */

const path = require('node:path');

const CONSULTAS = [
  {
    nombre: '1. Participaciones activas sin consentimiento vigente',
    sql: `
      WITH ultimo AS (
        SELECT DISTINCT ON (c.id_consentimiento) c.id_participacion, e.tipo_evento, d.vigente
          FROM ethics_schema.consentimiento c
          JOIN ethics_schema.evento_consentimiento e ON e.id_consentimiento = c.id_consentimiento
          LEFT JOIN ethics_schema.documento_consentimiento d ON d.id_documento = e.id_documento
         WHERE c.tipo = 'consentimiento'
         ORDER BY c.id_consentimiento, e.fecha DESC
      )
      SELECT p.codigo_seudonimo, COALESCE(u.tipo_evento, 'sin registro') AS ultimo_evento
        FROM research_schema.participacion p
        LEFT JOIN ultimo u ON u.id_participacion = p.id_participacion
       WHERE p.estado = 'activo'
         AND (u.tipo_evento IS NULL OR u.tipo_evento NOT IN ('aceptar', 'reconsentir') OR u.vigente IS NOT TRUE)`,
  },
  {
    nombre: '2. Aceptaciones sin documento, versión o huella de evidencia',
    sql: `
      SELECT e.id_evento, e.tipo_evento, d.version, (e.evidencia_hash IS NOT NULL) AS tiene_huella
        FROM ethics_schema.evento_consentimiento e
        LEFT JOIN ethics_schema.documento_consentimiento d ON d.id_documento = e.id_documento
       WHERE (e.tipo_evento IN ('aceptar', 'reconsentir')
              AND (d.id_documento IS NULL OR d.version IS NULL OR e.evidencia_hash IS NULL))
          OR (e.evidencia_ruta IS NOT NULL AND e.evidencia_hash IS NULL)`,
  },
  {
    nombre: '3. Exportaciones vigentes con participantes que se retiraron después',
    sql: `
      SELECT x.codigo_exportacion, ep.codigo_en_exportacion, e.fecha AS fecha_retiro
        FROM research_schema.exportacion x
        JOIN research_schema.exportacion_participacion ep ON ep.id_exportacion = x.id_exportacion
        JOIN ethics_schema.consentimiento c ON c.id_participacion = ep.id_participacion
        JOIN ethics_schema.evento_consentimiento e
          ON e.id_consentimiento = c.id_consentimiento AND e.tipo_evento = 'retirar'
       WHERE x.estado = 'lista' AND x.fecha_vencimiento > now() AND e.fecha > x.fecha_generacion`,
  },
  {
    nombre: '4. Eventos de consentimiento sin registro en auditoría',
    sql: `
      SELECT e.id_evento, e.tipo_evento, e.fecha
        FROM ethics_schema.evento_consentimiento e
       WHERE NOT EXISTS (
         SELECT 1 FROM security_schema.auditoria a
          WHERE a.entidad = 'consentimiento' AND a.resultado = 'exito'
            AND a.id_registro_afectado = e.id_consentimiento
            AND a.fecha_hora BETWEEN e.fecha - interval '5 minutes' AND e.fecha + interval '5 minutes')`,
  },
];

async function ejecutar() {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const { Pool } = require('pg');
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 10000,
  });

  let total = 0;
  try {
    for (const consulta of CONSULTAS) {
      const { rows } = await pool.query(consulta.sql);
      total += rows.length;
      if (rows.length === 0) {
        console.log(`[OK] ${consulta.nombre}`);
      } else {
        console.log(`[REVISAR] ${consulta.nombre}: ${rows.length} caso(s)`);
        console.table(rows);
      }
    }
    console.log(total === 0 ? '\nSin inconsistencias.' : `\nTotal de inconsistencias: ${total}`);
    process.exitCode = total === 0 ? 0 : 1;
  } catch (error) {
    console.error('[ERROR]', error.code || error.message);
    process.exitCode = 2;
  } finally {
    await pool.end();
  }
}

if (require.main === module) ejecutar();

module.exports = { CONSULTAS, ejecutar };
