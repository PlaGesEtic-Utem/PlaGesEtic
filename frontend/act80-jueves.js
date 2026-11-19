'use strict';
/* Funciones puras para las correcciones UX del jueves - Actividad 80. */
(function (raiz, fabrica) {
  const modulo = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = modulo;
  if (raiz) raiz.PlaGesAct80Jueves = modulo;
})(typeof window !== 'undefined' ? window : null, function () {
  function fechaLocal(d) {
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')].join('-');
  }
  function cuentaVencida(fechaExpiracion, hoy = new Date()) {
    if (!fechaExpiracion) return false;
    const fecha = String(fechaExpiracion).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
    return fecha < fechaLocal(hoy); // Valida hasta el fin del dia indicado.
  }
  function estadoCuenta(usuario, hoy = new Date()) {
    if (!usuario.activo) return 'Bloqueada';
    return cuentaVencida(usuario.fecha_expiracion, hoy) ? 'Vencida' : 'Activa';
  }
  function secretoDesdeUri(uri) {
    let u;
    try { u = new URL(uri); } catch (_) { throw new Error('QR MFA invalido.'); }
    if (u.protocol !== 'otpauth:' || u.hostname !== 'totp') {
      throw new Error('Formato del QR MFA no reconocido.');
    }
    const secreto = (u.searchParams.get('secret') || '').trim().toUpperCase();
    if (!/^[A-Z2-7]{16,128}$/.test(secreto)) {
      throw new Error('El QR no incluye una clave MFA valida.');
    }
    return secreto;
  }
  function consultaParticipantes(estado) {
    const p = new URLSearchParams();
    p.set('pagina', String(estado.pagina || 1));
    p.set('limite', String(estado.limite || 20));
    const q = String(estado.q || '').trim();
    if (q) p.set('q', q);
    if (estado.estado) p.set('estado', estado.estado);
    return p.toString();
  }
  function normalizarParticipantes(respuesta, estado) {
    if (Array.isArray(respuesta)) {
      let datos = respuesta.slice();
      const q = String(estado.q || '').trim().toLocaleLowerCase('es');
      if (q) datos = datos.filter(p =>
        String(p.codigo_seudonimo || '').toLocaleLowerCase('es').includes(q));
      if (estado.estado) datos = datos.filter(p => p.estado === estado.estado);
      const limite = estado.limite || 20;
      const pagina = estado.pagina || 1;
      return { datos: datos.slice((pagina - 1) * limite, pagina * limite),
        total: datos.length, pagina, limite, modo: 'compatibilidad' };
    }
    if (!respuesta || !Array.isArray(respuesta.datos) ||
        !Number.isInteger(respuesta.total) || respuesta.total < 0 ||
        !Number.isInteger(respuesta.pagina) || respuesta.pagina < 1 ||
        !Number.isInteger(respuesta.limite) ||
        respuesta.limite < 1 || respuesta.limite > 100) {
      throw new Error('El backend no devolvio el contrato de paginacion de participantes esperado.');
    }
    return { datos: respuesta.datos, total: respuesta.total,
      pagina: respuesta.pagina, limite: respuesta.limite, modo: 'servidor' };
  }
  return { cuentaVencida, estadoCuenta, secretoDesdeUri,
    consultaParticipantes, normalizarParticipantes };
});
