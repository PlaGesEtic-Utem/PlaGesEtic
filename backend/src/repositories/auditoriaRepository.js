
'use strict';

/**
 * Repositorio de auditoría.
 *
 * La bitácora es append-only:
 * - INSERT para registrar eventos.
 * - SELECT para consultar eventos.
 *
 * No se implementan UPDATE ni DELETE.
 */

const { obtenerPool } = require('../db/pool');

const query = (texto, params) =>
  obtenerPool().query(texto, params);

const ZONA_HORARIA = 'America/Santiago';

async function registrar(f) {
  await query(
    `INSERT INTO security_schema.auditoria
       (id_auditoria, id_usuario, correo_intentado, id_sesion, ip, entidad,
        id_registro_afectado, id_estudio, accion, resultado, justificacion,
        id_autorizacion, fecha_hora)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      f.id_usuario,
      f.correo_intentado,
      f.id_sesion,
      f.ip,
      f.entidad,
      f.id_registro_afectado,
      f.id_estudio,
      f.accion,
      f.resultado,
      f.justificacion,
      f.id_autorizacion,
      f.fecha_hora,
    ]
  );
}

/**
 * Consulta registros con filtros combinables.
 *
 * Todas las entradas variables se envían
 * como parámetros de PostgreSQL.
 */
async function consultar(filtros) {
  const condiciones = [];
  const params = [];

  function agregar(campo, valor) {
    params.push(valor);
    condiciones.push(`${campo} = $${params.length}`);
  }

  if (filtros.id_usuario) {
    agregar('id_usuario', filtros.id_usuario);
  }

  if (filtros.id_estudio) {
    agregar('id_estudio', filtros.id_estudio);
  }

  if (filtros.entidad) {
    agregar('entidad', filtros.entidad);
  }

  if (filtros.id_registro_afectado) {
    agregar(
      'id_registro_afectado',
      filtros.id_registro_afectado
    );
  }

  if (filtros.accion) {
    agregar('accion', filtros.accion);
  }

  if (filtros.resultado) {
    agregar('resultado', filtros.resultado);
  }

  if (filtros.desde) {
    params.push(filtros.desde);
    condiciones.push(
      `fecha_hora >= (($${params.length}::date)::timestamp AT TIME ZONE '${ZONA_HORARIA}')`
    );
  }

  if (filtros.hasta) {
    params.push(filtros.hasta);
    condiciones.push(
      `fecha_hora < ((($${params.length}::date) + 1)::timestamp AT TIME ZONE '${ZONA_HORARIA}')`
    );
  }

  const where = condiciones.length
    ? `WHERE ${condiciones.join(' AND ')}`
    : '';

  const [conteo, pagina] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS total
       FROM security_schema.auditoria
       ${where}`,
      params
    ),
    query(
      `SELECT
         id_auditoria,
         id_usuario,
         correo_intentado,
         id_sesion,
         ip,
         entidad,
         id_registro_afectado,
         id_estudio,
         accion,
         resultado,
         justificacion,
         id_autorizacion,
         fecha_hora
       FROM security_schema.auditoria
       ${where}
       ORDER BY fecha_hora DESC, id_auditoria DESC
       LIMIT $${params.length + 1}
       OFFSET $${params.length + 2}`,
      [
        ...params,
        filtros.limite,
        filtros.desplazamiento,
      ]
    ),
  ]);

  return {
    filas: pagina.rows,
    total: conteo.rows[0].total,
  };
}

module.exports = {
  registrar,
  consultar,
};
