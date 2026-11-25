'use strict';
/**
 * Rutas de administración de cuentas y membresías (Actividad 73).
 *
 *   /usuarios                         Director y Soporte (usuario/leer, crear, actualizar; alcance global)
 *   /estudios/:idEstudio/membresias   listar: membresia/leer (Director global; Investigador con puede_consultar)
 *                                     otorgar y revocar: membresia/crear y actualizar con puede_modificar
 *
 * Nombre y correo de las CUENTAS no son datos de participantes, por eso pasan el filtro de privacidad.
 * Nunca se devuelven hash_password ni mfa_secret.
 */
const { Router } = require('express');
const { requierePermiso } = require('../middlewares/controlAcceso');
const { marcarAuditoria } = require('../middlewares/auditoria');
const c = require('../controllers/usuariosController');

function usuarios() {
  const r = Router();
  r.get('/', marcarAuditoria('usuario', 'leer'), requierePermiso({ recurso: 'usuario', accion: 'leer' }), c.listar);
  r.get('/:idUsuario', marcarAuditoria('usuario', 'leer'), requierePermiso({ recurso: 'usuario', accion: 'leer' }), c.obtener);
  r.post('/', marcarAuditoria('usuario', 'crear'), requierePermiso({ recurso: 'usuario', accion: 'crear' }), c.crear);
  r.patch('/:idUsuario', marcarAuditoria('usuario', 'actualizar'),
    requierePermiso({ recurso: 'usuario', accion: 'actualizar' }), c.actualizar);
  return r;
}

function membresias() {
  const r = Router({ mergeParams: true });
  r.get('/', marcarAuditoria('membresia', 'leer'),
    requierePermiso({ recurso: 'membresia', accion: 'leer', permisoEstudio: 'puede_consultar' }), c.listarMembresias);
  r.post('/', marcarAuditoria('membresia', 'crear'),
    requierePermiso({ recurso: 'membresia', accion: 'crear', permisoEstudio: 'puede_modificar' }), c.otorgarMembresia);
  r.delete('/:idMembresia', marcarAuditoria('membresia', 'revocar'),
    requierePermiso({ recurso: 'membresia', accion: 'actualizar', permisoEstudio: 'puede_modificar' }), c.revocarMembresia);
  return r;
}

module.exports = { usuarios, membresias };
