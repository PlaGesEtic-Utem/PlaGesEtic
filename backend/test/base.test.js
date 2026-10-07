'use strict';
/**
 * Pruebas básicas del esqueleto (no necesitan base de datos: usan un pool falso).
 * Ejecutar:  npm test
 */
const test = require('node:test');
const assert = require('node:assert');
const { crearApp } = require('../src/app');
const { cargarConfig } = require('../src/config');

async function levantar(pool) {
  const app = crearApp({ pool });
  const srv = app.listen(0);
  await new Promise((r) => srv.once('listening', r));
  return { url: `http://127.0.0.1:${srv.address().port}`, cerrar: () => srv.close() };
}
const poolOk = { query: async () => ({ rows: [{ ok: 1 }] }) };
const poolCaido = { query: async () => { const e = new Error('connect ECONNREFUSED'); e.code = 'ECONNREFUSED'; throw e; } };

test('GET /salud responde 200 cuando hay base de datos', async () => {
  const s = await levantar(poolOk);
  const r = await fetch(`${s.url}/salud`);
  const body = await r.json();
  s.cerrar();
  assert.strictEqual(r.status, 200);
  assert.strictEqual(body.estado, 'ok');
  assert.strictEqual(body.base_datos, 'ok');
});

test('GET /salud responde 503 con el formato común si la base no responde', async () => {
  const s = await levantar(poolCaido);
  const r = await fetch(`${s.url}/salud`);
  const body = await r.json();
  s.cerrar();
  assert.strictEqual(r.status, 503);
  assert.deepStrictEqual(Object.keys(body.error).sort(), ['codigo', 'mensaje']);
  assert.ok(!JSON.stringify(body).includes('ECONNREFUSED'), 'no debe mostrar detalles internos');
});

test('Una ruta inexistente responde 404 con el formato común', async () => {
  const s = await levantar(poolOk);
  const r = await fetch(`${s.url}/no-existe`);
  const body = await r.json();
  s.cerrar();
  assert.strictEqual(r.status, 404);
  assert.strictEqual(body.error.codigo, 'NO_ENCONTRADO');
});

test('JSON mal formado responde 400 sin detalles internos', async () => {
  const s = await levantar(poolOk);
  const r = await fetch(`${s.url}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{malo' });
  const body = await r.json();
  s.cerrar();
  assert.strictEqual(r.status, 400);
  assert.strictEqual(body.error.codigo, 'SOLICITUD_INVALIDA');
});

test('No se envía la cabecera X-Powered-By', async () => {
  const s = await levantar(poolOk);
  const r = await fetch(`${s.url}/salud`);
  s.cerrar();
  assert.strictEqual(r.headers.get('x-powered-by'), null);
});

test('La configuración falla si falta una variable obligatoria', () => {
  assert.throws(() => cargarConfig({ DB_HOST: 'x' }), /Faltan variables de entorno/);
});
