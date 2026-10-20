'use strict';
/**
 * Prueba contra PostgreSQL REAL: la bitácora security_schema.auditoria es solo de inserción.
 * Con el usuario de la aplicación, UPDATE y DELETE deben fallar y la fila debe quedar intacta.
 *
 * Se omite por defecto (npm test no necesita Docker). Para ejecutarla:
 *   1. Levanta la base (docker compose up -d) con el esquema cargado.
 *   2. Usa un .env con DB_HOST=localhost y las credenciales del usuario de la APLICACIÓN
 *      (no el dueño del esquema), porque la protección se prueba con ese usuario.
 *   3. Git Bash:    TEST_BD_REAL=1 npm test
 *      PowerShell:  $env:TEST_BD_REAL=1; npm.cmd test
 *
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');

const OMITIR = process.env.TEST_BD_REAL === '1' ? false : 'definir TEST_BD_REAL=1 para probar contra PostgreSQL real';

test('auditoria es solo de inserción (PostgreSQL real)', { skip: OMITIR }, async (t) => {
  const { Pool } = require('pg');
  const { cargarConfig } = require('../src/config');
  const pool = new Pool(cargarConfig().db);
  t.after(() => pool.end());

  const insertada = await pool.query(
    `INSERT INTO security_schema.auditoria (id_auditoria, entidad, accion, resultado, fecha_hora)
     VALUES (gen_random_uuid(), 'prueba_automatizada', 'leer', 'exito', now())
     RETURNING id_auditoria`
  );
  const id = insertada.rows[0].id_auditoria;
  const leer = () => pool.query('SELECT resultado FROM security_schema.auditoria WHERE id_auditoria = $1', [id]);

  await t.test('INSERT funciona', async () => {
    assert.equal((await leer()).rows.length, 1);
  });

  await t.test('UPDATE falla y la fila no cambia', async () => {
    await assert.rejects(pool.query("UPDATE security_schema.auditoria SET resultado = 'error' WHERE id_auditoria = $1", [id]));
    assert.equal((await leer()).rows[0].resultado, 'exito');
  });

  await t.test('DELETE falla y la fila sigue existiendo', async () => {
    await assert.rejects(pool.query('DELETE FROM security_schema.auditoria WHERE id_auditoria = $1', [id]));
    assert.equal((await leer()).rows.length, 1);
  });
});