
'use strict';

/**
 * Filtro de privacidad de PlaGesEtic.
 *
 * ADR-002, decisión D15.
 *
 * Se instala antes de los controladores y filtra
 * las respuestas JSON antes de enviarlas al cliente.
 *
 * REGLAS:
 * - Los campos protegidos se eliminan por defecto.
 * - Se revisan objetos y arreglos anidados.
 * - Los datos de una identidad no se entregan
 *   por las rutas habituales.
 * - Las excepciones se declaran en cada ruta,
 *   mediante permitirEnRespuesta().
 * - Ningún permiso general desactiva el filtro.
 *
 * El filtrado no modifica el objeto original.
 */

const CAMPOS_PROHIBIDOS = [
  'rut',
  'rut_cifrado',
  'rut_hash',
  'nombre_cifrado',
  'correo_cifrado',
  'correo_hash',
  'telefono_cifrado',
  'fecha_nacimiento',
  'id_identidad',
  'ux_lab_id',
  'id_participante',
  'id_vinculo',
  'evidencia_ruta',
  'documento_ruta',
  'ruta_archivo',
  'hash_password',
  'mfa_secret',
  'codigo_hash',
  'token_hash',
];

/**
 * Nombre, correo y telefono son datos personales
 * cuando pertenecen a una identidad.
 *
 * No se eliminan indiscriminadamente porque otras
 * entidades, como usuarios o estudios, pueden
 * utilizar nombres de campos equivalentes.
 */
const CAMPOS_PII_EN_IDENTIDAD = [
  'nombre',
  'correo',
  'telefono',
];

/**
 * Campos que permiten identificar un objeto como
 * una identidad personal.
 */
const MARCADORES_IDENTIDAD = [
  'ux_lab_id',
  'id_identidad',
  'rut',
  'rut_cifrado',
  'nombre_cifrado',
  'fecha_nacimiento',
];

const PROHIBIDOS = new Set(
  CAMPOS_PROHIBIDOS.map((campo) => campo.toLowerCase())
);

const PII_EN_IDENTIDAD = new Set(
  CAMPOS_PII_EN_IDENTIDAD
);

/**
 * Crea una copia filtrada de un valor.
 *
 * La lista de excepciones se aplica únicamente
 * al primer nivel de la respuesta.
 *
 * Los campos anidados permanecen protegidos,
 * aunque tengan el mismo nombre.
 */
function limpiarPII(
  valor,
  vistos = new WeakSet(),
  permitidos = new Set(),
  profundidad = 0
) {
  if (valor === null || typeof valor !== 'object') {
    return valor;
  }

  if (typeof valor.toJSON === 'function') {
    valor = valor.toJSON();
  }

  if (valor === null || typeof valor !== 'object') {
    return valor;
  }

  if (vistos.has(valor)) {
    return undefined;
  }

  vistos.add(valor);

  try {
    if (Array.isArray(valor)) {
      return valor.map((elemento) =>
        limpiarPII(
          elemento,
          vistos,
          new Set(),
          profundidad + 1
        )
      );
    }

    const esIdentidad =
  MARCADORES_IDENTIDAD.some(
    (campo) =>
      Object.prototype.hasOwnProperty.call(valor, campo)
  ) ||
  (
    Object.prototype.hasOwnProperty.call(valor, 'nombre') &&
    Object.prototype.hasOwnProperty.call(valor, 'correo') &&
    Object.prototype.hasOwnProperty.call(valor, 'telefono')
  );

    const salida = {};

    for (const [clave, contenido] of Object.entries(valor)) {
      const nombreCampo = clave.toLowerCase();

      const permitido =
        profundidad === 0 &&
        permitidos.has(clave);

      if (
        PROHIBIDOS.has(nombreCampo) &&
        !permitido
      ) {
        continue;
      }

      if (
        esIdentidad &&
        PII_EN_IDENTIDAD.has(nombreCampo) &&
        !permitido
      ) {
        continue;
      }

      salida[clave] = limpiarPII(
        contenido,
        vistos,
        new Set(),
        profundidad + 1
      );
    }

    return salida;
  } finally {
    vistos.delete(valor);
  }
}

/**
 * Intercepta res.json() y filtra la respuesta.
 *
 * La autorización no desactiva el filtro.
 * Solo se respetan excepciones declaradas
 * explícitamente por la ruta.
 */
function filtroPrivacidad(req, res, next) {
  const jsonOriginal = res.json.bind(res);

  res.json = (cuerpo) => {
    const camposPermitidos = Array.isArray(
      req.camposPermitidos
    )
      ? req.camposPermitidos
      : [];

    const permitidos = new Set(camposPermitidos);

    const respuestaLimpia = limpiarPII(
      cuerpo,
      new WeakSet(),
      permitidos
    );

    return jsonOriginal(respuestaLimpia);
  };

  next();
}

/**
 * Declara excepciones puntuales por ruta.
 *
 * Ejemplos:
 *
 * permitirEnRespuesta('ux_lab_id')
 *
 * permitirEnRespuesta(
 *   'codigo_seudonimo',
 *   'nombre',
 *   'correo',
 *   'telefono'
 * )
 *
 * Las excepciones solo afectan campos
 * del primer nivel de la respuesta.
 */
function permitirEnRespuesta(...campos) {
  return (req, res, next) => {
    req.camposPermitidos = campos;
    next();
  };
}

module.exports = {
  filtroPrivacidad,
  permitirEnRespuesta,
  limpiarPII,
  CAMPOS_PROHIBIDOS,
};
