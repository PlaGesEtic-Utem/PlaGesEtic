
'use strict';

/**
 * Servicio de participaciones.
 *
 * - Inscripción con código seudónimo.
 * - Listado de participaciones por estudio.
 * - Consulta excepcional de datos de contacto.
 *
 * El descifrado de datos personales se realiza
 * exclusivamente en identidadesRepository.js.
 */

const db = require('../config/db');
const repo = require('../repositories/participacionesRepository');
const identidadesRepo = require('../repositories/identidadesRepository');
const { ErrorApi, errores } = require('../utils/errores');
const {
  generarCodigoSeudonimo,
  conReintentoPorColision,
} = require('../utils/codigos');

const UX_LAB_ID_RE = /^UXL-[A-Z0-9]{8}$/;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ESTADOS = ['activo', 'retirado'];

const MOTIVOS_CONTACTO = [
  'coordinar_sesion',
  'reconsentimiento',
  'incidente',
  'retiro',
  'otro',
];

const conflicto = (codigo, mensaje) =>
  new ErrorApi(409, codigo, mensaje);

/**
 * Convierte las fechas DATE de PostgreSQL a texto.
 */
function fechaComoTexto(d) {
  if (!(d instanceof Date)) return d;

  const p = (x) => String(x).padStart(2, '0');

  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Determina si una persona tiene menos de 18 años.
 */
function esMenorDeEdad(fechaNacimiento, hoy = new Date()) {
  const [an, mn, dn] = fechaComoTexto(fechaNacimiento)
    .split('-')
    .map(Number);

  const [ah, mh, dh] = fechaComoTexto(hoy)
    .split('-')
    .map(Number);

  const cumple18 =
    (ah - an > 18) ||
    (
      ah - an === 18 &&
      (
        mh > mn ||
        (mh === mn && dh >= dn)
      )
    );

  return !cumple18;
}

const presentar = (fila) => ({
  ...fila,
  fecha_inicio: fechaComoTexto(fila.fecha_inicio),
});

/**
 * Valida el identificador UX Lab.
 */
function validarUxLabId(v) {
  if (typeof v !== 'string' || !v.trim()) {
    throw errores.solicitudInvalida(
      'Falta el campo obligatorio «ux_lab_id».'
    );
  }

  const id = v.trim().toUpperCase();

  if (!UX_LAB_ID_RE.test(id)) {
    throw errores.solicitudInvalida(
      'El UX Lab ID no es válido (formato UXL-XXXXXXXX).'
    );
  }

  return id;
}

/**
 * Detecta colisiones del código seudónimo
 * y del vínculo de identidad.
 */
const esColision = (err) =>
  err.code === '23505' &&
  /codigo_seudonimo|vinculo_identidad/.test(
    err.constraint || ''
  );

/**
 * POST /estudios/:idEstudio/participaciones
 *
 * Inscribe a una persona en un estudio activo.
 */
async function inscribir(idEstudio, cuerpo = {}) {
  const uxLabId = validarUxLabId(cuerpo.ux_lab_id);

  return conReintentoPorColision(async () => {
    try {
      return presentar(
        await db.transaccion(async (c) => {
          const estado = await repo.estadoEstudio(
            c,
            idEstudio
          );

          if (!estado) {
            throw errores.noEncontrado(
              'El estudio no existe.'
            );
          }

          if (estado !== 'activo') {
            throw conflicto(
              'ESTUDIO_NO_ACTIVO',
              'Solo se puede inscribir en un estudio activo (con protocolo aprobado por el CEC).'
            );
          }

          const identidad = await repo.identidadPorUxLabId(
            c,
            uxLabId
          );

          if (!identidad) {
            throw errores.noEncontrado(
              'No hay una persona vigente con ese UX Lab ID.'
            );
          }

          if (identidad.tipo !== 'participante') {
            throw conflicto(
              'NO_ES_PARTICIPANTE',
              'Ese UX Lab ID es de un representante legal: se inscribe a la persona representada.'
            );
          }

          const idParticipante =
            await repo.participanteDeIdentidad(
              c,
              identidad.id_identidad
            ) ||
            await repo.crearParticipanteConVinculo(
              c,
              identidad.id_identidad
            );

          return repo.crearParticipacion(c, {
            id_participante: idParticipante,
            id_estudio: idEstudio,
            codigo_seudonimo: generarCodigoSeudonimo(),
            es_menor_al_enrolar: esMenorDeEdad(
              identidad.fecha_nacimiento
            ),
          });
        })
      );
    } catch (err) {
      if (
        err.code === '23505' &&
        /participante_estudio/.test(
          err.constraint || ''
        )
      ) {
        throw conflicto(
          'YA_PARTICIPA',
          'Esta persona ya está inscrita en este estudio.'
        );
      }

      throw err;
    }
  }, {
    esColision,
    mensaje: 'No se pudo generar un código seudónimo único',
  });
}

/**
 * GET /estudios/:idEstudio/participaciones
 *
 * Lista participaciones sin datos personales.
 */
async function listar(idEstudio, estado) {
  if (
    estado !== undefined &&
    !ESTADOS.includes(estado)
  ) {
    throw errores.solicitudInvalida(
      '«estado» debe ser activo o retirado.'
    );
  }

  if (!await repo.existeEstudio(idEstudio)) {
    throw errores.noEncontrado(
      'El estudio no existe.'
    );
  }

  return (
    await repo.listarPorEstudio(
      idEstudio,
      estado || null
    )
  ).map(presentar);
}

/**
 * Valida el motivo de consulta de contacto.
 *
 * Cuando el motivo es "otro", exige detalle.
 */
function validarMotivoContacto(cuerpo = {}) {
  if (
    !cuerpo ||
    typeof cuerpo !== 'object' ||
    Array.isArray(cuerpo)
  ) {
    throw errores.solicitudInvalida(
      'El cuerpo de la solicitud no es válido.'
    );
  }

  if (!MOTIVOS_CONTACTO.includes(cuerpo.motivo)) {
    throw errores.solicitudInvalida(
      '«motivo» debe ser coordinar_sesion, reconsentimiento, incidente, retiro u otro.'
    );
  }

  let detalle = null;

  if (cuerpo.motivo === 'otro') {
    if (
      typeof cuerpo.detalle !== 'string' ||
      !cuerpo.detalle.trim()
    ) {
      throw errores.solicitudInvalida(
        '«detalle» es obligatorio cuando el motivo es otro.'
      );
    }

    detalle = cuerpo.detalle.trim();

    if (detalle.length > 2000) {
      throw errores.solicitudInvalida(
        '«detalle» admite como máximo 2000 caracteres.'
      );
    }
  }

  return {
    motivo: cuerpo.motivo,
    detalle,
  };
}

/**
 * POST /participaciones/:idParticipacion/contacto
 *
 * Consulta datos de contacto de una participación.
 *
 * REGLAS:
 * - El motivo debe ser válido.
 * - Si está retirada, solo se permite "retiro".
 * - La restricción se verifica ANTES de descifrar.
 * - La respuesta solo contiene nombre,
 *   correo y teléfono.
 *
 * La autorización debe comprobarse previamente
 * en el middleware accesoContacto.
 */
async function consultarContacto(
  idParticipacion,
  cuerpo = {}
) {
  if (
    typeof idParticipacion !== 'string' ||
    !UUID_RE.test(idParticipacion)
  ) {
    throw errores.solicitudInvalida(
      'El identificador de participación no es válido.'
    );
  }

  /**
   * Primero validamos el motivo.
   *
   * Nunca enviamos un motivo no validado
   * al repositorio de identidades.
   */
  const { motivo } = validarMotivoContacto(cuerpo);

  /**
   * El repositorio comprueba el estado de
   * la participación antes del descifrado.
   *
   * Una participación retirada con motivo
   * distinto de "retiro" produce un error 409
   * sin descifrar datos personales.
   */
  const contacto =
    await identidadesRepo.obtenerContactoPorParticipacion(
      idParticipacion,
      motivo
    );

  if (!contacto) {
    throw errores.noEncontrado(
      'No existe una identidad vigente para esta participación.'
    );
  }

  /**
   * Defensa adicional en el servicio.
   *
   * Esta condición normalmente ya fue comprobada
   * por el repositorio.
   */
  if (
    contacto.estado === 'retirado' &&
    motivo !== 'retiro'
  ) {
    throw conflicto(
      'PARTICIPACION_RETIRADA',
      'Una participación retirada solo admite contacto por motivo retiro.'
    );
  }

  /**
 * La respuesta pública contiene únicamente
 * los cuatro campos definidos en D12.
 *
 * No se expone el estado de la participación
 * ni identificadores internos.
 */
return {
  codigo_seudonimo: contacto.codigo_seudonimo,
  nombre: contacto.nombre,
  correo: contacto.correo,
  telefono: contacto.telefono,
};
}

module.exports = {
  inscribir,
  listar,
  esMenorDeEdad,
  validarMotivoContacto,
  consultarContacto,
};
