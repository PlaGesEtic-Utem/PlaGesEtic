'use strict';
/**
 * MIDDLEWARE 2 · AUTENTICACIÓN
 * Responsable de completarlo: Benjamín Arias · jueves 08/10 (Actividad 42).
 * Reutiliza el login, MFA y JWT de la Actividad 40 (no se reimplementan).
 *
 * ENTRADA: cabecera  Authorization: Bearer <JWT de sesión emitido por POST /auth/login/mfa>
 * VALIDA:
 *   1. Que venga el token y que su firma y vencimiento sean válidos (JWT_SECRET).
 *   2. Que la fila de security_schema.sesion_usuario exista, sin fecha_cierre y sin vencer.
 *   3. Que el usuario esté activo y, si tiene fecha_expiracion, que no haya pasado.
 * SALIDA (si todo está bien):
 *   req.usuario = { id_usuario, nombre_rol, id_sesion }
 *   y completa req.auditoria.id_usuario y req.auditoria.id_sesion.
 * SI FALLA: next(errores.noAutenticado())  →  401 con el formato común (y queda auditado).
 */
// const { errores } = require('../utils/errores');

function autenticacion(req, res, next) {
  // TODO (B. Arias, 08/10): implementar las validaciones de arriba.
  req.usuario = null;
  next();
}

module.exports = { autenticacion };
