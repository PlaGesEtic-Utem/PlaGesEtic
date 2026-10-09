'use strict';
/**
 * Cifrado de datos personales (RNF-SEC-01, Diccionario v3 · identity_schema).
 *
 *  - cifrar / descifrar: AES-256-GCM. Para datos que el sistema necesita volver a leer
 *    (nombre, RUT, correo, teléfono). Formato guardado: "v1:" + base64(iv | tag | texto cifrado).
 *    GCM detecta si alguien alteró el dato: descifrar lanza error.
 *  - huella: HMAC-SHA-256 en hexadecimal (64 caracteres). Para buscar o detectar duplicados
 *    sin descifrar (rut_hash, correo_hash). El mismo dato siempre da la misma huella.
 *
 * Clave: variable de entorno CLAVE_CIFRADO (32 bytes en base64). De ella se derivan dos subclaves
 * distintas (una para cifrar y otra para la huella), así una no revela la otra.
 * La clave nunca va en el repositorio; su guardado y rotación en producción está pendiente (Especificación técnica).
 */
const crypto = require('crypto');

const CLAVE_EJEMPLO = 'cGxhR2VzRXRpYy1zb2xvLWRlc2Fycm9sbG8tMzJieXQ='; // la de .env.example: SOLO desarrollo
let claves = null;

function obtenerClaves() {
  if (claves) return claves;
  const b64 = process.env.CLAVE_CIFRADO;
  if (!b64) throw new Error('Falta CLAVE_CIFRADO en el .env (ver .env.example).');
  const maestra = Buffer.from(b64, 'base64');
  if (maestra.length !== 32) throw new Error('CLAVE_CIFRADO debe ser de 32 bytes en base64.');
  if (process.env.NODE_ENV === 'production' && b64 === CLAVE_EJEMPLO) {
    throw new Error('CLAVE_CIFRADO es la clave de ejemplo: no se permite en producción.');
  }
  const derivar = (uso) => Buffer.from(crypto.hkdfSync('sha256', maestra, Buffer.alloc(0), `plagesetic:${uso}`, 32));
  claves = { cifrado: derivar('cifrado'), huella: derivar('huella') };
  return claves;
}

function cifrar(texto) {
  if (texto === null || texto === undefined) return null;
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', obtenerClaves().cifrado, iv);
  const cifrado = Buffer.concat([c.update(String(texto), 'utf8'), c.final()]);
  return 'v1:' + Buffer.concat([iv, c.getAuthTag(), cifrado]).toString('base64');
}

function descifrar(guardado) {
  if (guardado === null || guardado === undefined) return null;
  if (!String(guardado).startsWith('v1:')) throw new Error('Formato de cifrado desconocido');
  const datos = Buffer.from(String(guardado).slice(3), 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', obtenerClaves().cifrado, datos.subarray(0, 12));
  d.setAuthTag(datos.subarray(12, 28));
  return Buffer.concat([d.update(datos.subarray(28)), d.final()]).toString('utf8');
}

function huella(texto) {
  if (texto === null || texto === undefined) return null;
  return crypto.createHmac('sha256', obtenerClaves().huella).update(String(texto), 'utf8').digest('hex');
}

/** Solo para las pruebas automáticas. */
function _reiniciarClaves() { claves = null; }

module.exports = { cifrar, descifrar, huella, CLAVE_EJEMPLO, _reiniciarClaves };
