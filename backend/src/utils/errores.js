'use strict';
/**
 * Formato común de errores de la API:
 *   { "error": { "codigo": "NO_AUTENTICADO", "mensaje": "Texto para el usuario" } }
 * Nunca se envían detalles internos (stack, SQL, nombres de tablas).
 */
class ErrorApi extends Error {
  constructor(estado, codigo, mensaje) {
    super(mensaje);
    this.estado = estado;
    this.codigo = codigo;
  }
}

const errores = {
  solicitudInvalida: (m = 'La solicitud no es válida.') => new ErrorApi(400, 'SOLICITUD_INVALIDA', m),
  noAutenticado: (m = 'Debes iniciar sesión.') => new ErrorApi(401, 'NO_AUTENTICADO', m),
  sinPermiso: (m = 'No tienes permiso para esta acción.') => new ErrorApi(403, 'SIN_PERMISO', m),
  noEncontrado: (m = 'El recurso no existe.') => new ErrorApi(404, 'NO_ENCONTRADO', m),
  conflicto: (m = 'La operación no se puede realizar en el estado actual.') => new ErrorApi(409, 'CONFLICTO', m),
  tipoNoPermitido: (m = 'El tipo de archivo no está permitido.') => new ErrorApi(415, 'TIPO_NO_PERMITIDO', m),
  servicioNoDisponible: (m = 'El servicio no está disponible.') => new ErrorApi(503, 'SERVICIO_NO_DISPONIBLE', m),
};

module.exports = { ErrorApi, errores };
