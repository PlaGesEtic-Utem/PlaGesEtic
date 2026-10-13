'use strict';
/**
 * Ingreso al sistema en dos pasos (Actividad 46 · ADR-002 D3 · Recomendación técnica v2).
 *
 *   Paso 1  POST /auth/login       correo + contraseña (argon2id)  → token_temporal (5 min, solo sirve para el paso 2)
 *   Paso 2  POST /auth/login/mfa   token_temporal + código TOTP    → token de sesión
 *           (o un código de recuperación de un solo uso)
 *
 * Reglas:
 *  - Un error de correo, contraseña, cuenta inactiva o vencida responde SIEMPRE lo mismo (no se revela cuál falló).
 *  - 5 intentos fallidos en 15 minutos bloquean ese correo (paso 1) o ese usuario (paso 2) por 15 minutos.
 *  - La sesión vence a los 30 minutos sin uso y nunca dura más de 8 horas (lo aplica el middleware de autenticación).
 *  - Fuera del Alfa (Actividad 74): enrolar MFA con QR, regenerar códigos y recuperar contraseña.
 */
const crypto = require('crypto');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const repo = require('../repositories/authRepository');
const { descifrar } = require('../utils/cifrado');
const totp = require('../utils/totp');
const { cargarConfig } = require('../config');
const { ErrorApi, errores } = require('../utils/errores');

const MAX_FALLOS = 5;
const VENTANA_FALLOS_MIN = 15;
const MIN_INACTIVIDAD = 30;
const HORAS_MAXIMO = 8;
const SEG_TOKEN_TEMPORAL = 300;
const LARGO_MIN_PASSWORD = 12;

const credencialesInvalidas = () => new ErrorApi(401, 'CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.');
const codigoInvalido = () => new ErrorApi(401, 'CODIGO_INVALIDO', 'El código no es válido o ya venció. Intenta con el código actual.');
const demasiadosIntentos = () => new ErrorApi(429, 'DEMASIADOS_INTENTOS',
  `Demasiados intentos fallidos. Espera ${VENTANA_FALLOS_MIN} minutos e inténtalo de nuevo.`);

const secretoJwt = () => {
  const s = cargarConfig().jwt.secreto;
  if (!s) throw new Error('JWT_SECRET no está configurado');
  return s;
};
const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');
const desdeVentana = () => new Date(Date.now() - VENTANA_FALLOS_MIN * 60 * 1000);

// Hash de relleno: si el correo no existe se verifica igual contra él, para que la respuesta tarde
// lo mismo y no se pueda adivinar qué correos están registrados midiendo el tiempo.
let hashRelleno = null;
async function obtenerHashRelleno() {
  if (!hashRelleno) hashRelleno = await argon2.hash(crypto.randomBytes(16).toString('hex'), { type: argon2.argon2id });
  return hashRelleno;
}

function cuentaUsable(u) {
  return u && u.activo === true && (!u.fecha_expiracion || new Date(u.fecha_expiracion) > new Date());
}

function texto(v, campo) {
  if (typeof v !== 'string' || !v.trim()) throw errores.solicitudInvalida(`Falta el campo obligatorio «${campo}».`);
  return v.trim();
}

/** Paso 1. `aud` es req.auditoria: se completa para que quede registrado el resultado. */
async function login(cuerpo, aud) {
  const correo = texto(cuerpo.correo, 'correo').toLowerCase();
  const password = typeof cuerpo.password === 'string' ? cuerpo.password : texto(cuerpo.password, 'password');
  aud.entidad = 'sesion';

  if (await repo.contarFallosPorCorreo(correo, desdeVentana()) >= MAX_FALLOS) {
    aud.accion = 'login_fallido'; aud.correo_intentado = correo;
    throw demasiadosIntentos();
  }

  const u = await repo.usuarioPorCorreo(correo);
  const passwordOk = await argon2.verify(u ? u.hash_password : await obtenerHashRelleno(), password).catch(() => false);
  if (!u || !passwordOk || !cuentaUsable(u)) {
    aud.accion = 'login_fallido'; aud.correo_intentado = correo;
    if (u) aud.id_usuario = u.id_usuario;
    throw credencialesInvalidas();
  }

  aud.id_usuario = u.id_usuario;
  if (!u.mfa_activo || !u.mfa_secret) {
    // Cuenta sin MFA configurado: en el MVP todos los roles usan MFA. El enrolamiento con QR llega en la Act. 74.
    aud.accion = 'login_fallido';
    throw new ErrorApi(403, 'MFA_PENDIENTE', 'Tu cuenta aún no tiene configurado el segundo factor. Pide a Soporte que lo active.');
  }

  aud.accion = 'leer'; // paso 1 correcto: todavía no es un ingreso (falta el código)
  const tokenTemporal = jwt.sign({ sub: u.id_usuario, tipo: 'mfa' }, secretoJwt(),
    { algorithm: 'HS256', expiresIn: SEG_TOKEN_TEMPORAL });
  return { token_temporal: tokenTemporal, mfa_requerido: true, expira_en_segundos: SEG_TOKEN_TEMPORAL };
}

/** Paso 2: código TOTP o código de recuperación. Crea la sesión. */
async function loginMfa(cuerpo, aud, ip) {
  aud.entidad = 'sesion';
  const tokenTemporal = texto(cuerpo.token_temporal, 'token_temporal');
  let datos;
  try {
    datos = jwt.verify(tokenTemporal, secretoJwt(), { algorithms: ['HS256'] });
  } catch (e) {
    aud.accion = 'login_fallido';
    throw new ErrorApi(401, 'TOKEN_TEMPORAL_INVALIDO', 'El paso anterior venció. Vuelve a ingresar tu correo y contraseña.');
  }
  if (datos.tipo !== 'mfa' || !datos.sub) { aud.accion = 'login_fallido'; throw errores.noAutenticado(); }
  aud.id_usuario = datos.sub;

  const tieneCodigo = typeof cuerpo.codigo === 'string' && cuerpo.codigo.trim() !== '';
  const tieneRecuperacion = typeof cuerpo.codigo_recuperacion === 'string' && cuerpo.codigo_recuperacion.trim() !== '';
  if (tieneCodigo === tieneRecuperacion) {
    throw errores.solicitudInvalida('Envía «codigo» (6 dígitos de tu app) o «codigo_recuperacion», solo uno.');
  }

  if (await repo.contarFallosPorUsuario(datos.sub, desdeVentana()) >= MAX_FALLOS) {
    aud.accion = 'login_fallido';
    throw demasiadosIntentos();
  }

  const u = await repo.usuarioPorId(datos.sub);
  if (!cuentaUsable(u) || !u.mfa_activo || !u.mfa_secret) { aud.accion = 'login_fallido'; throw errores.noAutenticado(); }

  let valido;
  if (tieneCodigo) {
    valido = totp.verificar(descifrar(u.mfa_secret), cuerpo.codigo);
  } else {
    const normalizado = cuerpo.codigo_recuperacion.toUpperCase().replace(/[^A-Z0-9]/g, '');
    valido = await repo.consumirCodigoRecuperacion(u.id_usuario, crypto.createHash('sha256').update(normalizado).digest('hex'));
  }
  if (!valido) { aud.accion = 'login_fallido'; throw codigoInvalido(); }

  // Sesión: el JWT solo lleva el id de la sesión; en la base se guarda su huella SHA-256, nunca el token.
  const idSesion = crypto.randomUUID();
  const token = jwt.sign({ id_sesion: idSesion }, secretoJwt(), { algorithm: 'HS256', expiresIn: `${HORAS_MAXIMO}h` });
  const s = await repo.crearSesion({
    idSesion, idUsuario: u.id_usuario, tokenHash: hashToken(token), ip: ip ? String(ip).slice(0, 45) : null,
    minutosInactividad: MIN_INACTIVIDAD,
  });

  aud.accion = 'login_exitoso';
  aud.id_sesion = idSesion;
  aud.id_registro_afectado = idSesion;
  return {
    token,
    expira_por_inactividad: s.fecha_expiracion,
    usuario: { nombre: u.nombre, correo: u.correo, rol: u.nombre_rol, debe_cambiar_password: u.debe_cambiar_password },
  };
}

/** POST /auth/logout (con sesión). */
async function logout(usuario, aud) {
  aud.entidad = 'sesion'; aud.accion = 'cierre_sesion'; aud.id_registro_afectado = usuario.id_sesion;
  await repo.cerrarSesion(usuario.id_sesion);
}

/** POST /auth/password (con sesión): cambia la contraseña y quita la obligación de cambiarla. */
async function cambiarPassword(cuerpo, usuario, aud) {
  aud.entidad = 'usuario'; aud.accion = 'actualizar'; aud.id_registro_afectado = usuario.id_usuario;
  const actual = typeof cuerpo.password_actual === 'string' ? cuerpo.password_actual : '';
  const nueva = typeof cuerpo.password_nueva === 'string' ? cuerpo.password_nueva : '';
  if (nueva.length < LARGO_MIN_PASSWORD) {
    throw errores.solicitudInvalida(`La nueva contraseña debe tener al menos ${LARGO_MIN_PASSWORD} caracteres.`);
  }
  if (nueva === actual) throw errores.solicitudInvalida('La nueva contraseña debe ser distinta de la actual.');
  const u = await repo.usuarioPorId(usuario.id_usuario);
  if (!u || !(await argon2.verify(u.hash_password, actual).catch(() => false))) throw credencialesInvalidas();
  await repo.cambiarPassword(u.id_usuario, await argon2.hash(nueva, { type: argon2.argon2id }));
}

module.exports = {
  login, loginMfa, logout, cambiarPassword,
  MAX_FALLOS, VENTANA_FALLOS_MIN, MIN_INACTIVIDAD, HORAS_MAXIMO, LARGO_MIN_PASSWORD,
};
