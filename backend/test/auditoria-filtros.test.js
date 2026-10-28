
'use strict';

/**
 * Pruebas de filtros de auditoría:
 * entidad e id_registro_afectado.
 *
 * No requieren PostgreSQL real.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  validarFiltros,
} = require('../src/controllers/auditoriaController');



const UUID_VALIDO =
  '33333333-3333-4333-8333-333333333333';

describe('GET /auditoria - validación de filtros', () => {

  it('acepta entidad contacto_participante', () => {
    const filtros = validarFiltros({
      entidad: 'contacto_participante',
    });

    assert.equal(
      filtros.entidad,
      'contacto_participante'
    );
  });

  it('acepta un id_registro_afectado válido', () => {
    const filtros = validarFiltros({
      id_registro_afectado: UUID_VALIDO,
    });

    assert.equal(
      filtros.id_registro_afectado,
      UUID_VALIDO
    );
  });

  it('permite combinar entidad e identificador', () => {
    const filtros = validarFiltros({
      entidad: 'identidad',
      id_registro_afectado: UUID_VALIDO,
    });

    assert.equal(filtros.entidad, 'identidad');
    assert.equal(
      filtros.id_registro_afectado,
      UUID_VALIDO
    );
  });

  it('rechaza identificadores inválidos', () => {
    assert.throws(
      () => validarFiltros({
        id_registro_afectado: 'no-es-uuid',
      }),
      /UUID válido/
    );
  });

  it('rechaza entidades con caracteres no permitidos', () => {
    assert.throws(
      () => validarFiltros({
        entidad: 'identidad; DROP TABLE auditoria;',
      }),
      /entidad/
    );
  });

  it('rechaza filtros repetidos', () => {
    assert.throws(
      () => validarFiltros({
        entidad: ['identidad', 'estudio'],
      }),
      /una sola vez/
    );
  });

  it('rechaza entidad vacía', () => {
    assert.throws(
      () => validarFiltros({
        entidad: '  ',
      }),
      /no puede estar vacío/
    );
  });
});
