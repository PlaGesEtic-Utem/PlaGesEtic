'use strict';
/** Pruebas del segundo factor (TOTP, RFC 6238) y del límite de pedidos (no necesitan base de datos). */
const test = require('node:test');
const assert = require('node:assert');
const totp = require('../src/utils/totp');
const { limiteSolicitudes } = require('../src/middlewares/limiteSolicitudes');

// Vectores oficiales del RFC 6238 (secreto ASCII «12345678901234567890», SHA-1), recortados a 6 dígitos.
const SECRETO_RFC = totp.base32Codificar(Buffer.from('12345678901234567890'));

test('TOTP: coincide con los vectores de prueba del RFC 6238', () => {
  assert.strictEqual(totp.codigo(SECRETO_RFC, 59 * 1000), '287082');
  assert.strictEqual(totp.codigo(SECRETO_RFC, 1111111109 * 1000), '081804');
  assert.strictEqual(totp.codigo(SECRETO_RFC, 1234567890 * 1000), '005924');
  assert.strictEqual(totp.codigo(SECRETO_RFC, 2000000000 * 1000), '279037');
});

test('TOTP: acepta el código actual y ±30 s, rechaza otros y formatos inválidos', () => {
  const s = totp.generarSecreto();
  const t = Date.UTC(2026, 9, 11, 12, 0, 15);
  assert.ok(totp.verificar(s, totp.codigo(s, t), t));
  assert.ok(totp.verificar(s, totp.codigo(s, t - 30000), t));
  assert.ok(totp.verificar(s, totp.codigo(s, t + 30000), t));
  assert.ok(!totp.verificar(s, totp.codigo(s, t - 90000), t));
  assert.ok(!totp.verificar(s, '12345', t));
  assert.ok(!totp.verificar(s, 'abcdef', t));
});

test('TOTP: el secreto en base32 ida y vuelta, y la dirección otpauth para el QR', () => {
  const s = totp.generarSecreto();
  assert.match(s, /^[A-Z2-7]{32}$/);
  assert.strictEqual(totp.base32Codificar(totp.base32Decodificar(s)), s);
  assert.match(totp.uriOtpauth(s, 'ana@uxlab.test'), /^otpauth:\/\/totp\/plaGesEtic%3Aana%40uxlab\.test\?secret=/);
});

test('Límite de pedidos: deja pasar hasta el máximo y luego responde 429', () => {
  const mw = limiteSolicitudes({ maximo: 3, ventanaMs: 60000 });
  const res = { set() {} };
  const resultados = [];
  for (let i = 0; i < 5; i++) mw({ ip: '1.2.3.4' }, res, (err) => resultados.push(err ? err.estado : 'ok'));
  assert.deepStrictEqual(resultados, ['ok', 'ok', 'ok', 429, 429]);
});
