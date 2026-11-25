'use strict';
/**
 * Membresías de un estudio (Actividad 73). Las da y las revoca quien tiene puede_modificar
 * en el estudio (el responsable); el Director solo las consulta, según la tabla permiso.
 *  - Director y Soporte no reciben membresías: el Director ya ve todo y Soporte no ve datos de estudios.
 *  - Toda membresía incluye puede_consultar.
 *  - Si la cuenta tiene fecha de término, la membresía no puede durar más que la cuenta.
 *  - El responsable del estudio no puede perder su propia membresía.
 */
const repo = require('../repositories/membresiasRepository');
const { ErrorApi, errores } = require('../utils/errores');

const PERMISOS = ['puede_consultar', 'puede_cargar', 'puede_modificar', 'puede_descargar', 'puede_exportar'];
const ROLES_SIN_MEMBRESIA = ['Director', 'Soporte'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const conflicto = (codigo, mensaje) => new ErrorApi(409, codigo, mensaje);

function permisos(cuerpo) {
  const p = {};
  for (const k of PERMISOS) {
    const v = cuerpo[k] === undefined ? false : cuerpo[k];
    if (typeof v !== 'boolean') throw errores.solicitudInvalida(`«${k}» debe ser true o false.`);
    p[k] = v;
  }
  if (cuerpo.puede_consultar === undefined) p.puede_consultar = true;
  if (!p.puede_consultar) throw errores.solicitudInvalida('Toda membresía incluye «puede_consultar».');
  return p;
}

function fechaFin(valor, hoy = new Date()) {
  if (valor === undefined || valor === null) return null;
  if (typeof valor !== 'string' || !FECHA_RE.test(valor) || Number.isNaN(Date.parse(valor))) {
    throw errores.solicitudInvalida('«fecha_fin» debe ser una fecha con formato AAAA-MM-DD.');
  }
  if (valor < hoy.toISOString().slice(0, 10)) throw errores.solicitudInvalida('«fecha_fin» no puede ser anterior a hoy.');
  return valor;
}

async function listar(idEstudio, query = {}) {
  return repo.listar(idEstudio, query.todas !== 'true');
}

async function otorgar(idEstudio, cuerpo, actor) {
  if (typeof cuerpo.id_usuario !== 'string' || !UUID_RE.test(cuerpo.id_usuario)) {
    throw errores.solicitudInvalida('Falta «id_usuario» o no es válido.');
  }
  const p = permisos(cuerpo);
  let fin = fechaFin(cuerpo.fecha_fin);

  const u = await repo.usuarioParaMembresia(cuerpo.id_usuario);
  if (!u) throw errores.noEncontrado('El usuario no existe.');
  if (!u.activo) throw conflicto('USUARIO_BLOQUEADO', 'La cuenta está bloqueada.');
  if (ROLES_SIN_MEMBRESIA.includes(u.nombre_rol)) {
    throw errores.solicitudInvalida(`Las cuentas de ${u.nombre_rol} no reciben membresías de estudio.`);
  }
  if (u.fecha_expiracion) {
    const venceCuenta = new Date(u.fecha_expiracion).toISOString().slice(0, 10);
    if (!fin || fin > venceCuenta) fin = venceCuenta;
  }

  const existente = await repo.buscarPorUsuario(cuerpo.id_usuario, idEstudio);
  if (existente && existente.vigente) {
    throw conflicto('MEMBRESIA_EXISTENTE', 'El usuario ya tiene una membresía vigente en este estudio.');
  }
  const id = await repo.guardar(idEstudio, cuerpo.id_usuario, p, actor.id_usuario, fin,
    existente ? existente.id_membresia : null);
  const m = await repo.obtener(id);
  delete m.id_estudio;
  return m;
}

async function revocar(idEstudio, idMembresia) {
  if (!UUID_RE.test(idMembresia)) throw errores.solicitudInvalida('El identificador de la membresía no es válido.');
  const m = await repo.obtener(idMembresia);
  if (!m || m.id_estudio !== idEstudio) throw errores.noEncontrado('La membresía no existe en este estudio.');
  if (!m.vigente) throw conflicto('MEMBRESIA_NO_VIGENTE', 'La membresía ya no está vigente.');
  if (m.id_usuario === await repo.responsableDelEstudio(idEstudio)) {
    throw conflicto('RESPONSABLE_DEL_ESTUDIO', 'No se puede revocar la membresía del responsable del estudio.');
  }
  await repo.revocar(idMembresia);
  const r = await repo.obtener(idMembresia);
  delete r.id_estudio;
  return r;
}

module.exports = { listar, otorgar, revocar, permisos, fechaFin };
