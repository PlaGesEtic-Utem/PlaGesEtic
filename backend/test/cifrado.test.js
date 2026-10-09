'use strict';
/** Pruebas del cifrado de datos personales y del RUT (no necesitan base de datos). */
const test = require('node:test');
const assert = require('node:assert');
process.env.CLAVE_CIFRADO = 'cGxhR2VzRXRpYy1zb2xvLWRlc2Fycm9sbG8tMzJieXQ=';
const { cifrar, descifrar, huella } = require('../src/utils/cifrado');
const { validarRut } = require('../src/utils/rut');
const { nuevoUxLabId } = require('../src/services/identidadesService');

test('Cifrar y descifrar devuelve el mismo texto, y el cifrado no contiene el original', () => {
  const c = cifrar('Pedro Parra');
  assert.ok(c.startsWith('v1:'));
  assert.ok(!c.includes('Pedro'));
  assert.strictEqual(descifrar(c), 'Pedro Parra');
});

test('Cifrar dos veces lo mismo da resultados distintos (IV aleatorio)', () => {
  assert.notStrictEqual(cifrar('11111111-1'), cifrar('11111111-1'));
});

test('Si alguien altera el dato cifrado, descifrar falla', () => {
  const c = cifrar('dato');
  const alterado = c.slice(0, -4) + (c.slice(-4) === 'AAAA' ? 'BBBB' : 'AAAA');
  assert.throws(() => descifrar(alterado));
});

test('La huella es siempre igual para el mismo dato y tiene 64 caracteres', () => {
  assert.strictEqual(huella('11111111-1'), huella('11111111-1'));
  assert.strictEqual(huella('11111111-1').length, 64);
  assert.notStrictEqual(huella('11111111-1'), huella('22222222-2'));
});

test('RUT: acepta formatos con y sin puntos, rechaza dígito verificador incorrecto', () => {
  assert.strictEqual(validarRut('11.111.111-1'), '11111111-1');
  assert.strictEqual(validarRut('11111111-1'), '11111111-1');
  assert.strictEqual(validarRut('11.111.111-2'), null);
  assert.strictEqual(validarRut('hola'), null);
});

test('UX Lab ID: formato UXL- + 8 caracteres sin letras confundibles', () => {
  for (let i = 0; i < 50; i++) assert.match(nuevoUxLabId(), /^UXL-[A-HJ-NP-Z2-9]{8}$/);
});
