
'use strict';

/**
 * Pruebas HTTP de desenmascaramiento.
 *
 * Comprueban:
 * - Acceso del Director.
 * - Acceso del investigador responsable.
 * - Autorizaciones especiales.
 * - Aislamiento entre estudios.
 * - Restricciones de participación retirada.
 * - Respuestas y auditoría.
 *
 * No requieren PostgreSQL real.
 */

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { once } = require('node:events');

process.env.DB_HOST ||= 'localhost';
process.env.DB_NAME ||= 'plagesetic_test';
process.env.DB_USER ||= 'usuario_test';
process.env.DB_PASSWORD ||= 'clave_test';
process.env.JWT_SECRET = 'secreto-solo-para-pruebas';

const jwt = require('jsonwebtoken');

const DIRECTOR = '11111111-1111-4111-8111-111111111111';
const INVESTIGADOR = '22222222-2222-4222-8222-222222222222';
const ASISTENTE = '33333333-3333-4333-8333-333333333333';

const ESTUDIO_1 = '44444444-4444-4444-8444-444444444444';
const ESTUDIO_2 = '55555555-5555-4555-8555-555555555555';

const PARTICIPACION = '66666666-6666-4666-8666-666666666666';
const IDENTIDAD = '77777777-7777-4777-8777-777777777777';
const AUTORIZACION = '88888888-8888-4888-8888-888888888888';
const UX_LAB_ID = 'UXL-ABCDEFGH';

let estado;

function reiniciar() {
  estado = {
    sesiones: new Map(),
    auditorias: [],
    consultas: [],
    estudio: ESTUDIO_1,
    responsable: INVESTIGADOR,
    estadoParticipacion: 'activo',
    autorizacion: null,
    llamadasContacto: 0,
    llamadasIdentidad: 0,
  };
}

reiniciar();

const CAMPOS_AUDITORIA = [
  'id_usuario',
  'correo_intentado',
  'id_sesion',
  'ip',
  'entidad',
  'id_registro_afectado',
  'id_estudio',
  'accion',
  'resultado',
  'justificacion',
  'id_autorizacion',
  'fecha_hora',
];

/**
 * La simulación responde solamente a las consultas
 * necesarias para los dos endpoints.
 *
 * Una consulta desconocida falla explícitamente.
 */
const bdFalsa = {
  async query(sql, parametros = []) {
    const texto = sql.replace(/\s+/g, ' ').trim();
    estado.consultas.push({ texto, parametros });

    if (texto.includes('security_schema.sesion_usuario')) {
      const sesion = estado.sesiones.get(parametros[0]);

      if (texto.startsWith('UPDATE') && !texto.includes('RETURNING')) {
        return { rows: [], rowCount: sesion ? 1 : 0 };
      }

      return {
        rows: sesion && !sesion.cerrada ? [{
          id_sesion: sesion.id_sesion,
          id_usuario: sesion.id_usuario,
          nombre_rol: sesion.nombre_rol,
          debe_cambiar_password: false,
        }] : [],
      };
    }

    if (texto.includes('FROM security_schema.permiso')) {
      const [rol, recurso, accion] = parametros;
      return {
        rows: rol === 'Director' &&
          recurso === 'identidad' &&
          accion === 'leer'
          ? [{ alcance: 'global' }]
          : [],
      };
    }

    if (
      texto.includes('FROM research_schema.participacion') &&
      texto.includes('SELECT id_estudio')
    ) {
      return {
        rows: parametros[0] === PARTICIPACION
          ? [{ id_estudio: estado.estudio }]
          : [],
      };
    }

    if (
      texto.includes('FROM research_schema.estudio') &&
      texto.includes('id_responsable')
    ) {
      return {
        rows: parametros[0] === estado.estudio &&
          parametros[1] === estado.responsable
          ? [{ '?column?': 1 }]
          : [],
      };
    }

    if (
      texto.includes('identity_schema.vinculo_identidad') &&
      texto.includes('identity_schema.identidad')
    ) {
      const corresponde =
        texto.includes('p.id_participacion = $1')
          ? parametros[0] === PARTICIPACION &&
            parametros[1] === estado.estudio
          : parametros[0] === UX_LAB_ID &&
            parametros[1] === estado.estudio;

      return {
        rows: corresponde
          ? [{ id_identidad: IDENTIDAD }]
          : [],
      };
    }

    if (texto.includes('FROM security_schema.autorizacion')) {
      const autorizacion = estado.autorizacion;

      const coincide =
        autorizacion &&
        autorizacion.usuario === parametros[0] &&
        autorizacion.estudio === parametros[1] &&
        (
          autorizacion.identidad === null ||
          autorizacion.identidad === parametros[2]
        );

      const condicionesSQL =
        texto.includes("a.tipo = 'ver_identidad'") &&
        texto.includes("a.estado = 'aprobada'") &&
        texto.includes('a.fecha_resolucion IS NOT NULL') &&
        texto.includes('a.fecha_vencimiento > NOW()') &&
        texto.includes("r.nombre_rol = 'Director'");

      return {
        rows: coincide &&
          condicionesSQL &&
          autorizacion.aprobada &&
          autorizacion.resuelta &&
          autorizacion.vigente &&
          autorizacion.autorizadorDirector
          ? [{ id_autorizacion: AUTORIZACION }]
          : [],
      };
    }

    if (texto.startsWith('INSERT INTO security_schema.auditoria')) {
      estado.auditorias.push(
        Object.fromEntries(
          CAMPOS_AUDITORIA.map((campo, indice) => [
            campo,
            parametros[indice],
          ])
        )
      );

      return { rows: [], rowCount: 1 };
    }

    throw new Error(`Consulta no simulada: ${texto.slice(0, 180)}`);
  },
};

require('../src/db/pool').obtenerPool = () => bdFalsa;

/**
 * Se simulan las salidas del repositorio de
 * identidades, no los controles de acceso.
 *
 * Los middlewares y controladores son reales.
 */
const identidadesRepo = require('../src/repositories/identidadesRepository');

identidadesRepo.obtenerContactoPorParticipacion =
  async (idParticipacion, motivo) => {
    estado.llamadasContacto++;

    assert.equal(idParticipacion, PARTICIPACION);

    if (
      estado.estadoParticipacion === 'retirado' &&
      motivo !== 'retiro'
    ) {
      const { ErrorApi } = require('../src/utils/errores');

      throw new ErrorApi(
        409,
        'PARTICIPACION_RETIRADA',
        'Una participación retirada solo admite contacto por motivo retiro.'
      );
    }

    return {
      estado: estado.estadoParticipacion,
      nombre: 'Persona de prueba',
      correo: 'persona@example.test',
      telefono: '+56912345678',
    };
  };

identidadesRepo.obtenerDescifradaPorUxLabId = async (uxLabId) => {
  estado.llamadasIdentidad++;
  assert.equal(uxLabId, UX_LAB_ID);

  return {
    id_identidad: IDENTIDAD,
    nombre: 'Persona de prueba',
    correo: 'persona@example.test',
    telefono: '+56912345678',
    rut: '12345678-5',
    fecha_nacimiento: '2000-01-01',
    tipo: 'participante',
  };
};

const { crearApp } = require('../src/app');

function sesion(usuario, rol) {
  const token = jwt.sign(
    { sub: usuario },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const hash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  estado.sesiones.set(hash, {
    id_sesion: crypto.randomUUID(),
    id_usuario: usuario,
    nombre_rol: rol,
    cerrada: false,
  });

  return token;
}

function concederAutorizacion(usuario, cambios = {}) {
  estado.autorizacion = {
    usuario,
    estudio: ESTUDIO_1,
    identidad: IDENTIDAD,
    aprobada: true,
    resuelta: true,
    vigente: true,
    autorizadorDirector: true,
    ...cambios,
  };
}

async function iniciar() {
  const servidor = crearApp({ pool: bdFalsa })
    .listen(0, '127.0.0.1');

  await once(servidor, 'listening');

  return {
    url: `http://127.0.0.1:${servidor.address().port}`,
    cerrar: () => new Promise((resolver) => {
      servidor.closeAllConnections?.();
      servidor.close(resolver);
    }),
  };
}

async function solicitar(servidor, ruta, token, cuerpo) {
  const respuesta = await fetch(servidor.url + ruta, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(cuerpo),
  });

  return {
    estado: respuesta.status,
    cache: respuesta.headers.get('cache-control'),
    cuerpo: await respuesta.json(),
  };
}

async function esperarAuditoria() {
  for (let intento = 0; intento < 100; intento++) {
    if (estado.auditorias.length) {
      return estado.auditorias.at(-1);
    }

    await new Promise((resolver) => setTimeout(resolver, 10));
  }

  assert.fail('No se registró la auditoría');
}

const rutaContacto =
  `/participaciones/${PARTICIPACION}/contacto`;

const rutaIdentidad =
  `/identidades/${UX_LAB_ID}/desenmascarar`;

const cuerpoIdentidad = (estudio = ESTUDIO_1) => ({
  id_estudio: estudio,
  justificacion: 'Investigación autorizada',
});

describe('Desenmascaramiento HTTP', () => {
  let servidor;

  before(async () => {
    servidor = await iniciar();
  });

  after(async () => {
    await servidor.cerrar();
  });

  beforeEach(reiniciar);

  it('rechaza contacto sin autenticación', async () => {
    const respuesta = await solicitar(
      servidor,
      rutaContacto,
      null,
      { motivo: 'retiro' }
    );

    assert.equal(respuesta.estado, 401);
    assert.equal(estado.llamadasContacto, 0);
  });

  it('Director consulta contacto con respuesta mínima y auditoría', async () => {
    const token = sesion(DIRECTOR, 'Director');

    const respuesta = await solicitar(
      servidor,
      rutaContacto,
      token,
      { motivo: 'coordinar_sesion' }
    );

    assert.equal(respuesta.estado, 200);
    assert.equal(respuesta.cache, 'no-store');

    assert.deepEqual(respuesta.cuerpo, {
      nombre: 'Persona de prueba',
      correo: 'persona@example.test',
      telefono: '+56912345678',
    });

    const auditoria = await esperarAuditoria();

    assert.equal(auditoria.entidad, 'identidad');
    assert.equal(auditoria.accion, 'desenmascarar');
    assert.equal(auditoria.id_estudio, ESTUDIO_1);
    assert.equal(auditoria.id_registro_afectado, PARTICIPACION);
    assert.equal(auditoria.justificacion, 'coordinar_sesion');
    assert.equal(auditoria.resultado, 'exito');
  });

  it('investigador responsable puede consultar contacto', async () => {
    const token = sesion(INVESTIGADOR, 'Investigador');

    const respuesta = await solicitar(
      servidor,
      rutaContacto,
      token,
      { motivo: 'incidente' }
    );

    assert.equal(respuesta.estado, 200);
    assert.equal(estado.llamadasContacto, 1);
  });

  it('investigador no responsable recibe 403', async () => {
    estado.responsable = DIRECTOR;

    const token = sesion(INVESTIGADOR, 'Investigador');

    const respuesta = await solicitar(
      servidor,
      rutaContacto,
      token,
      { motivo: 'incidente' }
    );

    assert.equal(respuesta.estado, 403);
    assert.equal(estado.llamadasContacto, 0);
  });

  it('participación retirada rechaza motivos distintos de retiro', async () => {
    estado.estadoParticipacion = 'retirado';

    const token = sesion(DIRECTOR, 'Director');

    const respuesta = await solicitar(
      servidor,
      rutaContacto,
      token,
      { motivo: 'coordinar_sesion' }
    );

    assert.equal(respuesta.estado, 409);
    assert.equal(respuesta.cuerpo.error.codigo, 'PARTICIPACION_RETIRADA');
  });

  it('participación retirada admite contacto por retiro', async () => {
    estado.estadoParticipacion = 'retirado';

    const token = sesion(DIRECTOR, 'Director');

    const respuesta = await solicitar(
      servidor,
      rutaContacto,
      token,
      { motivo: 'retiro' }
    );

    assert.equal(respuesta.estado, 200);
  });

  it('motivo otro exige detalle', async () => {
    const token = sesion(DIRECTOR, 'Director');

    const respuesta = await solicitar(
      servidor,
      rutaContacto,
      token,
      { motivo: 'otro' }
    );

    assert.equal(respuesta.estado, 400);
    assert.equal(estado.llamadasContacto, 0);
  });

  it('Director desenmascara identidad asociada al estudio', async () => {
    const token = sesion(DIRECTOR, 'Director');

    const respuesta = await solicitar(
      servidor,
      rutaIdentidad,
      token,
      cuerpoIdentidad()
    );

    assert.equal(respuesta.estado, 200);
    assert.equal(respuesta.cache, 'no-store');
    assert.equal(respuesta.cuerpo.nombre, 'Persona de prueba');
    assert.equal(respuesta.cuerpo.rut, '12345678-5');
    assert.equal(
      Object.hasOwn(respuesta.cuerpo, 'id_identidad'),
      false
    );

    const auditoria = await esperarAuditoria();

    assert.equal(auditoria.accion, 'desenmascarar');
    assert.equal(auditoria.id_estudio, ESTUDIO_1);
    assert.equal(auditoria.id_registro_afectado, IDENTIDAD);
    assert.equal(auditoria.justificacion, 'Investigación autorizada');
  });

  it('investigador sin autorización no ve identidad completa', async () => {
    const token = sesion(INVESTIGADOR, 'Investigador');

    const respuesta = await solicitar(
      servidor,
      rutaIdentidad,
      token,
      cuerpoIdentidad()
    );

    assert.equal(respuesta.estado, 403);
    assert.equal(estado.llamadasIdentidad, 0);
  });

  it('autorización especial válida permite desenmascarar', async () => {
    concederAutorizacion(ASISTENTE);

    const token = sesion(ASISTENTE, 'Asistente');

    const respuesta = await solicitar(
      servidor,
      rutaIdentidad,
      token,
      cuerpoIdentidad()
    );

    assert.equal(respuesta.estado, 200);

    const auditoria = await esperarAuditoria();

    assert.equal(auditoria.id_autorizacion, AUTORIZACION);
  });

  it('autorización especial válida permite consultar contacto', async () => {
    concederAutorizacion(ASISTENTE);

    const token = sesion(ASISTENTE, 'Asistente');

    const respuesta = await solicitar(
      servidor,
      rutaContacto,
      token,
      { motivo: 'reconsentimiento' }
    );

    assert.equal(respuesta.estado, 200);
  });

  it('autorización vencida se rechaza', async () => {
    concederAutorizacion(ASISTENTE, { vigente: false });

    const token = sesion(ASISTENTE, 'Asistente');

    const respuesta = await solicitar(
      servidor,
      rutaIdentidad,
      token,
      cuerpoIdentidad()
    );

    assert.equal(respuesta.estado, 403);
    assert.equal(estado.llamadasIdentidad, 0);
  });

  it('autorización sin resolución se rechaza', async () => {
    concederAutorizacion(ASISTENTE, { resuelta: false });

    const token = sesion(ASISTENTE, 'Asistente');

    const respuesta = await solicitar(
      servidor,
      rutaIdentidad,
      token,
      cuerpoIdentidad()
    );

    assert.equal(respuesta.estado, 403);
  });

  it('autorización sin aprobación de Director se rechaza', async () => {
    concederAutorizacion(ASISTENTE, {
      autorizadorDirector: false,
    });

    const token = sesion(ASISTENTE, 'Asistente');

    const respuesta = await solicitar(
      servidor,
      rutaIdentidad,
      token,
      cuerpoIdentidad()
    );

    assert.equal(respuesta.estado, 403);
  });

  it('autorización de otra identidad se rechaza', async () => {
    concederAutorizacion(ASISTENTE, {
      identidad: crypto.randomUUID(),
    });

    const token = sesion(ASISTENTE, 'Asistente');

    const respuesta = await solicitar(
      servidor,
      rutaIdentidad,
      token,
      cuerpoIdentidad()
    );

    assert.equal(respuesta.estado, 403);
  });

  it('impide desenmascarar usando otro estudio', async () => {
    const token = sesion(DIRECTOR, 'Director');

    const respuesta = await solicitar(
      servidor,
      rutaIdentidad,
      token,
      cuerpoIdentidad(ESTUDIO_2)
    );

    assert.equal(respuesta.estado, 404);
    assert.equal(estado.llamadasIdentidad, 0);
  });
});
