/* Actividad 58 · jueves: validaciones sin DOM, reutilizables y comprobables con node --test.
 * No conserva datos personales; el controlador de pantalla los elimina al navegar.
 */
(function (raiz, fabrica) {
  const funciones = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = funciones;
  if (raiz) raiz.PlaGesActividad58 = funciones;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const MOTIVOS = new Set(['coordinar_sesion', 'retiro', 'otro']);
  const CONTACTO = ['codigo_seudonimo', 'nombre', 'correo', 'telefono'];
  const IDENTIDAD = ['ux_lab_id', 'rut', 'nombre', 'correo', 'telefono', 'fecha_nacimiento'];
  const MAXIMO = 10 * 1024 * 1024;
  const MIME = new Set(['application/pdf', 'image/png', 'image/jpeg']);

  function validarMotivo(motivo, detalle = '') {
    if (!MOTIVOS.has(motivo)) throw new Error('Selecciona un motivo de contacto válido.');
    const limpio = String(detalle).trim();
    if (motivo === 'otro' && !limpio) throw new Error('Describe brevemente el motivo del contacto.');
    return motivo === 'otro' ? { motivo, detalle: limpio } : { motivo };
  }
  function validarJustificacion(texto) {
    const j = String(texto || '').trim();
    if (j.length < 20) throw new Error('La justificación debe tener al menos 20 caracteres. No escribas nombres ni RUT.');
    return j;
  }
  function validarEvidenciaEvento(tipo, archivo, validarAlta) {
    if (!['retirar', 'reconsentir'].includes(tipo)) throw new Error('Evento de consentimiento inválido.');
    if (tipo === 'reconsentir') {
      if (typeof validarAlta === 'function') return validarAlta('Acepta', archivo);
      if (!archivo) throw new Error('El reconsentimiento exige evidencia firmada.');
    }
    if (archivo && (!archivo.size || archivo.size > MAXIMO ||
      !/\.(pdf|jpe?g|png)$/i.test(archivo.name || '') || (archivo.type && !MIME.has(archivo.type)))) {
      throw new Error('La evidencia debe ser PDF, JPEG o PNG y no superar 10 MB.');
    }
  }
  function soloCampos(datos, permitidos) {
    const resultado = {};
    for (const key of permitidos) {
      if (datos && Object.prototype.hasOwnProperty.call(datos, key)) {
        // No se admiten arrays, objetos o claves adicionales recibidas de la API.
        if (datos[key] === null || ['string', 'number'].includes(typeof datos[key])) {
          resultado[key] = datos[key];
        }
      }
    }
    return resultado;
  }
  const soloContacto = datos => soloCampos(datos, CONTACTO);
  const soloIdentidad = datos => soloCampos(datos, IDENTIDAD);
  function mensajeError(error) {
    const code = error?.codigo || '';
    const status = error?.status;
    if (status === 401) return 'Tu sesión expiró o falta iniciar sesión. Ingresa nuevamente.';
    if (status === 403) return 'No tienes permiso para esta operación. Solicita autorización al responsable o Director.';
    if (status === 503 || code === 'AUDITORIA_NO_DISPONIBLE')
      return 'Auditoría no disponible. No se mostrarán datos personales ni se registrará el evento. Intenta más tarde.';
    if (status === 409) return String(error?.mensaje || 'La operación no está permitida con el estado actual. Actualiza la ficha.');
    if (status === 404) return 'No se encontró el recurso. Actualiza la ficha y vuelve a intentar.';
    return String(error?.mensaje || error?.message || 'No se pudo completar la operación.');
  }
  return { validarMotivo, validarJustificacion, validarEvidenciaEvento, soloContacto, soloIdentidad, mensajeError };
});
