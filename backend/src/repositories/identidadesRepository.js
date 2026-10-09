'use strict';
/**
 * Acceso a identity_schema.identidad. ÚNICO lugar del backend que escribe datos personales,
 * y siempre ya cifrados (el cifrado lo hace el servicio). Nunca devuelve columnas cifradas:
 * las consultas de aquí solo leen el ux_lab_id.
 */
const db = require('../config/db');

async function buscarPorRutHash(rutHash) {
  const { rows } = await db.query('SELECT ux_lab_id FROM identity_schema.identidad WHERE rut_hash = $1 AND fecha_revocacion IS NULL', [rutHash]);
  return rows.map((r) => r.ux_lab_id);
}

/** El correo no es único (hermanos pueden compartir el del apoderado): puede devolver varias. */
async function buscarPorCorreoHash(correoHash) {
  const { rows } = await db.query('SELECT ux_lab_id FROM identity_schema.identidad WHERE correo_hash = $1 AND fecha_revocacion IS NULL ORDER BY fecha_registro', [correoHash]);
  return rows.map((r) => r.ux_lab_id);
}

async function crear(f) {
  const { rows } = await db.query(
    `INSERT INTO identity_schema.identidad
       (ux_lab_id, rut_cifrado, rut_hash, nombre_cifrado, correo_cifrado, correo_hash, telefono_cifrado,
        tipo, fecha_nacimiento, fecha_registro)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
     RETURNING id_identidad, ux_lab_id`,
    [f.ux_lab_id, f.rut_cifrado, f.rut_hash, f.nombre_cifrado, f.correo_cifrado, f.correo_hash, f.telefono_cifrado,
      f.tipo, f.fecha_nacimiento]);
  return rows[0];
}

module.exports = { buscarPorRutHash, buscarPorCorreoHash, crear };
