
'use strict';

/**
 * Reglas de negocio de consentimientos.
 *
 * Las decisiones se registran como eventos nuevos.
 * Nunca se modifica ni elimina un evento histórico.
 *
 * H-14:
 * Si un consentimiento otorgado corresponde a una versión
 * documental reemplazada, su estado efectivo pasa a
 * pendiente_reconsentir.
 *
 * H-15:
 * Un consentimiento retirado (revocado) no puede
 * reconsentirse ni reactivarse.
 */

const db = require('../config/db');
const repo = require('../repositories/consentimientosRepository');
const participacionesRepo = require('../repositories/participacionesRepository');
const almacenamiento = require('../utils/almacenamiento');
const { ErrorApi, errores } = require('../utils/errores');

const TIPOS = ['consentimiento', 'asentimiento'];
const EVENTOS = ['aceptar', 'negar'];
const EVENTOS_NUEVOS = ['negar', 'retirar', 'reconsentir'];

const ESTADO_DE_EVENTO = {
  aceptar: 'otorgado',
  negar: 'negado',
  retirar: 'revocado',
  reconsentir: 'otorgado',
};

const DESDE_ESTADO = {
  negar: ['otorgado'],
  retirar: ['otorgado'],
  reconsentir: ['negado', 'pendiente_reconsentir'],
};

const VERSION_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,19}$/;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SUBCARPETA = 'evidencias';

const conflicto = (codigo, mensaje) =>
  new ErrorApi(409, codigo, mensaje);

const texto = (valor) =>
  valor === undefined || valor === null
    ? ''
    : String(valor).trim();

/**
 * Obtiene el estado efectivo sin alterar el historial.
 *
 * Solo un consentimiento otorgado sobre un documento
 * reemplazado queda pendiente de reconsentimiento.
 *
 * Un retiro conserva siempre el estado revocado.
 */
function estadoEfectivo(ultimo) {
  if (!ultimo) return 'sin_registro';

  const estado = ESTADO_DE_EVENTO[ultimo.tipo_evento];

  if (
    estado === 'otorgado' &&
    ultimo.documento_vigente === false
  ) {
    return 'pendiente_reconsentir';
  }

  return estado;
}

/**
 * Detecta el tipo del archivo por su contenido.
 */
function extensionReal(buffer) {
  if (
    buffer.subarray(0, 5).toString('latin1') === '%PDF-'
  ) {
    return 'pdf';
  }

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([
        0x89, 0x50, 0x4e, 0x47,
        0x0d, 0x0a, 0x1a, 0x0a,
      ])
    )
  ) {
    return 'png';
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'jpg';
  }

  return null;
}

function validar(cuerpo, archivo) {
  const tipoEvento = texto(cuerpo.tipo_evento);

  if (!EVENTOS.includes(tipoEvento)) {
    throw errores.solicitudInvalida(
      `«tipo_evento» debe ser ${EVENTOS.join(' o ')}.`
    );
  }

  const tipo = texto(cuerpo.tipo) || 'consentimiento';

  if (!TIPOS.includes(tipo)) {
    throw errores.solicitudInvalida(
      `«tipo» debe ser ${TIPOS.join(' o ')}.`
    );
  }

  const version = texto(cuerpo.version);

  if (!VERSION_RE.test(version)) {
    throw errores.solicitudInvalida(
      '«version» es obligatoria: la del documento vigente (hasta 20 caracteres: letras, números, punto, guion).'
    );
  }

  const idRepresentacion =
    texto(cuerpo.id_representacion) || null;

  if (
    idRepresentacion &&
    !UUID_RE.test(idRepresentacion)
  ) {
    throw errores.solicitudInvalida(
      '«id_representacion» no es un identificador válido.'
    );
  }

  let extension = null;

  if (
    archivo &&
    archivo.buffer &&
    archivo.buffer.length > 0
  ) {
    extension = extensionReal(archivo.buffer);

    if (!extension) {
      throw errores.tipoNoPermitido(
        'La evidencia debe ser un PDF, JPEG o PNG válido.'
      );
    }
  } else if (tipoEvento === 'aceptar') {
    throw errores.solicitudInvalida(
      'Para aceptar se requiere la evidencia firmada en el campo «evidencia».'
    );
  }

  return {
    tipoEvento,
    tipo,
    version,
    idRepresentacion,
    extension,
  };
}

/**
 * POST /participaciones/:idParticipacion/consentimientos
 */
async function registrar(
  idParticipacion,
  usuario,
  cuerpo,
  archivo
) {
  const d = validar(cuerpo, archivo);

  const guardado = d.extension
    ? await almacenamiento.guardar(
        SUBCARPETA,
        archivo.buffer,
        d.extension
      )
    : null;

  try {
    return await db.transaccion(async (c) => {
      const p = await repo.participacionBloqueada(
        c,
        idParticipacion
      );

      if (!p) {
        throw errores.noEncontrado(
          'La participación no existe.'
        );
      }

      if (p.estado !== 'activo') {
        throw conflicto(
          'PARTICIPACION_RETIRADA',
          'La participación está retirada: no admite nuevos consentimientos.'
        );
      }

      if (
        d.tipo === 'asentimiento' &&
        !p.es_menor_al_enrolar
      ) {
        throw conflicto(
          'ASENTIMIENTO_SOLO_MENORES',
          'El asentimiento solo corresponde a participantes que eran menores al inscribirse.'
        );
      }

      if (
        p.es_menor_al_enrolar &&
        d.tipo === 'consentimiento'
      ) {
        if (!d.idRepresentacion) {
          throw errores.solicitudInvalida(
            'Para un menor, el consentimiento lo entrega su representante legal: falta «id_representacion».'
          );
        }

        const representacionValida =
          await participacionesRepo.representacionVigente(
            c,
            d.idRepresentacion,
            idParticipacion
          );

        if (!representacionValida) {
          throw conflicto(
            'REPRESENTACION_NO_VALIDA',
            'La representación no existe, no está vigente o no corresponde a esta persona.'
          );
        }
      } else if (d.idRepresentacion) {
        throw errores.solicitudInvalida(
          '«id_representacion» solo aplica al consentimiento de un menor.'
        );
      }

      const documento = await repo.documentoPorVersion(
        c,
        p.id_estudio,
        d.tipo,
        d.version
      );

      if (!documento) {
        throw errores.noEncontrado(
          'No existe un documento de ese tipo y versión en el estudio.'
        );
      }

      if (!documento.vigente) {
        throw conflicto(
          'DOCUMENTO_NO_VIGENTE',
          'Esa versión del documento ya no está vigente: usa la versión vigente del estudio.'
        );
      }

      const idConsentimiento =
        await repo.consentimientoBloqueado(
          c,
          idParticipacion,
          d.tipo
        );

      const ultimo = await repo.ultimoEvento(
        c,
        idConsentimiento
      );

      // H-15: tampoco permite reactivar por esta ruta
      // un consentimiento cuyo último evento fue retirar.
      if (
        ultimo &&
        ultimo.tipo_evento === 'retirar'
      ) {
        throw conflicto(
          'TRANSICION_INVALIDA',
          'Un consentimiento retirado no puede reactivarse.'
        );
      }

      if (
        ultimo &&
        ultimo.tipo_evento === d.tipoEvento &&
        ultimo.id_documento === documento.id_documento
      ) {
        throw conflicto(
          'SIN_CAMBIOS',
          'Esa misma decisión ya está registrada para este documento.'
        );
      }

      const evento = await repo.agregarEvento(c, {
        id_consentimiento: idConsentimiento,
        id_documento: documento.id_documento,
        id_representacion: d.idRepresentacion,
        tipo_evento: d.tipoEvento,
        evidencia_ruta: guardado
          ? guardado.ruta
          : null,
        evidencia_hash: guardado
          ? guardado.hash
          : null,
        id_usuario: usuario.id_usuario,
      });

      return {
        id_evento: evento.id_evento,
        id_consentimiento: evento.id_consentimiento,
        id_participacion: idParticipacion,
        tipo: d.tipo,
        tipo_evento: evento.tipo_evento,
        version: d.version,
        fecha: evento.fecha,
        evidencia_hash: evento.evidencia_hash,
        estado_vigente:
          ESTADO_DE_EVENTO[evento.tipo_evento],
      };
    });
  } catch (error) {
    if (guardado) {
      await almacenamiento.eliminar(
        guardado.ruta
      ).catch(() => {});
    }

    throw error;
  }
}

/**
 * GET /participaciones/:idParticipacion/consentimientos
 *
 * El estado se calcula desde el último evento
 * y la vigencia del documento correspondiente.
 */
async function listar(idParticipacion) {
  const p = await repo.participacion(
    idParticipacion
  );

  if (!p) {
    throw errores.noEncontrado(
      'La participación no existe.'
    );
  }

  const filas =
    await repo.eventosDeParticipacion(
      idParticipacion
    );

  const exigidos = p.es_menor_al_enrolar
    ? TIPOS
    : ['consentimiento'];

  const estadoVigente = exigidos.map((tipo) => {
    const ultimo = filas.find(
      (fila) => fila.tipo === tipo
    );

    if (!ultimo) {
      return {
        tipo,
        estado: 'sin_registro',
      };
    }

    return {
      tipo,
      estado: estadoEfectivo(ultimo),
      tipo_evento: ultimo.tipo_evento,
      version: ultimo.version,
      documento_vigente:
        ultimo.documento_vigente,
      fecha: ultimo.fecha,
    };
  });

  return {
    id_participacion: p.id_participacion,
    codigo_seudonimo: p.codigo_seudonimo,
    es_menor_al_enrolar:
      p.es_menor_al_enrolar,

    completo: estadoVigente.every(
      (elemento) =>
        elemento.estado === 'otorgado'
    ),

    estado_vigente: estadoVigente,

    historial: filas.map((fila) => ({
      id_evento: fila.id_evento,
      tipo: fila.tipo,
      tipo_evento: fila.tipo_evento,
      version: fila.version,
      fecha: fila.fecha,
      evidencia_hash: fila.evidencia_hash,
      id_representacion:
        fila.id_representacion,
      id_usuario: fila.id_usuario,
    })),
  };
}

function validarEvento(cuerpo, archivo) {
  const tipoEvento = texto(cuerpo.tipo_evento);

  if (!EVENTOS_NUEVOS.includes(tipoEvento)) {
    throw errores.solicitudInvalida(
      '«tipo_evento» debe ser negar, retirar o reconsentir.'
    );
  }

  let version = null;

  if (tipoEvento === 'reconsentir') {
    version = texto(cuerpo.version);

    if (!VERSION_RE.test(version)) {
      throw errores.solicitudInvalida(
        'Para reconsentir, «version» es obligatoria: la del documento vigente.'
      );
    }
  }

  const idRepresentacion =
    texto(cuerpo.id_representacion) || null;

  if (
    idRepresentacion &&
    !UUID_RE.test(idRepresentacion)
  ) {
    throw errores.solicitudInvalida(
      '«id_representacion» no es un identificador válido.'
    );
  }

  let extension = null;

  if (
    archivo &&
    archivo.buffer &&
    archivo.buffer.length > 0
  ) {
    extension = extensionReal(archivo.buffer);

    if (!extension) {
      throw errores.tipoNoPermitido(
        'La evidencia debe ser un PDF, JPEG o PNG válido.'
      );
    }
  } else if (tipoEvento === 'reconsentir') {
    throw errores.solicitudInvalida(
      'Para reconsentir se requiere la evidencia firmada en el campo «evidencia».'
    );
  }

  return {
    tipoEvento,
    version,
    idRepresentacion,
    extension,
  };
}

/**
 * POST /consentimientos/:idConsentimiento/eventos
 *
 * H-14: permite reconsentir desde pendiente_reconsentir.
 * H-15: prohíbe reconsentir desde revocado.
 */
async function registrarEvento(
  idConsentimiento,
  usuario,
  cuerpo,
  archivo
) {
  const d = validarEvento(cuerpo, archivo);

  const guardado = d.extension
    ? await almacenamiento.guardar(
        SUBCARPETA,
        archivo.buffer,
        d.extension
      )
    : null;

  try {
    return await db.transaccion(async (c) => {
      const cons =
        await repo.consentimientoConParticipacion(
          c,
          idConsentimiento
        );

      if (!cons) {
        throw errores.noEncontrado(
          'El consentimiento no existe.'
        );
      }

      // Mantener el orden de bloqueos original.
      const p =
        await repo.participacionBloqueadaParaActualizar(
          c,
          cons.id_participacion
        );

      if (!p) {
        throw errores.noEncontrado(
          'La participación no existe.'
        );
      }

      await repo.bloquearConsentimiento(
        c,
        idConsentimiento
      );

      if (
        d.tipoEvento !== 'retirar' &&
        (await participacionesRepo.estadoEstudio(
          c,
          p.id_estudio
        )) === 'cerrado'
      ) {
        throw conflicto(
          'ESTUDIO_CERRADO',
          'El estudio está cerrado: solo se admite el retiro del consentimiento.'
        );
      }

      const ultimo = await repo.ultimoEvento(
        c,
        idConsentimiento
      );

      if (!ultimo) {
        throw conflicto(
          'SIN_DECISION_PREVIA',
          'El consentimiento no tiene ninguna decisión registrada.'
        );
      }

      const estadoActual =
        estadoEfectivo(ultimo);

      if (
        p.estado !== 'activo' &&
        d.tipoEvento !== 'retirar'
      ) {
        throw conflicto(
          'TRANSICION_INVALIDA',
          'La participación retirada no admite nuevas decisiones de consentimiento.'
        );
      }

      if (
        !DESDE_ESTADO[d.tipoEvento].includes(
          estadoActual
        )
      ) {
        throw conflicto(
          'TRANSICION_INVALIDA',
          `No se puede registrar «${d.tipoEvento}» cuando el consentimiento está ${estadoActual}.`
        );
      }

      const exigeRepresentacion =
        p.es_menor_al_enrolar &&
        cons.tipo === 'consentimiento';

      if (exigeRepresentacion) {
        if (!d.idRepresentacion) {
          if (d.tipoEvento === 'reconsentir') {
            throw errores.solicitudInvalida(
              'Para un menor, el consentimiento lo entrega su representante legal: falta «id_representacion».'
            );
          }
        } else {
          const valida =
            await participacionesRepo.representacionVigente(
              c,
              d.idRepresentacion,
              p.id_participacion
            );

          if (!valida) {
            throw conflicto(
              'REPRESENTACION_NO_VALIDA',
              'La representación no existe, no está vigente o no corresponde a esta persona.'
            );
          }
        }
      } else if (d.idRepresentacion) {
        throw errores.solicitudInvalida(
          '«id_representacion» solo aplica al consentimiento de un menor.'
        );
      }

      let idDocumento = ultimo.id_documento;

      if (d.tipoEvento === 'reconsentir') {
        const documento =
          await repo.documentoPorVersion(
            c,
            p.id_estudio,
            cons.tipo,
            d.version
          );

        if (!documento) {
          throw errores.noEncontrado(
            'No existe un documento de ese tipo y versión en el estudio.'
          );
        }

        if (!documento.vigente) {
          throw conflicto(
            'DOCUMENTO_NO_VIGENTE',
            'Esa versión del documento ya no está vigente: usa la versión vigente del estudio.'
          );
        }

        idDocumento = documento.id_documento;
      }

      const evento = await repo.agregarEvento(
        c,
        {
          id_consentimiento: idConsentimiento,
          id_documento: idDocumento,
          id_representacion:
            d.idRepresentacion,
          tipo_evento: d.tipoEvento,
          evidencia_ruta: guardado
            ? guardado.ruta
            : null,
          evidencia_hash: guardado
            ? guardado.hash
            : null,
          id_usuario: usuario.id_usuario,
        }
      );

      if (d.tipoEvento === 'retirar') {
        await repo.marcarParticipacionRetirada(
          c,
          p.id_participacion
        );
      }

      return {
        id_evento: evento.id_evento,
        id_consentimiento:
          evento.id_consentimiento,
        id_participacion:
          p.id_participacion,
        tipo: cons.tipo,
        tipo_evento: evento.tipo_evento,
        fecha: evento.fecha,
        evidencia_hash: evento.evidencia_hash,
        estado_vigente:
          ESTADO_DE_EVENTO[evento.tipo_evento],
        participacion_estado:
          d.tipoEvento === 'retirar'
            ? 'retirado'
            : p.estado,
      };
    });
  } catch (error) {
    if (guardado) {
      await almacenamiento.eliminar(
        guardado.ruta
      ).catch(() => {});
    }

    throw error;
  }
}

module.exports = {
  registrar,
  listar,
  registrarEvento,
  TIPOS,
  EVENTOS,
};
