
'use strict';

/**
 * Rutas de identidades.
 *
 * POST /identidades/buscar
 *   Busca una identidad sin exponer datos personales.
 *
 * POST /identidades
 *   Registra una identidad y devuelve su UX Lab ID.
 *
 * POST /identidades/:ux_lab_id/desenmascarar
 *   Permite consultar datos personales únicamente
 *   con los permisos correspondientes.
 *
 * Las operaciones de desenmascaramiento requieren
 * una justificación y quedan registradas en auditoría.
 */

const { Router } = require('express');

const { requierePermiso } =
  require('../middlewares/controlAcceso');

const { marcarAuditoria } =
  require('../middlewares/auditoria');

const { permitirEnRespuesta } =
  require('../middlewares/filtroPrivacidad');

const {
  noAlmacenar,
  accesoDesenmascarar,
} = require('../middlewares/accesoIdentidad');

const c = require('../controllers/identidadesController');

module.exports = () => {
  const r = Router();

  /**
   * Permiso existente para registrar identidades.
   */
  const puedeRegistrar = requierePermiso({
    recurso: 'identidad',
    accion: 'crear',
  });

  /**
   * Búsqueda de identidad.
   *
   * Solo permite devolver los identificadores
   * necesarios para el proceso de inscripción.
   */
  r.post(
    '/buscar',
    marcarAuditoria('identidad', 'leer'),
    puedeRegistrar,
    permitirEnRespuesta('ux_lab_id', 'ux_lab_ids'),
    c.buscar
  );

  /**
   * Registro de identidad.
   *
   * La respuesta solo incluye el UX Lab ID.
   */
  r.post(
    '/',
    marcarAuditoria('identidad', 'crear'),
    puedeRegistrar,
    permitirEnRespuesta('ux_lab_id'),
    c.crear
  );

  /**
   * Desenmascaramiento de identidad.
   *
   * Requiere:
   * - Usuario autenticado.
   * - id_estudio válido.
   * - Identidad vinculada a ese estudio.
   * - Director con permiso global de lectura,
   *   o autorización especial ver_identidad.
   * - Justificación obligatoria.
   *
   * El middleware accesoDesenmascarar comprueba
   * las condiciones antes de ejecutar el controlador.
   */
  r.post(
    '/:ux_lab_id/desenmascarar',
    noAlmacenar,
    marcarAuditoria('identidad', 'desenmascarar'),
    accesoDesenmascarar,
    permitirEnRespuesta(
      'ux_lab_id',
      'rut',
      'nombre',
      'correo',
      'telefono',
      'fecha_nacimiento'
    ),
    c.desenmascarar
  );

  return r;
};
