'use strict';

/**
 * Actividad 74: pruebas HTTP de controles de seguridad.
 * Usa datos simulados; no modifica PostgreSQL ni cuentas reales.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

process.env.DB_HOST ||= 'localhost';
process.env.DB_NAME ||= 'plagesetic_test';
process.env.DB_USER ||= 'usuario_test';
process.env.DB_PASSWORD ||= 'clave_test';
process.env.JWT_SECRET = 'act74-secreto-jwt-exclusivo-de-pruebas-arias';

const express = require('express');
const jwt = require('jsonwebtoken');
const totp = require('../src/utils/totp');
const {
  cabecerasSeguridad,
  cors
} = require('../src/middlewares/seguridad');
const {
  rutaNoEncontrada,
  manejadorErrores
} = require('../src/middlewares/manejadorErrores');

const repo = require('../src/repositories/authRepository');
const cifrado = require('../src/utils/cifrado');

const ID_USUARIO = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORIGEN_AUTORIZADO = 'http://localhost:8080';
const SECRETO_PRUEBA = totp.generarSecreto();

let activaciones = 0;

// Sustituir únicamente las consultas necesarias.
// Se hace antes de cargar el controlador.
const originales = {
  usuarioPorId: repo.usuarioPorId,
  contarFallosPorUsuario: repo.contarFallosPorUsuario,
  activarMFA: repo.activarMFA,
  descifrar: cifrado.descifrar
};

repo.usuarioPorId = async (id) => id === ID_USUARIO ? {
  id_usuario: ID_USUARIO,
  correo: 'usuario-act74@uxlab.test',
  activo: true,
  fecha_expiracion: null,
  mfa_activo: false,
  mfa_secret: 'SECRETO_CIFRADO_SIMULADO'
} : null;

repo.contarFallosPorUsuario = async () => 0;

repo.activarMFA = async () => {
  activaciones += 1;
};

cifrado.descifrar = (valor) => {
  assert.equal(valor, 'SECRETO_CIFRADO_SIMULADO');
  return SECRETO_PRUEBA;
};

const authController = require('../src/controllers/authController');

// Servidor HTTP local con los controladores reales.
const app = express();

app.disable('x-powered-by');
app.use(cabecerasSeguridad);
app.use(cors(ORIGEN_AUTORIZADO));
app.use(express.json());

app.get('/salud', (_req, res) => {
  res.json({ estado: 'ok' });
});

app.use((req, _res, next) => {
  req.auditoria = {};
  next();
});

// Sesión ficticia para probar exclusivamente la política.
app.post(
  '/auth/password',
  (req, _res, next) => {
    req.usuario = { id_usuario: ID_USUARIO };
    next();
  },
  authController.cambiarPassword
);

app.post(
  '/auth/mfa/confirmar',
  authController.confirmarMfa
);

app.use(rutaNoEncontrada);
app.use(manejadorErrores);

let servidor;
let base;

before(async () => {
  servidor = app.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
  if (servidor) {
    servidor.closeAllConnections?.();
    await new Promise((resolve, reject) => {
      servidor.close(err => err ? reject(err) : resolve());
    });
  }

  Object.assign(repo, {
    usuarioPorId: originales.usuarioPorId,
    contarFallosPorUsuario: originales.contarFallosPorUsuario,
    activarMFA: originales.activarMFA
  });

  cifrado.descifrar = originales.descifrar;
});

const post = (ruta, cuerpo) => fetch(base + ruta, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(cuerpo)
});

// PRUEBA 1: cabeceras HTTP.
test('Act74: cabeceras de seguridad en respuestas 200 y 404', async () => {
  for (const ruta of ['/salud', '/ruta-inexistente']) {
    const res = await fetch(base + ruta);

    assert.equal(res.status, ruta === '/salud' ? 200 : 404);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(res.headers.get('referrer-policy'), 'no-referrer');

    assert.match(
      res.headers.get('content-security-policy') || '',
      /default-src 'none'/
    );

    assert.equal(res.headers.has('x-powered-by'), false);
  }
});

// PRUEBA 2: CORS.
test('Act74: CORS autoriza solamente el origen configurado', async () => {
  const permitido = await fetch(base + '/salud', {
    headers: { Origin: ORIGEN_AUTORIZADO }
  });

  assert.equal(
    permitido.headers.get('access-control-allow-origin'),
    ORIGEN_AUTORIZADO
  );

  const denegado = await fetch(base + '/salud', {
    headers: {
      Origin: 'https://origen-no-autorizado.example'
    }
  });

  assert.equal(
    denegado.headers.has('access-control-allow-origin'),
    false
  );
});

// PRUEBA 3: contraseña corta.
test('Act74: contraseña de 8 caracteres responde HTTP 400', async () => {
  const res = await post('/auth/password', {
    password_actual: 'ClaveAnteriorDePrueba2026',
    password_nueva: 'Corta123'
  });

  assert.equal(res.status, 400);

  const data = await res.json();

  assert.match(
    data.error.mensaje,
    /al menos 12 caracteres/i
  );
});

// PRUEBA 4: MFA incorrecto.
test('Act74: MFA incorrecto no activa el segundo factor', async () => {
  const codigoMalo = [
    '000000',
    '111111',
    '222222',
    '333333'
  ].find(codigo => !totp.verificar(SECRETO_PRUEBA, codigo));

  assert.ok(codigoMalo);

  const pase = jwt.sign(
    {
      sub: ID_USUARIO,
      tipo: 'enrolar'
    },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '5m'
    }
  );

  const res = await post('/auth/mfa/confirmar', {
    token_temporal: pase,
    codigo: codigoMalo
  });

  assert.equal(res.status, 401);

  const data = await res.json();

  assert.equal(data.error.codigo, 'CODIGO_INVALIDO');

  assert.equal(
    activaciones,
    0,
    'Un código incorrecto no debe activar MFA'
  );

  const usuario = await repo.usuarioPorId(ID_USUARIO);

  assert.equal(usuario.mfa_activo, false);
  assert.equal(data.codigos_recuperacion, undefined);
});
