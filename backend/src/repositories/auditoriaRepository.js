'use strict';
/**
 * Repositorio de auditoría. SOLO inserta: la tabla es append-only
 * (no existe ninguna función de lectura-modificación ni de borrado aquí).
 * Si ya tienes un auditoriaRepository en el proyecto, conserva el tuyo y
 * verifica que registrar() reciba la misma fila que arma el middleware.
 */
const db = require('../config/db'); // AJUSTAR la ruta: debe exportar query(texto, parametros) del Pool de pg

async function registrar(f) {
  await db.query(
    `INSERT INTO security_schema.auditoria
       (id_auditoria, id_usuario, correo_intentado, id_sesion, ip, entidad,
        id_registro_afectado, id_estudio, accion, resultado, justificacion,
        id_autorizacion, fecha_hora)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      f.id_usuario, f.correo_intentado, f.id_sesion, f.ip, f.entidad,
      f.id_registro_afectado, f.id_estudio, f.accion, f.resultado, f.justificacion,
      f.id_autorizacion, f.fecha_hora,
    ]
  );
}

module.exports = { registrar };