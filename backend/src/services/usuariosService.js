'use strict';
/**
 * Administración de cuentas (Actividad 73). Solo Director y Soporte (permisos usuario/*).
 *  - Nadie se registra solo: la cuenta nace con contraseña temporal, cambio obligatorio y MFA pendiente.
 *  - La contraseña temporal se entrega una sola vez en la respuesta; en la base solo queda su hash argon2id.
 *  - Soporte no crea, edita ni asigna cuentas de Director (solo el Director lo hace).
 *  - Nadie se bloquea ni se cambia el rol a sí mismo, para no dejar el sistema sin administrador.
 *  - Estudiante e Invitado siempre tienen fecha de término.
 */
const crypto = require('crypto');
const argon2 = require('argon2');
const repo = require('../repositories/usuariosRepository');
const { ErrorApi, errores } = require('../utils/errores');
const { cargarConfig } = require('../config');
const ROLES = ['Director', 'Soporte', 'Investigador', 'Asistente', 'Estudiante', 'Invitado'];
const ROLES_TEMPORALES = ['Estudiante', 'Invitado'];
const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
// Sin letras ni números que se confunden (0/O, 1/l/I), para dictarla o copiarla sin errores.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

function passwordTemporal(largo = 14) {
  const bytes = crypto.randomBytes(largo);
  let s = '';
  for (let i = 0; i < largo; i++) s += ALFABETO[bytes[i] % ALFABETO.length];
  return s;
}

const hashear = (password) => argon2.hash(password, { type: argon2.argon2id });

function texto(valor, campo, max) {
  if (typeof valor !== 'string' || !valor.trim()) throw errores.solicitudInvalida(`Falta el campo obligatorio «${campo}».`);
  const v = valor.trim();
  if (v.length > max) throw errores.solicitudInvalida(`«${campo}» admite como máximo ${max} caracteres.`);
  return v;
}

function correo(valor) {
  const v = texto(valor, 'correo', 150).toLowerCase();
  if (!CORREO_RE.test(v)) throw errores.solicitudInvalida('El correo no tiene un formato válido.');
  const dominios = cargarConfig().dominiosPermitidos; 
  const dominio = v.split('@')[1];
  if (dominios.length && !dominios.includes(dominio)) {
    throw errores.solicitudInvalida(`El dominio del correo debe ser uno de: ${dominios.join(', ')}.`);
  }
  return v;
}

function rol(valor) {
  if (!ROLES.includes(valor)) throw errores.solicitudInvalida(`«rol» debe ser uno de: ${ROLES.join(', ')}.`);
  return valor;
}

/** Fecha de término (AAAA-MM-DD), futura. null = sin término. */
function fechaExpiracion(valor, hoy = new Date()) {
  if (valor === null) return null;
  if (typeof valor !== 'string' || !FECHA_RE.test(valor) || Number.isNaN(Date.parse(valor))) {
    throw errores.solicitudInvalida('«fecha_expiracion» debe ser una fecha con formato AAAA-MM-DD.');
  }
  if (valor <= hoy.toISOString().slice(0, 10)) {
    throw errores.solicitudInvalida('«fecha_expiracion» debe ser posterior a hoy.');
  }
  return valor;
}

/** Soporte no administra cuentas de Director ni entrega ese rol. */
function revisarJerarquia(actor, rolObjetivo) {
  if (rolObjetivo === 'Director' && actor.nombre_rol !== 'Director') {
    throw errores.sinPermiso('Solo un Director puede administrar cuentas de Director.');
  }
}

async function listar(query = {}) {
  let activo = null;
  if (query.activo !== undefined && query.activo !== '') {
    if (!['true', 'false'].includes(query.activo)) throw errores.solicitudInvalida('El filtro «activo» debe ser true o false.');
    activo = query.activo === 'true';
  }
  const filtroRol = query.rol ? rol(query.rol) : null;
  return repo.listar({ rol: filtroRol, activo });
}

async function obtener(idUsuario) {
  const u = await repo.obtener(idUsuario);
  if (!u) throw errores.noEncontrado('El usuario no existe.');
  return { ...u, membresias: await repo.membresiasVigentes(idUsuario) };
}

async function crear(cuerpo, actor) {
  const datos = {
    nombre: texto(cuerpo.nombre, 'nombre', 150),
    correo: correo(cuerpo.correo),
    rol: rol(cuerpo.rol),
    fechaExpiracion: cuerpo.fecha_expiracion === undefined ? null : fechaExpiracion(cuerpo.fecha_expiracion),
  };
  revisarJerarquia(actor, datos.rol);
  if (ROLES_TEMPORALES.includes(datos.rol) && !datos.fechaExpiracion) {
    throw errores.solicitudInvalida(`Las cuentas de ${datos.rol} necesitan «fecha_expiracion».`);
  }

  const temporal = passwordTemporal();
  let idUsuario;
  try {
    idUsuario = await repo.crear({
      nombre: datos.nombre, correo: datos.correo, hashPassword: await hashear(temporal),
      idRol: await repo.idRol(datos.rol), fechaExpiracion: datos.fechaExpiracion,
    });
  } catch (err) {
    if (err && err.code === '23505') throw new ErrorApi(409, 'CORREO_DUPLICADO', 'Ya existe una cuenta con ese correo.');
    throw err;
  }
  return { ...(await repo.obtener(idUsuario)), password_temporal: temporal };
}

async function actualizar(idUsuario, cuerpo, actor) {
  const actual = await repo.obtener(idUsuario);
  if (!actual) throw errores.noEncontrado('El usuario no existe.');
  revisarJerarquia(actor, actual.nombre_rol);

  const cambios = {};
  if (cuerpo.activo !== undefined) {
    if (typeof cuerpo.activo !== 'boolean') throw errores.solicitudInvalida('«activo» debe ser true o false.');
    cambios.activo = cuerpo.activo;
  }
  let nuevoRol = null;
  if (cuerpo.rol !== undefined) {
    nuevoRol = rol(cuerpo.rol);
    revisarJerarquia(actor, nuevoRol);
    cambios.idRol = await repo.idRol(nuevoRol);
  }
  if (cuerpo.fecha_expiracion !== undefined) cambios.fechaExpiracion = fechaExpiracion(cuerpo.fecha_expiracion);
  if (cuerpo.reiniciar_mfa !== undefined && cuerpo.reiniciar_mfa !== true) {
    throw errores.solicitudInvalida('«reiniciar_mfa» solo acepta true.');
  }
  if (cuerpo.restablecer_password !== undefined && cuerpo.restablecer_password !== true) {
    throw errores.solicitudInvalida('«restablecer_password» solo acepta true.');
  }
  cambios.reiniciarMfa = cuerpo.reiniciar_mfa === true;

  const hayCambios = cambios.activo !== undefined || cambios.idRol !== undefined || cambios.fechaExpiracion !== undefined
    || cambios.reiniciarMfa || cuerpo.restablecer_password === true;
  if (!hayCambios) {
    throw errores.solicitudInvalida('Indica al menos un cambio: activo, rol, fecha_expiracion, restablecer_password o reiniciar_mfa.');
  }

  if (idUsuario === actor.id_usuario && (cambios.activo === false || nuevoRol)) {
    throw new ErrorApi(409, 'CAMBIO_PROPIO', 'No puedes bloquearte ni cambiarte el rol a ti mismo.');
  }
  const rolFinal = nuevoRol || actual.nombre_rol;
  const fechaFinal = cambios.fechaExpiracion !== undefined ? cambios.fechaExpiracion : actual.fecha_expiracion;
  if (ROLES_TEMPORALES.includes(rolFinal) && !fechaFinal) {
    throw errores.solicitudInvalida(`Las cuentas de ${rolFinal} necesitan «fecha_expiracion».`);
  }

  let temporal = null;
  if (cuerpo.restablecer_password === true) {
    temporal = passwordTemporal();
    cambios.hashPassword = await hashear(temporal);
  }
  await repo.actualizar(idUsuario, cambios);
  const respuesta = await repo.obtener(idUsuario);
  return temporal ? { ...respuesta, password_temporal: temporal } : respuesta;
}

module.exports = {
  listar, obtener, crear, actualizar,
  // Para pruebas
  passwordTemporal, fechaExpiracion, revisarJerarquia, ROLES,
};
