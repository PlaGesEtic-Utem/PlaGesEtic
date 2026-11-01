'use strict';
/** D17: datos sensibles se entregan solo si INSERT de auditoría fue confirmado. */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');

process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_NAME = process.env.DB_NAME || 'plagesetic_test';
process.env.DB_USER = process.env.DB_USER || 'usuario_test';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'clave_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-solo-para-pruebas';

const auditoriaRepo = require('../src/repositories/auditoriaRepository');
const participacionesServicio = require('../src/services/participacionesService');
const identidadesServicio = require('../src/services/identidadesService');
const { auditoria, marcarAuditoria } = require('../src/middlewares/auditoria');
const participacionesController = require('../src/controllers/participacionesController');
const identidadesController = require('../src/controllers/identidadesController');
const { manejadorErrores } = require('../src/middlewares/manejadorErrores');

const ID_PART = '22222222-2222-4222-8222-222222222222';
const ID_EST = '33333333-3333-4333-8333-333333333333';
const ID_IDENTIDAD = '44444444-4444-4444-8444-444444444444';
const DATOS_CONTACTO = {
  codigo_seudonimo: 'P-ABC234', nombre: 'Persona Sensible',
  correo: 'dato-privado@example.test', telefono: '+56912345678',
};
const DATOS_IDENTIDAD = {
  id_identidad: ID_IDENTIDAD, ux_lab_id: 'UXL-ABCDEFGH',
  rut: '11111111-1', nombre: 'Persona Sensible',
  correo: 'dato-privado@example.test', telefono: '+56912345678',
  fecha_nacimiento: '1990-01-01',
};

let escrituras;
let rechazarAuditoria;
let servidor;
let base;

function reponerMocks() {
  escrituras = [];
  rechazarAuditoria = false;
  auditoriaRepo.registrar = async (fila) => {
    escrituras.push({ ...fila });
    if (rechazarAuditoria) throw new Error('BD auditoria inaccesible (simulado)');
  };
  participacionesServicio.validarMotivoContacto = () => ({ motivo: 'investigacion', detalle: '' });
  participacionesServicio.consultarContacto = async () => DATOS_CONTACTO;
  identidadesServicio.desenmascarar = async () => DATOS_IDENTIDAD;
}

async function pedir(ruta, body) {
  const r = await fetch(base + ruta, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const datos = await r.json();
  await new Promise((resolver) => setImmediate(resolver));
  return { status: r.status, headers: r.headers, datos };
}

describe('D17 - auditoría previa obligatoria', () => {
  before(async () => {
    reponerMocks();
    const app = express();
    app.use(express.json());
    app.use(auditoria);
    app.post('/participaciones/:idParticipacion/contacto',
      marcarAuditoria('contacto_participante', 'desenmascarar'),
      participacionesController.contacto);
    app.post('/identidades/:ux_lab_id/desenmascarar',
      marcarAuditoria('identidad', 'desenmascarar'),
      identidadesController.desenmascarar);
    app.use(manejadorErrores);
    servidor = app.listen(0, '127.0.0.1');
    await once(servidor, 'listening');
    base = `http://127.0.0.1:${servidor.address().port}`;
  });
  after(async () => {
    await new Promise((resolver) => servidor.close(resolver));
  });

  for (const tipo of ['contacto', 'desenmascarar']) {
    const contacto = tipo === 'contacto';
    const ruta = contacto
      ? `/participaciones/${ID_PART}/contacto`
      : '/identidades/UXL-ABCDEFGH/desenmascarar';
    const cuerpo = contacto
      ? { motivo: 'investigacion' }
      : { id_estudio: ID_EST, justificacion: 'Solicitud ética debidamente justificada' };

    it(`${tipo}: éxito requiere INSERT previo y no lo duplica`, async () => {
      reponerMocks();
      const respuesta = await pedir(ruta, cuerpo);
      assert.equal(respuesta.status, 200);
      assert.equal(respuesta.headers.get('cache-control'), 'no-store');
      assert.equal(respuesta.datos.nombre, 'Persona Sensible');
      assert.equal(escrituras.length, 1);
      assert.equal(escrituras[0].entidad, contacto ? 'contacto_participante' : 'identidad');
      assert.equal(escrituras[0].accion, 'desenmascarar');
      assert.equal(escrituras[0].resultado, 'exito');
      assert.equal(escrituras[0].id_registro_afectado, contacto ? ID_PART : ID_IDENTIDAD);
    });

    it(`${tipo}: caída de auditoría => 503 sin datos sensibles`, async () => {
      reponerMocks();
      rechazarAuditoria = true;
      const respuesta = await pedir(ruta, cuerpo);
      assert.equal(respuesta.status, 503);
      assert.equal(respuesta.headers.get('cache-control'), 'no-store');
      assert.equal(respuesta.datos.error.codigo, 'AUDITORIA_NO_DISPONIBLE');
      assert.equal(JSON.stringify(respuesta.datos).includes('Persona Sensible'), false);
      assert.equal(JSON.stringify(respuesta.datos).includes('dato-privado'), false);
      assert.equal(escrituras.length, 1, 'No se reintenta el INSERT al finalizar la respuesta');
    });
  }
});
