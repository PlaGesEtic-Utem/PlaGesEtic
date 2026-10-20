'use strict';
/** Pruebas del cálculo de menor de edad (no necesitan base de datos). Las del generador de códigos están en codigos.test.js. */
const test = require('node:test');
const assert = require('node:assert');
const { esMenorDeEdad } = require('../src/services/participacionesService');

test('Menor de edad: se calcula con la fecha de hoy y cambia justo el día que cumple 18', () => {
  const hoy = new Date(2026, 9, 10); // 10/10/2026
  assert.strictEqual(esMenorDeEdad('2012-06-01', hoy), true);
  assert.strictEqual(esMenorDeEdad('2008-10-11', hoy), true);  // cumple 18 mañana
  assert.strictEqual(esMenorDeEdad('2008-10-10', hoy), false); // cumple 18 hoy
  assert.strictEqual(esMenorDeEdad('1992-04-10', hoy), false);
  assert.strictEqual(esMenorDeEdad(new Date(2008, 9, 10), hoy), false); // como la entrega la base
});