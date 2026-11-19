/* Utilidades del listado de estudios (Actividad 80). */
(function (raiz, fabrica) {
  const modulo = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = modulo;
  if (raiz) raiz.PlaGesAct80Estudios = modulo;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  function consulta(s) {
    const p = new URLSearchParams();
    p.set('pagina', String(s.pagina || 1));
    p.set('limite', String(s.limite || 20));
    p.set('orden', s.orden || 'fecha');
    if (s.q && s.q.trim()) p.set('q', s.q.trim());
    if (s.estado) p.set('estado', s.estado);
    p.set('solo_mios', String(Boolean(s.soloMios)));
    return p.toString();
  }
  function normalizar(respuesta, s) {
    if (Array.isArray(respuesta)) {
      // Compatibilidad con el backend que aún no pagina.
      let datos = respuesta.slice();
      const q = String(s.q || '').trim().toLocaleLowerCase('es');
      if (q) datos = datos.filter(e =>
        String(e.codigo_estudio || e.codigo || '').toLocaleLowerCase('es').includes(q) ||
        String(e.nombre || '').toLocaleLowerCase('es').includes(q));
      if (s.estado) datos = datos.filter(e => e.estado === s.estado);
      const total = datos.length;
      const limite = s.limite || 20;
      return {
        datos: datos.slice((s.pagina - 1) * limite, s.pagina * limite),
        total, pagina: s.pagina, limite, modo: 'compatibilidad'
      };
    }
    if (!respuesta || !Array.isArray(respuesta.datos) ||
        !Number.isInteger(respuesta.total) || respuesta.total < 0 ||
        !Number.isInteger(respuesta.pagina) || respuesta.pagina < 1 ||
        !Number.isInteger(respuesta.limite) || respuesta.limite < 1) {
      throw new Error('El servidor no devolvió el contrato de paginación esperado.');
    }
    return {
      datos: respuesta.datos,
      total: respuesta.total,
      pagina: respuesta.pagina,
      limite: respuesta.limite,
      modo: 'servidor'
    };
  }
  return { consulta, normalizar };
});
