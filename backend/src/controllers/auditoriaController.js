'use strict';
/**
 * GET /auditoria  (solo Director) — consulta de la bitácora, solo lectura.
 *
 * Filtros (query string, todos opcionales):
 *   id_usuario, id_estudio   UUID
 *   accion                   una de las 13 acciones del diccionario v3
 *   resultado                exito | error
 *   desde, hasta             YYYY-MM-DD (ambos inclusive)
 *   limite                   1 a 200 (por defecto 50)
 *   desplazamiento           0 o más (por defecto 0)
 * Respuesta: { datos: [ ...registros ], paginacion: { total, limite, desplazamiento } }
 */
const auditoriaRepository = require('../repositories/auditoriaRepository');
const { errores } = require('../utils/errores');

const ACCIONES = [
  'crear', 'leer', 'actualizar', 'eliminar', 'descargar', 'exportar', 'desenmascarar',
  'aprobar', 'rechazar', 'revocar', 'login_exitoso', 'login_fallido', 'cierre_sesion',
];
const RESULTADOS = ['exito', 'error'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const LIMITE_POR_DEFECTO = 50;
const LIMITE_MAXIMO = 200;

/** Devuelve el valor del filtro como texto, o null si no vino. Rechaza repetidos (?accion=a&accion=b). */
function texto(query, nombre) {
  const v = query[nombre];
  if (v === undefined || v === '') return null;
  if (typeof v !== 'string') throw errores.solicitudInvalida(`El filtro ${nombre} debe indicarse una sola vez.`);
  return v.trim();
}

function fechaValida(s) {
  if (!FECHA_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; // rechaza 2026-02-31
}

function entero(query, nombre, porDefecto, min, max) {
  const v = texto(query, nombre);
  if (v === null) return porDefecto;
  if (!/^\d+$/.test(v) || Number(v) < min || Number(v) > max) {
    throw errores.solicitudInvalida(`El parámetro ${nombre} debe ser un entero entre ${min} y ${max}.`);
  }
  return Number(v);
}

/** Valida y normaliza los filtros. Lanza errores.solicitudInvalida (400) si algo no corresponde. */
function validarFiltros(query = {}) {
  const f = {
    id_usuario: texto(query, 'id_usuario'),
    id_estudio: texto(query, 'id_estudio'),
    accion: texto(query, 'accion'),
    resultado: texto(query, 'resultado'),
    desde: texto(query, 'desde'),
    hasta: texto(query, 'hasta'),
    limite: entero(query, 'limite', LIMITE_POR_DEFECTO, 1, LIMITE_MAXIMO),
    desplazamiento: entero(query, 'desplazamiento', 0, 0, Number.MAX_SAFE_INTEGER),
  };

  if (f.id_usuario && !UUID_RE.test(f.id_usuario)) throw errores.solicitudInvalida('id_usuario no es un UUID válido.');
  if (f.id_estudio && !UUID_RE.test(f.id_estudio)) throw errores.solicitudInvalida('id_estudio no es un UUID válido.');
  if (f.accion && !ACCIONES.includes(f.accion)) {
    throw errores.solicitudInvalida(`accion no es válida. Valores permitidos: ${ACCIONES.join(', ')}.`);
  }
  if (f.resultado && !RESULTADOS.includes(f.resultado)) {
    throw errores.solicitudInvalida('resultado debe ser exito o error.');
  }
  if (f.desde && !fechaValida(f.desde)) throw errores.solicitudInvalida('desde debe tener el formato YYYY-MM-DD.');
  if (f.hasta && !fechaValida(f.hasta)) throw errores.solicitudInvalida('hasta debe tener el formato YYYY-MM-DD.');
  if (f.desde && f.hasta && f.desde > f.hasta) throw errores.solicitudInvalida('desde no puede ser posterior a hasta.');

  return f;
}

async function listar(req, res, next) {
  try {
    const filtros = validarFiltros(req.query);
    const { filas, total } = await auditoriaRepository.consultar(filtros);
    res.json({
      datos: filas,
      paginacion: { total, limite: filtros.limite, desplazamiento: filtros.desplazamiento },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, validarFiltros, ACCIONES };