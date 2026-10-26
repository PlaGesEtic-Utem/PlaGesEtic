
'use strict';

/**
 * GET /auditoria — consulta de bitácora (solo lectura).
 *
 * Filtros opcionales:
 *   id_usuario, id_estudio, id_registro_afectado: UUID
 *   entidad: identificador de entidad auditada
 *   accion: acción registrada
 *   resultado: exito | error
 *   desde, hasta: YYYY-MM-DD
 *   limite: 1 a 200
 *   desplazamiento: entero >= 0
 */

const auditoriaRepository = require('../repositories/auditoriaRepository');
const { errores } = require('../utils/errores');

const ACCIONES = [
  'crear',
  'leer',
  'actualizar',
  'eliminar',
  'descargar',
  'exportar',
  'desenmascarar',
  'aprobar',
  'rechazar',
  'revocar',
  'login_exitoso',
  'login_fallido',
  'cierre_sesion',
];

const RESULTADOS = ['exito', 'error'];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ENTIDAD_RE = /^[a-z][a-z0-9_]{0,63}$/;

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

const LIMITE_POR_DEFECTO = 50;
const LIMITE_MAXIMO = 200;

function texto(query, nombre) {
  const valor = query[nombre];

  if (valor === undefined) return null;

  if (typeof valor !== 'string') {
    throw errores.solicitudInvalida(
      `El filtro ${nombre} debe indicarse una sola vez.`
    );
  }

  const limpio = valor.trim();

  if (!limpio) {
    throw errores.solicitudInvalida(
      `El filtro ${nombre} no puede estar vacío.`
    );
  }

  return limpio;
}

function fechaValida(valor) {
  if (!FECHA_RE.test(valor)) return false;

  const fecha = new Date(`${valor}T00:00:00Z`);

  return (
    !Number.isNaN(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) === valor
  );
}

function entero(query, nombre, porDefecto, minimo, maximo) {
  const valor = texto(query, nombre);

  if (valor === null) return porDefecto;

  if (!/^\d+$/.test(valor)) {
    throw errores.solicitudInvalida(
      `El parámetro ${nombre} debe ser un entero entre ${minimo} y ${maximo}.`
    );
  }

  const numero = Number(valor);

  if (
    !Number.isSafeInteger(numero) ||
    numero < minimo ||
    numero > maximo
  ) {
    throw errores.solicitudInvalida(
      `El parámetro ${nombre} debe ser un entero entre ${minimo} y ${maximo}.`
    );
  }

  return numero;
}

function validarUuid(valor, nombre) {
  if (valor !== null && !UUID_RE.test(valor)) {
    throw errores.solicitudInvalida(
      `${nombre} no es un UUID válido.`
    );
  }
}

function validarFiltros(query = {}) {
  const filtros = {
    id_usuario: texto(query, 'id_usuario'),
    id_estudio: texto(query, 'id_estudio'),
    entidad: texto(query, 'entidad'),
    id_registro_afectado: texto(query, 'id_registro_afectado'),
    accion: texto(query, 'accion'),
    resultado: texto(query, 'resultado'),
    desde: texto(query, 'desde'),
    hasta: texto(query, 'hasta'),
    limite: entero(
      query,
      'limite',
      LIMITE_POR_DEFECTO,
      1,
      LIMITE_MAXIMO
    ),
    desplazamiento: entero(
      query,
      'desplazamiento',
      0,
      0,
      Number.MAX_SAFE_INTEGER
    ),
  };

  validarUuid(filtros.id_usuario, 'id_usuario');
  validarUuid(filtros.id_estudio, 'id_estudio');
  validarUuid(
    filtros.id_registro_afectado,
    'id_registro_afectado'
  );

  if (
    filtros.entidad !== null &&
    !ENTIDAD_RE.test(filtros.entidad)
  ) {
    throw errores.solicitudInvalida(
      'entidad debe contener entre 1 y 64 caracteres: letras minúsculas, números o guion bajo; debe comenzar con una letra.'
    );
  }

  if (
    filtros.accion !== null &&
    !ACCIONES.includes(filtros.accion)
  ) {
    throw errores.solicitudInvalida(
      `accion no es válida. Valores permitidos: ${ACCIONES.join(', ')}.`
    );
  }

  if (
    filtros.resultado !== null &&
    !RESULTADOS.includes(filtros.resultado)
  ) {
    throw errores.solicitudInvalida(
      'resultado debe ser exito o error.'
    );
  }

  if (
    filtros.desde !== null &&
    !fechaValida(filtros.desde)
  ) {
    throw errores.solicitudInvalida(
      'desde debe tener el formato YYYY-MM-DD.'
    );
  }

  if (
    filtros.hasta !== null &&
    !fechaValida(filtros.hasta)
  ) {
    throw errores.solicitudInvalida(
      'hasta debe tener el formato YYYY-MM-DD.'
    );
  }

  if (
    filtros.desde !== null &&
    filtros.hasta !== null &&
    filtros.desde > filtros.hasta
  ) {
    throw errores.solicitudInvalida(
      'desde no puede ser posterior a hasta.'
    );
  }

  return filtros;
}

async function listar(req, res, next) {
  try {
    const filtros = validarFiltros(req.query);

    const { filas, total } =
      await auditoriaRepository.consultar(filtros);

    return res.json({
      datos: filas,
      paginacion: {
        total,
        limite: filtros.limite,
        desplazamiento: filtros.desplazamiento,
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listar,
  validarFiltros,
  ACCIONES,
};
