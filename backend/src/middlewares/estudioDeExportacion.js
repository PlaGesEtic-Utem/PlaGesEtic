'use strict';
/**
 * MIDDLEWARE · ESTUDIO DE UNA EXPORTACIÓN
 * Las rutas cuelgan de /exportaciones/:idExportacion, pero el control de acceso decide por estudio.
 * Busca la exportación, la deja en req.exportacion y pone su estudio en req.params.idEstudio,
 * que es lo que lee requierePermiso. Debe ir ANTES de requierePermiso.
 * SI FALLA: 400 si el id está mal formado; 404 si la exportación no existe.
 */
const { buscarPorId } = require('../repositories/exportacionesRepository');
const { errores } = require('../utils/errores');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolverExportacion(req, res, next) {
  try {
    const id = req.params && req.params.idExportacion;
    if (!id || !UUID_RE.test(id)) {
      return next(errores.solicitudInvalida('El identificador de la exportación no es válido.'));
    }
    const exportacion = await buscarPorId(id);
    if (!exportacion) return next(errores.noEncontrado('La exportación no existe.'));
    req.exportacion = exportacion;
    req.params.idEstudio = exportacion.id_estudio;
    if (req.auditoria) {
      req.auditoria.id_estudio = exportacion.id_estudio;
      req.auditoria.id_registro_afectado = exportacion.id_exportacion;
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { resolverExportacion };