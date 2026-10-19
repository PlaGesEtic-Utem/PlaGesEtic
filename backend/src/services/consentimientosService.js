'use strict';
/**
 * Reglas de negocio de los consentimientos (Flujo de consentimientos v2).
 *  - Cada decisión es un EVENTO nuevo (aceptar o negar) sobre el documento exacto; nunca se edita uno anterior.
 *  - La versión enviada debe ser la VIGENTE de ese estudio y tipo.
 *  - Aceptar exige la evidencia firmada (PDF, JPEG o PNG, máximo 10 MB, con hash SHA-256); negar la admite opcional.
 *  - Menores: el «consentimiento» lo entrega su representante legal vigente (id_representacion); el «asentimiento»
 *    es del propio menor. Un mayor de edad no admite asentimiento ni representante.
 *  - No se registra sobre una participación retirada, ni se repite la misma decisión sobre el mismo documento.
 *  - Todo ocurre en UNA transacción; si algo falla, el archivo de evidencia guardado se borra.
 *  - Estado vigente de cada tipo = efecto del último evento: aceptar → otorgado, negar → negado.
 */
const db = require('../config/db');
const repo = require('../repositories/consentimientosRepository');
const participacionesRepo = require('../repositories/participacionesRepository');
const almacenamiento = require('../utils/almacenamiento');
const { ErrorApi, errores } = require('../utils/errores');

const TIPOS = ['consentimiento', 'asentimiento'];
const EVENTOS = ['aceptar', 'negar'];
const ESTADO_DE_EVENTO = { aceptar: 'otorgado', negar: 'negado', retirar: 'revocado', reconsentir: 'otorgado' };
const VERSION_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,19}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SUBCARPETA = 'evidencias';

const conflicto = (codigo, mensaje) => new ErrorApi(409, codigo, mensaje);
const texto = (v) => (v === undefined || v === null ? '' : String(v).trim());

/** Extensión según los bytes reales del archivo (no según lo que declara el cliente), o null si no es PDF/JPEG/PNG. */
function extensionReal(buffer) {
  if (buffer.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  return null;
}

function validar(cuerpo, archivo) {
  const tipoEvento = texto(cuerpo.tipo_evento);
  if (!EVENTOS.includes(tipoEvento)) throw errores.solicitudInvalida(`«tipo_evento» debe ser ${EVENTOS.join(' o ')}.`);

  const tipo = texto(cuerpo.tipo) || 'consentimiento';
  if (!TIPOS.includes(tipo)) throw errores.solicitudInvalida(`«tipo» debe ser ${TIPOS.join(' o ')}.`);

  const version = texto(cuerpo.version);
  if (!VERSION_RE.test(version)) {
    throw errores.solicitudInvalida('«version» es obligatoria: la del documento vigente (hasta 20 caracteres: letras, números, punto, guion).');
  }

  const idRepresentacion = texto(cuerpo.id_representacion) || null;
  if (idRepresentacion && !UUID_RE.test(idRepresentacion)) {
    throw errores.solicitudInvalida('«id_representacion» no es un identificador válido.');
  }

  let extension = null;
  if (archivo && archivo.buffer && archivo.buffer.length > 0) {
    extension = extensionReal(archivo.buffer);
    if (!extension) throw errores.tipoNoPermitido('La evidencia debe ser un PDF, JPEG o PNG válido.');
  } else if (tipoEvento === 'aceptar') {
    throw errores.solicitudInvalida('Para aceptar se requiere la evidencia firmada en el campo «evidencia».');
  }
  return { tipoEvento, tipo, version, idRepresentacion, extension };
}

/** POST /participaciones/:idParticipacion/consentimientos */
async function registrar(idParticipacion, usuario, cuerpo, archivo) {
  const d = validar(cuerpo, archivo);

  const guardado = d.extension ? await almacenamiento.guardar(SUBCARPETA, archivo.buffer, d.extension) : null;
  try {
    return await db.transaccion(async (c) => {
      const p = await repo.participacionBloqueada(c, idParticipacion);
      if (!p) throw errores.noEncontrado('La participación no existe.');
      if (p.estado !== 'activo') {
        throw conflicto('PARTICIPACION_RETIRADA', 'La participación está retirada: no admite nuevos consentimientos.');
      }

      if (d.tipo === 'asentimiento' && !p.es_menor_al_enrolar) {
        throw conflicto('ASENTIMIENTO_SOLO_MENORES', 'El asentimiento solo corresponde a participantes que eran menores al inscribirse.');
      }
      if (p.es_menor_al_enrolar && d.tipo === 'consentimiento') {
        if (!d.idRepresentacion) {
          throw errores.solicitudInvalida('Para un menor, el consentimiento lo entrega su representante legal: falta «id_representacion».');
        }
        if (!(await participacionesRepo.representacionVigente(c, d.idRepresentacion, idParticipacion))) {
          throw conflicto('REPRESENTACION_NO_VALIDA', 'La representación no existe, no está vigente o no corresponde a esta persona.');
        }
      } else if (d.idRepresentacion) {
        throw errores.solicitudInvalida('«id_representacion» solo aplica al consentimiento de un menor.');
      }

      const documento = await repo.documentoPorVersion(c, p.id_estudio, d.tipo, d.version);
      if (!documento) throw errores.noEncontrado('No existe un documento de ese tipo y versión en el estudio.');
      if (!documento.vigente) {
        throw conflicto('DOCUMENTO_NO_VIGENTE', 'Esa versión del documento ya no está vigente: usa la versión vigente del estudio.');
      }

      const idConsentimiento = await repo.consentimientoBloqueado(c, idParticipacion, d.tipo);
      const ultimo = await repo.ultimoEvento(c, idConsentimiento);
      if (ultimo && ultimo.tipo_evento === d.tipoEvento && ultimo.id_documento === documento.id_documento) {
        throw conflicto('SIN_CAMBIOS', 'Esa misma decisión ya está registrada para este documento.');
      }

      const evento = await repo.agregarEvento(c, {
        id_consentimiento: idConsentimiento,
        id_documento: documento.id_documento,
        id_representacion: d.idRepresentacion,
        tipo_evento: d.tipoEvento,
        evidencia_ruta: guardado ? guardado.ruta : null,
        evidencia_hash: guardado ? guardado.hash : null,
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
        estado_vigente: ESTADO_DE_EVENTO[evento.tipo_evento],
      };
    });
  } catch (err) {
    if (guardado) await almacenamiento.eliminar(guardado.ruta).catch(() => {});
    throw err;
  }
}

/**
 * GET /participaciones/:idParticipacion/consentimientos
 * estado_vigente: un elemento por tipo exigido (consentimiento; y asentimiento si era menor).
 * completo: todos los tipos exigidos están «otorgado». documento_vigente = false indica que lo otorgado
 * fue sobre una versión que ya fue reemplazada.
 */
async function listar(idParticipacion) {
  const p = await repo.participacion(idParticipacion);
  if (!p) throw errores.noEncontrado('La participación no existe.');

  const filas = await repo.eventosDeParticipacion(idParticipacion); // del más nuevo al más antiguo
  const exigidos = p.es_menor_al_enrolar ? TIPOS : ['consentimiento'];
  const estadoVigente = exigidos.map((tipo) => {
    const ultimo = filas.find((f) => f.tipo === tipo);
    if (!ultimo) return { tipo, estado: 'sin_registro' };
    return {
      tipo,
      estado: ESTADO_DE_EVENTO[ultimo.tipo_evento],
      tipo_evento: ultimo.tipo_evento,
      version: ultimo.version,
      documento_vigente: ultimo.documento_vigente,
      fecha: ultimo.fecha,
    };
  });

  return {
    id_participacion: p.id_participacion,
    codigo_seudonimo: p.codigo_seudonimo,
    es_menor_al_enrolar: p.es_menor_al_enrolar,
    completo: estadoVigente.every((e) => e.estado === 'otorgado'),
    estado_vigente: estadoVigente,
    historial: filas.map((f) => ({
      id_evento: f.id_evento,
      tipo: f.tipo,
      tipo_evento: f.tipo_evento,
      version: f.version,
      fecha: f.fecha,
      evidencia_hash: f.evidencia_hash,
      id_representacion: f.id_representacion,
      id_usuario: f.id_usuario,
    })),
  };
}

module.exports = { registrar, listar, TIPOS, EVENTOS };
