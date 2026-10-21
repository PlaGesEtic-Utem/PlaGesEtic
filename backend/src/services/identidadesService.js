
'use strict';

/**
 * Servicio de identidades.
 *
 * Registro y búsqueda de identidades (Actividad 45).
 * Desenmascaramiento de identidades (Actividad 56).
 *
 * El descifrado se realiza exclusivamente
 * dentro del repositorio de identidades.
 *
 * El acceso al desenmascaramiento debe estar
 * autorizado previamente por los middlewares.
 */

const repo = require('../repositories/identidadesRepository');
const { cifrar, huella } = require('../utils/cifrado');
const { validarRut } = require('../utils/rut');
const { ErrorApi, errores } = require('../utils/errores');
const {
  generarUxLabId,
  conReintentoPorColision,
} = require('../utils/codigos');

const TIPOS = ['participante', 'representante'];
const CORREO_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const UX_LAB_ID_RE = /^UXL-[A-Z0-9]{8}$/;

const conflicto = (codigo, mensaje) =>
  new ErrorApi(409, codigo, mensaje);

const normalizarCorreo = (c) =>
  c.trim().toLowerCase();

const normalizarTelefono = (t) =>
  t.replace(/[\s\-()]/g, '');

function texto(v, campo, max) {
  if (typeof v !== 'string' || !v.trim()) {
    throw errores.solicitudInvalida(
      `Falta el campo obligatorio «${campo}».`
    );
  }

  if (v.trim().length > max) {
    throw errores.solicitudInvalida(
      `«${campo}» admite como máximo ${max} caracteres.`
    );
  }

  return v.trim();
}

function edad(fechaNacimiento) {
  const n = new Date(fechaNacimiento + 'T00:00:00Z');
  const hoy = new Date();

  let e = hoy.getUTCFullYear() - n.getUTCFullYear();
  const m = hoy.getUTCMonth() - n.getUTCMonth();

  if (
    m < 0 ||
    (m === 0 && hoy.getUTCDate() < n.getUTCDate())
  ) {
    e--;
  }

  return e;
}

/**
 * Valida los datos para registrar una identidad.
 */
function validarEntrada(c) {
  const nombre = texto(c.nombre, 'nombre', 150);

  const correo = normalizarCorreo(
    texto(c.correo, 'correo', 150)
  );

  if (!CORREO_RE.test(correo)) {
    throw errores.solicitudInvalida(
      'El correo no es válido.'
    );
  }

  const telefono = normalizarTelefono(
    texto(c.telefono, 'telefono', 30)
  );

  if (!/^\+?\d{8,15}$/.test(telefono)) {
    throw errores.solicitudInvalida(
      'El teléfono no es válido (ej.: +56 9 1234 5678).'
    );
  }

  let rut = null;

  if (
    c.rut !== undefined &&
    c.rut !== null &&
    c.rut !== ''
  ) {
    rut = validarRut(String(c.rut));

    if (!rut) {
      throw errores.solicitudInvalida(
        'El RUT no es válido (revisa el dígito verificador).'
      );
    }
  }

  if (
    typeof c.fecha_nacimiento !== 'string' ||
    !FECHA_RE.test(c.fecha_nacimiento) ||
    Number.isNaN(Date.parse(c.fecha_nacimiento))
  ) {
    throw errores.solicitudInvalida(
      '«fecha_nacimiento» es obligatoria, con formato AAAA-MM-DD.'
    );
  }

  const e = edad(c.fecha_nacimiento);

  if (e < 0 || e > 120) {
    throw errores.solicitudInvalida(
      'La fecha de nacimiento no es válida.'
    );
  }

  const tipo = c.tipo === undefined
    ? 'participante'
    : c.tipo;

  if (!TIPOS.includes(tipo)) {
    throw errores.solicitudInvalida(
      '«tipo» debe ser participante o representante.'
    );
  }

  if (tipo === 'representante' && e < 18) {
    throw errores.solicitudInvalida(
      'Un representante legal debe ser mayor de edad.'
    );
  }

  return {
    nombre,
    correo,
    telefono,
    rut,
    fecha_nacimiento: c.fecha_nacimiento,
    tipo,
  };
}

/**
 * POST /identidades/buscar
 *
 * Busca por RUT o correo sin devolver datos personales.
 */
async function buscar(c = {}) {
  const tieneRut =
    c.rut !== undefined &&
    c.rut !== null &&
    c.rut !== '';

  const tieneCorreo =
    typeof c.correo === 'string' &&
    c.correo.trim() !== '';

  if (tieneRut === tieneCorreo) {
    throw errores.solicitudInvalida(
      'Envía «rut» o «correo» (solo uno de los dos).'
    );
  }

  let ids;

  if (tieneRut) {
    const rut = validarRut(String(c.rut));

    if (!rut) {
      throw errores.solicitudInvalida(
        'El RUT no es válido (revisa el dígito verificador).'
      );
    }

    ids = await repo.buscarPorRutHash(huella(rut));
  } else {
    ids = await repo.buscarPorCorreoHash(
      huella(normalizarCorreo(c.correo))
    );
  }

  return {
    existe: ids.length > 0,
    ux_lab_ids: ids,
  };
}

/**
 * Detecta colisiones del UX Lab ID generado.
 */
const esColision = (err) =>
  err.code === '23505' &&
  /ux_lab_id/.test(err.constraint || '');

/**
 * POST /identidades
 *
 * Registra una identidad con sus datos cifrados.
 */
async function crear(c = {}) {
  const d = validarEntrada(c);

  const fila = {
    rut_cifrado: d.rut ? cifrar(d.rut) : null,
    rut_hash: d.rut ? huella(d.rut) : null,
    nombre_cifrado: cifrar(d.nombre),
    correo_cifrado: cifrar(d.correo),
    correo_hash: huella(d.correo),
    telefono_cifrado: cifrar(d.telefono),
    tipo: d.tipo,
    fecha_nacimiento: d.fecha_nacimiento,
  };

  return conReintentoPorColision(async () => {
    try {
      return await repo.crear({
        ...fila,
        ux_lab_id: generarUxLabId(),
      });
    } catch (err) {
      if (
        err.code === '23505' &&
        /rut_hash/.test(err.constraint || '')
      ) {
        throw conflicto(
          'PERSONA_YA_REGISTRADA',
          'Ya existe una persona con ese RUT. Búscala con /identidades/buscar para usar su UX Lab ID.'
        );
      }

      throw err;
    }
  }, {
    esColision,
    mensaje: 'No se pudo generar un UX Lab ID único',
  });
}

/**
 * POST /identidades/:ux_lab_id/desenmascarar
 *
 * Valida la solicitud y obtiene los datos personales
 * descifrados desde el repositorio de identidades.
 *
 * IMPORTANTE:
 * Este servicio no concede permisos.
 * La ruta debe verificar la autorización y su
 * vinculación con el estudio antes de llamarlo.
 */
async function desenmascarar(uxLabId, cuerpo = {}) {
  if (
    typeof uxLabId !== 'string' ||
    !UX_LAB_ID_RE.test(uxLabId)
  ) {
    throw errores.solicitudInvalida(
      'El UX Lab ID no es válido (formato UXL-XXXXXXXX).'
    );
  }

  texto(cuerpo.justificacion, 'justificacion', 2000);

  const identidad =
    await repo.obtenerDescifradaPorUxLabId(uxLabId);

  if (!identidad) {
    throw errores.noEncontrado(
      'La identidad no existe o no está vigente.'
    );
  }

  return identidad;
}

module.exports = {
  buscar,
  crear,
  validarEntrada,
  desenmascarar,
};
