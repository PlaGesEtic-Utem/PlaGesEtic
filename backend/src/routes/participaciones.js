'use strict';
/**
 * Rutas de participaciones (Actividad 45 · sábado 10). Se montan en /estudios/:idEstudio/participaciones
 * (mergeParams para que el control de acceso vea idEstudio y revise la membresía de ESE estudio).
 *  - Inscribir: Investigador y Asistente con membresía y puede_cargar.
 *  - Listar: con membresía y puede_consultar (incluye Estudiante); el Director, por su permiso global.
 * Las respuestas solo traen el código seudónimo: el filtro de privacidad quita id_participante y ux_lab_id.
 */
const { Router } = require('express');
const { requierePermiso } = require('../middlewares/controlAcceso');
const { marcarAuditoria } = require('../middlewares/auditoria');
const c = require('../controllers/participacionesController');

module.exports = () => {
  const r = Router({ mergeParams: true });

  r.post('/', marcarAuditoria('participacion', 'crear'),
    requierePermiso({ recurso: 'participacion', accion: 'crear', permisoEstudio: 'puede_cargar' }), c.inscribir);

  r.get('/', marcarAuditoria('participacion', 'leer'),
    requierePermiso({ recurso: 'participacion', accion: 'leer', permisoEstudio: 'puede_consultar' }), c.listar);

  return r;
};
