'use strict';
/** Recibe la solicitud ya autenticada y autorizada, llama al servicio y responde (Actividad 60). */
const servicio = require('../services/exportacionesService');
const { registrarAhora } = require('../middlewares/auditoria');

const envolver = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

const solicitar = envolver(async (req, res) => {
  const exportacion = await servicio.solicitar(req.params.idEstudio, req.body || {}, req.usuario);
  req.auditoria.id_registro_afectado = exportacion.id_exportacion;
  res.status(201).json(exportacion);
});

const decidir = envolver(async (req, res) => {
  if (req.body && req.body.decision === 'rechazar') req.auditoria.accion = 'rechazar';
  const { motivo, exportacion } = await servicio.decidir(req.exportacion, req.body || {}, req.usuario);
  req.auditoria.justificacion = motivo;
  res.json(exportacion);
});

const consultar = envolver(async (req, res) => {
  res.json(servicio.consultar(req.exportacion, req.usuario));
});

// D17: la descarga queda en la auditoría ANTES de entregar el archivo.
const descargar = envolver(async (req, res) => {
  const archivo = await servicio.prepararDescarga(req.exportacion, req.usuario);
  await registrarAhora(req);
  res.download(archivo.ruta, archivo.nombre);
});

module.exports = { solicitar, decidir, consultar, descargar };