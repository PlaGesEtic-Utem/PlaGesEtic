'use strict';
const { ErrorApi, errores } = require('../utils/errores');

/** Rutas que no existen: 404 con el formato común. */
function rutaNoEncontrada(req, res, next) {
  next(errores.noEncontrado('La ruta solicitada no existe.'));
}

/**
 * Manejador final de errores. Siempre responde { error: { codigo, mensaje } }.
 * Los errores inesperados se registran en el log del servidor y al cliente
 * solo le llega un mensaje genérico.
 */
// eslint-disable-next-line no-unused-vars
function manejadorErrores(err, req, res, next) {
  let e = err;
  if (err && err.type === 'entity.parse.failed') e = errores.solicitudInvalida('El cuerpo de la solicitud no es JSON válido.');
  if (!(e instanceof ErrorApi)) {
    console.error('[error]', req.method, req.originalUrl, '-', err && (err.code || err.message));
    e = new ErrorApi(500, 'ERROR_INTERNO', 'Ocurrió un error inesperado. Intenta nuevamente.');
  }
  if (req.auditoria) req.auditoria.resultado = 'error';
  res.status(e.estado).json({ error: { codigo: e.codigo, mensaje: e.message } });
}

module.exports = { rutaNoEncontrada, manejadorErrores };
