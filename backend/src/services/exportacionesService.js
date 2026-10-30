'use strict';
/**
 * Reglas de la exportación desidentificada (Actividad 60, ADR-002 D23 a D25).
 *  - Si la pide el Investigador responsable, queda aprobada y el paquete se genera de inmediato.
 *  - Si la pide otro (Estudiante), queda solicitada hasta que el responsable la apruebe o la rechace.
 *  - El paquete trae solo códigos E-, el estado del consentimiento y el mes de inscripción.
 *  - Se descarga durante 7 días y solo si nadie del paquete se retiró.
 */
const AdmZip = require('adm-zip');
const db = require('../config/db');
const repo = require('../repositories/exportacionesRepository');
const estudiosRepo = require('../repositories/estudiosRepository');
const almacenamiento = require('../utils/almacenamiento');
const { generarCodigo } = require('../utils/codigos');
const { ErrorApi, errores } = require('../utils/errores');

const PROPOSITOS = ['analisis', 'informe', 'publicacion'];
const conflicto = (codigo, mensaje) => new ErrorApi(409, codigo, mensaje);

/** Lo que se muestra de una exportación: nunca la ruta ni la huella del archivo. */
function vista(e) {
  return {
    id_exportacion: e.id_exportacion,
    codigo_exportacion: e.codigo_exportacion,
    proposito: e.proposito,
    estado: e.estado,
    fecha_solicitud: e.fecha_solicitud,
    fecha_aprobacion: e.fecha_aprobacion || null,
    fecha_generacion: e.fecha_generacion || null,
    fecha_vencimiento: e.fecha_vencimiento || null,
  };
}

/** Arma el .zip con participantes.csv y LEEME.txt (D23). */
function armarZip(codigoExportacion, proposito, filas) {
  const csv = ['codigo_en_exportacion,estado_consentimiento,mes_inscripcion']
    .concat(filas.map((f) => `${f.codigo},otorgado,${f.mes}`))
    .join('\n') + '\n';
  const leeme = [
    `Paquete ${codigoExportacion} · plaGesEtic (UX Lab UTEM)`,
    `Propósito: ${proposito}`,
    `Personas incluidas: ${filas.length}`,
    '',
    'participantes.csv trae una fila por persona con su código en este paquete (E-),',
    'el estado de su consentimiento y el mes de inscripción.',
    'No trae nombres, RUT, contacto, fechas exactas ni los códigos internos de la plataforma.',
    'Los códigos E- cambian en cada paquete.',
    'La desidentificación reduce el riesgo, pero no garantiza un anonimato total.',
  ].join('\n') + '\n';
  const zip = new AdmZip();
  zip.addFile('participantes.csv', Buffer.from(csv, 'utf8'));
  zip.addFile('LEEME.txt', Buffer.from(leeme, 'utf8'));
  return zip.toBuffer();
}

/** Genera el paquete de una exportación aprobada (D24), todo en una transacción. */
async function generarPaquete(exportacion) {
  let guardado = null;
  try {
    await db.transaccion(async (cliente) => {
      const elegibles = await repo.participacionesElegibles(cliente, exportacion.id_estudio);
      const usados = new Set();
      const filas = [];
      for (const p of elegibles) {
        let codigo;
        do { codigo = generarCodigo('E-', 6); } while (usados.has(codigo));
        usados.add(codigo);
        await repo.guardarCodigo(cliente, exportacion.id_exportacion, p.id_participacion, codigo);
        filas.push({ codigo, mes: p.mes_inscripcion });
      }
      const zip = armarZip(exportacion.codigo_exportacion, exportacion.proposito, filas);
      guardado = await almacenamiento.guardar('exportaciones', zip, 'zip');
      await repo.marcarLista(cliente, exportacion.id_exportacion, guardado.ruta, guardado.hash);
    });
  } catch (err) {
    if (guardado) await almacenamiento.eliminar(guardado.ruta).catch(() => {});
    throw err;
  }
}

/** POST /estudios/:idEstudio/exportaciones */
async function solicitar(idEstudio, cuerpo, usuario) {
  const proposito = typeof cuerpo.proposito === 'string' ? cuerpo.proposito.trim() : '';
  if (!PROPOSITOS.includes(proposito)) {
    throw errores.solicitudInvalida(`«proposito» debe ser ${PROPOSITOS.join(', ')}.`);
  }
  const filtros = cuerpo.filtros === undefined ? {} : cuerpo.filtros;
  if (!filtros || typeof filtros !== 'object' || Array.isArray(filtros) || Object.keys(filtros).length > 0) {
    throw errores.solicitudInvalida('Por ahora «filtros» debe ser un objeto vacío: {}.');
  }
  const estudio = await estudiosRepo.obtener(idEstudio);
  if (!estudio) throw errores.noEncontrado('El estudio no existe.');

  const esResponsable = estudio.id_responsable === usuario.id_usuario;
  const creada = await db.transaccion((cliente) => repo.crear(cliente, {
    id_estudio: idEstudio,
    codigo_exportacion: generarCodigo('X-', 6),
    proposito,
    filtros,
    estado: esResponsable ? 'aprobada' : 'solicitada',
    id_solicitante: usuario.id_usuario,
  }));
  if (esResponsable) await generarPaquete({ ...creada, id_estudio: idEstudio });
  return vista(await repo.buscarPorId(creada.id_exportacion));
}

/** PATCH /exportaciones/:idExportacion/aprobacion */
async function decidir(exportacion, cuerpo, usuario) {
  const decision = cuerpo.decision;
  if (decision !== 'aprobar' && decision !== 'rechazar') {
    throw errores.solicitudInvalida('«decision» debe ser aprobar o rechazar.');
  }
  const motivo = typeof cuerpo.motivo === 'string' ? cuerpo.motivo.trim() : '';
  if (motivo.length < 5) throw errores.solicitudInvalida('Escribe un «motivo» de al menos 5 caracteres.');
  if (exportacion.id_responsable !== usuario.id_usuario) {
    throw errores.sinPermiso('Solo el Investigador responsable del estudio decide las exportaciones.');
  }
  const estado = decision === 'aprobar' ? 'aprobada' : 'rechazada';
  const decidida = await db.transaccion((cliente) =>
    repo.decidir(cliente, exportacion.id_exportacion, estado, usuario.id_usuario));
  if (!decidida) throw conflicto('EXPORTACION_YA_DECIDIDA', 'Solo se puede decidir una exportación «solicitada».');
  if (estado === 'aprobada') await generarPaquete(exportacion);
  return { motivo, exportacion: vista(await repo.buscarPorId(exportacion.id_exportacion)) };
}

/** Solo el solicitante o el responsable del estudio ven y descargan una exportación. */
function revisarAcceso(exportacion, usuario) {
  const puede = exportacion.id_solicitante === usuario.id_usuario
    || exportacion.id_responsable === usuario.id_usuario;
  if (!puede) throw errores.sinPermiso();
}

/** GET /exportaciones/:idExportacion */
function consultar(exportacion, usuario) {
  revisarAcceso(exportacion, usuario);
  const vencida = exportacion.estado === 'lista' && new Date(exportacion.fecha_vencimiento) < new Date();
  return vista({ ...exportacion, estado: vencida ? 'vencida' : exportacion.estado });
}

/** GET /exportaciones/:idExportacion/descarga: revisa todo antes de entregar (D25). */
async function prepararDescarga(exportacion, usuario) {
  revisarAcceso(exportacion, usuario);
  if (exportacion.estado !== 'lista') {
    throw conflicto('EXPORTACION_NO_DISPONIBLE', `La exportación está «${exportacion.estado}»: no se puede descargar.`);
  }
  if (new Date(exportacion.fecha_vencimiento) < new Date()) {
    await repo.marcarVencida(exportacion.id_exportacion);
    throw conflicto('EXPORTACION_VENCIDA', 'La exportación venció. Pide una nueva.');
  }
  if (await repo.contarNoElegibles(exportacion.id_exportacion, exportacion.id_estudio) > 0) {
    throw conflicto('EXPORTACION_DESACTUALIZADA',
      'Alguien del paquete ya no puede ir en una exportación (por ejemplo, se retiró). Pide una nueva.');
  }
  return {
    ruta: almacenamiento.rutaAbsoluta(exportacion.ruta_paquete),
    nombre: `${exportacion.codigo_exportacion}.zip`,
  };
}

module.exports = { solicitar, decidir, consultar, prepararDescarga, armarZip };