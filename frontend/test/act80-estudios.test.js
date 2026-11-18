'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { consulta, normalizar } = require('../act80-estudios');

test('envía parámetros acordados para búsqueda en servidor', () => {
  const p = new URLSearchParams(consulta({ q: ' Est-01 ', estado: 'activo', soloMios: true, pagina: 2, limite: 20, orden: 'fecha' }));
  assert.equal(p.get('q'), 'Est-01');
  assert.equal(p.get('estado'), 'activo');
  assert.equal(p.get('solo_mios'), 'true');
  assert.equal(p.get('pagina'), '2');
  assert.equal(p.get('limite'), '20');
  assert.equal(p.get('orden'), 'fecha');
});

test('procesa respuesta paginada del servidor', () => {
  const r = normalizar({ datos: [{codigo_estudio:'EST-01'}], total: 33, pagina: 2, limite: 20 }, {pagina:2,limite:20});
  assert.equal(r.total, 33);
  assert.equal(r.modo, 'servidor');
  assert.equal(r.datos.length, 1);
});

test('mantiene compatibilidad con lista antigua', () => {
  const r = normalizar([{codigo_estudio:'EST-01',nombre:'Uno',estado:'activo'}, {codigo_estudio:'EST-02',nombre:'Dos',estado:'borrador'}],
    {q:'est-01',estado:'activo',pagina:1,limite:20});
  assert.equal(r.total, 1);
  assert.equal(r.datos[0].codigo_estudio, 'EST-01');
  assert.equal(r.modo, 'compatibilidad');
});

test('rechaza contratos malformados sin inventar resultados', () => {
  assert.throws(() => normalizar({datos:[],total:'10',pagina:1,limite:20}, {pagina:1,limite:20}), /contrato/);
});
