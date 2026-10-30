
'use strict';

/**
 * Actividad 56 - Prueba de privacidad D15.
 *
 * Persona canario:
 * Datos ficticios y únicos que permiten detectar
 * filtraciones accidentales en respuestas HTTP.
 *
 * Se prueba el middleware real filtroPrivacidad
 * mediante un servidor Express de prueba.
 *
 * No requiere PostgreSQL ni Docker.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');

const {
  filtroPrivacidad,
  permitirEnRespuesta,
  CAMPOS_PROHIBIDOS,
} = require('../src/middlewares/filtroPrivacidad');

/**
 * Identidad ficticia de prueba.
 *
 * No corresponde a ninguna persona real.
 */
const CANARIO = {
  nombre: 'CanarioPrivacidadUnico2026',
  correo: 'canario-unico-2026@example.test',
  telefono: '+56987654321',
  rut: '12345678-5',
  ux_lab_id: 'UXL-ABCDEFGH',
  fecha_nacimiento: '2000-01-01',
};

const CAMPOS_D15 = [
  'rut',
  'rut_cifrado',
  'rut_hash',
  'nombre_cifrado',
  'correo_cifrado',
  'correo_hash',
  'telefono_cifrado',
  'fecha_nacimiento',
  'id_identidad',
  'ux_lab_id',
  'id_participante',
  'id_vinculo',
  'evidencia_ruta',
  'documento_ruta',
  'ruta_archivo',
  'hash_password',
  'mfa_secret',
  'codigo_hash',
  'token_hash',
];

/**
 * Construye una identidad con campos protegidos.
 */
function identidadCanario() {
  return {
    ...CANARIO,
    id_identidad: '77777777-7777-4777-8777-777777777777',
    id_participante: '88888888-8888-4888-8888-888888888888',
    id_vinculo: '99999999-9999-4999-8999-999999999999',
    rut_cifrado: 'CIFRADO_CANARIO',
    rut_hash: 'HASH_RUT_CANARIO',
    nombre_cifrado: 'NOMBRE_CIFRADO_CANARIO',
    correo_cifrado: 'CORREO_CIFRADO_CANARIO',
    correo_hash: 'HASH_CORREO_CANARIO',
    telefono_cifrado: 'TELEFONO_CIFRADO_CANARIO',
    evidencia_ruta: '/privado/evidencia-canario.pdf',
    documento_ruta: '/privado/documento-canario.pdf',
    ruta_archivo: '/privado/archivo-canario.mp4',
    hash_password: 'HASH_PASSWORD_CANARIO',
    mfa_secret: 'MFA_SECRET_CANARIO',
    codigo_hash: 'CODIGO_HASH_CANARIO',
    token_hash: 'TOKEN_HASH_CANARIO',
  };
}

/**
 * Inspecciona todos los niveles del JSON.
 */
function recopilarClaves(valor, resultado = []) {
  if (Array.isArray(valor)) {
    for (const elemento of valor) {
      recopilarClaves(elemento, resultado);
    }
  } else if (valor && typeof valor === 'object') {
    for (const [clave, contenido] of Object.entries(valor)) {
      resultado.push(clave.toLowerCase());
      recopilarClaves(contenido, resultado);
    }
  }

  return resultado;
}

/**
 * Verifica que ningún campo D15 aparezca,
 * incluso en estructuras anidadas.
 */
function comprobarSinCamposProhibidos(cuerpo) {
  const claves = recopilarClaves(cuerpo);

  for (const campo of CAMPOS_D15) {
    assert.equal(
      claves.includes(campo),
      false,
      `Filtración detectada: campo ${campo}`
    );
  }
}

/**
 * Busca valores identificables de la persona canario
 * dentro de la respuesta completa.
 */
function comprobarSinCanario(cuerpo) {
  const respuesta = JSON.stringify(cuerpo);

  for (const [campo, valor] of Object.entries(CANARIO)) {
    assert.equal(
      respuesta.includes(valor),
      false,
      `Filtración de persona canario: ${campo}`
    );
  }
}

/**
 * Crea un servidor HTTP de prueba.
 *
 * Las rutas son escenarios de prueba que utilizan
 * el mismo middleware que PlaGesEtic.
 */
function crearAppPrueba() {
  const app = express();

  app.use(express.json());
  app.use(filtroPrivacidad);

  /**
   * Simula una respuesta con una identidad completa.
   * Ningún dato personal debería salir.
   */
  app.get('/prueba/identidad', (req, res) => {
    res.json({
      ok: true,
      identidad: identidadCanario(),
    });
  });

  /**
   * Simula respuestas con listas y objetos anidados.
   */
  app.get('/prueba/anidados', (req, res) => {
    res.json({
      estudio: 'EST-01',
      participantes: [
        {
          codigo_seudonimo: 'P-ABC234',
          identidad: identidadCanario(),
        },
        {
          codigo_seudonimo: 'P-XYZ789',
          datos: {
            nivel1: {
              nivel2: identidadCanario(),
            },
          },
        },
      ],
    });
  });

  /**
   * Simula una respuesta con campos de
   * autenticación y rutas privadas.
   */
  app.get('/prueba/seguridad', (req, res) => {
    res.json({
      usuario: {
        id_usuario: '11111111-1111-4111-8111-111111111111',
        hash_password: 'HASH_PASSWORD_CANARIO',
        mfa_secret: 'MFA_SECRET_CANARIO',
        token_hash: 'TOKEN_HASH_CANARIO',
        codigo_hash: 'CODIGO_HASH_CANARIO',
      },
      archivos: [
        {
          ruta_archivo: '/privado/archivo-canario.mp4',
          documento_ruta: '/privado/documento-canario.pdf',
          evidencia_ruta: '/privado/evidencia-canario.pdf',
        },
      ],
    });
  });

  /**
   * Una ruta que solo puede devolver el UX Lab ID.
   */
  app.get(
    '/prueba/excepcion-ux',
    permitirEnRespuesta('ux_lab_id'),
    (req, res) => {
      res.json({
        ux_lab_id: CANARIO.ux_lab_id,
        rut: CANARIO.rut,
        id_identidad: '77777777-7777-4777-8777-777777777777',
        hash_password: 'HASH_PASSWORD_CANARIO',
      });
    }
  );

  /**
   * Comprueba que las excepciones no se extiendan
   * automáticamente a los objetos anidados.
   */
  app.get(
    '/prueba/excepcion-anidada',
    permitirEnRespuesta('ux_lab_id'),
    (req, res) => {
      res.json({
        ux_lab_id: CANARIO.ux_lab_id,
        otra_identidad: {
          ux_lab_id: 'UXL-HGFEDCBA',
          rut: CANARIO.rut,
        },
      });
    }
  );

  /**
   * Verifica que un permiso de desenmascarar
   * no desactive globalmente el filtro D15.
   */
  app.get('/prueba/acceso-no-es-excepcion', (req, res) => {
    req.acceso = {
      desenmascarar: true,
    };

    res.json({
      identidad: identidadCanario(),
    });
  });

  /**
   * Caso de riesgo: identidad sin marcadores.
   *
   * Sirve para detectar si el filtro depende
   * exclusivamente de ux_lab_id o id_identidad.
   */
  app.get('/prueba/identidad-sin-marcadores', (req, res) => {
    res.json({
      identidad: {
        nombre: CANARIO.nombre,
        correo: CANARIO.correo,
        telefono: CANARIO.telefono,
      },
    });
  });

  return app;
}

async function iniciarServidor() {
  const servidor = crearAppPrueba().listen(
    0,
    '127.0.0.1'
  );

  await once(servidor, 'listening');

  return {
    url: `http://127.0.0.1:${servidor.address().port}`,
    cerrar: () => new Promise((resolver) => {
      servidor.closeAllConnections?.();
      servidor.close(resolver);
    }),
  };
}

async function consultar(servidor, ruta) {
  const respuesta = await fetch(
    servidor.url + ruta
  );

  assert.equal(
    respuesta.status,
    200,
    `Error HTTP al consultar ${ruta}`
  );

  return respuesta.json();
}

describe('D15 - Barrido de privacidad con persona canario', () => {
  let servidor;

  before(async () => {
    servidor = await iniciarServidor();
  });

  after(async () => {
    await servidor.cerrar();
  });

  it('la lista del filtro incluye todos los campos oficiales D15', () => {
    const declarados = new Set(
      CAMPOS_PROHIBIDOS.map((campo) => campo.toLowerCase())
    );

    for (const campo of CAMPOS_D15) {
      assert.ok(
        declarados.has(campo),
        `Falta el campo oficial D15: ${campo}`
      );
    }
  });

  it('no expone la identidad completa del canario', async () => {
    const cuerpo = await consultar(
      servidor,
      '/prueba/identidad'
    );

    comprobarSinCamposProhibidos(cuerpo);
    comprobarSinCanario(cuerpo);
    assert.equal(cuerpo.ok, true);
  });

  it('protege datos en listas y objetos anidados', async () => {
    const cuerpo = await consultar(
      servidor,
      '/prueba/anidados'
    );

    comprobarSinCamposProhibidos(cuerpo);
    comprobarSinCanario(cuerpo);

    assert.equal(cuerpo.estudio, 'EST-01');
    assert.equal(
      cuerpo.participantes[0].codigo_seudonimo,
      'P-ABC234'
    );
  });

  it('elimina secretos de autenticación y rutas privadas', async () => {
    const cuerpo = await consultar(
      servidor,
      '/prueba/seguridad'
    );

    comprobarSinCamposProhibidos(cuerpo);

    const texto = JSON.stringify(cuerpo);

    assert.equal(
      texto.includes('MFA_SECRET_CANARIO'),
      false
    );
    assert.equal(
      texto.includes('HASH_PASSWORD_CANARIO'),
      false
    );
  });

  it('permite solo el UX Lab ID declarado por la ruta', async () => {
    const cuerpo = await consultar(
      servidor,
      '/prueba/excepcion-ux'
    );

    assert.deepEqual(cuerpo, {
      ux_lab_id: CANARIO.ux_lab_id,
    });
  });

  it('una excepción no autoriza datos anidados', async () => {
    const cuerpo = await consultar(
      servidor,
      '/prueba/excepcion-anidada'
    );

    assert.equal(
      cuerpo.ux_lab_id,
      CANARIO.ux_lab_id
    );

    assert.deepEqual(
      cuerpo.otra_identidad,
      {}
    );
  });

  it('desenmascarar=true no desactiva el filtro', async () => {
    const cuerpo = await consultar(
      servidor,
      '/prueba/acceso-no-es-excepcion'
    );

    comprobarSinCamposProhibidos(cuerpo);
    comprobarSinCanario(cuerpo);
  });

  it('detecta una identidad sin marcadores explícitos', async () => {
    const cuerpo = await consultar(
      servidor,
      '/prueba/identidad-sin-marcadores'
    );

    comprobarSinCanario(cuerpo);
  });
});
