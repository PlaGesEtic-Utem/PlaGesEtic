#!/usr/bin/env node
'use strict';
/**
 * Act. 57 - Verifica la cadena de security_schema.auditoria sin modificar datos.
 *
 * Ejecutar desde backend: node scripts/verificar-auditoria.js
 * Usa DB_HOST, DB_PORT, DB_NAME, DB_USER y DB_PASSWORD de backend/.env.
 *
 * Código 0: cadena válida; 1: primera inconsistencia; 2: problema de conexión.
 * Nota: sin un ancla externa no se detecta la eliminación de la última fila.
 */

const path = require('node:path');
const CERO = '0'.repeat(64);
const HEX64 = /^[0-9a-f]{64}$/;

const normalizar = (valor) => String(valor ?? '').trim().toLowerCase();

/** Recorre los registros en orden ascendente y devuelve el primer fallo. */
function verificarFilas(filas) {
  let hashPrevio = CERO;
  let secuenciaPrevia = null;
  const saltos = [];

  for (const fila of filas) {
    const secuencia = Number(fila.secuencia);
    const hash = normalizar(fila.hash);
    const hashAnterior = normalizar(fila.hash_anterior);
    const calculado = normalizar(fila.hash_calculado);
    const id = fila.id_auditoria;
    const fallo = (motivo) => ({
      integra: false,
      revisadas: filas.length,
      primeraAlteracion: { secuencia: fila.secuencia, id_auditoria: id, motivo },
      saltos,
    });

    if (!Number.isSafeInteger(secuencia) || secuencia < 1 ||
        (secuenciaPrevia !== null && secuencia <= secuenciaPrevia)) {
      return fallo('Secuencia inválida o desordenada');
    }
    if (!HEX64.test(hash) || !HEX64.test(hashAnterior) || !HEX64.test(calculado)) {
      return fallo('Hash ausente o con formato inválido');
    }
    if (hash !== calculado) {
      return fallo('La huella almacenada no coincide con el contenido de la fila');
    }
    if (hashAnterior !== hashPrevio) {
      return fallo('El hash_anterior no coincide con la huella de la fila previa');
    }

    if (secuenciaPrevia === null && secuencia > 1) {
      saltos.push({ desde: 1, hasta: secuencia - 1 });
    } else if (secuenciaPrevia !== null && secuencia > secuenciaPrevia + 1) {
      saltos.push({ desde: secuenciaPrevia + 1, hasta: secuencia - 1 });
    }

    hashPrevio = hash;
    secuenciaPrevia = secuencia;
  }

  return { integra: true, revisadas: filas.length, primeraAlteracion: null, saltos };
}

async function ejecutar() {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
  const { Pool } = require('pg');
  const pool = new Pool({
    host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
    port: Number(process.env.DB_PORT || process.env.PGPORT || 5432),
    database: process.env.DB_NAME || process.env.PGDATABASE,
    user: process.env.DB_USER || process.env.PGUSER,
    password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
    connectionTimeoutMillis: 10000,
  });

  try {
    // El cálculo del hash se realiza con la MISMA función SQL de la migración.
    // Es importante no reserializar jsonb con JSON.stringify() en JavaScript.
    const { rows } = await pool.query(`
      SELECT a.secuencia, a.id_auditoria, a.hash, a.hash_anterior,
             security_schema.fn_auditoria_huella(a) AS hash_calculado
      FROM security_schema.auditoria a
      ORDER BY a.secuencia ASC
    `);

    const resultado = verificarFilas(rows);
    if (!resultado.integra) {
      const { secuencia, id_auditoria, motivo } = resultado.primeraAlteracion;
      console.error(`[AUDITORIA ALTERADA] Primera fila: secuencia=${secuencia}, id=${id_auditoria}`);
      console.error(`Motivo: ${motivo}`);
      process.exitCode = 1;
      return;
    }

    console.log(`[AUDITORIA ÍNTEGRA] ${resultado.revisadas} registros verificados.`);
    if (resultado.saltos.length) {
      console.warn(`[ADVERTENCIA] ${resultado.saltos.length} salto(s) de secuencia. Pueden deberse a transacciones abortadas; no demuestran alteración por sí solos.`);
      console.warn(JSON.stringify(resultado.saltos));
    }
  } catch (error) {
    console.error('[ERROR DE VERIFICACIÓN]', error.code || error.message);
    process.exitCode = 2;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  ejecutar().catch((err) => {
    console.error('[ERROR DE VERIFICACIÓN]', err.code || err.message);
    process.exitCode = 2;
  });
}

module.exports = { verificarFilas, ejecutar };
