// Arma la aplicación Express y la conexión a la base de datos, y la inicia en el puerto configurado.
'use strict';

const { cargarConfig } = require('./config'); // Cargar la configuración desde variables de entorno o archivo .env
const { iniciarPool, cerrarPool } = require('./db/pool'); // Inicializar y cerrar la conexión a la base de datos
const { crearApp } = require('./app'); // Crear la aplicación Express con las rutas y middlewares necesarios

const config = cargarConfig(); // Cargar la configuracion de la aplicacion (puerto, entornno, base de datos, etc.)
const pool = iniciarPool(config.db);  // Entregarle a la aplicacion el pool de conexiones a la base de datos para que pueda realizar consultas
const app = crearApp({ pool }); // Llamar a la funcion que crea la aplicacion Express y pasarle el pool de conexiones a la base de datos


// Iniciar el servidor en el puerto especificado en la configuración
const servidor = app.listen(config.puerto, () => {
  console.log(`[api] plaGesEtic escuchando en el puerto ${config.puerto} (${config.entorno})`);
});


// Manejo de señales para cerrar el servidor y la conexión a la base de datos de manera ordenada
async function apagar(senal) {
  console.log(`[api] ${senal} recibido: cerrando...`);
  servidor.close(async () => { await cerrarPool(); process.exit(0); });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => apagar('SIGTERM')); // Señal de terminación del proceso (por ejemplo, al detener un contenedor Docker)
process.on('SIGINT', () => apagar('SIGINT')); // Señal de interrupción del proceso (por ejemplo, al presionar Ctrl+C en la terminal)
