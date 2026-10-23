'use strict';
/**
 * Generador único de códigos legibles (UX Lab ID y código seudónimo).
 * Los formatos son los de siempre: UXL-XXXXXXXX y P-XXXXXX.
 */
const crypto = require('crypto');

// 32 símbolos, sin 0/O ni 1/I para no confundirlos al leerlos (la L sí está).
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// «byte % largo» solo es uniforme si el largo divide a 256. Si alguien cambia el alfabeto, esto avisa.
if (256 % ALFABETO.length !== 0) {
  throw new Error('El alfabeto debe tener un tamaño que divida a 256 para no sesgar los códigos.');
}

function generarCodigo(prefijo, largo) {
  const bytes = crypto.randomBytes(largo);
  return prefijo + Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
}

const generarUxLabId = () => generarCodigo('UXL-', 8);
const generarCodigoSeudonimo = () => generarCodigo('P-', 6);

const INTENTOS_POR_DEFECTO = 5;
const esViolacionDeUnicidad = (err) => Boolean(err) && err.code === '23505';

/**
 * Ejecuta `operacion` y, si falla por colisión (por defecto, 23505 de PostgreSQL), la repite.
 * La operación debe generar su código dentro, para que cada intento use uno nuevo.
 */
async function conReintentoPorColision(operacion, {
  intentos = INTENTOS_POR_DEFECTO,
  esColision = esViolacionDeUnicidad,
  mensaje = 'No se pudo generar un código único',
} = {}) {
  for (let intento = 1; intento <= intentos; intento++) {
    try {
      return await operacion(intento);
    } catch (err) {
      if (!esColision(err)) throw err;
    }
  }
  throw new Error(mensaje);
}

module.exports = { ALFABETO, generarCodigo, generarUxLabId, generarCodigoSeudonimo, conReintentoPorColision };