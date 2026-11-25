'use strict';

/**
 * Actividad 75: vinculación entre consentimiento y datos.
 *
 * Pruebas sobre servicios reales con repositorios simulados.
 * No modifica PostgreSQL ni archivos de participantes.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const consentimientos = require('../src/services/consentimientosService');
const repoConsentimientos = require('../src/repositories/consentimientosRepository');

const exportaciones = require('../src/services/exportacionesService');
const repoExportaciones = require('../src/repositories/exportacionesRepository');

const ID_PART = '11111111-1111-4111-8111-111111111111';
const ID_USER = '22222222-2222-4222-8222-222222222222';
const ID_ESTUDIO = '33333333-3333-4333-8333-333333333333';
const ID_EXPORTACION = '44444444-4444-4444-8444-444444444444';

test(
  'Act75: nueva version deja pendiente hasta reconsentir',
  async (t) => {
    t.mock.method(
      repoConsentimientos,
      'participacion',
      async () => ({
        id_participacion: ID_PART,
        codigo_seudonimo: 'P-ABC234',
        es_menor_al_enrolar: false
      })
    );

    let eventos = [{
      id_evento: 'evento-1',
      tipo: 'consentimiento',
      tipo_evento: 'aceptar',
      version: 'v1',
      documento_vigente: false,
      fecha: new Date('2026-11-10T12:00:00Z'),
      evidencia_hash: 'a'.repeat(64),
      id_representacion: null,
      id_usuario: ID_USER
    }];

    t.mock.method(
      repoConsentimientos,
      'eventosDeParticipacion',
      async () => eventos
    );

    const pendiente = await consentimientos.listar(ID_PART);

    assert.equal(pendiente.completo, false);
    assert.equal(
      pendiente.estado_vigente[0].estado,
      'pendiente_reconsentir'
    );

    // Simular el nuevo evento que registra el servicio de
    // consentimiento cuando se acepta la version vigente.
    eventos = [{
      id_evento: 'evento-2',
      tipo: 'consentimiento',
      tipo_evento: 'reconsentir',
      version: 'v2',
      documento_vigente: true,
      fecha: new Date('2026-11-12T12:00:00Z'),
      evidencia_hash: 'b'.repeat(64),
      id_representacion: null,
      id_usuario: ID_USER
    }, ...eventos];

    const actualizado = await consentimientos.listar(ID_PART);

    assert.equal(
      actualizado.estado_vigente[0].estado,
      'otorgado'
    );
  }
);

test(
  'Act75: exportacion con participante retirado responde 409',
  async (t) => {
    let consultasElegibilidad = 0;

    t.mock.method(
      repoExportaciones,
      'contarNoElegibles',
      async (idExportacion, idEstudio) => {
        consultasElegibilidad += 1;
        assert.equal(idExportacion, ID_EXPORTACION);
        assert.equal(idEstudio, ID_ESTUDIO);

        // Una participacion del paquete ya no es elegible
        // despues de retirar su consentimiento.
        return 1;
      }
    );

    const exportacion = {
      id_exportacion: ID_EXPORTACION,
      id_estudio: ID_ESTUDIO,
      id_solicitante: ID_USER,
      id_responsable: ID_USER,
      codigo_exportacion: 'X-ABC234',
      estado: 'lista',
      fecha_vencimiento: '2999-12-31T23:59:59Z',
      ruta_paquete: 'exportaciones/prueba.zip'
    };

    const usuario = { id_usuario: ID_USER };

    await assert.rejects(
      () => exportaciones.prepararDescarga(
        exportacion,
        usuario
      ),
      (error) => {
        assert.equal(error.estado, 409);
        assert.equal(
          error.codigo,
          'EXPORTACION_DESACTUALIZADA'
        );
        return true;
      }
    );

    assert.equal(
      consultasElegibilidad,
      1,
      'Se debe revalidar la elegibilidad al descargar'
    );
  }
);

// Pendiente: identificar la ruta real que recibe nuevos
// datos de investigacion vinculados a una participacion.
// No reemplazar este caso por una ruta ficticia.
test.todo(
  'Act75: cargar datos despues de retiro debe responder 409'
);
