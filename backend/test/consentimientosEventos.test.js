
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

const USUARIO = {
  id_usuario: '77777777-7777-4777-8777-777777777777',
};

const PDF = {
  buffer: Buffer.from('%PDF-1.4 evidencia de prueba'),
};

const ESTADO = {
  aceptar: 'otorgado',
  reconsentir: 'otorgado',
  negar: 'negado',
  retirar: 'revocado',
};

/**
 * Simula las transacciones y los repositorios.
 */
function preparar({
  ultimo = {
    tipo_evento: 'aceptar',
    id_documento: ID_DOC_ANTERIOR,
    documento_vigente: true,
  },
  consentimiento = {
    id_consentimiento: ID_CONS,
    id_participacion: ID_PART,
    tipo: 'consentimiento',
  },
  participacion = {
    id_participacion: ID_PART,
    id_estudio: ID_EST,
    estado: 'activo',
    es_menor_al_enrolar: false,
  },
  estudio = 'activo',
  documento = {
    id_documento: ID_DOC_VIGENTE,
    vigente: true,
  },
  representacionVigente = true,
  falloAlRetirar = false,
} = {}) {
  const t = {
    confirmadas: 0,
    revertidas: 0,
    eventos: [],
    retiros: [],
    archivosBorrados: 0,
    clienteTx: { tx: 1 },
  };

  db.transaccion = async (trabajo) => {
    try {
      const resultado = await trabajo(t.clienteTx);
      t.confirmadas++;
      return resultado;
    } catch (error) {
      t.revertidas++;
      throw error;
    }
  };

  repo.consentimientoConParticipacion =
    async () => consentimiento;

  repo.participacionBloqueadaParaActualizar =
    async () => participacion;

  repo.bloquearConsentimiento = async () => {};

  repo.ultimoEvento = async () => ultimo;

  repo.documentoPorVersion = async () => documento;

  repo.agregarEvento = async (cliente, datos) => {
    t.eventos.push({ c: cliente, ...datos });

    return {
      id_evento: 'e1',
      id_consentimiento: datos.id_consentimiento,
      tipo_evento: datos.tipo_evento,
      fecha: new Date(),
      evidencia_hash: datos.evidencia_hash,
    };
  };

  repo.marcarParticipacionRetirada = async (cliente, id) => {
    if (falloAlRetirar) {
      throw new Error('fallo simulado');
    }

    t.retiros.push({ c: cliente, id });
  };

  participacionesRepo.estadoEstudio =
    async () => estudio;

  participacionesRepo.representacionVigente =
    async () => representacionVigente;

  almacenamiento.guardar = async () => ({
    ruta: 'evidencias/x.pdf',
    hash: 'a'.repeat(64),
  });

  almacenamiento.eliminar = async () => {
    t.archivosBorrados++;
  };

  return t;
}

const cuerpoDe = (evento) =>
  evento === 'reconsentir'
    ? { tipo_evento: evento, version: 'v2' }
    : { tipo_evento: evento };

const evidenciaDe = (evento) =>
  evento === 'reconsentir'
    ? PDF
    : undefined;

const registrar = (
  evento,
  extra = {},
  archivo = evidenciaDe(evento)
) =>
  servicio.registrarEvento(
    ID_CONS,
    USUARIO,
    { ...cuerpoDe(evento), ...extra },
    archivo
  );

const rechazaCon = (promesa, estado, codigo) =>
  assert.rejects(
    promesa,
    (error) =>
      error.estado === estado &&
      error.codigo === codigo
  );

test(
  'retirar: registra evento y participación retirada en una transacción',
  async () => {
    const t = preparar();

    const resultado = await registrar('retirar');

    assert.equal(resultado.estado_vigente, 'revocado');
    assert.equal(resultado.participacion_estado, 'retirado');
    assert.equal(t.eventos.length, 1);
    assert.equal(t.retiros.length, 1);
    assert.equal(t.eventos[0].c, t.clienteTx);
    assert.equal(t.retiros[0].c, t.clienteTx);
    assert.equal(
      t.eventos[0].id_documento,
      ID_DOC_ANTERIOR
    );
    assert.equal(t.confirmadas, 1);
  }
);

test(
  'retirar: si falla la participación se revierte la transacción',
  async () => {
    const t = preparar({ falloAlRetirar: true });

    await assert.rejects(
      () => registrar('retirar', {}, PDF),
      /fallo simulado/
    );

    assert.equal(t.revertidas, 1);
    assert.equal(t.confirmadas, 0);
    assert.equal(t.archivosBorrados, 1);
  }
);

/**
 * Transiciones permitidas.
 */
for (const [evento, previo] of [
  ['retirar', 'aceptar'],
  ['retirar', 'reconsentir'],
  ['negar', 'aceptar'],
  ['negar', 'reconsentir'],
  ['reconsentir', 'negar'],
]) {
  test(
    `${evento} desde «${previo}» se admite`,
    async () => {
      const t = preparar({
        ultimo: {
          tipo_evento: previo,
          id_documento: ID_DOC_ANTERIOR,
          documento_vigente: true,
        },
      });

      const resultado = await registrar(evento);

      assert.equal(
        resultado.estado_vigente,
        ESTADO[evento]
      );

      assert.equal(t.eventos.length, 1);

      assert.equal(
        t.eventos[0].id_documento,
        evento === 'reconsentir'
          ? ID_DOC_VIGENTE
          : ID_DOC_ANTERIOR
      );
    }
  );
}

/**
 * Transiciones prohibidas, incluyendo H-15.
 */
for (const [evento, previo] of [
  ['retirar', 'retirar'],
  ['retirar', 'negar'],
  ['negar', 'negar'],
  ['negar', 'retirar'],
  ['reconsentir', 'aceptar'],
  ['reconsentir', 'reconsentir'],
  ['reconsentir', 'retirar'],
]) {
  test(
    `${evento} desde «${previo}» responde 409`,
    async () => {
      const t = preparar({
        ultimo: {
          tipo_evento: previo,
          id_documento: ID_DOC_ANTERIOR,
          documento_vigente: true,
        },
      });

      await rechazaCon(
        registrar(evento),
        409,
        'TRANSICION_INVALIDA'
      );

      assert.equal(t.eventos.length, 0);
      assert.equal(t.retiros.length, 0);
      assert.equal(t.revertidas, 1);
    }
  );
}

test(
  'H-15: un consentimiento retirado no puede reconsentirse',
  async () => {
    const t = preparar({
      ultimo: {
        tipo_evento: 'retirar',
        id_documento: ID_DOC_ANTERIOR,
        documento_vigente: false,
      },
      participacion: {
        id_participacion: ID_PART,
        id_estudio: ID_EST,
        estado: 'retirado',
        es_menor_al_enrolar: false,
      },
    });

    await rechazaCon(
      registrar('reconsentir'),
      409,
      'TRANSICION_INVALIDA'
    );

    assert.equal(t.eventos.length, 0);
    assert.equal(t.retiros.length, 0);
    assert.equal(t.confirmadas, 0);
    assert.equal(t.revertidas, 1);
  }
);

test(
  'H-14: permite reconsentir sobre la nueva versión',
  async () => {
    const t = preparar({
      ultimo: {
        tipo_evento: 'aceptar',
        id_documento: ID_DOC_ANTERIOR,
        documento_vigente: false,
      },
    });

    const resultado = await registrar('reconsentir');

    assert.equal(resultado.estado_vigente, 'otorgado');
    assert.equal(t.eventos.length, 1);
    assert.equal(
      t.eventos[0].id_documento,
      ID_DOC_VIGENTE
    );
    assert.equal(t.confirmadas, 1);
  }
);

test(
  'H-14: nueva versión deja consentimiento pendiente',
  async () => {
    preparar();

    repo.participacion = async () => ({
      id_participacion: ID_PART,
      codigo_seudonimo: 'P-ABC234',
      es_menor_al_enrolar: false,
    });

    repo.eventosDeParticipacion = async () => [
      {
        id_evento: 'e1',
        tipo: 'consentimiento',
        tipo_evento: 'aceptar',
        version: 'v1',
        documento_vigente: false,
        fecha: new Date(),
        evidencia_hash: 'a'.repeat(64),
        id_representacion: null,
        id_usuario: USUARIO.id_usuario,
      },
    ];

    const resultado = await servicio.listar(ID_PART);

    assert.equal(resultado.completo, false);
    assert.equal(
      resultado.estado_vigente[0].estado,
      'pendiente_reconsentir'
    );
    assert.equal(
      resultado.estado_vigente[0].version,
      'v1'
    );
    assert.equal(
      resultado.estado_vigente[0].documento_vigente,
      false
    );
    assert.equal(
      resultado.historial[0].tipo_evento,
      'aceptar'
    );
  }
);

test(
  'H-14: un documento vigente conserva estado otorgado',
  async () => {
    preparar();

    repo.participacion = async () => ({
      id_participacion: ID_PART,
      codigo_seudonimo: 'P-ABC234',
      es_menor_al_enrolar: false,
    });

    repo.eventosDeParticipacion = async () => [
      {
        id_evento: 'e2',
        tipo: 'consentimiento',
        tipo_evento: 'reconsentir',
        version: 'v2',
        documento_vigente: true,
        fecha: new Date(),
      },
    ];

    const resultado = await servicio.listar(ID_PART);

    assert.equal(resultado.completo, true);
    assert.equal(
      resultado.estado_vigente[0].estado,
      'otorgado'
    );
  }
);

test(
  'H-15: un consentimiento revocado sigue revocado aunque cambie el documento',
  async () => {
    preparar();

    repo.participacion = async () => ({
      id_participacion: ID_PART,
      codigo_seudonimo: 'P-ABC234',
      es_menor_al_enrolar: false,
    });

    repo.eventosDeParticipacion = async () => [
      {
        id_evento: 'e3',
        tipo: 'consentimiento',
        tipo_evento: 'retirar',
        version: 'v1',
        documento_vigente: false,
        fecha: new Date(),
      },
    ];

    const resultado = await servicio.listar(ID_PART);

    assert.equal(resultado.completo, false);
    assert.equal(
      resultado.estado_vigente[0].estado,
      'revocado'
    );
  }
);

test(
  'tipo_evento inválido responde HTTP 400',
  async () => {
    preparar();

    await rechazaCon(
      servicio.registrarEvento(
        ID_CONS,
        USUARIO,
        { tipo_evento: 'aceptar' }
      ),
      400,
      'SOLICITUD_INVALIDA'
    );

    await rechazaCon(
      servicio.registrarEvento(
        ID_CONS,
        USUARIO,
        {}
      ),
      400,
      'SOLICITUD_INVALIDA'
    );
  }
);

test(
  'reconsentir requiere evidencia y versión válidas',
  async () => {
    preparar();

    await rechazaCon(
      registrar('reconsentir', {}, null),
      400,
      'SOLICITUD_INVALIDA'
    );

    await rechazaCon(
      registrar('reconsentir', { version: '' }),
      400,
      'SOLICITUD_INVALIDA'
    );

    await rechazaCon(
      registrar(
        'reconsentir',
        {},
        { buffer: Buffer.from('no es PDF') }
      ),
      415,
      'TIPO_NO_PERMITIDO'
    );
  }
);

test(
  'reconsentir con documento no vigente responde 409',
  async () => {
    preparar({
      ultimo: {
        tipo_evento: 'negar',
        id_documento: ID_DOC_ANTERIOR,
        documento_vigente: false,
      },
      documento: {
        id_documento: ID_DOC_ANTERIOR,
        vigente: false,
      },
    });

    await rechazaCon(
      registrar('reconsentir'),
      409,
      'DOCUMENTO_NO_VIGENTE'
    );
  }
);

test(
  'reconsentir con documento inexistente responde 404',
  async () => {
    preparar({
      ultimo: {
        tipo_evento: 'negar',
        id_documento: ID_DOC_ANTERIOR,
        documento_vigente: false,
      },
      documento: null,
    });

    await rechazaCon(
      registrar('reconsentir'),
      404,
      'NO_ENCONTRADO'
    );
  }
);

test(
  'consentimiento inexistente responde 404',
  async () => {
    preparar({ consentimiento: null });

    await rechazaCon(
      registrar('retirar'),
      404,
      'NO_ENCONTRADO'
    );
  }
);

test(
  'estudio cerrado: solo admite retiro',
  async () => {
    preparar({ estudio: 'cerrado' });

    await rechazaCon(
      registrar('negar'),
      409,
      'ESTUDIO_CERRADO'
    );

    preparar({
      estudio: 'cerrado',
      ultimo: {
        tipo_evento: 'negar',
        id_documento: ID_DOC_ANTERIOR,
        documento_vigente: false,
      },
    });

    await rechazaCon(
      registrar('reconsentir'),
      409,
      'ESTUDIO_CERRADO'
    );

    const t = preparar({ estudio: 'cerrado' });

    const resultado = await registrar('retirar');

    assert.equal(
      resultado.participacion_estado,
      'retirado'
    );
    assert.equal(t.eventos.length, 1);
  }
);

test(
  'menor: reconsentimiento exige representante vigente',
  async () => {
    const menor = {
      id_participacion: ID_PART,
      id_estudio: ID_EST,
      estado: 'activo',
      es_menor_al_enrolar: true,
    };

    const ultimo = {
      tipo_evento: 'negar',
      id_documento: ID_DOC_ANTERIOR,
      documento_vigente: true,
    };

    preparar({
      participacion: menor,
      ultimo,
    });

    await rechazaCon(
      registrar('reconsentir'),
      400,
      'SOLICITUD_INVALIDA'
    );

    preparar({
      participacion: menor,
      ultimo,
      representacionVigente: false,
    });

    await rechazaCon(
      registrar('reconsentir', {
        id_representacion: ID_REP,
      }),
      409,
      'REPRESENTACION_NO_VALIDA'
    );

    const t = preparar({
      participacion: menor,
      ultimo,
    });

    await registrar('reconsentir', {
      id_representacion: ID_REP,
    });

    assert.equal(
      t.eventos[0].id_representacion,
      ID_REP
    );
  }
);

test(
  'adulto no admite id_representacion',
  async () => {
    preparar();

    await rechazaCon(
      registrar('retirar', {
        id_representacion: ID_REP,
      }),
      400,
      'SOLICITUD_INVALIDA'
    );
  }
);
test('H-15: registrar() no reactiva un consentimiento cuyo último evento fue retirar', async () => {
  const t = preparar({
    ultimo: {
      tipo_evento: 'retirar',
      id_documento: ID_DOC_ANTERIOR,
      documento_vigente: false,
    },
  });

  // Simulamos las dependencias de la ruta de registro inicial.
  repo.participacionBloqueada = async () => ({
    id_participacion: ID_PART,
    id_estudio: ID_EST,
    estado: 'activo',
    es_menor_al_enrolar: false,
  });

  repo.consentimientoBloqueado = async () => ID_CONS;

  await rechazaCon(
    servicio.registrar(
      ID_PART,
      USUARIO,
      {
        tipo_evento: 'aceptar',
        tipo: 'consentimiento',
        version: 'v2',
      },
      PDF
    ),
    409,
    'TRANSICION_INVALIDA'
  );

  assert.equal(t.eventos.length, 0);
  assert.equal(t.confirmadas, 0);
  assert.equal(t.revertidas, 1);
});