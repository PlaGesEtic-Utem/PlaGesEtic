'use strict';
/**
 * MIDDLEWARE 1 · AUDITORÍA  (primero en la cadena v3)
 * Responsable de completarlo: Benjamín Arias · jueves 08/10 (Actividad 42).
 *
 * ENTRADA: cualquier solicitud (también las públicas como /auth/login).
 * SALIDA:  req.auditoria con la fila que se insertará en security_schema.auditoria:
 *   { id_usuario, correo_intentado, id_sesion, ip, entidad, id_registro_afectado,
 *     id_estudio, accion, resultado, justificacion, id_autorizacion, fecha_hora }
 *   Los middlewares siguientes y los controladores van completando campos
 *   (ej.: autenticación pone id_usuario e id_sesion; la ruta pone entidad y acción).
 *
 * AL TERMINAR la respuesta (evento 'finish'), también en 401 y 403:
 *   - resultado = 'exito' si el código es < 400; si no, 'error'.
 *   - INSERT con auditoriaRepository.registrar(req.auditoria).
 *   - Si el INSERT falla: se deja en el log del sistema y la respuesta NO se bloquea
 *     (Middlewares v3; el mecanismo de recuperación está pendiente).
 *   - Nunca se guarda contenido de datos personales, contraseñas, códigos MFA ni tokens:
 *     solo identificadores (especificación de Felipe Cruz, 07/10).
 */
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

  res.on('finish', () => {
    // TODO (B. Arias, 08/10): definir resultado e insertar con auditoriaRepository.registrar().
  });

  next();
}

/**
 * Ayuda para las rutas: indica qué entidad y qué acción se auditan.
 * Uso:  router.get('/estudios/:idEstudio', marcarAuditoria('estudio', 'leer'), ...)
 * Acciones válidas (diccionario v3): crear, leer, actualizar, eliminar, descargar, exportar,
 * desenmascarar, aprobar, rechazar, revocar, login_exitoso, login_fallido, cierre_sesion.
 */
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

module.exports = { auditoria, marcarAuditoria };
