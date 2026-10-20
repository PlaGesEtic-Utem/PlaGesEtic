'use strict';
/**
 * Participaciones con código seudónimo (Actividad 45 · sábado 10, Catálogo v3 · Participaciones).
 *  - Se inscribe a una persona con su UX Lab ID (el que devolvió POST /identidades o /identidades/buscar).
 *  - Si la persona nunca participó, se crea su participante y el vínculo identidad ↔ participante.
 *    Si ya participó en otro estudio, se reutiliza el mismo participante.
 *  - Cada inscripción recibe un código P-XXXXXX aleatorio y distinto por estudio: el código no permite
 *    saber quién es la persona ni relacionar sus participaciones entre estudios.
 *  - es_menor_al_enrolar se calcula con la fecha de nacimiento a la fecha de hoy y queda fijo.
 */
const crypto = require('crypto');
const db = require('../config/db');
const repo = require('../repositories/participacionesRepository');
const { ErrorApi, errores } = require('../utils/errores');

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // el mismo del UX Lab ID: sin 0/O ni 1/I/L
const UX_LAB_ID_RE = /^UXL-[A-Z0-9]{8}$/;
const ESTADOS = ['activo', 'retirado'];
const INTENTOS = 5;

const conflicto = (codigo, mensaje) => new ErrorApi(409, codigo, mensaje);

function nuevoCodigoSeudonimo() {
  const bytes = crypto.randomBytes(6);
  return 'P-' + Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
}

/** El cliente pg entrega DATE como Date local; se pasa a AAAA-MM-DD sin correr el día. */
function fechaComoTexto(d) {
  if (!(d instanceof Date)) return d;
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** ¿Tiene menos de 18 años a la fecha «hoy»? Compara AAAA-MM-DD como texto, sin husos horarios. */
function esMenorDeEdad(fechaNacimiento, hoy = new Date()) {
  const [an, mn, dn] = fechaComoTexto(fechaNacimiento).split('-').map(Number);
  const [ah, mh, dh] = fechaComoTexto(hoy).split('-').map(Number);
  const cumple18 = (ah - an > 18) || (ah - an === 18 && (mh > mn || (mh === mn && dh >= dn)));
  return !cumple18;
}

const presentar = (fila) => ({ ...fila, fecha_inicio: fechaComoTexto(fila.fecha_inicio) });

function validarUxLabId(v) {
  if (typeof v !== 'string' || !v.trim()) throw errores.solicitudInvalida('Falta el campo obligatorio «ux_lab_id».');
  const id = v.trim().toUpperCase();
  if (!UX_LAB_ID_RE.test(id)) throw errores.solicitudInvalida('El UX Lab ID no es válido (formato UXL-XXXXXXXX).');
  return id;
}

/** POST /estudios/:idEstudio/participaciones */
async function inscribir(idEstudio, cuerpo = {}) {
  const uxLabId = validarUxLabId(cuerpo.ux_lab_id);

  for (let intento = 0; intento < INTENTOS; intento++) {
    try {
      return presentar(await db.transaccion(async (c) => {
        const estado = await repo.estadoEstudio(c, idEstudio);
        if (!estado) throw errores.noEncontrado('El estudio no existe.');
        if (estado !== 'activo') {
          throw conflicto('ESTUDIO_NO_ACTIVO', 'Solo se puede inscribir en un estudio activo (con protocolo aprobado por el CEC).');
        }

        const identidad = await repo.identidadPorUxLabId(c, uxLabId);
        if (!identidad) throw errores.noEncontrado('No hay una persona vigente con ese UX Lab ID.');
        if (identidad.tipo !== 'participante') {
          throw conflicto('NO_ES_PARTICIPANTE', 'Ese UX Lab ID es de un representante legal: se inscribe a la persona representada.');
        }

        const idParticipante = await repo.participanteDeIdentidad(c, identidad.id_identidad)
          || await repo.crearParticipanteConVinculo(c, identidad.id_identidad);

        return repo.crearParticipacion(c, {
          id_participante: idParticipante,
          id_estudio: idEstudio,
          codigo_seudonimo: nuevoCodigoSeudonimo(),
          es_menor_al_enrolar: esMenorDeEdad(identidad.fecha_nacimiento),
        });
      }));
    } catch (err) {
      if (err.code === '23505') {
        const restriccion = err.constraint || '';
        if (/participante_estudio/.test(restriccion)) {
          throw conflicto('YA_PARTICIPA', 'Esta persona ya está inscrita en este estudio.');
        }
        // Choque del código aleatorio o dos inscripciones simultáneas de la misma persona nueva:
        // se repite todo (la transacción anterior ya se deshizo).
        if (/codigo_seudonimo|vinculo_identidad/.test(restriccion)) continue;
      }
      throw err;
    }
  }
  throw new Error('No se pudo generar un código seudónimo único');
}

/** GET /estudios/:idEstudio/participaciones */
async function listar(idEstudio, estado) {
  if (estado !== undefined && !ESTADOS.includes(estado)) {
    throw errores.solicitudInvalida('«estado» debe ser activo o retirado.');
  }
  if (!await repo.existeEstudio(idEstudio)) throw errores.noEncontrado('El estudio no existe.');
  return (await repo.listarPorEstudio(idEstudio, estado || null)).map(presentar);
}

module.exports = { inscribir, listar, nuevoCodigoSeudonimo, esMenorDeEdad };
