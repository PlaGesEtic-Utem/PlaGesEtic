'use strict';
/** Consultas del middleware de control de acceso (solo lectura). */
const { obtenerPool } = require('../db/pool');

const query = (texto, params) => obtenerPool().query(texto, params);

/** Alcance con el que el rol tiene (recurso, accion), o null si no lo tiene. 'global' gana sobre 'estudio'. */
async function alcanceDelPermiso(nombreRol, recurso, accion) {
  const { rows } = await query(
    `SELECT p.alcance
       FROM security_schema.permiso p
       JOIN security_schema.rol r ON r.id_rol = p.id_rol
      WHERE r.nombre_rol = $1 AND p.recurso = $2 AND p.accion = $3
      ORDER BY (p.alcance = 'global') DESC
      LIMIT 1`,
    [nombreRol, recurso, accion]
  );
  return rows.length ? rows[0].alcance : null;
}

/** Membresía vigente hoy (fecha_inicio pasada, fecha_fin nula o no vencida). */
async function buscarMembresia(idUsuario, idEstudio) {
  const { rows } = await query(
    `SELECT id_membresia, puede_consultar, puede_cargar, puede_modificar, puede_descargar, puede_exportar
       FROM security_schema.membresia_estudio
      WHERE id_usuario = $1 AND id_estudio = $2
        AND fecha_inicio <= CURRENT_DATE
        AND (fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE)
      LIMIT 1`,
    [idUsuario, idEstudio]
  );
  return rows[0] || null;
}

/**
 * Autorización aprobada y vigente para ese estudio y recurso. Si tiene id_registro_objetivo,
 * solo vale para ese registro; si no lo tiene, vale para todo el recurso del estudio.
 */
async function buscarAutorizacion(idUsuario, idEstudio, recurso, tipo, idRegistro) {
  const { rows } = await query(
    `SELECT id_autorizacion
       FROM security_schema.autorizacion
      WHERE id_usuario = $1 AND id_estudio = $2 AND recurso = $3
        AND estado = 'aprobada'
        AND fecha_vencimiento > now()
        AND ($4::varchar IS NULL OR tipo = $4::varchar)
        AND (id_registro_objetivo IS NULL OR id_registro_objetivo = $5::uuid)
      ORDER BY fecha_vencimiento DESC
      LIMIT 1`,
    [idUsuario, idEstudio, recurso, tipo, idRegistro]
  );
  return rows.length ? rows[0].id_autorizacion : null;
}

async function estudioEstaCerrado(idEstudio) {
  const { rows } = await query(
    'SELECT estado FROM research_schema.estudio WHERE id_estudio = $1',
    [idEstudio]
  );
  return rows.length > 0 && rows[0].estado === 'cerrado';
}

module.exports = { alcanceDelPermiso, buscarMembresia, buscarAutorizacion, estudioEstaCerrado };
