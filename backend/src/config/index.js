'use strict';
/**
 * Configuración por variables de entorno.
 * Falla al arrancar si falta una variable obligatoria: es mejor no levantar
 * que levantar con una configuración incompleta.
 */
require('dotenv').config();

const OBLIGATORIAS = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];

function cargarConfig(env = process.env) {
  const faltan = OBLIGATORIAS.filter((k) => !env[k]);
  if (faltan.length) {
    throw new Error(`Faltan variables de entorno: ${faltan.join(', ')}. Revisa el archivo .env (ver .env.example).`);
  }
  return Object.freeze({
    entorno: env.NODE_ENV || 'development',
    puerto: Number(env.PORT) || 3000,
    db: Object.freeze({
      host: env.DB_HOST,
      port: Number(env.DB_PORT) || 5432,
      database: env.DB_NAME,
      user: env.DB_USER,          // usuario de la APLICACIÓN, no el dueño del esquema
      password: env.DB_PASSWORD,
    }),
    jwt: Object.freeze({
      secreto: env.JWT_SECRET || null,      // lo usa el login de la Actividad 40
      expiraEn: env.JWT_EXPIRA_EN || '8h',
    }),
  });
}

module.exports = { cargarConfig, OBLIGATORIAS };
