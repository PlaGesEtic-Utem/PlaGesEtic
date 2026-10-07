'use strict';
/**
 * Acceso a security_schema.auditoria. SOLO INSERT: la tabla es append-only
 * (el usuario de la aplicación no tiene UPDATE ni DELETE sobre ella).
 * La usa el middleware de auditoría (B. Arias, 08/10) y GET /auditoria (10/10).
 */
const COLUMNAS = ['id_usuario', 'correo_intentado', 'id_sesion', 'ip', 'entidad', 'id_registro_afectado',
  'id_estudio', 'accion', 'resultado', 'justificacion', 'id_autorizacion', 'fecha_hora'];

async function registrar(pool, fila) {
  const valores = COLUMNAS.map((c) => (fila[c] === undefined ? null : fila[c]));
  const marcas = COLUMNAS.map((_, i) => `$${i + 1}`).join(', ');
  await pool.query(`INSERT INTO security_schema.auditoria (${COLUMNAS.join(', ')}) VALUES (${marcas})`, valores);
}

module.exports = { registrar, COLUMNAS };
