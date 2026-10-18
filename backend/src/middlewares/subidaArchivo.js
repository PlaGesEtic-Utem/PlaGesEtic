'use strict';
/**
 * MIDDLEWARE · SUBIDA DE UN PDF (multipart, campo «archivo», máximo 10 MB, en memoria).
 * Va DESPUÉS del control de acceso: quien no tiene permiso no alcanza a subir nada.
 * Traduce los errores de multer al formato común de la API.
 */
const multer = require('multer');
const { ErrorApi, errores } = require('../utils/errores');

const MAX_BYTES = 10 * 1024 * 1024;

const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1, fields: 5 },
  fileFilter(req, file, cb) {
    if (file.mimetype !== 'application/pdf') return cb(errores.tipoNoPermitido('Solo se admiten archivos PDF.'));
    return cb(null, true);
  },
}).single('archivo');

function subirPdf(req, res, next) {
  subida(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new ErrorApi(413, 'ARCHIVO_MUY_GRANDE', 'El archivo supera el máximo de 10 MB.'));
      }
      return next(errores.solicitudInvalida('El archivo o los campos enviados no son válidos.'));
    }
    return next(err);
  });
}

module.exports = { subirPdf, MAX_BYTES };
