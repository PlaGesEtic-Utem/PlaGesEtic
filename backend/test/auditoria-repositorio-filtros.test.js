
'use strict';

/**
 * Pruebas de los filtros SQL de auditoría.
 *
 * Simula PostgreSQL para verificar que:
 * - entidad se incorpore al WHERE.
 * - id_registro_afectado se incorpore al WHERE.
 * - ambos filtros funcionen combinados.
 * - las consultas utilicen parámetros SQL.
 *
 * No requiere una base de datos real.
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const UUID =
  '33333333-3333-4333-8333-333333333333';

const consultas = [];

const poolFalso = {
  async query(sql, parametros = []) {
    consultas.push({
      sql,
      parametros,
    });

    if (/COUNT\(\*\)/i.test(sql)) {
      return {
        rows: [{ total: 1 }],
      };
    }

    return {
      rows: [{
        entidad: 'contacto_participante',
        id_registro_afectado: UUID,
      }],
    };
  },
};

// Sustituir el pool ANTES de cargar el repositorio.
require('../src/db/pool').obtenerPool = () => poolFalso;

const {
  consultar,
} = require('../src/repositories/auditoriaRepository');

function filtros(extra = {}) {
  return {
    id_usuario: null,
    id_estudio: null,
    entidad: null,
    id_registro_afectado: null,
    accion: null,
    resultado: null,
    desde: null,
    hasta: null,
    limite: 50,
    desplazamiento: 0,
    ...extra,
  };
}

describe('Repositorio de auditoría - filtros SQL', () => {
  beforeEach(() => {
    consultas.length = 0;
  });

  it('filtra correctamente por entidad', async () => {
    await consultar(filtros({
      entidad: 'contacto_participante',
    }));

    assert.equal(consultas.length, 2);

    for (const consulta of consultas) {
      assert.match(
        consulta.sql,
        /entidad = \$1/
      );

      assert.equal(
        consulta.parametros[0],
        'contacto_participante'
      );
    }
  });

  it('filtra por id_registro_afectado', async () => {
    await consultar(filtros({
      id_registro_afectado: UUID,
    }));

    assert.equal(consultas.length, 2);

    for (const consulta of consultas) {
      assert.match(
        consulta.sql,
        /id_registro_afectado = \$1/
      );

      assert.equal(
        consulta.parametros[0],
        UUID
      );
    }
  });

  it('permite combinar ambos filtros', async () => {
    await consultar(filtros({
      entidad: 'contacto_participante',
      id_registro_afectado: UUID,
    }));

    for (const consulta of consultas) {
      assert.match(
        consulta.sql,
        /entidad = \$1/
      );

      assert.match(
        consulta.sql,
        /id_registro_afectado = \$2/
      );

      assert.deepEqual(
        consulta.parametros.slice(0, 2),
        ['contacto_participante', UUID]
      );
    }
  });

  it('no concatena valores del usuario al SQL', async () => {
    await consultar(filtros({
      entidad: 'contacto_participante',
    }));

    for (const consulta of consultas) {
      assert.equal(
        consulta.sql.includes('contacto_participante'),
        false
      );

      assert.ok(
        consulta.parametros.includes('contacto_participante')
      );
    }
  });

  it('conserva la paginación', async () => {
    const resultado = await consultar(filtros({
      entidad: 'identidad',
      limite: 25,
      desplazamiento: 10,
    }));

    assert.equal(resultado.total, 1);

    const consultaPagina = consultas.find(
      (consulta) => /LIMIT\s+\$\d+/i.test(consulta.sql)
    );

    assert.ok(consultaPagina);

    assert.deepEqual(
      consultaPagina.parametros.slice(-2),
      [25, 10]
    );
  });
});
