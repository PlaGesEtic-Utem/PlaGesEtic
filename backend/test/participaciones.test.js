'use strict';
/** Pruebas del código seudónimo y del cálculo de menor de edad (no necesitan base de datos). */
const test = require('node:test');
const assert = require('node:assert');
const { nuevoCodigoSeudonimo, esMenorDeEdad } = require('../src/services/participacionesService');

test('El código seudónimo tiene el formato P-XXXXXX, sin letras ni números confusos', () => {
  for (let i = 0; i < 200; i++) assert.match(nuevoCodigoSeudonimo(), /^P-[A-HJ-NP-Z2-9]{6}$/);
});

test('Los códigos seudónimos son aleatorios (no se repiten en 1.000 intentos)', () => {
  const codigos = new Set(Array.from({ length: 1000 }, nuevoCodigoSeudonimo));
  assert.ok(codigos.size >= 999);
});

test('Menor de edad: se calcula con la fecha de hoy y cambia justo el día que cumple 18', () => {
  const hoy = new Date(2026, 9, 10); // 10/10/2026
  assert.strictEqual(esMenorDeEdad('2012-06-01', hoy), true);
  assert.strictEqual(esMenorDeEdad('2008-10-11', hoy), true);  // cumple 18 mañana
  assert.strictEqual(esMenorDeEdad('2008-10-10', hoy), false); // cumple 18 hoy
  assert.strictEqual(esMenorDeEdad('1992-04-10', hoy), false);
  assert.strictEqual(esMenorDeEdad(new Date(2008, 9, 10), hoy), false); // como la entrega la base
});
