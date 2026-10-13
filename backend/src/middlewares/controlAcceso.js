'use strict';
/**
 * MIDDLEWARE 3 · CONTROL DE ACCESO (RBAC + permisos por estudio)
 * Actividad 42 · Benjamín Arias
 *
 * Se usa POR RUTA, porque cada ruta necesita un permiso distinto:
 *   router.get('/estudios/:idEstudio',
 *     requierePermiso({ recurso: 'estudio', accion: 'leer', permisoEstudio: 'puede_consultar' }),
 *     controlador)
 *
 * ENTRADA: req.usuario (del middleware de autenticación) y, en rutas de un estudio,
 *          req.params.idEstudio (o id_estudio en el body, como en desenmascarar).
 * VALIDA, en este orden:
 *   1. security_schema.permiso: el rol tiene (recurso, accion). Si no → 403.
 *   2. Si el alcance es 'global' → pasa (ej.: supervisión del Director).
 *   3. Si el alcance es 'estudio' → membresia_estudio vigente con el permiso puede_* pedido,
 *      o una autorizacion 'aprobada', del mismo estudio y recurso, con fecha_vencimiento futura.
 *   4. Estudio cerrado: se rechazan 'crear' y 'actualizar' (Middlewares v3).
 * SALIDA:
 *   req.acceso = { alcance: 'global' | 'estudio', id_estudio, via: 'permiso' | 'membresia' | 'autorizacion',
 *                  id_autorizacion, desenmascarar, id_membresia, permisos }
 *   y completa req.auditoria.id_autorizacion cuando se usa una autorización.
 * SI FALLA: next(errores.sinPermiso())  →  403 con el formato común (y queda auditado).
 *
 * Opciones adicionales (todas opcionales; sin ellas la ruta se comporta como en el esqueleto):
 *   tipoAutorizacion      'ver_identidad', 'descarga_original'…: exige una autorización de ese tipo
 *                         (la membresía no basta). Para recursos que "siempre" piden autorización.
 *   parametroRegistro     nombre del parámetro de la ruta con el id del registro puntual
 *                         (ej. 'idRegistro'). Una autorización con id_registro_objetivo solo vale para ese registro.
 *   desenmascara          true solo en POST /identidades/:ux_lab_id/desenmascarar: deja
 *                         req.acceso.desenmascarar = true para que el filtro de privacidad no quite los PII.
 *   permiteEstudioCerrado true en rutas que deben seguir funcionando con el estudio cerrado
 *                         (ej. descargar o crear una exportación).
 */
const {
  alcanceDelPermiso, buscarMembresia, buscarAutorizacion, estudioEstaCerrado,
} = require('../repositories/accesoRepository');
const { ErrorApi, errores } = require('../utils/errores');

const PERMISOS_ESTUDIO = ['puede_consultar', 'puede_cargar', 'puede_modificar', 'puede_descargar', 'puede_exportar'];
const ACCIONES_BLOQUEADAS_EN_ESTUDIO_CERRADO = ['crear', 'actualizar'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const esUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

/* ---------- Middleware ---------- */

function requierePermiso({
  recurso, accion, permisoEstudio = null,
  tipoAutorizacion = null, parametroRegistro = null, desenmascara = false, permiteEstudioCerrado = false,
} = {}) {
  if (!recurso || !accion) throw new Error('requierePermiso necesita recurso y accion');
  if (permisoEstudio && !PERMISOS_ESTUDIO.includes(permisoEstudio)) {
    throw new Error(`permisoEstudio inválido: ${permisoEstudio}`);
  }

  return async function controlAcceso(req, res, next) {
    try {
      if (!req.usuario) return next(errores.noAutenticado()); // la ruta olvidó montar autenticacion

      const { id_usuario: idUsuario, nombre_rol: nombreRol } = req.usuario;
      const idEstudio = (req.params && req.params.idEstudio) || (req.body && req.body.id_estudio) || null;
      const idRegistro = parametroRegistro && req.params ? (req.params[parametroRegistro] || null) : null;

      // Un id mal formado haría fallar la consulta con error 500: se responde 400.
      if (idEstudio !== null && !esUuid(idEstudio)) {
        return next(errores.solicitudInvalida('El identificador del estudio no es válido.'));
      }
      if (idRegistro !== null && !esUuid(idRegistro)) {
        return next(errores.solicitudInvalida('El identificador del registro no es válido.'));
      }

      // 1. Permiso del rol.
      const alcance = await alcanceDelPermiso(nombreRol, recurso, accion);
      if (!alcance) return next(errores.sinPermiso());

      let via = 'permiso';
      let idMembresia = null;
      let permisos = null;
      let idAutorizacion = null;

      if (alcance === 'estudio') {
        // Un permiso de alcance 'estudio' sin estudio en la ruta es un error de configuración: falla cerrado.
        if (!idEstudio) {
          console.error(`[acceso] ruta con alcance 'estudio' sin idEstudio (${req.method} ${req.originalUrl})`);
          return next(errores.sinPermiso());
        }

        // 3a. Membresía vigente con el permiso puede_* que corresponde (salvo que la ruta exija autorización).
        if (!tipoAutorizacion) {
          const m = await buscarMembresia(idUsuario, idEstudio);
          if (m && (!permisoEstudio || m[permisoEstudio] === true)) {
            via = 'membresia';
            idMembresia = m.id_membresia;
            permisos = Object.fromEntries(PERMISOS_ESTUDIO.map((p) => [p, m[p] === true]));
          }
        }

        // 3b. Si no hubo membresía válida: autorización especial aprobada y vigente.
        if (via === 'permiso') {
          idAutorizacion = await buscarAutorizacion(idUsuario, idEstudio, recurso, tipoAutorizacion, idRegistro);
          if (!idAutorizacion) return next(errores.sinPermiso());
          via = 'autorizacion';
        }
      }

      // 4. Estudio cerrado: no se crean ni modifican sus datos.
      if (idEstudio && !permiteEstudioCerrado
          && ACCIONES_BLOQUEADAS_EN_ESTUDIO_CERRADO.includes(accion)
          && await estudioEstaCerrado(idEstudio)) {
        return next(new ErrorApi(409, 'ESTUDIO_CERRADO', 'El estudio está cerrado: no admite nuevos datos ni modificaciones.'));
      }

      req.acceso = {
        alcance,
        id_estudio: idEstudio,
        via,
        id_autorizacion: idAutorizacion,
        desenmascarar: desenmascara === true,
        id_membresia: idMembresia,
        permisos,
      };
      if (req.auditoria) {
        if (idAutorizacion) req.auditoria.id_autorizacion = idAutorizacion;
        if (idEstudio && !req.auditoria.id_estudio) req.auditoria.id_estudio = idEstudio;
      }
      return next();
    } catch (err) {
      return next(err); // error inesperado (p. ej. la BD): 500 genérico, no se concede el acceso
    }
  };
}

module.exports = { requierePermiso, PERMISOS_ESTUDIO };