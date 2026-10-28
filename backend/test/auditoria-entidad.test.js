'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const repositorio = require('../src/repositories/auditoriaRepository');
const {
  auditoria,
  marcarAuditoria,
  registrarAhora,
} = require('../src/middlewares/auditoria');

function solicitud() {
  return {
    method: 'POST',
    ip: '127.0.0.1',
    params: {},
    body: {},
  };
}

function respuesta(codigo = 200) {
  const res = new EventEmitter();
  res.statusCode = codigo;
  return res;
}

function terminar(res) {
  res.emit('finish');
  return new Promise((resolve) => setImmediate(resolve));
}

test('401: registra entidad sistema cuando la ruta no llegó a ejecutarse', async (t) => {
  const registros = [];

  t.mock.method(repositorio, 'registrar', async (fila) => {
    registros.push({ ...fila });
  });

  const req = solicitud();
  const res = respuesta(401);

  auditoria(req, res, () => {});
  await terminar(res);

  assert.equal(registros.length, 1);
  assert.equal(registros[0].entidad, 'sistema');
  assert.equal(registros[0].resultado, 'error');
});

test('conserva la entidad específica declarada por la ruta', async (t) => {
  const registros = [];

  t.mock.method(repositorio, 'registrar', async (fila) => {
    registros.push({ ...fila });
  });

  const req = solicitud();
  const res = respuesta(200);

  auditoria(req, res, () => {});
  marcarAuditoria('identidad', 'leer')(req, res, () => {});

  await terminar(res);

  assert.equal(registros.length, 1);
  assert.equal(registros[0].entidad, 'identidad');
});

test('entidades vacías reciben un valor de respaldo', async (t) => {
  const registros = [];

  t.mock.method(repositorio, 'registrar', async (fila) => {
    registros.push({ ...fila });
  });

  const req = solicitud();
  const res = respuesta(400);

  auditoria(req, res, () => {});
  req.auditoria.entidad = '   ';

  await terminar(res);

  assert.equal(registros.length, 1);
  assert.equal(registros[0].entidad, 'sistema');
});

test('D17 mantiene la auditoría previa sin duplicar registros', async (t) => {
  const registros = [];

  t.mock.method(repositorio, 'registrar', async (fila) => {
    registros.push({ ...fila });
  });

  const req = solicitud();
  const res = respuesta(200);

  auditoria(req, res, () => {});
  marcarAuditoria('identidad', 'desenmascarar')(req, res, () => {});

  await registrarAhora(req);
  await terminar(res);

  assert.equal(registros.length, 1);
  assert.equal(registros[0].entidad, 'identidad');
  assert.equal(registros[0].accion, 'desenmascarar');
});
