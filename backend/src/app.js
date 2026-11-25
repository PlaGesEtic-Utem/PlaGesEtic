'use strict';
const { cabecerasSeguridad , cors} = require('./middlewares/seguridad');
const express = require('express');
const crearRutas = require('./routes');
const { rutaNoEncontrada, manejadorErrores } = require('./middlewares/manejadorErrores');

/** Crea la aplicación Express. Recibe el pool para poder usar uno de prueba en los tests. */
function crearApp({ pool , origenPermitido }) {
  const app = express();
  app.disable('x-powered-by');           // no revelar la tecnología del servidor
  app.set('trust proxy', 1);  
  app.use(cabecerasSeguridad);
  app.use(cors( origenPermitido ));
  app.use(express.json({ limit: '1mb' }));
  app.use(crearRutas(pool));
  app.use(rutaNoEncontrada);
  app.use(manejadorErrores);
  return app;
}

module.exports = { crearApp };
