'use strict';
/**
    * plaGesEtic · Servidor de desarrollo de la interfaz: muestra el prototipo conectado a la API real. SOLO DESARROLLO.
    * * Abre el prototipo navegable v3.1 en http://localhost:8080, pero el ingreso, los estudios, los participantes
 * y el alta de participantes usan la API real (la de Docker, en http://localhost:3000).
 *   - Las llamadas /api/... se reenvían a la API tal cual (así el navegador no las bloquea).
 *   - /codigo?correo=... hace de «celular»: calcula el código de 6 dígitos de un usuario de prueba
 *     (@uxlab.test), igual que Google Authenticator con el secreto que imprime usuarios-prueba.js.
 *
 * Uso:  node demo-flujo.js        (con la API levantada:  docker compose up -d)
 * Sin dependencias: solo Node 18 o superior.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

if (process.env.NODE_ENV === 'production') { console.error('Solo para desarrollo.'); process.exit(1); }

const PUERTO = Number(process.env.PUERTO_DEMO || 8080);
const API = process.env.API || 'http://localhost:3000';
const PAGINA = path.join(__dirname, 'prototipo.html');
const INTEGRACION = path.join(__dirname, 'flujo-real.js');

// ---- «Celular simulado»: mismo cálculo que src/utils/totp.js y el secreto fijo de scripts/usuarios-prueba.js
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32(buf) {
  let bits = 0, valor = 0, s = '';
  for (const b of buf) { valor = (valor << 8) | b; bits += 8; while (bits >= 5) { s += B32[(valor >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) s += B32[(valor << (5 - bits)) & 31];
  return s;
}
function desdeBase32(t) {
  let bits = 0, valor = 0; const out = [];
  for (const c of t) { valor = (valor << 5) | B32.indexOf(c); bits += 5; if (bits >= 8) { out.push((valor >>> (bits - 8)) & 255); bits -= 8; } }
  return Buffer.from(out);
}
function codigoTotp(secreto, ms = Date.now()) {
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(Math.floor(ms / 30000)));
  const h = crypto.createHmac('sha1', desdeBase32(secreto)).update(msg).digest();
  const o = h[h.length - 1] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, '0');
}
const secretoDePrueba = (correo) => base32(crypto.createHmac('sha1', 'plagesetic-solo-desarrollo').update(correo).digest());

// ---- Servidor
const leerCuerpo = (req) => new Promise((ok, mal) => {
  const partes = []; req.on('data', (p) => partes.push(p)); req.on('end', () => ok(Buffer.concat(partes))); req.on('error', mal);
});
const json = (res, status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      // El prototipo navegable v3.1 tal cual, más la capa que lo conecta a la API real.
      const html = fs.readFileSync(PAGINA, 'utf8').replace('</body>', '<script src="/qrcode.js"></script><script src="/flujo-real.js"></script></body>');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(html);
    }
    if (req.method === 'GET' && url.pathname === '/qrcode.js') { // librería QR (MIT, Kazuhiko Arase)
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
      return fs.createReadStream(path.join(__dirname, 'qrcode.js')).pipe(res);
    }
    // Dirección otpauth:// del usuario de prueba, para escanearla con Google/Microsoft Authenticator.
    // Es el mismo secreto fijo de scripts/usuarios-prueba.js: solo para cuentas @uxlab.test.
    if (req.method === 'GET' && url.pathname === '/otpauth') {
      const correo = String(url.searchParams.get('correo') || '').trim().toLowerCase();
      if (!/^[a-z0-9._-]+@uxlab\.test$/.test(correo)) return json(res, 400, { error: 'Solo usuarios de prueba (@uxlab.test).' });
      const uri = `otpauth://totp/plaGesEtic:${encodeURIComponent(correo)}?secret=${secretoDePrueba(correo)}&issuer=plaGesEtic&algorithm=SHA1&digits=6&period=30`;
      return json(res, 200, { uri });
    }
    if (req.method === 'GET' && url.pathname === '/flujo-real.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
      return fs.createReadStream(INTEGRACION).pipe(res);
    }

    if (url.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }

    if (req.method === 'GET' && url.pathname === '/codigo') {
      const correo = String(url.searchParams.get('correo') || '').trim().toLowerCase();
      if (!/^[a-z0-9._-]+@uxlab\.test$/.test(correo)) return json(res, 400, { error: 'Solo usuarios de prueba (@uxlab.test).' });
      const s = secretoDePrueba(correo);
      return json(res, 200, { codigo: codigoTotp(s), segundos_restantes: 30 - (Math.floor(Date.now() / 1000) % 30) });
    }

    if (url.pathname.startsWith('/api/')) {
      const destino = API + url.pathname.slice(4) + url.search;
      const cuerpo = ['GET', 'HEAD'].includes(req.method) ? undefined : await leerCuerpo(req);
      const cab = {};
      if (req.headers['content-type']) cab['Content-Type'] = req.headers['content-type'];
      if (req.headers.authorization) cab.Authorization = req.headers.authorization;
      let r;
      try { r = await fetch(destino, { method: req.method, headers: cab, body: cuerpo }); }
      catch (e) { return json(res, 502, { error: { codigo: 'API_APAGADA', mensaje: `No se pudo conectar con la API en ${API}. ¿Está corriendo «docker compose up -d»?` } }); }
      const texto = await r.text();
      res.writeHead(r.status, { 'Content-Type': r.headers.get('content-type') || 'application/json' });
      return res.end(texto);
    }

    json(res, 404, { error: 'No existe' });
  } catch (e) {
    json(res, 500, { error: String(e.message || e) });
  }
}).listen(PUERTO, process.env.HOST || '127.0.0.1', () => {   // HOST=0.0.0.0 solo dentro de Docker
  console.log(`\n  Prototipo conectado a la API real:  http://localhost:${PUERTO}\n  (usa la API en ${API} · Ctrl+C para cerrar)\n`);
});
