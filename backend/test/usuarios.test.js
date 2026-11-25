'use strict';
/** Reglas de administración de cuentas y membresías (Actividad 73). No necesitan base de datos. */
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-solo-para-pruebas';
const usuarios = require('../src/services/usuariosService');
const membresias = require('../src/services/membresiasService');

const codigo = (fn) => { try { fn(); } catch (e) { return `${e.estado} ${e.codigo}`; } return 'sin error'; };

test('Contraseña temporal: 14 caracteres, sin letras confundibles y distinta cada vez', () => {
  const vistas = new Set();
  for (let i = 0; i < 200; i++) {
    const p = usuarios.passwordTemporal();
    assert.equal(p.length, 14);
    assert.match(p, /^[A-HJ-NP-Za-km-z2-9]+$/);
    vistas.add(p);
  }
  assert.equal(vistas.size, 200);
});

test('Fecha de término: formato AAAA-MM-DD y posterior a hoy; null la quita', () => {
  const hoy = new Date('2026-11-09T12:00:00Z');
  assert.equal(usuarios.fechaExpiracion('2026-12-20', hoy), '2026-12-20');
  assert.equal(usuarios.fechaExpiracion(null, hoy), null);
  assert.equal(codigo(() => usuarios.fechaExpiracion('2026-11-09', hoy)), '400 SOLICITUD_INVALIDA');
  assert.equal(codigo(() => usuarios.fechaExpiracion('20/12/2026', hoy)), '400 SOLICITUD_INVALIDA');
});

test('Solo un Director administra cuentas de Director', () => {
  assert.equal(codigo(() => usuarios.revisarJerarquia({ nombre_rol: 'Soporte' }, 'Director')), '403 SIN_PERMISO');
  assert.equal(codigo(() => usuarios.revisarJerarquia({ nombre_rol: 'Director' }, 'Director')), 'sin error');
  assert.equal(codigo(() => usuarios.revisarJerarquia({ nombre_rol: 'Soporte' }, 'Investigador')), 'sin error');
});

test('Membresía: puede_consultar va siempre y los permisos deben ser true o false', () => {
  assert.deepEqual(membresias.permisos({}), {
    puede_consultar: true, puede_cargar: false, puede_modificar: false, puede_descargar: false, puede_exportar: false,
  });
  assert.equal(membresias.permisos({ puede_cargar: true }).puede_cargar, true);
  assert.equal(codigo(() => membresias.permisos({ puede_consultar: false })), '400 SOLICITUD_INVALIDA');
  assert.equal(codigo(() => membresias.permisos({ puede_cargar: 'si' })), '400 SOLICITUD_INVALIDA');
});

test('Membresía: fecha_fin opcional, no anterior a hoy', () => {
  const hoy = new Date('2026-11-09T12:00:00Z');
  assert.equal(membresias.fechaFin(undefined, hoy), null);
  assert.equal(membresias.fechaFin('2026-11-09', hoy), '2026-11-09');
  assert.equal(codigo(() => membresias.fechaFin('2026-11-08', hoy)), '400 SOLICITUD_INVALIDA');
});
