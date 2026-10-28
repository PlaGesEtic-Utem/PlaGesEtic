'use strict';

/**
 * Controlador de identidades.
 *
 * Operaciones:
 * - Buscar identidades.
 * - Registrar identidades.
 * - Desenmascarar una identidad autorizada.
 *
 * El controlador no realiza el descifrado.
 * Esa responsabilidad pertenece exclusivamente
 * al repositorio de identidades.
 */

const servicio = require('../services/identidadesService');
const { registrarAhora } = require('../middlewares/auditoria');

const envolver = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res)).catch(next);

/**
 * POST /identidades/buscar
 *
 * Busca una identidad por RUT o correo.
 * No devuelve datos personales.
 */
const buscar = envolver(async (req, res) => {
  res.json(await servicio.buscar(req.body || {}));
});

/**
 * POST /identidades
 *
 * Registra una nueva identidad.
 * Devuelve únicamente el UX Lab ID.
 */
const crear = envolver(async (req, res) => {
  const {
    id_identidad: id,
    ux_lab_id: uxLabId,
  } = await servicio.crear(req.body || {});

  req.auditoria.id_registro_afectado = id;

  res.status(201).json({
    ux_lab_id: uxLabId,
  });
});

/**
 * POST /identidades/:ux_lab_id/desenmascarar
 *
 * Devuelve los datos personales de una identidad.
 *
 * IMPORTANTE:
 * La autorización debe comprobarse previamente
 * mediante los middlewares de la ruta.
 *
 * La justificación se registra en auditoría.
 * El identificador interno no se envía al cliente.
 */
const desenmascarar = envolver(async (req, res) => {
  const identidad = await servicio.desenmascarar(
    req.params.ux_lab_id,
    req.body || {}
  );

  if (req.auditoria) {
    req.auditoria.id_registro_afectado =
      identidad.id_identidad;

    req.auditoria.justificacion =
      req.body.justificacion.trim();
  }

  const {
    id_identidad,
    ...datosPersonales
  } = identidad;

  res.set('Cache-Control', 'no-store');
  await registrarAhora(req);

  res.json(datosPersonales);
});

module.exports = {
  buscar,
  crear,
  desenmascarar,
};
