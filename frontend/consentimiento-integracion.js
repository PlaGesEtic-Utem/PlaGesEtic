/* Integración del alta de participante con el consentimiento (Actividad 58).
 * Sin almacenamiento permanente: el estado parcial vive solo en memoria.
 * Funciones independientes del DOM para permitir pruebas automáticas.
 */
(function (raiz, fabrica) {
  const funciones = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = funciones;
  if (raiz) raiz.PlaGesConsentimiento = funciones;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const MAXIMO = 10 * 1024 * 1024;
  const EXTENSIONES = /\.(pdf|png|jpe?g)$/i;
  const MIME = new Set(['application/pdf', 'image/jpeg', 'image/png']);

  function validarEvidencia(decision, archivo) {
    if (decision !== 'Acepta' && decision !== 'Niega') {
      throw new Error('Selecciona si la persona acepta o niega.');
    }
    if (decision === 'Niega') {
      if (archivo) throw new Error('Para registrar una negación, quita el archivo adjunto.');
      return;
    }
    if (!archivo) throw new Error('Para aceptar, adjunta la evidencia firmada.');
    if (!archivo.size || archivo.size > MAXIMO) {
      throw new Error('La evidencia debe pesar más de 0 bytes y no superar 10 MB.');
    }
    if (!EXTENSIONES.test(archivo.name || '') || (archivo.type && !MIME.has(archivo.type))) {
      throw new Error('La evidencia debe ser un PDF, JPEG o PNG.');
    }
    // El servidor valida la firma del formato por sus bytes; esto es solo validación previa de interfaz.
  }

  async function completarAlta({ estado, obtenerIdentidad, inscribir, registrar }) {
    if (!estado || typeof estado !== 'object') throw new Error('Falta el estado temporal de la inscripción.');
    if (!estado.uxLabId) {
      estado.uxLabId = await obtenerIdentidad();
      if (!estado.uxLabId) throw new Error('La API no devolvió un identificador UX Lab.');
    }
    if (!estado.idParticipacion) {
      const alta = await inscribir(estado.uxLabId);
      if (!alta || !alta.id_participacion || !alta.codigo_seudonimo) {
        throw new Error('La API no devolvió los identificadores de la inscripción.');
      }
      estado.idParticipacion = alta.id_participacion;
      estado.codigo = alta.codigo_seudonimo;
    }
    if (!estado.consentimiento) {
      // Si falla aquí, la inscripción y su código quedan conservados para reintentar SOLO el consentimiento.
      const consentimiento = await registrar(estado.idParticipacion);
      if (!consentimiento || !consentimiento.id_consentimiento || !consentimiento.estado_vigente) {
        throw new Error('La API no confirmó el registro de consentimiento. Revisa la ficha antes de reintentar.');
      }
      estado.consentimiento = consentimiento;
    }
    return { idParticipacion: estado.idParticipacion, codigo: estado.codigo, consentimiento: estado.consentimiento };
  }

  return { validarEvidencia, completarAlta, MAXIMO };
});
