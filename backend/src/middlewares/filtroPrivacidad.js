'use strict';
/**
 * MIDDLEWARE 4 · FILTRO DE DATOS PERSONALES (seudonimización de la salida)
 * Responsable de completarlo: Benjamín Arias · jueves 08/10 (Actividad 42).
 *
 * Se monta ANTES de los controladores, pero actúa sobre la SALIDA:
 * envuelve res.json() para limpiar la respuesta antes de enviarla.
 *
 * ENTRADA: el objeto que el controlador pasa a res.json() y req.acceso.
 * HACE:    quita (también en objetos anidados y listas) los campos de CAMPOS_PROHIBIDOS,
 *          salvo cuando req.acceso.desenmascarar es true (acción 'desenmascarar', auditada).
 * SALIDA:  la misma respuesta sin esos campos.
 *
 * La lista oficial la entrega Felipe Cruz el 07/10 (especificación de auditoría y filtro).
 */
const CAMPOS_PROHIBIDOS = [
  // TODO (B. Arias, 08/10): completar con la lista de Felipe Cruz.
];

function filtroPrivacidad(req, res, next) {
  const jsonOriginal = res.json.bind(res);
  res.json = (cuerpo) => {
    // TODO (B. Arias, 08/10): limpiar 'cuerpo' según CAMPOS_PROHIBIDOS.
    return jsonOriginal(cuerpo);
  };
  next();
}

module.exports = { filtroPrivacidad, CAMPOS_PROHIBIDOS };
