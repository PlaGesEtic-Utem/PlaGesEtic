'use strict';
/**
 * Reglas de negocio de estudios (Actividad 45, Catálogo v3 · Estudios y protocolos).
 *  - Un estudio nace en 'borrador'; el creador queda como responsable con los cinco permisos.
 *  - Solo se activa si tiene un protocolo aprobado por el CEC y vigente (si no → 409).
 *  - Un estudio cerrado no se edita (el control de acceso ya lo bloquea; aquí se repite por seguridad).
 */
const repo = require('../repositories/estudiosRepository');
const { ErrorApi, errores } = require('../utils/errores');

const ESTADOS = ['borrador', 'activo', 'cerrado'];
const EDITABLES = ['nombre', 'descripcion', 'fecha_inicio', 'fecha_fin', 'retencion_hasta'];
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

const conflicto = (codigo, mensaje) => new ErrorApi(409, codigo, mensaje);

/* ---------- Validación de entrada ---------- */
function texto(valor, campo, max, obligatorio) {
  if (valor === undefined || valor === null || valor === '') {
    if (obligatorio) throw errores.solicitudInvalida(`Falta el campo obligatorio «${campo}».`);
    return null;
  }
  if (typeof valor !== 'string') throw errores.solicitudInvalida(`«${campo}» debe ser texto.`);
  const v = valor.trim();
  if (obligatorio && !v) throw errores.solicitudInvalida(`Falta el campo obligatorio «${campo}».`);
  if (max && v.length > max) throw errores.solicitudInvalida(`«${campo}» admite como máximo ${max} caracteres.`);
  return v || null;
}

function fecha(valor, campo, obligatorio) {
  if (valor === undefined || valor === null || valor === '') {
    if (obligatorio) throw errores.solicitudInvalida(`Falta el campo obligatorio «${campo}».`);
    return null;
  }
  if (typeof valor !== 'string' || !FECHA_RE.test(valor) || Number.isNaN(Date.parse(valor))) {
    throw errores.solicitudInvalida(`«${campo}» debe ser una fecha con formato AAAA-MM-DD.`);
  }
  return valor;
}

function validarOrdenFechas({ fecha_inicio, fecha_fin, retencion_hasta }) {
  if (fecha_inicio && fecha_fin && fecha_fin < fecha_inicio) {
    throw errores.solicitudInvalida('«fecha_fin» no puede ser anterior a «fecha_inicio».');
  }
  const base = fecha_fin || fecha_inicio;
  if (base && retencion_hasta && retencion_hasta < base) {
    throw errores.solicitudInvalida('«retencion_hasta» no puede ser anterior al término del estudio.');
  }
}

/** Traduce errores de la base que el usuario puede corregir. */
function traducirErrorBD(err) {
  if (err && err.code === '23505') return conflicto('CODIGO_DUPLICADO', 'Ya existe un estudio con ese código.');
  return err;
}

/* ---------- Casos de uso ---------- */
async function crear(cuerpo, usuario) {
  const datos = {
    codigo_estudio: texto(cuerpo.codigo_estudio, 'codigo_estudio', 20, true),
    nombre: texto(cuerpo.nombre, 'nombre', 150, true),
    descripcion: texto(cuerpo.descripcion, 'descripcion', null, false),
    fecha_inicio: fecha(cuerpo.fecha_inicio, 'fecha_inicio', true),
    fecha_fin: fecha(cuerpo.fecha_fin, 'fecha_fin', false),
    retencion_hasta: fecha(cuerpo.retencion_hasta, 'retencion_hasta', false),
  };
  validarOrdenFechas(datos);
  try {
    return await repo.crearConMembresia(datos, usuario.id_usuario);
  } catch (err) { throw traducirErrorBD(err); }
}

async function listar(usuario, estadoFiltro) {
  let estado = null;
  if (estadoFiltro !== undefined && estadoFiltro !== '') {
    if (!ESTADOS.includes(estadoFiltro)) throw errores.solicitudInvalida('El filtro «estado» debe ser borrador, activo o cerrado.');
    estado = estadoFiltro;
  }
  const verTodos = await repo.rolVeTodosLosEstudios(usuario.nombre_rol);
  return verTodos ? repo.listarTodos(estado) : repo.listarPorMembresia(usuario.id_usuario, estado);
}

async function obtener(idEstudio) {
  const e = await repo.obtener(idEstudio);
  if (!e) throw errores.noEncontrado('El estudio no existe.');
  return e;
}

async function actualizar(idEstudio, cuerpo) {
  const actual = await obtener(idEstudio);
  if (actual.estado === 'cerrado') throw conflicto('ESTUDIO_CERRADO', 'El estudio está cerrado: no admite modificaciones.');

  const desconocidos = Object.keys(cuerpo || {}).filter((k) => !EDITABLES.includes(k));
  if (desconocidos.length) {
    throw errores.solicitudInvalida(`No se pueden modificar: ${desconocidos.join(', ')}. Campos editables: ${EDITABLES.join(', ')}.`);
  }
  const campos = {};
  if ('nombre' in cuerpo) campos.nombre = texto(cuerpo.nombre, 'nombre', 150, true);
  if ('descripcion' in cuerpo) campos.descripcion = texto(cuerpo.descripcion, 'descripcion', null, false);
  if ('fecha_inicio' in cuerpo) campos.fecha_inicio = fecha(cuerpo.fecha_inicio, 'fecha_inicio', true);
  if ('fecha_fin' in cuerpo) campos.fecha_fin = fecha(cuerpo.fecha_fin, 'fecha_fin', false);
  if ('retencion_hasta' in cuerpo) campos.retencion_hasta = fecha(cuerpo.retencion_hasta, 'retencion_hasta', false);
  if (!Object.keys(campos).length) throw errores.solicitudInvalida('No se envió ningún campo para modificar.');

  validarOrdenFechas({ ...actual, ...normalizarFechas(actual), ...campos });
  return repo.actualizar(idEstudio, campos);
}

async function activar(idEstudio) {
  const e = await obtener(idEstudio);
  if (e.estado === 'activo') throw conflicto('ESTUDIO_YA_ACTIVO', 'El estudio ya está activo.');
  if (e.estado === 'cerrado') throw conflicto('ESTUDIO_CERRADO', 'Un estudio cerrado no se puede volver a activar.');
  if (!(await repo.tieneProtocoloAprobadoVigente(idEstudio))) {
    throw conflicto('SIN_PROTOCOLO_APROBADO',
      'El estudio no tiene un protocolo aprobado por el Comité de Ética y vigente: no se puede activar.');
  }
  return repo.cambiarEstado(idEstudio, 'activo');
}

/** pg devuelve DATE como objeto Date; para comparar con las fechas del body se pasan a AAAA-MM-DD. */
function normalizarFechas(e) {
  const f = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d);
  return { fecha_inicio: f(e.fecha_inicio), fecha_fin: f(e.fecha_fin), retencion_hasta: f(e.retencion_hasta) };
}

module.exports = { crear, listar, obtener, actualizar, activar, ESTADOS, EDITABLES };
