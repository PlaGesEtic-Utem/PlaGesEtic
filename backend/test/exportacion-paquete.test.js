'use strict';
/**
 * Act. 60 (D23): el paquete de exportación no trae datos personales ni códigos internos.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const AdmZip = require('adm-zip');
const { armarZip } = require('../src/services/exportacionesService');
const { generarCodigo } = require('../src/utils/codigos');

const filas = [
  { codigo: generarCodigo('E-', 6), mes: '2026-09' },
  { codigo: generarCodigo('E-', 6), mes: '2026-10' },
];
const zip = new AdmZip(armarZip('X-ABC234', 'analisis', filas));
const leer = (nombre) => zip.getEntry(nombre).getData().toString('utf8');

test('el paquete trae solo participantes.csv y LEEME.txt', () => {
  const nombres = zip.getEntries().map((e) => e.entryName).sort();
  assert.deepEqual(nombres, ['LEEME.txt', 'participantes.csv']);
});

test('participantes.csv trae solo código E-, consentimiento y mes', () => {
  const lineas = leer('participantes.csv').trim().split('\n');
  assert.equal(lineas[0], 'codigo_en_exportacion,estado_consentimiento,mes_inscripcion');
  assert.equal(lineas.length, filas.length + 1);
  for (const linea of lineas.slice(1)) {
    assert.match(linea, /^E-[A-Z2-9]{6},otorgado,\d{4}-\d{2}$/);
  }
});

test('ningún archivo trae códigos P- o UXL-, RUT ni correos', () => {
  const todo = leer('participantes.csv') + leer('LEEME.txt');
  assert.doesNotMatch(todo, /\bP-[A-Z2-9]{6}\b/);
  assert.doesNotMatch(todo, /UXL-[A-Z2-9]{8}/);
  assert.doesNotMatch(todo, /\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]/);
  assert.doesNotMatch(todo, /@/);
});