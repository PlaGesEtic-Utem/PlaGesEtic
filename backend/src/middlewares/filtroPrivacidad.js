'use strict';
/**
 * Se monta ANTES de los controladores, pero actúa sobre la SALIDA:
 * envuelve res.json() para limpiar la respuesta antes de enviarla.
 *
 * ENTRADA: el objeto que el controlador pasa a res.json() y req.acceso.
 * HACE:    quita (también en objetos anidados y listas) los campos de CAMPOS_PROHIBIDOS,
 *          salvo cuando req.acceso.desenmascarar es true (acción 'desenmascarar', auditada).
 * SALIDA:  la misma respuesta sin esos campos (se devuelve una copia; el objeto original no se modifica).
 * FALLA CERRADO: si req.acceso no existe o no trae desenmascarar === true, siempre se filtra.
 *
 * ⚠ La lista oficial la entrega Felipe Cruz (07/10). Mientras tanto se cargó la lista PII de los
 *   Middlewares v3 y de la Matriz de Seudonimización v3. Reemplázala o amplíala con la suya.
 */
const CAMPOS_PROHIBIDOS = [
  // Identidad (identity_schema) y su cifrado
  'rut', 'rut_cifrado', 'rut_hash',
  'nombre_cifrado', 'correo_cifrado', 'correo_hash', 'telefono_cifrado',
  'fecha_nacimiento',
  'id_identidad', 'ux_lab_id',
  // Enlace participante ↔ persona: se expone codigo_seudonimo, nunca id_participante
  'id_participante',
  // Evidencia firmada (identifica a la persona por sí misma)
  'evidencia_ruta',
];

/**
 * Nombres genéricos que SOLO son PII dentro de una identidad (nombre, correo y teléfono descifrados).
 * No se pueden prohibir en todo el árbol porque también existen en usuario.nombre, estudio.nombre, etc.
 * Se quitan únicamente de los objetos que traen alguno de MARCADORES_IDENTIDAD.
 */
const CAMPOS_PII_EN_IDENTIDAD = ['nombre', 'correo', 'telefono'];
const MARCADORES_IDENTIDAD = ['ux_lab_id', 'id_identidad', 'rut', 'rut_cifrado', 'nombre_cifrado', 'fecha_nacimiento'];

const PROHIBIDOS = new Set(CAMPOS_PROHIBIDOS.map((c) => c.toLowerCase()));
const PII_EN_IDENTIDAD = new Set(CAMPOS_PII_EN_IDENTIDAD);

/** Devuelve una copia profunda de `valor` sin los campos personales. No modifica el original. */
function limpiarPII(valor, vistos = new WeakSet()) {
  if (valor === null || typeof valor !== 'object') return valor;
  if (typeof valor.toJSON === 'function') valor = valor.toJSON(); // Date, Buffer, etc.
  if (valor === null || typeof valor !== 'object') return valor;

  if (vistos.has(valor)) return undefined; // referencia circular
  vistos.add(valor);
  try {
    if (Array.isArray(valor)) return valor.map((v) => limpiarPII(v, vistos));

    const esIdentidad = MARCADORES_IDENTIDAD.some((m) => Object.prototype.hasOwnProperty.call(valor, m));
    const salida = {};
    for (const [clave, v] of Object.entries(valor)) {
      const k = clave.toLowerCase();
      if (PROHIBIDOS.has(k)) continue;
      if (esIdentidad && PII_EN_IDENTIDAD.has(k)) continue;
      salida[clave] = limpiarPII(v, vistos);
    }
    return salida;
  } finally {
    vistos.delete(valor); // el mismo objeto puede aparecer dos veces sin ser circular
  }
}

function filtroPrivacidad(req, res, next) {
  const jsonOriginal = res.json.bind(res);
  res.json = (cuerpo) => {
    const puedeVerPII = !!(req.acceso && req.acceso.desenmascarar === true);
    return jsonOriginal(puedeVerPII ? cuerpo : limpiarPII(cuerpo));
  };
  next();
}

module.exports = { filtroPrivacidad, limpiarPII, CAMPOS_PROHIBIDOS };