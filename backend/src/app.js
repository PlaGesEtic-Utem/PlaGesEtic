'use strict';
const express = require('express');
const crearRutas = require('./routes');
const { rutaNoEncontrada, manejadorErrores } = require('./middlewares/manejadorErrores');

/** Crea la aplicación Express. Recibe el pool para poder usar uno de prueba en los tests. */
function crearApp({ pool }) {
  const app = express();
  app.disable('x-powered-by');           // no revelar la tecnología del servidor
  app.set('trust proxy', 1);             // req.ip correcto detrás de un proxy
  app.use(express.json({ limit: '1mb' }));
  app.use(crearRutas(pool));
  app.use(rutaNoEncontrada);
  app.use(manejadorErrores);
  return app;
}

module.exports = { crearApp };
