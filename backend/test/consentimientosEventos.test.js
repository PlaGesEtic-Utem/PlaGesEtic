'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../src/config/db');
const repo = require('../src/repositories/consentimientosRepository');
const participacionesRepo = require('../src/repositories/participacionesRepository');
const almacenamiento = require('../src/utils/almacenamiento');
const servicio = require('../src/services/consentimientosService');

const ID_CONS = '11111111-1111-4111-8111-111111111111';
const ID_PART = '22222222-2222-4222-8222-222222222222';
const ID_EST = '33333333-3333-4333-8333-333333333333';
const ID_DOC_ANTERIOR = '44444444-4444-4444-8444-444444444444';
const ID_DOC_VIGENTE = '55555555-5555-4555-8555-555555555555';
const ID_REP = '66666666-6666-4666-8666-666666666666';
const USUARIO = { id_usuario: '77777777-7777-4777-8777-777777777777' };
const PDF = { buffer: Buffer.from('%PDF-1.4 evidencia de prueba') };

const ESTADO = { aceptar: 'otorgado', reconsentir: 'otorgado', negar: 'negado', retirar: 'revocado' };

/** Sustituye la base y los repositorios; devuelve lo que se fue registrando. */
function preparar({
  ultimo = { tipo_evento: 'aceptar', id_documento: ID_DOC_ANTERIOR },
  consentimiento = { id_consentimiento: ID_CONS, id_participacion: ID_PART, tipo: 'consentimiento' },
  participacion = { id_participacion: ID_PART, id_estudio: ID_EST, estado: 'activo', es_menor_al_enrolar: false },
  estudio = 'activo',
  documento = { id_documento: ID_DOC_VIGENTE, vigente: true },
  representacionVigente = true,
  falloAlRetirar = false,
} = {}) {
  const t = { confirmadas: 0, revertidas: 0, eventos: [], retiros: [], archivosBorrados: 0, clienteTx: { tx: 1 } };
  db.transaccion = async (trabajo) => {
    try { const r = await trabajo(t.clienteTx); t.confirmadas++; return r; }
    catch (e) { t.revertidas++; throw e; }
  };
  repo.consentimientoConParticipacion = async () => consentimiento;
  repo.participacionBloqueadaParaActualizar = async () => participacion;
  repo.bloquearConsentimiento = async () => {};
  repo.ultimoEvento = async () => ultimo;
  repo.documentoPorVersion = async () => documento;
  repo.agregarEvento = async (c, f) => {
    t.eventos.push({ c, ...f });
    return { id_evento: 'e1', id_consentimiento: f.id_consentimiento, tipo_evento: f.tipo_evento,
      fecha: new Date(), evidencia_hash: f.evidencia_hash };
  };
  repo.marcarParticipacionRetirada = async (c, id) => {
    if (falloAlRetirar) throw new Error('fallo simulado');
    t.retiros.push({ c, id });
  };
  participacionesRepo.estadoEstudio = async () => estudio;
  participacionesRepo.representacionVigente = async () => representacionVigente;
  almacenamiento.guardar = async () => ({ ruta: 'evidencias/x.pdf', hash: 'a'.repeat(64) });
  almacenamiento.eliminar = async () => { t.archivosBorrados++; };
  return t;
}

const cuerpoDe = (evento) => (evento === 'reconsentir' ? { tipo_evento: evento, version: 'v2' } : { tipo_evento: evento });
const evidenciaDe = (evento) => (evento === 'reconsentir' ? PDF : undefined);
const registrar = (evento, extra = {}, archivo = evidenciaDe(evento)) =>
  servicio.registrarEvento(ID_CONS, USUARIO, { ...cuerpoDe(evento), ...extra }, archivo);
const rechazaCon = (promesa, estado, codigo) =>
  assert.rejects(promesa, (e) => e.estado === estado && e.codigo === codigo);

test('retirar: registra el evento y pasa la participación a retirado en la MISMA transacción', async () => {
  const t = preparar();
  const r = await registrar('retirar');
  assert.equal(r.estado_vigente, 'revocado');
  assert.equal(r.participacion_estado, 'retirado');
  assert.equal(t.eventos.length, 1);
  assert.equal(t.retiros.length, 1);
  assert.equal(t.eventos[0].c, t.clienteTx);
  assert.equal(t.retiros[0].c, t.clienteTx);
  assert.equal(t.eventos[0].id_documento, ID_DOC_ANTERIOR);
  assert.equal(t.confirmadas, 1);
});

test('retirar: si falla el cambio de la participación, todo se revierte y se borra la evidencia', async () => {
  const t = preparar({ falloAlRetirar: true });
  await assert.rejects(() => registrar('retirar', {}, PDF), /fallo simulado/);
  assert.equal(t.revertidas, 1);
  assert.equal(t.confirmadas, 0);
  assert.equal(t.archivosBorrados, 1);
});

// [evento nuevo, último evento registrado]: estados vigentes desde los que SÍ se admite
for (const [evento, previo] of [
  ['retirar', 'aceptar'], ['retirar', 'reconsentir'],
  ['negar', 'aceptar'], ['negar', 'reconsentir'],
  ['reconsentir', 'negar'], ['reconsentir', 'retirar'],
]) {
  test(`${evento} desde «${previo}» se admite y deja el estado vigente «${ESTADO[evento]}»`, async () => {
    const t = preparar({ ultimo: { tipo_evento: previo, id_documento: ID_DOC_ANTERIOR } });
    const r = await registrar(evento);
    assert.equal(r.estado_vigente, ESTADO[evento]);
    assert.equal(t.eventos.length, 1);
    assert.equal(t.eventos[0].id_documento, evento === 'reconsentir' ? ID_DOC_VIGENTE : ID_DOC_ANTERIOR);
  });
}

// Eventos inválidos para el estado vigente → 409 y no se escribe nada
for (const [evento, previo] of [
  ['retirar', 'retirar'], ['retirar', 'negar'],
  ['negar', 'negar'], ['negar', 'retirar'],
  ['reconsentir', 'aceptar'], ['reconsentir', 'reconsentir'],
]) {
  test(`${evento} desde «${previo}» → 409 TRANSICION_INVALIDA`, async () => {
    const t = preparar({ ultimo: { tipo_evento: previo, id_documento: ID_DOC_ANTERIOR } });
    await rechazaCon(registrar(evento), 409, 'TRANSICION_INVALIDA');
    assert.equal(t.eventos.length, 0);
    assert.equal(t.retiros.length, 0);
    assert.equal(t.revertidas, 1);
  });
}

test('un tipo_evento que no es negar, retirar ni reconsentir → 400', async () => {
  preparar();
  await rechazaCon(servicio.registrarEvento(ID_CONS, USUARIO, { tipo_evento: 'aceptar' }), 400, 'SOLICITUD_INVALIDA');
  await rechazaCon(servicio.registrarEvento(ID_CONS, USUARIO, {}), 400, 'SOLICITUD_INVALIDA');
});

test('reconsentir sin evidencia, sin versión o con evidencia no válida', async () => {
  preparar({ ultimo: { tipo_evento: 'retirar', id_documento: ID_DOC_ANTERIOR } });
  await rechazaCon(registrar('reconsentir', {}, null), 400, 'SOLICITUD_INVALIDA');
  await rechazaCon(registrar('reconsentir', { version: '' }), 400, 'SOLICITUD_INVALIDA');
  await rechazaCon(registrar('reconsentir', {}, { buffer: Buffer.from('esto no es un PDF') }), 415, 'TIPO_NO_PERMITIDO');
});

test('reconsentir sobre un documento que ya no es el vigente → 409; que no existe → 404', async () => {
  preparar({ ultimo: { tipo_evento: 'retirar', id_documento: ID_DOC_ANTERIOR },
    documento: { id_documento: ID_DOC_ANTERIOR, vigente: false } });
  await rechazaCon(registrar('reconsentir'), 409, 'DOCUMENTO_NO_VIGENTE');
  preparar({ ultimo: { tipo_evento: 'retirar', id_documento: ID_DOC_ANTERIOR }, documento: null });
  await rechazaCon(registrar('reconsentir'), 404, 'NO_ENCONTRADO');
});

test('un consentimiento que no existe → 404', async () => {
  preparar({ consentimiento: null });
  await rechazaCon(registrar('retirar'), 404, 'NO_ENCONTRADO');
});

test('estudio cerrado: solo se admite el retiro', async () => {
  preparar({ estudio: 'cerrado' });
  await rechazaCon(registrar('negar'), 409, 'ESTUDIO_CERRADO');
  preparar({ estudio: 'cerrado', ultimo: { tipo_evento: 'retirar', id_documento: ID_DOC_ANTERIOR } });
  await rechazaCon(registrar('reconsentir'), 409, 'ESTUDIO_CERRADO');
  const t = preparar({ estudio: 'cerrado' });
  const r = await registrar('retirar');
  assert.equal(r.participacion_estado, 'retirado');
  assert.equal(t.eventos.length, 1);
});

test('menor de edad: el reconsentimiento exige un representante vigente', async () => {
  const menor = { id_participacion: ID_PART, id_estudio: ID_EST, estado: 'retirado', es_menor_al_enrolar: true };
  const ultimo = { tipo_evento: 'retirar', id_documento: ID_DOC_ANTERIOR };
  preparar({ participacion: menor, ultimo });
  await rechazaCon(registrar('reconsentir'), 400, 'SOLICITUD_INVALIDA');
  preparar({ participacion: menor, ultimo, representacionVigente: false });
  await rechazaCon(registrar('reconsentir', { id_representacion: ID_REP }), 409, 'REPRESENTACION_NO_VALIDA');
  const t = preparar({ participacion: menor, ultimo });
  await registrar('reconsentir', { id_representacion: ID_REP });
  assert.equal(t.eventos[0].id_representacion, ID_REP);
});

test('un adulto no admite id_representacion', async () => {
  preparar();
  await rechazaCon(registrar('retirar', { id_representacion: ID_REP }), 400, 'SOLICITUD_INVALIDA');
});