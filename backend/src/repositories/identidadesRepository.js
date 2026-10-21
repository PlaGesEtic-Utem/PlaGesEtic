
'use strict';

/**
 * Repositorio de identidades.
 *
 * Centraliza el acceso a identity_schema.identidad.
 *
 * - Busca identidades mediante huellas.
 * - Registra datos personales cifrados.
 * - Descifra datos personales exclusivamente aquí.
 * - Comprueba la restricción de retiro antes
 *   de descifrar los datos de contacto.
 *
 * Las operaciones de desenmascaramiento requieren
 * autorización previa en los middlewares.
 */

const db = require('../config/db');
const { descifrar } = require('../utils/cifrado');
const { ErrorApi } = require('../utils/errores');

/**
 * Descifra un campo opcional.
 *
 * Los campos cifrados pueden ser NULL en la BD.
 */
function descifrarOpcional(valor) {
  if (valor === null || valor === undefined) {
    return null;
  }

  return descifrar(valor);
}

/**
 * Busca identidades vigentes por huella del RUT.
 */
async function buscarPorRutHash(rutHash) {
  const { rows } = await db.query(
    `SELECT ux_lab_id
       FROM identity_schema.identidad
      WHERE rut_hash = $1
        AND fecha_revocacion IS NULL`,
    [rutHash]
  );

  return rows.map((fila) => fila.ux_lab_id);
}

/**
 * Busca identidades vigentes por correo.
 *
 * El correo no es único: varias personas
 * pueden compartir una dirección.
 */
async function buscarPorCorreoHash(correoHash) {
  const { rows } = await db.query(
    `SELECT ux_lab_id
       FROM identity_schema.identidad
      WHERE correo_hash = $1
        AND fecha_revocacion IS NULL
      ORDER BY fecha_registro`,
    [correoHash]
  );

  return rows.map((fila) => fila.ux_lab_id);
}

/**
 * Registra una identidad.
 *
 * Los campos personales llegan cifrados
 * desde identidadesService.js.
 */
async function crear(f) {
  const { rows } = await db.query(
    `INSERT INTO identity_schema.identidad
       (
         ux_lab_id,
         rut_cifrado,
         rut_hash,
         nombre_cifrado,
         correo_cifrado,
         correo_hash,
         telefono_cifrado,
         tipo,
         fecha_nacimiento,
         fecha_registro
       )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
     RETURNING id_identidad, ux_lab_id`,
    [
      f.ux_lab_id,
      f.rut_cifrado,
      f.rut_hash,
      f.nombre_cifrado,
      f.correo_cifrado,
      f.correo_hash,
      f.telefono_cifrado,
      f.tipo,
      f.fecha_nacimiento,
    ]
  );

  return rows[0];
}

/**
 * Descifra los datos de una identidad.
 *
 * Función privada: no se exporta.
 */
function descifrarIdentidad(fila) {
  if (!fila) {
    return null;
  }

  return {
    id_identidad: fila.id_identidad,
    nombre: descifrarOpcional(fila.nombre_cifrado),
    correo: descifrarOpcional(fila.correo_cifrado),
    telefono: descifrarOpcional(fila.telefono_cifrado),
    rut: descifrarOpcional(fila.rut_cifrado),
    fecha_nacimiento: fila.fecha_nacimiento,
    tipo: fila.tipo,
  };
}

/**
 * Obtiene una identidad vigente por UX Lab ID.
 *
 * POST /identidades/:ux_lab_id/desenmascarar
 *
 * La pertenencia al estudio y la autorización
 * deben comprobarse antes, en accesoIdentidad.js.
 */
async function obtenerDescifradaPorUxLabId(uxLabId) {
  const { rows } = await db.query(
    `SELECT
         id_identidad,
         nombre_cifrado,
         correo_cifrado,
         telefono_cifrado,
         rut_cifrado,
         fecha_nacimiento,
         tipo
       FROM identity_schema.identidad
      WHERE ux_lab_id = $1
        AND fecha_revocacion IS NULL
        AND fecha_eliminacion IS NULL`,
    [uxLabId]
  );

  return descifrarIdentidad(rows[0]);
}

/**
 * Obtiene datos de contacto de una participación.
 *
 * POST /participaciones/:idParticipacion/contacto
 *
 * REGLAS:
 * - La autorización debe estar comprobada.
 * - La identidad debe estar vigente.
 * - Si la participación está retirada,
 *   únicamente se admite el motivo "retiro".
 * - La restricción se comprueba ANTES de descifrar.
 * - Solo devuelve nombre, correo y teléfono.
 *
 * El servicio debe proporcionar el motivo
 * previamente validado.
 */
async function obtenerContactoPorParticipacion(
  idParticipacion,
  motivo
) {
  const { rows } = await db.query(
    `SELECT
         i.nombre_cifrado,
         i.correo_cifrado,
         i.telefono_cifrado,
         p.estado
       FROM research_schema.participacion p
       INNER JOIN identity_schema.vinculo_identidad v
         ON v.id_participante = p.id_participante
       INNER JOIN identity_schema.identidad i
         ON i.id_identidad = v.id_identidad
      WHERE p.id_participacion = $1
        AND i.tipo = 'participante'
        AND i.fecha_revocacion IS NULL
        AND i.fecha_eliminacion IS NULL`,
    [idParticipacion]
  );

  if (!rows.length) {
    return null;
  }

  const fila = rows[0];

  /**
   * Fallar antes de descifrar si el motivo
   * no permite contactar a una persona retirada.
   *
   * Si el motivo no se proporcionó, tampoco
   * se concede acceso a sus datos.
   */
  if (
    fila.estado === 'retirado' &&
    motivo !== 'retiro'
  ) {
    throw new ErrorApi(
      409,
      'PARTICIPACION_RETIRADA',
      'Una participación retirada solo admite contacto por motivo retiro.'
    );
  }

  /**
   * El descifrado se ejecuta únicamente
   * después de superar la restricción.
   */
  return {
    estado: fila.estado,
    nombre: descifrarOpcional(fila.nombre_cifrado),
    correo: descifrarOpcional(fila.correo_cifrado),
    telefono: descifrarOpcional(fila.telefono_cifrado),
  };
}

module.exports = {
  buscarPorRutHash,
  buscarPorCorreoHash,
  crear,
  obtenerDescifradaPorUxLabId,
  obtenerContactoPorParticipacion,
};
