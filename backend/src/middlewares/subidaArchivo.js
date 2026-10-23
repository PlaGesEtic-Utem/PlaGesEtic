'use strict';
/**
 * MIDDLEWARES · SUBIDA DE UN ARCHIVO (multipart, un solo archivo, máximo 10 MB, en memoria).
 *   subirPdf        campo «archivo»   solo PDF                (documentos de consentimiento)
 *   subirEvidencia  campo «evidencia» PDF, JPEG o PNG         (evidencia firmada de un consentimiento)
 * Van DESPUÉS del control de acceso: quien no tiene permiso no alcanza a subir nada.
 * Traducen los errores de multer al formato común de la API. El contenido real (bytes iniciales)
 * se vuelve a revisar en el servicio: el tipo que declara el cliente no basta.
 */
const multer = require('multer');
const { ErrorApi, errores } = require('../utils/errores');

const MAX_BYTES = 10 * 1024 * 1024;

function crearSubida(campo, tiposPermitidos, descripcionTipos) {
  const subida = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_BYTES, files: 1, fields: 10 },
    fileFilter(req, file, cb) {
      if (!tiposPermitidos.includes(file.mimetype)) {
        return cb(errores.tipoNoPermitido(`Solo se admiten archivos ${descripcionTipos}.`));
      }
      return cb(null, true);
    },
  }).single(campo);

  return function subirArchivo(req, res, next) {
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
  };
}

const subirPdf = crearSubida('archivo', ['application/pdf'], 'PDF');
const subirEvidencia = crearSubida('evidencia', ['application/pdf', 'image/jpeg', 'image/png'], 'PDF, JPEG o PNG');

module.exports = { subirPdf, subirEvidencia, MAX_BYTES };
