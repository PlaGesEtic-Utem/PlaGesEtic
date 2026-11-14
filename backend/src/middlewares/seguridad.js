'use strict';

// Cabeceras que le indician al navegador como protegerse con cada respuesta de la API.

function cabecerasSeguridad(req, res, next) {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('Referrer-Policy', 'no-referrer');    
    res.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");   
    next();
}

// Solo el frontend indicado en ORIGEN_PERMITDO puede leer las respuestas desde el navegador.

function cors(origenPermitido) {
    return (req, res, next) => {
        const origen = req.get('origin');
        if (origenPermitido && origen === origenPermitido) {
            res.set('Access-Control-Allow-Origin', origen);
            res.set('Access-Control-Allow-Methods', 'GET, POST,PATCH, DELETE, OPTIONS');
            res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.set('Vary', 'Origin');
        }
        if (req.method === 'OPTIONS') return res.sendStatus(204);

        next();
    };
}

module.exports =  {cabecerasSeguridad, cors};