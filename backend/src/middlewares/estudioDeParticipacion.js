'use strict';
/**
 * MIDDLEWARE · ESTUDIO DE UNA PARTICIPACIÓN
 * Las rutas de consentimientos cuelgan de /participaciones/:idParticipacion/..., pero el control de acceso
 * decide por estudio. Este middleware obtiene el estudio de la participación y lo deja en
 * req.params.idEstudio, que es lo que lee requierePermiso.
 *
 * Uso: debe ir ANTES de requierePermiso en la ruta:
 *   router.get('/:idParticipacion/consentimientos', resolverEstudioDeParticipacion,
 *     requierePermiso({ recurso: 'consentimiento', accion: 'leer', permisoEstudio: 'puede_consultar' }), ...)
 * SI FALLA: 400 si el id está mal formado; 404 si la participación no existe.
 */
const { estudioDeParticipacion } = require('../repositories/accesoRepository');
const { errores } = require('../utils/errores');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolverEstudioDeParticipacion(req, res, next) {
  try {
    const id = req.params && req.params.idParticipacion;
    if (!id || !UUID_RE.test(id)) {
      return next(errores.solicitudInvalida('El identificador de la participación no es válido.'));
    }
    const idEstudio = await estudioDeParticipacion(id);
    if (!idEstudio) return next(errores.noEncontrado('La participación no existe.'));
    req.params.idEstudio = idEstudio;
    if (req.auditoria) req.auditoria.id_estudio = idEstudio;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { resolverEstudioDeParticipacion };
