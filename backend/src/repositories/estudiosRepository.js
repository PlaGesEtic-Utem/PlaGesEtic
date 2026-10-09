'use strict';
/**
 * Acceso a research_schema.estudio (y la membresía del creador).
 * Única capa que escribe SQL para estudios. Siempre con parámetros ($1, $2…).
 */
const db = require('../config/db');

const COLUMNAS = `e.id_estudio, e.codigo_estudio, e.nombre, e.descripcion, e.id_responsable, e.estado,
  e.fecha_inicio, e.fecha_fin, e.fecha_cierre, e.retencion_hasta`;

/** ¿El rol puede leer estudios con alcance global? (ej. Director). Se decide con la tabla permiso, no por el nombre del rol. */
async function rolVeTodosLosEstudios(nombreRol) {
  const { rows } = await db.query(
    `SELECT 1 FROM security_schema.permiso p JOIN security_schema.rol r ON r.id_rol = p.id_rol
      WHERE r.nombre_rol = $1 AND p.recurso = 'estudio' AND p.accion = 'leer' AND p.alcance = 'global'`,
    [nombreRol]);
  return rows.length > 0;
}

async function listarTodos(estado) {
  const { rows } = await db.query(
    `SELECT ${COLUMNAS} FROM research_schema.estudio e
      WHERE ($1::varchar IS NULL OR e.estado = $1) ORDER BY e.codigo_estudio`, [estado]);
  return rows;
}

/** Estudios donde el usuario tiene membresía vigente. */
async function listarPorMembresia(idUsuario, estado) {
  const { rows } = await db.query(
    `SELECT ${COLUMNAS} FROM research_schema.estudio e
       JOIN security_schema.membresia_estudio m ON m.id_estudio = e.id_estudio
      WHERE m.id_usuario = $1
        AND m.fecha_inicio <= CURRENT_DATE AND (m.fecha_fin IS NULL OR m.fecha_fin >= CURRENT_DATE)
        AND ($2::varchar IS NULL OR e.estado = $2)
      ORDER BY e.codigo_estudio`, [idUsuario, estado]);
  return rows;
}

async function obtener(idEstudio) {
  const { rows } = await db.query(`SELECT ${COLUMNAS} FROM research_schema.estudio e WHERE e.id_estudio = $1`, [idEstudio]);
  return rows[0] || null;
}

/** Crea el estudio en 'borrador' y la membresía del creador con los cinco permisos, en una sola transacción. */
async function crearConMembresia(datos, idCreador) {
  return db.transaccion(async (c) => {
    const { rows } = await c.query(
      `INSERT INTO research_schema.estudio
         (codigo_estudio, nombre, descripcion, id_responsable, estado, fecha_inicio, fecha_fin, retencion_hasta)
       VALUES ($1, $2, $3, $4, 'borrador', $5, $6, $7)
       RETURNING id_estudio, codigo_estudio, nombre, descripcion, id_responsable, estado,
                 fecha_inicio, fecha_fin, fecha_cierre, retencion_hasta`,
      [datos.codigo_estudio, datos.nombre, datos.descripcion, idCreador, datos.fecha_inicio, datos.fecha_fin, datos.retencion_hasta]);
    const estudio = rows[0];
    await c.query(
      `INSERT INTO security_schema.membresia_estudio
         (id_usuario, id_estudio, puede_consultar, puede_cargar, puede_modificar, puede_descargar, puede_exportar,
          id_otorgante, fecha_inicio)
       VALUES ($1, $2, true, true, true, true, true, $1, CURRENT_DATE)`,
      [idCreador, estudio.id_estudio]);
    return estudio;
  });
}

/** Actualiza solo los campos recibidos (lista cerrada definida en el servicio). */
async function actualizar(idEstudio, campos) {
  const claves = Object.keys(campos);
  const sets = claves.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const { rows } = await db.query(
    `UPDATE research_schema.estudio e SET ${sets} WHERE e.id_estudio = $1 RETURNING ${COLUMNAS.replace(/e\./g, '')}`,
    [idEstudio, ...claves.map((k) => campos[k])]);
  return rows[0] || null;
}

/** ¿Tiene una versión de protocolo aprobada por el CEC y vigente hoy? */
async function tieneProtocoloAprobadoVigente(idEstudio) {
  const { rows } = await db.query(
    `SELECT 1 FROM ethics_schema.protocolo_version
      WHERE id_estudio = $1 AND estado_cec = 'aprobado'
        AND (fecha_vencimiento_cec IS NULL OR fecha_vencimiento_cec >= CURRENT_DATE) LIMIT 1`, [idEstudio]);
  return rows.length > 0;
}

async function cambiarEstado(idEstudio, estado) {
  const { rows } = await db.query(
    `UPDATE research_schema.estudio e SET estado = $2 WHERE e.id_estudio = $1 RETURNING ${COLUMNAS.replace(/e\./g, '')}`,
    [idEstudio, estado]);
  return rows[0] || null;
}

module.exports = {
  rolVeTodosLosEstudios, listarTodos, listarPorMembresia, obtener,
  crearConMembresia, actualizar, tieneProtocoloAprobadoVigente, cambiarEstado,
};
