'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validarEvidencia, completarAlta } = require('../consentimiento-integracion');

const pdf = { name: 'evidencia.pdf', type: 'application/pdf', size: 100 };

test('B4: aceptar requiere evidencia firmada', () => {
  assert.throws(() => validarEvidencia('Acepta', null), /adjunta la evidencia/);
  assert.doesNotThrow(() => validarEvidencia('Acepta', pdf));
});
test('B4: negar no necesita archivo', () => {
  assert.doesNotThrow(() => validarEvidencia('Niega', null));
  assert.throws(() => validarEvidencia('Niega', pdf), /quita el archivo/);
});
test('B4: solo admite PDF, JPEG o PNG de hasta 10 MB', () => {
  assert.throws(() => validarEvidencia('Acepta', { ...pdf, name: 'prueba.exe' }), /PDF/);
  assert.throws(() => validarEvidencia('Acepta', { ...pdf, size: 10 * 1024 * 1024 + 1 }), /10 MB/);
  assert.doesNotThrow(() => validarEvidencia('Acepta', { name: 'foto.png', type: 'image/png', size: 50 }));
});
test('B4: alta completa registra identidad, inscripción y consentimiento en orden', async () => {
  const pasos = [];
  const resultado = await completarAlta({
    estado: {},
    obtenerIdentidad: async () => { pasos.push('identidad'); return 'UXL-ABC12345'; },
    inscribir: async () => { pasos.push('inscribir'); return { id_participacion: 'uuid', codigo_seudonimo: 'P-ABC123' }; },
    registrar: async id => { pasos.push('consentimiento:' + id); return { id_consentimiento: 'c1', estado_vigente: 'otorgado' }; }
  });
  assert.deepEqual(pasos, ['identidad', 'inscribir', 'consentimiento:uuid']);
  assert.equal(resultado.consentimiento.estado_vigente, 'otorgado');
});
test('B4: si falla registrar la decisión, no inscribe dos veces', async () => {
  const estado = {};
  let inscripciones = 0, intentos = 0;
  const args = {
    estado, obtenerIdentidad: async () => 'UXL-ABC12345',
    inscribir: async () => { inscripciones++; return { id_participacion: 'uuid', codigo_seudonimo: 'P-ABC123' }; },
    registrar: async () => { if (++intentos === 1) throw new Error('Fallo temporal'); return { id_consentimiento: 'c1', estado_vigente: 'negado' }; }
  };
  await assert.rejects(completarAlta(args), /Fallo temporal/);
  const resultado = await completarAlta(args);
  assert.equal(inscripciones, 1);
  assert.equal(intentos, 2);
  assert.equal(resultado.consentimiento.estado_vigente, 'negado');
});
test('B4: no muestra confirmación si no hay respuesta de inscripción o consentimiento', async () => {
  await assert.rejects(completarAlta({ estado: {}, obtenerIdentidad: async () => 'UXL-ID',
    inscribir: async () => ({}), registrar: async () => ({}) }), /identificadores/);
  await assert.rejects(completarAlta({ estado: {}, obtenerIdentidad: async () => 'UXL-ID',
    inscribir: async () => ({ id_participacion: 'id', codigo_seudonimo: 'P-ABC123' }),
    registrar: async () => ({}) }), /no confirmó/);
});
