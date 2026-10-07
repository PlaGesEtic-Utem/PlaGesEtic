'use strict';
const { Router } = require('express');
const { crearSaludController } = require('../controllers/saludController');

module.exports = (pool) => Router().get('/', crearSaludController(pool));
