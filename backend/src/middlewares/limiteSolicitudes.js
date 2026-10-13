'use strict';
/**
 * Límite simple de pedidos por IP (Recomendación técnica v2: «límite de solicitudes por IP»).
 * Se usa en el login para frenar a quien prueba contraseñas en masa. Guarda los conteos en memoria:
 * suficiente para una sola instancia de la API (el MVP). Si se escalan instancias, pasar a una solución compartida.
 */
const { ErrorApi } = require('../utils/errores');

function limiteSolicitudes({ maximo = 20, ventanaMs = 60 * 1000 } = {}) {
  const conteos = new Map(); // ip -> { n, inicio }
  return (req, res, next) => {
    const ahora = Date.now();
    const ip = req.ip || 'desconocida';
    let c = conteos.get(ip);
    if (!c || ahora - c.inicio >= ventanaMs) { c = { n: 0, inicio: ahora }; conteos.set(ip, c); }
    c.n += 1;
    if (conteos.size > 10000) { // limpieza para no crecer sin fin
      for (const [k, v] of conteos) if (ahora - v.inicio >= ventanaMs) conteos.delete(k);
    }
    if (c.n > maximo) {
      res.set('Retry-After', String(Math.ceil((c.inicio + ventanaMs - ahora) / 1000)));
      if (req.auditoria) req.auditoria.accion = 'login_fallido';
      return next(new ErrorApi(429, 'DEMASIADAS_SOLICITUDES', 'Demasiadas solicitudes. Espera un momento.'));
    }
    return next();
  };
}

module.exports = { limiteSolicitudes };
