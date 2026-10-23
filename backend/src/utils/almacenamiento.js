'use strict';
/**
 * Almacenamiento de archivos en disco (volumen `almacenamiento` de Docker).
 *
 *   guardar(subcarpeta, buffer, extension) → { ruta, hash, tamano }
 *   eliminar(ruta)                          → borra el archivo (no falla si ya no existe)
 *   rutaAbsoluta(ruta)                      → ruta real en disco, sin salir de la carpeta raíz
 *
 * - El nombre del archivo es aleatorio (16 bytes en hexadecimal): nunca se usa el nombre que
 *   trae el usuario, así no hay colisiones ni rutas manipuladas.
 * - En la base se guarda la ruta RELATIVA (p. ej. consentimientos/9f2c….pdf), no la absoluta:
 *   así el mismo registro sirve en Docker y en la PC de cada integrante.
 * - La carpeta raíz sale de ALMACENAMIENTO_DIR (en Docker: /app/almacenamiento).
 */
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const RAIZ = path.resolve(process.env.ALMACENAMIENTO_DIR || path.join(process.cwd(), 'almacenamiento'));

/** Huella SHA-256 (64 caracteres hexadecimales) de un contenido. */
function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/** Convierte una ruta relativa en absoluta y rechaza cualquier intento de salir de la raíz. */
function rutaAbsoluta(rutaRelativa) {
  const absoluta = path.resolve(RAIZ, String(rutaRelativa));
  if (absoluta !== RAIZ && !absoluta.startsWith(RAIZ + path.sep)) {
    throw new Error('La ruta del archivo queda fuera del almacenamiento');
  }
  return absoluta;
}

/** Guarda el contenido con nombre aleatorio y devuelve ruta relativa, hash y tamaño. */
async function guardar(subcarpeta, buffer, extension) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error('No hay contenido para guardar');
  const ext = String(extension || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  const nombre = crypto.randomBytes(16).toString('hex') + (ext ? '.' + ext : '');
  const relativa = path.posix.join(subcarpeta, nombre);
  const absoluta = rutaAbsoluta(relativa);
  await fs.mkdir(path.dirname(absoluta), { recursive: true, mode: 0o750 });
  // flag 'wx': falla si el archivo ya existe, en vez de pisarlo.
  await fs.writeFile(absoluta, buffer, { flag: 'wx', mode: 0o640 });
  return { ruta: relativa, hash: sha256(buffer), tamano: buffer.length };
}

/** Borra un archivo guardado (se usa para limpiar si la transacción en la base falla). */
async function eliminar(rutaRelativa) {
  try {
    await fs.unlink(rutaAbsoluta(rutaRelativa));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

module.exports = { guardar, eliminar, rutaAbsoluta, sha256 };
