'use strict';
/**
 * Eventos de un consentimiento. Se monta en /consentimientos/:idConsentimiento/eventos (mergeParams).
 *  - Registrar negar, retirar o reconsentir: membresía con puede_cargar. Multipart opcional; evidencia en «evidencia».
 * permiteEstudioCerrado: el retiro debe poder registrarse aunque el estudio esté cerrado; el servicio rechaza
 * (409) cualquier otro evento en un estudio cerrado.
 */
const { Router } = require('express');
const { requierePermiso } = require('../middlewares/controlAcceso');
const { marcarAuditoria } = require('../middlewares/auditoria');
const { resolverEstudioDeConsentimiento } = require('../middlewares/estudioDeConsentimiento');
const { subirEvidencia } = require('../middlewares/subidaArchivo');
const c = require('../controllers/consentimientosController');

module.exports = () => {
  const r = Router({ mergeParams: true });

  r.post('/', marcarAuditoria('consentimiento', 'crear'), resolverEstudioDeConsentimiento,
    requierePermiso({
      recurso: 'consentimiento', accion: 'crear', permisoEstudio: 'puede_cargar', permiteEstudioCerrado: true,
    }),
    subirEvidencia, c.registrarEvento);

  return r;
};