
'use strict';

/**
 * Rutas de identidades.
 *
 * POST /identidades/buscar
 *   Busca identidades sin exponer datos personales.
 *
 * POST /identidades
 *   Registra una identidad y devuelve su UX Lab ID.
 *
 * POST /identidades/:ux_lab_id/desenmascarar
 *   Entrega datos personales únicamente a usuarios
 *   autorizados y con auditoría previa obligatoria.
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


  const puedeRegistrar = requierePermiso({
    recurso: 'identidad',
    accion: 'crear',
  });

  /**
   * POST /identidades/buscar
   *
   * Permite devolver exclusivamente
   * los identificadores necesarios.
   */
  r.post(
    '/buscar',
    marcarAuditoria('identidad', 'leer'),
    puedeRegistrar,
    permitirEnRespuesta(
      'ux_lab_id',
      'ux_lab_ids'
    ),
    c.buscar
  );

  /**
   * POST /identidades
   *
   * Registra la identidad y devuelve
   * únicamente su UX Lab ID.
   */
  r.post(
    '/',
    marcarAuditoria('identidad', 'crear'),
    puedeRegistrar,
    permitirEnRespuesta('ux_lab_id'),
    c.crear
  );

  /**
   * ACTIVIDAD 56 + D17
   *
   * POST /identidades/:ux_lab_id/desenmascarar
   *
   * Requisitos:
   * - Usuario autenticado.
   * - Estudio válido.
   * - Identidad vinculada al estudio.
   * - Director autorizado o autorización
   *   especial ver_identidad.
   * - Justificación obligatoria.
   * - Cache-Control: no-store.
   * - Auditoría registrada antes de entregar datos.
   *
   * El controlador utiliza registrarAhora(req).
   *
   * Si falla la auditoría, responde HTTP 503
   * sin revelar datos personales.
   *
   * La excepción de privacidad permite únicamente
   * los seis campos del catálogo API.
   */
  r.post(
    '/:ux_lab_id/desenmascarar',
    noAlmacenar,
    marcarAuditoria(
      'identidad',
      'desenmascarar'
    ),
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
