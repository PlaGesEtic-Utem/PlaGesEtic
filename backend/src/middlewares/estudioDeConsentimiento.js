'use strict';
/**
 * MIDDLEWARE · ESTUDIO DE UN CONSENTIMIENTO
 * La ruta cuelga de /consentimientos/:idConsentimiento/..., pero el control de acceso decide por estudio.
 * Obtiene el estudio del consentimiento y lo deja en req.params.idEstudio, que es lo que lee requierePermiso.
 * Debe ir ANTES de requierePermiso.
 * SI FALLA: 400 si el id está mal formado; 404 si el consentimiento no existe.
 */
const { estudioDeConsentimiento } = require('../repositories/consentimientosRepository');
const { errores } = require('../utils/errores');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolverEstudioDeConsentimiento(req, res, next) {
  try {
    const id = req.params && req.params.idConsentimiento;
    if (!id || !UUID_RE.test(id)) {
      return next(errores.solicitudInvalida('El identificador del consentimiento no es válido.'));
    }
    const idEstudio = await estudioDeConsentimiento(id);
    if (!idEstudio) return next(errores.noEncontrado('El consentimiento no existe.'));
    req.params.idEstudio = idEstudio;
    if (req.auditoria) req.auditoria.id_estudio = idEstudio;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { resolverEstudioDeConsentimiento };