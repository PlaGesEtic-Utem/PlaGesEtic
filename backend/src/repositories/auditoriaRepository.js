'use strict';
/**
 * Repositorio de auditoría.
 * La tabla security_schema.auditoria es append-only: aquí solo hay INSERT (registrar)
 * y SELECT (consultar). No existe ninguna función que modifique o borre filas.
 */
const { obtenerPool } = require('../db/pool');

// El pool se pide al ejecutar (no al cargar el módulo): server.js lo inicia después de los require.
const query = (texto, params) => obtenerPool().query(texto, params);

// Las fechas del filtro se interpretan como días calendario de Chile.
const ZONA_HORARIA = 'America/Santiago';

async function registrar(f) {
  await query(
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

/**
 * Consulta paginada de la bitácora, de la más reciente a la más antigua.
 * filtros (ya validados por el controlador; todos opcionales salvo limite y desplazamiento):
 *   id_usuario, id_estudio, accion, resultado,
 *   desde  'YYYY-MM-DD'  (inclusive, desde las 00:00 de Chile)
 *   hasta  'YYYY-MM-DD'  (inclusive, hasta las 23:59:59 de Chile)
 *   limite, desplazamiento
 * Todos los valores van como parámetros ($n): nada del usuario se concatena en el SQL.
 */
async function consultar(filtros) {
  const condiciones = [];
  const params = [];
  const agregar = (sql, valor) => {
    params.push(valor);
    condiciones.push(sql.replace('?', `$${params.length}`));
  };

  if (filtros.id_usuario) agregar('id_usuario = ?', filtros.id_usuario);
  if (filtros.id_estudio) agregar('id_estudio = ?', filtros.id_estudio);
  if (filtros.accion) agregar('accion = ?', filtros.accion);
  if (filtros.resultado) agregar('resultado = ?', filtros.resultado);
  if (filtros.desde) {
    agregar(`fecha_hora >= ((?::date)::timestamp AT TIME ZONE '${ZONA_HORARIA}')`, filtros.desde);
  }
  if (filtros.hasta) {
    agregar(`fecha_hora < (((?::date) + 1)::timestamp AT TIME ZONE '${ZONA_HORARIA}')`, filtros.hasta);
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const [conteo, pagina] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total FROM security_schema.auditoria ${where}`, params),
    query(
      `SELECT id_auditoria, id_usuario, correo_intentado, id_sesion, ip, entidad,
              id_registro_afectado, id_estudio, accion, resultado, justificacion,
              id_autorizacion, fecha_hora
         FROM security_schema.auditoria
         ${where}
        ORDER BY fecha_hora DESC, id_auditoria DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, filtros.limite, filtros.desplazamiento]
    ),
  ]);

  return { filas: pagina.rows, total: conteo.rows[0].total };
}

module.exports = { registrar, consultar };