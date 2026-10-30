'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const a = require('../actividad58-eventos');

test('CP-57: retirar admite no adjuntar evidencia', () => assert.doesNotThrow(() => a.validarEvidenciaEvento('retirar', null)));
test('CP-58: reconsentir exige PDF/JPEG/PNG firmado', () => {
  assert.throws(() => a.validarEvidenciaEvento('reconsentir', null), /evidencia/);
  assert.doesNotThrow(() => a.validarEvidenciaEvento('reconsentir', { name: 'firma.pdf', size: 300, type: 'application/pdf' }));
});
test('CP-58: rechaza formatos y tamaños inválidos', () => {
  assert.throws(() => a.validarEvidenciaEvento('reconsentir', { name: 'e.exe', size: 10 }), /PDF/);
  assert.throws(() => a.validarEvidenciaEvento('retirar', { name: 'e.pdf', size: 11 * 1024 * 1024 }), /10 MB/);
});
test('CP-59: coordinar sesión genera motivo válido', () =>
  assert.deepEqual(a.validarMotivo('coordinar_sesion', 'ignorado'), { motivo: 'coordinar_sesion' }));
test('CP-59: motivo otro exige detalle', () => {
  assert.throws(() => a.validarMotivo('otro', '   '), /Describe/);
  assert.deepEqual(a.validarMotivo('otro', '  Gestión de agenda  '), { motivo: 'otro', detalle: 'Gestión de agenda' });
});
test('CP-59: respuesta contacto nunca incluye RUT ni fecha', () => {
  const r = a.soloContacto({ codigo_seudonimo:'P-AAAAAA', nombre:'Prueba', correo:'x@test.cl', telefono:'123', rut:'123', fecha_nacimiento:'2000', secreto:'extra' });
  assert.deepEqual(Object.keys(r), ['codigo_seudonimo','nombre','correo','telefono']);
});
test('CP-60: justificación obligatoria de 20 caracteres', () => {
  assert.throws(() => a.validarJustificacion('breve'), /20 caracteres/);
  assert.equal(a.validarJustificacion('  Verificación exigida por protocolo  '), 'Verificación exigida por protocolo');
});
test('CP-60: identidad muestra solo los seis campos autorizados', () => {
  const r = a.soloIdentidad({ux_lab_id:'UXL-ABCDEFGH',rut:'1-9',nombre:'Persona',correo:'x@test.cl',telefono:'1',fecha_nacimiento:'2000',id_identidad:'interno',password:'no'});
  assert.deepEqual(Object.keys(r), ['ux_lab_id','rut','nombre','correo','telefono','fecha_nacimiento']);
});
test('D22: errores 401, 403 y 503 en español', () => {
  assert.match(a.mensajeError({status:401}), /sesión/);
  assert.match(a.mensajeError({status:403}), /permiso/);
  assert.match(a.mensajeError({status:503}), /Auditoría/);
});
