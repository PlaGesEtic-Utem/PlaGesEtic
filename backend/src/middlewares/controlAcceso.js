'use strict';
/**
 * MIDDLEWARE 3 · CONTROL DE ACCESO (RBAC + permisos por estudio)
 * Responsable de completarlo: Benjamín Arias · jueves 08/10 (Actividad 42).
 *
 * Se usa POR RUTA, porque cada ruta necesita un permiso distinto:
 *   router.get('/estudios/:idEstudio',
 *     requierePermiso({ recurso: 'estudio', accion: 'leer', permisoEstudio: 'puede_consultar' }),
 *     controlador)
 *
 * ENTRADA: req.usuario (del middleware de autenticación) y, en rutas de un estudio,
 *          req.params.idEstudio.
 * VALIDA:
 *   1. security_schema.permiso: el rol tiene (recurso, accion). Si no → 403.
 *   2. Si el alcance es 'global' → pasa (ej.: supervisión del Director).
 *   3. Si el alcance es 'estudio' → membresia_estudio vigente con el permiso puede_* pedido,
 *      o una autorizacion 'aprobada', del mismo estudio y recurso, con fecha_vencimiento futura.
 * SALIDA:
 *   req.acceso = { alcance: 'global' | 'estudio', id_estudio, via: 'permiso' | 'membresia' | 'autorizacion',
 *                  id_autorizacion, desenmascarar: false }
 *   y completa req.auditoria.id_autorizacion cuando se usa una autorización.
 * SI FALLA: next(errores.sinPermiso())  →  403 con el formato común (y queda auditado).
 */
// const { errores } = require('../utils/errores');

const PERMISOS_ESTUDIO = ['puede_consultar', 'puede_cargar', 'puede_modificar', 'puede_descargar', 'puede_exportar'];

function requierePermiso({ recurso, accion, permisoEstudio = null } = {}) {
  if (!recurso || !accion) throw new Error('requierePermiso necesita recurso y accion');
  if (permisoEstudio && !PERMISOS_ESTUDIO.includes(permisoEstudio)) {
    throw new Error(`permisoEstudio inválido: ${permisoEstudio}`);
  }
  return function controlAcceso(req, res, next) {
    // TODO (B. Arias, 08/10): implementar las validaciones de arriba.
    req.acceso = { alcance: null, id_estudio: req.params.idEstudio || null, via: null, id_autorizacion: null, desenmascarar: false };
    next();
  };
}

module.exports = { requierePermiso, PERMISOS_ESTUDIO };
