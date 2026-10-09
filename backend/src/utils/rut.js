'use strict';
/**
 * RUT chileno: normalizar y validar el dígito verificador (módulo 11).
 * Se normaliza ANTES de calcular la huella, para que «11.111.111-1» y «11111111-1» sean la misma persona.
 */
function normalizarRut(rut) {
  if (typeof rut !== 'string') return null;
  const limpio = rut.replace(/[.\s]/g, '').toUpperCase();
  const m = limpio.match(/^(\d{7,8})-?([\dK])$/);
  return m ? `${m[1]}-${m[2]}` : null;
}

function digitoVerificador(cuerpo) {
  let suma = 0, mult = 2;
  for (const d of String(cuerpo).split('').reverse()) { suma += Number(d) * mult; mult = mult === 7 ? 2 : mult + 1; }
  const r = 11 - (suma % 11);
  return r === 11 ? '0' : r === 10 ? 'K' : String(r);
}

/** Devuelve el RUT normalizado (12345678-9) o null si el formato o el dígito verificador no calzan. */
function validarRut(rut) {
  const n = normalizarRut(rut);
  if (!n) return null;
  const [cuerpo, dv] = n.split('-');
  return digitoVerificador(cuerpo) === dv ? n : null;
}

module.exports = { normalizarRut, validarRut, digitoVerificador };
