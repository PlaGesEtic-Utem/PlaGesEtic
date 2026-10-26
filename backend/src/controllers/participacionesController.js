'use strict';

/**
 * Controlador de participaciones.
 *
 * Funciones:
 * - Inscribir participantes en estudios.
 * - Listar participaciones de un estudio.
 * - Consultar datos de contacto con autorización.
 *
 * El controlador no realiza operaciones de cifrado
 * ni accede directamente a las tablas de identidades.
 */

const servicio = require('../services/participacionesService');
const { registrarAhora } = require('../middlewares/auditoria');

const envolver = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res)).catch(next);

/**
 * POST /estudios/:idEstudio/participaciones
 *
 * Inscribe una persona en un estudio.
 */
const inscribir = envolver(async (req, res) => {
  const participacion = await servicio.inscribir(
    req.params.idEstudio,
    req.body || {}
  );

  req.auditoria.id_registro_afectado =
    participacion.id_participacion;

  res.status(201).json(participacion);
});

/**
 * GET /estudios/:idEstudio/participaciones
 *
 * Lista las participaciones de un estudio.
 */
const listar = envolver(async (req, res) => {
  const participaciones = await servicio.listar(
    req.params.idEstudio,
    req.query.estado
  );

  res.json(participaciones);
});

/**
 * POST /participaciones/:idParticipacion/contacto
 *
 * Consulta datos de contacto de una participación.
 *
 * REQUISITOS:
 * - El middleware debe verificar previamente
 *   los permisos y el estudio correspondiente.
 * - La solicitud debe incluir un motivo válido.
 * - Si el motivo es "otro", debe incluir detalle.
 * - La respuesta contiene únicamente:
 *   codigo_seudonimo, nombre, correo y telefono.
 *
 * La operación se registra como desenmascaramiento.
 */
const contacto = envolver(async (req, res) => {
  const cuerpo = req.body || {};


  const { motivo, detalle } =
    servicio.validarMotivoContacto(cuerpo);

  const justificacion = motivo === 'otro'
    ? `otro: ${detalle}`
    : motivo;

  if (req.auditoria) {
    req.auditoria.justificacion = justificacion;
    req.auditoria.id_registro_afectado =
      req.params.idParticipacion;
  }

  const datosContacto = await servicio.consultarContacto(
    req.params.idParticipacion,
    cuerpo
  );


  res.set('Cache-Control', 'no-store');
  await registrarAhora(req);

  res.json({
    codigo_seudonimo: datosContacto.codigo_seudonimo,
    nombre: datosContacto.nombre,
    correo: datosContacto.correo,
    telefono: datosContacto.telefono,
  });
});

module.exports = {
  inscribir,
  listar,
  contacto,
};
