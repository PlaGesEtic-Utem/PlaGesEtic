'use strict';
/**
 * Rutas de estudios (Actividad 45 · jueves 8). Se montan dentro de las rutas protegidas,
 * así que ya pasaron por auditoría y autenticación. Cada una declara su permiso y su acción auditada.
 */
const { Router } = require('express');
const { requierePermiso } = require('../middlewares/controlAcceso');
const { marcarAuditoria } = require('../middlewares/auditoria');
const c = require('../controllers/estudiosController');

module.exports = () => {
  const r = Router();

  // Crear: Investigador y Director (permiso 'estudio/crear', alcance global).
  r.post('/', marcarAuditoria('estudio', 'crear'),
    requierePermiso({ recurso: 'estudio', accion: 'crear' }), c.crear);

  // Listar: cualquier usuario con sesión. El servicio filtra: alcance global ve todos; el resto, solo sus membresías.
  r.get('/', marcarAuditoria('estudio', 'leer'), c.listar);

  // Ver detalle: membresía con puede_consultar (o alcance global).
  r.get('/:idEstudio', marcarAuditoria('estudio', 'leer'),
    requierePermiso({ recurso: 'estudio', accion: 'leer', permisoEstudio: 'puede_consultar' }), c.obtener);

  // Editar y activar: membresía con puede_modificar (responsable) o alcance global (Director).
  r.patch('/:idEstudio', marcarAuditoria('estudio', 'actualizar'),
    requierePermiso({ recurso: 'estudio', accion: 'actualizar', permisoEstudio: 'puede_modificar' }), c.actualizar);
  r.post('/:idEstudio/activar', marcarAuditoria('estudio', 'actualizar'),
    requierePermiso({ recurso: 'estudio', accion: 'actualizar', permisoEstudio: 'puede_modificar' }), c.activar);

  return r;
};
