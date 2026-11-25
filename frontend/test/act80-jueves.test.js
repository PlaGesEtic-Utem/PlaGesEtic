'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const ux = require('../act80-jueves');

test('cuenta activa hasta el final del dia de expiracion', () => {
  const hora = new Date(2026, 10, 19, 23, 58);
  assert.equal(ux.estadoCuenta({activo:true, fecha_expiracion:'2026-11-19'}, hora), 'Activa');
  assert.equal(ux.estadoCuenta({activo:true, fecha_expiracion:'2026-11-18'}, hora), 'Vencida');
  assert.equal(ux.estadoCuenta({activo:true, fecha_expiracion:null}, hora), 'Activa');
  assert.equal(ux.estadoCuenta({activo:false, fecha_expiracion:'2026-11-18'}, hora), 'Bloqueada');
});

test('secreto MFA desde URI oficial, no acepta URI extraña', () => {
  const uri = 'otpauth://totp/plaGesEtic:test%40uxlab.test?secret=JBSWY3DPEHPK3PXP&issuer=plaGesEtic';
  assert.equal(ux.secretoDesdeUri(uri), 'JBSWY3DPEHPK3PXP');
  assert.throws(() => ux.secretoDesdeUri('https://ejemplo.cl/?secret=JBSWY3DPEHPK3PXP'), /formato/i);
  assert.throws(() => ux.secretoDesdeUri('otpauth://totp/X?secret=NO-VALIDO'), /clave/i);
});

test('consulta de participantes envia pagina, limite, codigo y estado', () => {
  const p = new URLSearchParams(ux.consultaParticipantes({
    pagina: 2, limite: 20, q: ' P-AB23CD ', estado: 'activo'
  }));
  assert.equal(p.get('pagina'), '2');
  assert.equal(p.get('limite'), '20');
  assert.equal(p.get('q'), 'P-AB23CD');
  assert.equal(p.get('estado'), 'activo');
});

test('participantes: pagina del backend se respeta', () => {
  const fila = {codigo_seudonimo:'P-AB23CD',estado:'activo'};
  const r = ux.normalizarParticipantes({datos:[fila],total:41,pagina:2,limite:20}, {pagina:2,limite:20});
  assert.equal(r.datos[0], fila);
  assert.equal(r.total, 41);
  assert.equal(r.modo, 'servidor');
});

test('participantes: compatibilidad con API antigua sin inventar paginacion de servidor', () => {
  const lista = Array.from({length:42}, (_,i)=>({
    codigo_seudonimo:'P-'+String(i).padStart(6,'0'),
    estado:i%2===0?'activo':'retirado'
  }));
  const r = ux.normalizarParticipantes(lista, {pagina:2,limite:10, q:'P-',estado:'activo'});
  assert.equal(r.total,21);
  assert.equal(r.datos.length,10);
  assert.equal(r.modo,'compatibilidad');
  assert.equal(r.datos[0].estado,'activo');
  assert.throws(() => ux.normalizarParticipantes({datos:[],total:'1',pagina:1,limite:20},{pagina:1,limite:20}),/contrato/i);
});

test('integracion en C3, cuentas y enrolamiento MFA esta presente', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const flujo = fs.readFileSync(path.join(__dirname, '../flujo-real.js'), 'utf8');
  assert.match(flujo, /ACT80_JUEVES_HELPER/);
  assert.match(flujo, /act80PartBuscar/);
  assert.match(flujo, /consultaParticipantes\(act80Part\)/);
  assert.match(flujo, /estadoCuenta\(u\)/);
  assert.match(flujo, /id="act80-mfa-clave"/);
  assert.doesNotMatch(flujo, /UUID: <code>\$\{h\(u\.id_usuario\)\}<\/code>/);
});
