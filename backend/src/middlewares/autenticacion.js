'use strict';
/**
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
 *           El mensaje es el mismo en todos los casos para no revelar qué comprobación falló.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/db'); // AJUSTAR la ruta: debe exportar query(texto, parametros) del Pool de pg
const { ErrorApi, errores } = require('../utils/errores');

/**
 * ⚠ SUPUESTO a confirmar con el login de la Actividad 40:
 * sesion_usuario.token_hash (CHAR(64)) guarda el SHA-256 en hexadecimal del JWT completo.
 * Si el login lo calcula de otra forma, cambia solo esta función.
 */
function hashDelToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Con debe_cambiar_password = true solo se permiten estas rutas (Middlewares v3).
const RUTAS_CON_CAMBIO_PENDIENTE = [
  { metodo: 'POST', ruta: '/auth/password' },
  { metodo: 'POST', ruta: '/auth/logout' },
];

function rutaPermitidaConCambioPendiente(req) {
  const ruta = req.originalUrl.split('?')[0].replace(/\/+$/, '');
  return RUTAS_CON_CAMBIO_PENDIENTE.some((r) => r.metodo === req.method && ruta.endsWith(r.ruta));
}

async function autenticacion(req, res, next) {
  try {
    req.usuario = null;

    // 1. Token presente y con firma / vencimiento válidos.
    const [esquema, token] = (req.headers.authorization || '').split(' ');
    if (!esquema || esquema.toLowerCase() !== 'bearer' || !token) {
      return next(errores.noAutenticado());
    }
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET no está configurado');
    try {
      jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch (e) {
      return next(errores.noAutenticado()); // firma inválida, token vencido o mal formado
    }

    // 2 y 3. Sesión vigente + cuenta activa y sin vencer, en una sola consulta.
    // Un token_temporal del paso MFA no tiene fila en sesion_usuario, así que nunca pasa de aquí.
    const { rows } = await db.query(
      `SELECT s.id_sesion, u.id_usuario, u.debe_cambiar_password, r.nombre_rol
         FROM security_schema.sesion_usuario s
         JOIN security_schema.usuario u ON u.id_usuario = s.id_usuario
         JOIN security_schema.rol r     ON r.id_rol = u.id_rol
        WHERE s.token_hash = $1
          AND s.fecha_cierre IS NULL
          AND s.fecha_expiracion > now()
          AND u.activo = true
          AND (u.fecha_expiracion IS NULL OR u.fecha_expiracion > now())`,
      [hashDelToken(token)]
    );
    if (rows.length === 0) return next(errores.noAutenticado());
    const f = rows[0];

    // Cambio de contraseña pendiente: solo /auth/password y /auth/logout.
    if (f.debe_cambiar_password && !rutaPermitidaConCambioPendiente(req)) {
      return next(new ErrorApi(403, 'CAMBIO_PASSWORD_REQUERIDO', 'Debes cambiar tu contraseña antes de continuar.'));
    }

    req.usuario = { id_usuario: f.id_usuario, nombre_rol: f.nombre_rol, id_sesion: f.id_sesion };
    if (req.auditoria) {
      req.auditoria.id_usuario = f.id_usuario;
      req.auditoria.id_sesion = f.id_sesion;
    }
    return next();
  } catch (err) {
    return next(err); // error inesperado (p. ej. la BD): el manejador responde 500 genérico
  }
}

module.exports = { autenticacion };