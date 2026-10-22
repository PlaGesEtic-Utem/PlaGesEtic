
'use strict';

/**
 * Control de acceso a datos personales.
 *
 * ADR-002, decisiones D8 y D12.
 *
 * CONTACTO DE PARTICIPACIÓN:
 * - Director con permiso global identidad/leer.
 * - Investigador responsable del estudio.
 *
 * La autorización especial ver_identidad NO
 * permite consultar datos de contacto.
 *
 * IDENTIDAD COMPLETA:
 * - Director con permiso global identidad/leer.
 * - Usuario con autorización ver_identidad
 *   aprobada por un Director y vigente.
 *
 * En el desenmascaramiento completo se comprueba
 * que la identidad pertenece al estudio declarado.
 */

const db = require('../config/db');
const { errores } = require('../utils/errores');
const { requierePermiso } = require('./controlAcceso');

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UX_LAB_ID_RE = /^UXL-[A-Z0-9]{8}$/;

const esUuid = (valor) =>
  typeof valor === 'string' &&
  UUID_RE.test(valor);

/**
 * Impide almacenar respuestas con datos personales
 * en cachés del navegador o intermediarios.
 */
function noAlmacenar(req, res, next) {
  res.set('Cache-Control', 'no-store');
  return next();
}

/**
 * Reutiliza el RBAC existente para el Director.
 *
 * desenmascara=true permite que filtroPrivacidad
 * entregue los datos personales autorizados.
 */
const permisoDirector = requierePermiso({
  recurso: 'identidad',
  accion: 'leer',
  desenmascara: true,
});

/**
 * Comprueba que una identidad está vinculada
 * al estudio declarado en la solicitud.
 *
 * Impide utilizar una autorización de un estudio
 * para consultar identidades de otro.
 */
async function identidadEnEstudio(
  uxLabId,
  idEstudio
) {
  const { rows } = await db.query(
    `SELECT i.id_identidad
       FROM identity_schema.identidad i
       INNER JOIN identity_schema.vinculo_identidad v
         ON v.id_identidad = i.id_identidad
       INNER JOIN research_schema.participacion p
         ON p.id_participante = v.id_participante
      WHERE i.ux_lab_id = $1
        AND p.id_estudio = $2
        AND i.fecha_revocacion IS NULL
        AND i.fecha_eliminacion IS NULL
      LIMIT 1`,
    [uxLabId, idEstudio]
  );

  return rows[0] || null;
}

/**
 * Verifica que el usuario es el investigador
 * responsable del estudio.
 *
 * No basta con una membresía cualquiera:
 * debe coincidir con estudio.id_responsable.
 */
async function esInvestigadorResponsable(
  idUsuario,
  idEstudio
) {
  const { rows } = await db.query(
    `SELECT 1
       FROM research_schema.estudio
      WHERE id_estudio = $1
        AND id_responsable = $2
      LIMIT 1`,
    [idEstudio, idUsuario]
  );

  return rows.length > 0;
}

/**
 * Busca una autorización especial para consultar
 * la identidad indicada.
 *
 * Se exige:
 * - Usuario correcto.
 * - Estudio correcto.
 * - Recurso identidad.
 * - Tipo ver_identidad.
 * - Estado aprobada.
 * - Resolución registrada.
 * - Vigencia temporal.
 * - Aprobación por un Director.
 * - Identidad autorizada, cuando la autorización
 *   está restringida a un registro específico.
 *
 * id_registro_objetivo se compara con
 * identidad.id_identidad, no con el UX Lab ID.
 */
async function buscarAutorizacionIdentidad(
  idUsuario,
  idEstudio,
  idIdentidad
) {
  const { rows } = await db.query(
    `SELECT a.id_autorizacion
       FROM security_schema.autorizacion a
       INNER JOIN security_schema.usuario u
         ON u.id_usuario = a.id_autorizador
       INNER JOIN security_schema.rol r
         ON r.id_rol = u.id_rol
      WHERE a.id_usuario = $1
        AND a.id_estudio = $2
        AND a.recurso = 'identidad'
        AND a.tipo = 'ver_identidad'
        AND a.estado = 'aprobada'
        AND a.fecha_resolucion IS NOT NULL
        AND a.fecha_vencimiento > NOW()
        AND r.nombre_rol = 'Director'
        AND (
          a.id_registro_objetivo IS NULL
          OR a.id_registro_objetivo = $3
        )
      ORDER BY a.fecha_vencimiento DESC
      LIMIT 1`,
    [idUsuario, idEstudio, idIdentidad]
  );

  return rows.length
    ? rows[0].id_autorizacion
    : null;
}

/**
 * Habilita el desenmascaramiento solo después
 * de que se haya concedido el acceso.
 *
 * También deja los datos necesarios
 * para registrar la auditoría.
 */
function registrarAcceso(
  req,
  idEstudio,
  via,
  idAutorizacion = null
) {
  req.acceso = {
    alcance: 'estudio',
    id_estudio: idEstudio,
    via,
    id_autorizacion: idAutorizacion,
    desenmascarar: true,
    id_membresia: null,
    permisos: null,
  };

  if (req.auditoria) {
    req.auditoria.id_estudio = idEstudio;

    if (idAutorizacion) {
      req.auditoria.id_autorizacion =
        idAutorizacion;
    }
  }
}

/**
 * Ejecuta el RBAC global del Director.
 *
 * requierePermiso establece req.acceso y completa
 * el estudio en la auditoría cuando corresponde.
 */
function autorizarDirector(req, res, next) {
  return permisoDirector(req, res, next);
}

/**
 * POST /participaciones/:idParticipacion/contacto
 *
 * Debe ejecutarse después de
 * resolverEstudioDeParticipacion.
 *
 * Solo pueden acceder:
 * - Director.
 * - Investigador responsable del estudio.
 *
 * Las autorizaciones especiales ver_identidad
 * no conceden acceso a esta ruta.
 */
async function accesoContacto(req, res, next) {
  try {
    if (!req.usuario) {
      return next(errores.noAutenticado());
    }

    const idEstudio =
      req.params && req.params.idEstudio;

    const idParticipacion =
      req.params && req.params.idParticipacion;

    if (
      !esUuid(idEstudio) ||
      !esUuid(idParticipacion)
    ) {
      return next(
        errores.solicitudInvalida(
          'El identificador del estudio o participación no es válido.'
        )
      );
    }

    const {
      id_usuario: idUsuario,
      nombre_rol: rol,
    } = req.usuario;

    /**
     * Director:
     * El estudio ya fue resuelto desde
     * la participación por el middleware anterior.
     */
    if (rol === 'Director') {
      return autorizarDirector(req, res, next);
    }

    /**
     * Investigador responsable:
     * Solo puede consultar contactos
     * de su propio estudio.
     */
    if (rol === 'Investigador') {
      const responsable =
        await esInvestigadorResponsable(
          idUsuario,
          idEstudio
        );

      if (responsable) {
        registrarAcceso(
          req,
          idEstudio,
          'responsable'
        );

        return next();
      }
    }

    /**
     * Cualquier otro usuario recibe 403,
     * incluso cuando tenga una autorización
     * especial ver_identidad aprobada y vigente.
     */
    return next(errores.sinPermiso());
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /identidades/:ux_lab_id/desenmascarar
 *
 * Exige que la identidad esté realmente vinculada
 * al estudio enviado en el cuerpo de la solicitud.
 */
async function accesoDesenmascarar(req, res, next) {
  try {
    if (!req.usuario) {
      return next(errores.noAutenticado());
    }

    const idEstudio =
      req.body && req.body.id_estudio;

    const uxLabId =
      req.params && req.params.ux_lab_id;

    if (!esUuid(idEstudio)) {
      return next(
        errores.solicitudInvalida(
          '«id_estudio» es obligatorio y debe ser un UUID válido.'
        )
      );
    }

    if (
      typeof uxLabId !== 'string' ||
      !UX_LAB_ID_RE.test(uxLabId)
    ) {
      return next(
        errores.solicitudInvalida(
          'El UX Lab ID no es válido.'
        )
      );
    }

    /**
     * Verificación de pertenencia:
     * Se realiza antes de conceder acceso
     * y sin descifrar datos personales.
     */
    const identidad = await identidadEnEstudio(
      uxLabId,
      idEstudio
    );

    if (!identidad) {
      return next(
        errores.noEncontrado(
          'No existe una identidad vigente vinculada al estudio indicado.'
        )
      );
    }

    const {
      id_usuario: idUsuario,
      nombre_rol: rol,
    } = req.usuario;

    /**
     * Director:
     * Utiliza el permiso global identidad/leer
     * con desenmascara=true.
     */
    if (rol === 'Director') {
      return autorizarDirector(req, res, next);
    }

    /**
     * Los demás roles necesitan autorización
     * ver_identidad para este estudio e identidad.
     */
    const idAutorizacion =
      await buscarAutorizacionIdentidad(
        idUsuario,
        idEstudio,
        identidad.id_identidad
      );

    if (!idAutorizacion) {
      return next(errores.sinPermiso());
    }

    registrarAcceso(
      req,
      idEstudio,
      'autorizacion',
      idAutorizacion
    );

    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  noAlmacenar,
  accesoContacto,
  accesoDesenmascarar,
};
