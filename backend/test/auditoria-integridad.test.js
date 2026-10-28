'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { verificarFilas } = require('../scripts/verificar-auditoria');
const {
  construirCsv,
  crearExportador,
  MAX_FILAS,
} = require('../src/controllers/auditoriaExportarController');

const cero = '0'.repeat(64);
const hashA = 'a'.repeat(64);
const hashB = 'b'.repeat(64);
const fila1 = { secuencia: '1', id_auditoria: 'fila-1', hash: hashA, hash_anterior: cero, hash_calculado: hashA };
const fila2 = { secuencia: '2', id_auditoria: 'fila-2', hash: hashB, hash_anterior: hashA, hash_calculado: hashB };

function crearRespuesta() {
  return {
    cabeceras: {}, cuerpo: undefined, statusCode: 200,
    set(nombre, valor) { this.cabeceras[nombre] = valor; return this; },
    status(codigo) { this.statusCode = codigo; return this; },
    send(cuerpo) { this.cuerpo = cuerpo; return this; },
  };
}

test('Act57: cadena íntegra pasa', () => {
  assert.equal(verificarFilas([fila1, fila2]).integra, true);
});

test('Act57: informa la primera fila cuyo contenido fue alterado', () => {
  const filas = [fila1, { ...fila2, hash_calculado: 'c'.repeat(64) }];
  assert.equal(verificarFilas(filas).primeraAlteracion.id_auditoria, 'fila-2');
});

test('Act57: informa la primera ruptura del enlace anterior', () => {
  const filas = [fila1, { ...fila2, hash_anterior: cero }];
  assert.equal(verificarFilas(filas).primeraAlteracion.secuencia, '2');
});

test('Act57: un salto de secuencia se advierte, pero no se confunde con alteración', () => {
  const filas = [fila1, { ...fila2, secuencia: '3' }];
  const resultado = verificarFilas(filas);
  assert.equal(resultado.integra, true);
  assert.equal(resultado.saltos.length, 1);
});

test('Act57: CSV escapa comillas, saltos de línea y fórmulas', () => {
  const csv = construirCsv([{
    entidad: 'auditoria', accion: 'leer',
    justificacion: '=HYPERLINK("malicioso")\ntexto',
  }]);
  assert.match(csv, /"'=HYPERLINK\(""malicioso""\)\ntexto"/);
  assert.match(csv, /^\uFEFFid_auditoria,/);
});

test('Act57: registra exportar antes de entregar el CSV', async () => {
  const orden = [];
  const handler = crearExportador({
    consultar: async (filtros) => {
      assert.equal(filtros.limite, MAX_FILAS + 1);
      orden.push('consulta');
      return { filas: [{ id_auditoria: 'abc', accion: 'leer' }], total: 1 };
    },
    registrar: async (req) => {
      assert.equal(req.auditoria.accion, 'exportar');
      orden.push('auditoria');
    },
  });
  const req = { query: {}, auditoria: { accion: 'exportar' } };
  const res = crearRespuesta();
  let error;
  await handler(req, res, (err) => { error = err; });
  assert.equal(error, undefined);
  assert.equal(res.statusCode, 200);
  assert.match(res.cabeceras['Content-Type'], /text\/csv/);
  assert.equal(res.cabeceras['Cache-Control'], 'no-store');
  assert.match(res.cuerpo, /"abc"/);
  assert.deepEqual(orden, ['consulta', 'auditoria']);
});

test('Act57: caída de auditoría impide enviar CSV', async () => {
  const handler = crearExportador({
    consultar: async () => ({ filas: [{ id_auditoria: 'secreto' }], total: 1 }),
    registrar: async () => { throw Object.assign(new Error('Auditoría caída'), { status: 503 }); },
  });
  const res = crearRespuesta();
  let error;
  await handler({ query: {} }, res, (err) => { error = err; });
  assert.match(error.message, /Auditoría caída/);
  assert.equal(res.cuerpo, undefined);
  assert.equal(res.cabeceras['Content-Type'], undefined);
});

test('Act57: exportación excesiva se rechaza sin entregar datos', async () => {
  const handler = crearExportador({
    consultar: async () => ({ filas: [], total: MAX_FILAS + 1 }),
    registrar: async () => assert.fail('no debe registrar éxito si no exporta'),
  });
  const res = crearRespuesta();
  let error;
  await handler({ query: {} }, res, (err) => { error = err; });
  assert.match(error.message, /supera 10000 registros/);
  assert.equal(res.cuerpo, undefined);
});
