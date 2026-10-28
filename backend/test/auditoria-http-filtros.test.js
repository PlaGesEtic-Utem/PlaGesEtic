
'use strict';

/**
 * Pruebas HTTP de GET /auditoria.
 *
 * Verifica:
 * - Autenticación y autorización.
 * - Filtros entidad e id_registro_afectado.
 * - Filtros combinados.
 * - Validaciones HTTP 400.
 * - Consultas SQL parametrizadas.
 *
 * No requiere PostgreSQL real.
 */

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { once } = require('node:events');

process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_NAME = process.env.DB_NAME || 'plagesetic_test';
process.env.DB_USER = process.env.DB_USER || 'usuario_test';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'clave_test';
process.env.JWT_SECRET = 'secreto-solo-para-pruebas';

const jwt = require('jsonwebtoken');

const DIRECTOR = '11111111-1111-4111-8111-111111111111';
const INVESTIGADOR = '22222222-2222-4222-8222-222222222222';
const REGISTRO = '33333333-3333-4333-8333-333333333333';

const sesiones = new Map();
const consultas = [];

const bdFalsa = {
  async query(sql, params = []) {
    const texto = sql.replace(/\s+/g, ' ').trim();

    consultas.push({
      sql: texto,
      params: [...params],
    });

    if (
      texto.startsWith('UPDATE security_schema.sesion_usuario') ||
      texto.includes('FROM security_schema.sesion_usuario')
    ) {
      const sesion = sesiones.get(params[0]);

      if (
        texto.startsWith('UPDATE') &&
        !texto.includes('RETURNING')
      ) {
        return {
          rows: [],
          rowCount: sesion ? 1 : 0,
        };
      }

      return {
        rows: sesion ? [{
          id_sesion: sesion.id_sesion,
          id_usuario: sesion.id_usuario,
          nombre_rol: sesion.nombre_rol,
          debe_cambiar_password: false,
        }] : [],
        rowCount: sesion ? 1 : 0,
      };
    }

    if (texto.includes('FROM security_schema.permiso')) {
      const [rol, recurso, accion] = params;

      if (
        rol === 'Director' &&
        recurso === 'auditoria' &&
        accion === 'leer'
      ) {
        return {
          rows: [{ alcance: 'global' }],
        };
      }

      return { rows: [] };
    }

    if (texto.startsWith('INSERT INTO security_schema.auditoria')) {
      return {
        rows: [],
        rowCount: 1,
      };
    }

    if (
      texto.includes('COUNT(*)') &&
      texto.includes('security_schema.auditoria')
    ) {
      return {
        rows: [{ total: 0 }],
      };
    }

    if (texto.includes('FROM security_schema.auditoria')) {
      return {
        rows: [],
      };
    }

    throw new Error(
      `Consulta SQL no simulada: ${texto.slice(0, 150)}`
    );
  },
};

// Instalar la BD simulada antes de cargar la aplicación.
require('../src/db/pool').obtenerPool = () => bdFalsa;

const { crearApp } = require('../src/app');

function crearToken(idUsuario, rol) {
  const token = jwt.sign(
    { sub: idUsuario },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const hash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  sesiones.set(hash, {
    id_sesion: crypto.randomUUID(),
    id_usuario: idUsuario,
    nombre_rol: rol,
  });

  return token;
}

async function iniciar() {
  const servidor = crearApp({
    pool: bdFalsa,
  }).listen(0, '127.0.0.1');

  await once(servidor, 'listening');

  return {
    base: `http://127.0.0.1:${servidor.address().port}`,
    cerrar: () => new Promise((resolver) => {
      servidor.closeAllConnections?.();
      servidor.close(resolver);
    }),
  };
}

async function consultar(servidor, ruta, token) {
  const respuesta = await fetch(
    servidor.base + ruta,
    {
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : {},
    }
  );

  return {
    status: respuesta.status,
    cuerpo: await respuesta.json(),
  };
}

function consultasAuditoria() {
  return consultas.filter(
    (consulta) =>
      consulta.sql.includes('FROM security_schema.auditoria')
  );
}

describe('GET /auditoria - filtros HTTP', () => {
  let servidor;
  let tokenDirector;
  let tokenInvestigador;

  before(async () => {
    servidor = await iniciar();
  });

  after(async () => {
    await servidor.cerrar();
  });

  beforeEach(() => {
    consultas.length = 0;
    sesiones.clear();

    tokenDirector = crearToken(
      DIRECTOR,
      'Director'
    );

    tokenInvestigador = crearToken(
      INVESTIGADOR,
      'Investigador'
    );
  });

  it('requiere autenticación', async () => {
    const respuesta = await consultar(
      servidor,
      '/auditoria?entidad=identidad'
    );

    assert.equal(respuesta.status, 401);
  });

  it('rechaza usuarios sin permiso', async () => {
    const respuesta = await consultar(
      servidor,
      '/auditoria?entidad=identidad',
      tokenInvestigador
    );

    assert.equal(respuesta.status, 403);
    assert.equal(consultasAuditoria().length, 0);
  });

  it('Director puede filtrar por entidad', async () => {
    const respuesta = await consultar(
      servidor,
      '/auditoria?entidad=contacto_participante',
      tokenDirector
    );

    assert.equal(respuesta.status, 200);
    assert.ok(Array.isArray(respuesta.cuerpo.datos));

    const consultasSQL = consultasAuditoria();

    assert.equal(consultasSQL.length, 2);

    for (const consulta of consultasSQL) {
      assert.match(
        consulta.sql,
        /entidad = \$1/
      );

      assert.equal(
        consulta.params[0],
        'contacto_participante'
      );
    }
  });

  it('Director puede filtrar por id_registro_afectado', async () => {
    const respuesta = await consultar(
      servidor,
      `/auditoria?id_registro_afectado=${REGISTRO}`,
      tokenDirector
    );

    assert.equal(respuesta.status, 200);

    for (const consulta of consultasAuditoria()) {
      assert.match(
        consulta.sql,
        /id_registro_afectado = \$1/
      );

      assert.equal(
        consulta.params[0],
        REGISTRO
      );
    }
  });

  it('permite combinar ambos filtros mediante HTTP', async () => {
    const respuesta = await consultar(
      servidor,
      `/auditoria?entidad=identidad&id_registro_afectado=${REGISTRO}`,
      tokenDirector
    );

    assert.equal(respuesta.status, 200);

    for (const consulta of consultasAuditoria()) {
      assert.match(
        consulta.sql,
        /entidad = \$1/
      );

      assert.match(
        consulta.sql,
        /id_registro_afectado = \$2/
      );

      assert.deepEqual(
        consulta.params.slice(0, 2),
        ['identidad', REGISTRO]
      );
    }
  });

  it('rechaza entidad con formato inválido', async () => {
    const respuesta = await consultar(
      servidor,
      '/auditoria?entidad=identidad%3BDELETE',
      tokenDirector
    );

    assert.equal(respuesta.status, 400);
    assert.equal(consultasAuditoria().length, 0);
  });

  it('rechaza id_registro_afectado inválido', async () => {
    const respuesta = await consultar(
      servidor,
      '/auditoria?id_registro_afectado=no-es-uuid',
      tokenDirector
    );

    assert.equal(respuesta.status, 400);
    assert.equal(consultasAuditoria().length, 0);
  });

  it('rechaza parámetros repetidos', async () => {
    const respuesta = await consultar(
      servidor,
      '/auditoria?entidad=identidad&entidad=estudio',
      tokenDirector
    );

    assert.equal(respuesta.status, 400);
    assert.equal(consultasAuditoria().length, 0);
  });

  it('conserva los valores de paginación', async () => {
    const respuesta = await consultar(
      servidor,
      '/auditoria?entidad=identidad&limite=25&desplazamiento=10',
      tokenDirector
    );

    assert.equal(respuesta.status, 200);

    assert.deepEqual(
      respuesta.cuerpo.paginacion,
      {
        total: 0,
        limite: 25,
        desplazamiento: 10,
      }
    );

    const consultaPagina = consultasAuditoria().find(
      (consulta) => /LIMIT\s+\$\d+/i.test(consulta.sql)
    );

    assert.ok(consultaPagina);

    assert.deepEqual(
      consultaPagina.params.slice(-2),
      [25, 10]
    );
  });
});
