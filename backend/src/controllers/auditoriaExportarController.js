'use strict';
/** Act. 57: exportación CSV protegida y con auditoría previa obligatoria. */

const auditoriaRepository = require('../repositories/auditoriaRepository');
const { validarFiltros } = require('./auditoriaController');
const { registrarAhora } = require('../middlewares/auditoria');
const { ErrorApi } = require('../utils/errores');

// Límite de seguridad: no generar descargas ilimitadas en memoria.
const MAX_FILAS = 10000;

const COLUMNAS = [
  'id_auditoria', 'id_usuario', 'correo_intentado', 'id_sesion',
  'ip', 'entidad', 'id_registro_afectado', 'id_estudio',
  'accion', 'resultado', 'justificacion', 'id_autorizacion', 'fecha_hora',
];

function valorCsv(valor) {
  if (valor === null || valor === undefined) return '';
  let texto = valor instanceof Date ? valor.toISOString() : String(valor);
  // Impide que Excel/LibreOffice interpreten valores auditados como fórmulas.
  if (/^[\x00-\x20]*[=+\-@]/.test(texto)) texto = "'" + texto;
  return '"' + texto.replace(/"/g, '""') + '"';
}

function construirCsv(filas) {
  const encabezado = COLUMNAS.join(',');
  const lineas = filas.map((fila) => COLUMNAS.map((columna) => valorCsv(fila[columna])).join(','));
  return '\uFEFF' + [encabezado, ...lineas].join('\r\n') + '\r\n';
}

/**
 * Permite inyectar dependencias para comprobar que una falla de auditoría
 * nunca entrega el archivo CSV.
 */
function crearExportador({ consultar = auditoriaRepository.consultar, registrar = registrarAhora } = {}) {
  return async function exportar(req, res, next) {
    try {
      // Reutiliza las validaciones de GET /auditoria, incluidos filtros y fechas.
      const filtros = validarFiltros(req.query);

      // A diferencia del listado, la exportación reúne TODOS los registros que
      // coinciden con los filtros, hasta MAX_FILAS; no solo la página inicial.
      const { filas, total } = await consultar({
        ...filtros,
        limite: MAX_FILAS + 1,
        desplazamiento: 0,
      });

      if (total > MAX_FILAS || filas.length > MAX_FILAS) {
        throw new ErrorApi(
          413,
          'EXPORTACION_DEMASIADO_GRANDE',
          `La exportación supera ${MAX_FILAS} registros. Aplique filtros para reducirla.`
        );
      }

      // D17: se confirma el INSERT antes de entregar cualquier dato del CSV.
      // registrarAhora marca auditoriaPreviaIntentada y evita un INSERT duplicado en finish.
      await registrar(req);

      const csv = construirCsv(filas);
      res.set('Cache-Control', 'no-store');
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('Content-Type', 'text/csv; charset=utf-8');
      res.set('Content-Disposition', 'attachment; filename="auditoria.csv"');
      return res.status(200).send(csv);
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  exportar: crearExportador(),
  crearExportador,
  construirCsv,
  valorCsv,
  COLUMNAS,
  MAX_FILAS,
};
