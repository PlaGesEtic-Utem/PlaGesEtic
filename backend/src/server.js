'use strict';
const { cargarConfig } = require('./config');
const { iniciarPool, cerrarPool } = require('./db/pool');
const { crearApp } = require('./app');

const config = cargarConfig();
const pool = iniciarPool(config.db);
const app = crearApp({ pool });

const servidor = app.listen(config.puerto, () => {
  console.log(`[api] plaGesEtic escuchando en el puerto ${config.puerto} (${config.entorno})`);
});

async function apagar(senal) {
  console.log(`[api] ${senal} recibido: cerrando...`);
  servidor.close(async () => { await cerrarPool(); process.exit(0); });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => apagar('SIGTERM'));
process.on('SIGINT', () => apagar('SIGINT'));
