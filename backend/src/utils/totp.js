'use strict';
/**
 * Códigos TOTP (RFC 6238), los mismos que generan Google Authenticator, Microsoft Authenticator o Authy.
 * Un código de 6 dígitos cambia cada 30 segundos y se calcula con un secreto compartido
 * entre el servidor y la app del celular. Implementado con el módulo crypto de Node (sin dependencias).
 */
const crypto = require('crypto');

const ALFABETO_B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PERIODO = 30;   // segundos que dura cada código
const DIGITOS = 6;

function base32Codificar(buf) {
  let bits = 0, valor = 0, salida = '';
  for (const byte of buf) {
    valor = (valor << 8) | byte; bits += 8;
    while (bits >= 5) { salida += ALFABETO_B32[(valor >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) salida += ALFABETO_B32[(valor << (5 - bits)) & 31];
  return salida;
}

function base32Decodificar(texto) {
  const limpio = String(texto).toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0, valor = 0;
  const bytes = [];
  for (const c of limpio) {
    const i = ALFABETO_B32.indexOf(c);
    if (i < 0) throw new Error('Secreto TOTP con caracteres no válidos');
    valor = (valor << 5) | i; bits += 5;
    if (bits >= 8) { bytes.push((valor >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(bytes);
}

/** Secreto nuevo de 160 bits en base32 (lo que se guarda cifrado en usuario.mfa_secret). */
function generarSecreto() {
  return base32Codificar(crypto.randomBytes(20));
}

/** Código de 6 dígitos para un instante (por defecto, ahora). */
function codigo(secretoBase32, instanteMs = Date.now()) {
  const contador = Math.floor(instanteMs / 1000 / PERIODO);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(contador));
  const hmac = crypto.createHmac('sha1', base32Decodificar(secretoBase32)).update(msg).digest();
  const desplazamiento = hmac[hmac.length - 1] & 0x0f;
  const numero = (hmac.readUInt32BE(desplazamiento) & 0x7fffffff) % 10 ** DIGITOS;
  return String(numero).padStart(DIGITOS, '0');
}

/**
 * ¿El código es válido? Acepta el código actual y el de ±1 intervalo (30 s), por si el reloj
 * del celular está un poco desfasado (Recomendación técnica v2). Comparación en tiempo constante.
 */
function verificar(secretoBase32, codigoIngresado, instanteMs = Date.now(), ventana = 1) {
  const c = String(codigoIngresado || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(c)) return false;
  for (let k = -ventana; k <= ventana; k++) {
    const esperado = codigo(secretoBase32, instanteMs + k * PERIODO * 1000);
    if (crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(c))) return true;
  }
  return false;
}

/** Dirección otpauth:// que se convierte en el QR (para el enrolamiento de la Actividad 74). */
function uriOtpauth(secretoBase32, cuenta, emisor = 'plaGesEtic') {
  const etiqueta = encodeURIComponent(`${emisor}:${cuenta}`);
  return `otpauth://totp/${etiqueta}?secret=${secretoBase32}&issuer=${encodeURIComponent(emisor)}&algorithm=SHA1&digits=6&period=30`;
}

module.exports = { generarSecreto, codigo, verificar, uriOtpauth, base32Codificar, base32Decodificar };
