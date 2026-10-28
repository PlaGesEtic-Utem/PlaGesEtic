'use strict';
/**
 * Reglas de negocio de los documentos de consentimiento (PDF versionado por estudio y tipo).
 *  - Solo PDF (se revisa el tipo declarado y los bytes iniciales %PDF-), máximo 10 MB (lo corta multer).
 *  - La versión no se repite dentro de (estudio, tipo): si se repite → 409.
 *  - Al subir una versión nueva, la anterior del mismo tipo deja de ser vigente (en una transacción).
 *  - Si la base falla después de guardar el archivo, el archivo se borra.
 */
const repo = require('../repositories/documentosConsentimientoRepository');
const estudiosRepo = require('../repositories/estudiosRepository');
const almacenamiento = require('../utils/almacenamiento');
const { ErrorApi, errores } = require('../utils/errores');

const TIPOS = ['consentimiento', 'asentimiento'];
const VERSION_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,19}$/;
const SUBCARPETA = 'consentimientos';

const conflictoVersion = () => new ErrorApi(409, 'VERSION_DUPLICADA',
  'Ya existe un documento de ese tipo con esa versión en el estudio.');

function validar(cuerpo, archivo) {
  const tipo = typeof cuerpo.tipo === 'string' ? cuerpo.tipo.trim() : '';
  if (!TIPOS.includes(tipo)) throw errores.solicitudInvalida(`«tipo» debe ser ${TIPOS.join(' o ')}.`);

  const version = typeof cuerpo.version === 'string' ? cuerpo.version.trim() : '';
  if (!VERSION_RE.test(version)) {
    throw errores.solicitudInvalida('«version» es obligatoria: hasta 20 caracteres (letras, números, punto, guion).');
  }

  if (!archivo || !archivo.buffer || archivo.buffer.length === 0) {
    throw errores.solicitudInvalida('Falta el archivo PDF en el campo «archivo».');
  }
  if (archivo.buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw errores.tipoNoPermitido('El archivo no es un PDF válido.');
  }
  return { tipo, version };
}

async function subir(idEstudio, cuerpo, archivo) {
  const { tipo, version } = validar(cuerpo, archivo);

  if (!(await estudiosRepo.obtener(idEstudio))) throw errores.noEncontrado('El estudio no existe.');
  if (await repo.existeVersion(idEstudio, tipo, version)) throw conflictoVersion();

  const guardado = await almacenamiento.guardar(SUBCARPETA, archivo.buffer, 'pdf');
  try {
    return await repo.registrarNuevaVersion({
      id_estudio: idEstudio, tipo, version, ruta: guardado.ruta, hash: guardado.hash,
    });
  } catch (err) {
    await almacenamiento.eliminar(guardado.ruta).catch(() => {});
    if (err && err.code === '23505') throw conflictoVersion(); // carrera entre dos subidas iguales
    throw err;
  }
}

async function listar(idEstudio, consulta) {
  let tipo = null;
  if (consulta.tipo !== undefined && consulta.tipo !== '') {
    if (!TIPOS.includes(consulta.tipo)) throw errores.solicitudInvalida(`El filtro «tipo» debe ser ${TIPOS.join(' o ')}.`);
    tipo = consulta.tipo;
  }
  if (!(await estudiosRepo.obtener(idEstudio))) throw errores.noEncontrado('El estudio no existe.');
  return repo.listarPorEstudio(idEstudio, { tipo, soloVigentes: consulta.vigente === 'true' });
}

module.exports = { subir, listar, TIPOS };
