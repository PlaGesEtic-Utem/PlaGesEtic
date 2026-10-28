'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const {
  ALFABETO, generarUxLabId, generarCodigoSeudonimo, conReintentoPorColision,
} = require('../src/utils/codigos');

const colision = () => Object.assign(new Error('duplicate key'), { code: '23505' });

test('UX Lab ID: formato UXL- + 8 caracteres del alfabeto', () => {
  for (let i = 0; i < 200; i++) assert.match(generarUxLabId(), /^UXL-[A-HJ-NP-Z2-9]{8}$/);
});

test('Código seudónimo: formato P- + 6 caracteres del alfabeto', () => {
  for (let i = 0; i < 200; i++) assert.match(generarCodigoSeudonimo(), /^P-[A-HJ-NP-Z2-9]{6}$/);
});

test('Alfabeto: 32 símbolos únicos, sin 0/O/1/I, y su tamaño divide a 256 (sin sesgo)', () => {
  assert.equal(ALFABETO.length, 32);
  assert.equal(new Set(ALFABETO).size, 32);
  assert.doesNotMatch(ALFABETO, /[01IO]/);
  assert.equal(256 % ALFABETO.length, 0);
});

test('Alfabeto: con muchas muestras salen los 32 símbolos y ninguno de fuera', () => {
  const vistos = new Set();
  for (let i = 0; i < 20000; i++) for (const ch of generarCodigoSeudonimo().slice(2)) vistos.add(ch);
  assert.equal([...vistos].sort().join(''), [...ALFABETO].sort().join(''));
});

test('Cada byte se traduce por módulo 32 (0→A, 1→B, 31→9, 32→A)', (t) => {
  t.mock.method(crypto, 'randomBytes', () => Buffer.from([0, 1, 31, 32, 255, 64]));
  assert.equal(generarCodigoSeudonimo(), 'P-AB9A9A');
});

test('Independencia: los códigos no se repiten', () => {
  const uxl = new Set(Array.from({ length: 1000 }, () => generarUxLabId()));
  assert.equal(uxl.size, 1000);
  const seud = new Set(Array.from({ length: 1000 }, () => generarCodigoSeudonimo()));
  assert.ok(seud.size >= 999);
});

test('Independencia: cada código pide bytes nuevos a crypto, exactamente los que necesita', (t) => {
  const pedidos = [];
  t.mock.method(crypto, 'randomBytes', (n) => { pedidos.push(n); return Buffer.alloc(n, pedidos.length); });
  generarUxLabId(); generarCodigoSeudonimo(); generarUxLabId();
  assert.deepEqual(pedidos, [8, 6, 8]);
});

test('Reintento: sin colisión, la operación corre una sola vez', async () => {
  let llamadas = 0;
  const r = await conReintentoPorColision(async () => { llamadas++; return 'ok'; });
  assert.equal(r, 'ok');
  assert.equal(llamadas, 1);
});

test('Reintento: ante una colisión 23505 repite y devuelve el segundo intento', async () => {
  let llamadas = 0;
  const r = await conReintentoPorColision(async () => { if (++llamadas === 1) throw colision(); return 'ok'; });
  assert.equal(r, 'ok');
  assert.equal(llamadas, 2);
});

test('Reintento: si siempre choca, se rinde tras el máximo de intentos', async () => {
  let llamadas = 0;
  await assert.rejects(
    conReintentoPorColision(async () => { llamadas++; throw colision(); }, { intentos: 3, mensaje: 'sin código' }),
    /sin código/,
  );
  assert.equal(llamadas, 3);
});

test('Reintento: un error que no es colisión se propaga de inmediato', async () => {
  let llamadas = 0;
  const otro = Object.assign(new Error('fallo'), { code: '40001' });
  await assert.rejects(conReintentoPorColision(async () => { llamadas++; throw otro; }), (e) => e === otro);
  assert.equal(llamadas, 1);
});

test('Reintento: esColision personalizado decide qué se repite', async () => {
  let llamadas = 0;
  const choque = Object.assign(new Error('x'), { code: '23505', constraint: 'uq_codigo_seudonimo' });
  const r = await conReintentoPorColision(
    async () => { if (++llamadas === 1) throw choque; return 'ok'; },
    { esColision: (e) => /codigo_seudonimo/.test(e.constraint || '') },
  );
  assert.equal(r, 'ok');
  assert.equal(llamadas, 2);
});

test('Reintento con el generador: tras chocar, se genera un código distinto', async (t) => {
  const bytes = [Buffer.alloc(6, 0), Buffer.alloc(6, 0), Buffer.alloc(6, 1)];
  t.mock.method(crypto, 'randomBytes', () => bytes.shift());
  const usados = new Set(['P-AAAAAA']);
  const codigo = await conReintentoPorColision(async () => {
    const c = generarCodigoSeudonimo();
    if (usados.has(c)) throw colision();
    usados.add(c);
    return c;
  });
  assert.equal(codigo, 'P-BBBBBB');
});