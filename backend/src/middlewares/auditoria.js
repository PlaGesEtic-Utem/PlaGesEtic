'use strict';
/**
 *
 * ENTRADA: cualquier solicitud (también las públicas como /auth/login).
 * SALIDA:  req.auditoria con la fila que se insertará en security_schema.auditoria:
 *   { id_usuario, correo_intentado, id_sesion, ip, entidad, id_registro_afectado,
 *     id_estudio, accion, resultado, justificacion, id_autorizacion, fecha_hora }
 *   Los middlewares siguientes y los controladores van completando campos
 *   (autenticación pone id_usuario e id_sesion; la ruta pone entidad y acción).
 *
 * AL TERMINAR la respuesta (evento 'finish'), también en 401 y 403:
 *   - resultado = 'exito' si el código es < 400; si no, 'error'.
 *   - INSERT con auditoriaRepository.registrar(req.auditoria).
 *   - Si el INSERT falla: se deja en el log del sistema y la respuesta NO se bloquea.
 *   - Nunca se guarda contenido de datos personales, contraseñas, códigos MFA ni tokens:
 *     solo identificadores (y la justificación, que es texto del usuario sobre el motivo).
 */
const auditoriaRepository = require('../repositories/auditoriaRepository');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const esUuid = (v) => typeof v === 'string' && UUID_RE.test(v);


const ACCION_POR_METODO = {
  GET: 'leer',
  POST: 'crear',
  PUT: 'actualizar',
  PATCH: 'actualizar',
  DELETE: 'eliminar',
};

function auditoria(req, res, next) {
  req.auditoria = {
    id_usuario: null,
    correo_intentado: null,
    id_sesion: null,
    ip: req.ip || null,
    entidad: null,
    id_registro_afectado: null,
    id_estudio: null,
    accion: null,
    resultado: null,
    justificacion: null,
    id_autorizacion: null,
    fecha_hora: new Date(),
  };

  res.once('finish', () => {

    try {
      if (req.auditoriaPreviaIntentada) return;
      const a = completarAuditoria(req);
      a.resultado = res.statusCode < 400 ? 'exito' : 'error';
      Promise.resolve(auditoriaRepository.registrar(a)).catch((err) => registrarFallo(err, a));
    } catch (err) {
      registrarFallo(err, req.auditoria);
    }
  });

  next();
}


function completarAuditoria(req) {
  const a = req.auditoria;
  if (!a) throw new Error('Auditoría no inicializada');

  // Evita registros sin entidad cuando la solicitud falla antes de llegar a su ruta.
  if (typeof a.entidad !== 'string' || !a.entidad.trim()) {
    a.entidad = 'sistema';
  }
  // Datos que dejaron los middlewares anteriores, si nadie los copió antes.
  if (req.usuario) {
    a.id_usuario = a.id_usuario || req.usuario.id_usuario || null;
    a.id_sesion = a.id_sesion || req.usuario.id_sesion || null;
  }
  if (req.acceso && req.acceso.id_autorizacion && !a.id_autorizacion) {
    a.id_autorizacion = req.acceso.id_autorizacion;
  }


  a.id_estudio = a.id_estudio
    || (req.acceso && req.acceso.id_estudio)
    || (req.params && req.params.idEstudio)
    || (req.body && req.body.id_estudio)
    || null;


  if (!esUuid(a.id_estudio)) a.id_estudio = null;
  if (!esUuid(a.id_registro_afectado)) a.id_registro_afectado = null;


  a.accion = a.accion || ACCION_POR_METODO[req.method] || 'leer';


  if (a.accion === 'desenmascarar' && !a.justificacion
      && req.body && typeof req.body.justificacion === 'string') {
    a.justificacion = req.body.justificacion;
  }

  // VARCHAR(45) en la tabla.
  if (a.ip) a.ip = String(a.ip).slice(0, 45);


  return a;
}

/** D17: escritura obligatoria y confirmada ANTES de entregar datos sensibles. */
async function registrarAhora(req) {
  // Impide reintentos automáticos en finish incluso cuando PostgreSQL falla.
  if (req.auditoriaPreviaIntentada) throw new Error('Auditoría previa ya intentada');
  req.auditoriaPreviaIntentada = true;
  const a = completarAuditoria(req);
  a.resultado = 'exito';
  try {
    await auditoriaRepository.registrar(a);
  } catch (err) {
    registrarFallo(err, a);
    const { ErrorApi } = require('../utils/errores');
    throw new ErrorApi(503, 'AUDITORIA_NO_DISPONIBLE',
      'No es posible completar esta operación en este momento.');
  }
}

/** Deja el fallo en el log del sistema (sin IP, sin correo, sin justificación). */
function registrarFallo(err, a) {
  const f = a || {};
  console.error('[auditoria] no se pudo registrar:', err && (err.code || err.message), JSON.stringify({
    accion: f.accion, entidad: f.entidad, resultado: f.resultado,
    id_usuario: f.id_usuario, id_estudio: f.id_estudio, fecha_hora: f.fecha_hora,
  }));
}


function marcarAuditoria(entidad, accion) {
  return (req, res, next) => {
    if (req.auditoria) {
      req.auditoria.entidad = entidad;
      req.auditoria.accion = accion;
      if (req.params && req.params.idEstudio) req.auditoria.id_estudio = req.params.idEstudio;
    }
    next();
  };
}

module.exports = { auditoria, marcarAuditoria, registrarAhora };
