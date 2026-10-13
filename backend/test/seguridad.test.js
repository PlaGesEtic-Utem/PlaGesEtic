'use strict';
/**
 * Pruebas automatizadas de seguridad del backend (Actividad 43).
 *
 * Cubren, a través de HTTP real (servidor Express en un puerto libre):
 *   - 401 sin token, con token inválido y con la sesión cerrada
 *   - 403 sin permiso del rol y sin membresía en el estudio
 *   - fila de auditoría creada en un éxito y en rechazos (401 y 403)
 *   - respuestas sin campos de datos personales
 *   - bitácora de solo lectura (405 en PUT/PATCH/POST/DELETE; el repositorio no ofrece UPDATE ni DELETE)
 *
 * No necesitan Docker ni PostgreSQL: la base se simula en memoria (ver "BD simulada").
 * El fallo real de UPDATE/DELETE sobre la tabla está en test/auditoria-bd.test.js (requiere PostgreSQL).
 */
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { once } = require('node:events');

// ---------- Entorno de pruebas (antes de cargar cualquier módulo del proyecto) ----------
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_NAME = process.env.DB_NAME || 'plagesetic_test';
process.env.DB_USER = process.env.DB_USER || 'usuario_test';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'clave_test';
process.env.JWT_SECRET = 'secreto-solo-para-pruebas'; // dotenv no pisa variables ya definidas

const express = require('express');
const jwt = require('jsonwebtoken');

// ---------- BD simulada ----------
// Los repositorios piden el pool con obtenerPool(); se reemplaza ANTES de cargar app y middlewares
// (los repositorios toman la función al cargarse). Cada archivo de prueba corre en su propio proceso.
const U_DIRECTOR = '11111111-1111-4111-8111-111111111111';
const U_INVESTIGADOR = '22222222-2222-4222-8222-222222222222';
const E1 = '33333333-3333-4333-8333-333333333333';

let estado;
function reiniciar() {
  estado = { sesiones: new Map(), permisos: [], membresias: [], auditoria: [], consultas: [] };
}
reiniciar();

const ORDEN_INSERT_AUDITORIA = [
  'id_usuario', 'correo_intentado', 'id_sesion', 'ip', 'entidad', 'id_registro_afectado',
  'id_estudio', 'accion', 'resultado', 'justificacion', 'id_autorizacion', 'fecha_hora',
];

const sesionVigente = (hash) => {
  const s = estado.sesiones.get(hash);
  return s && !s.cerrada ? s : null;
};
const resultadoDeSesion = (s) => ({
  rows: s ? [{ id_sesion: s.id_sesion, id_usuario: s.id_usuario, debe_cambiar_password: false, nombre_rol: s.nombre_rol }] : [],
  rowCount: s ? 1 : 0,
});

const bdFalsa = {
  async query(sql, p = []) {
    const t = sql.replace(/\s+/g, ' ').trim();
    estado.consultas.push(t);

    if (t.startsWith('UPDATE security_schema.sesion_usuario')) {
      // Renovación de la sesión por actividad (vence tras un tiempo sin uso). Puede ir sola o
      // junto con la búsqueda de la sesión (RETURNING): se contesta como lo haría PostgreSQL.
      const s = sesionVigente(p[0]);
      if (!t.includes('RETURNING')) return { rows: [], rowCount: s ? 1 : 0 };
      return resultadoDeSesion(s);
    }
    if (t.includes('FROM security_schema.sesion_usuario')) {
      // Emula el filtro del SQL real (sin cierre y sin vencer); la prueba de "sesión cerrada"
      // además comprueba que el SQL real conserve esas condiciones.
      return resultadoDeSesion(sesionVigente(p[0]));
    }
    if (t.includes('FROM security_schema.permiso')) {
      const [rol, recurso, accion] = p;
      const f = estado.permisos.find((x) => x.rol === rol && x.recurso === recurso && x.accion === accion);
      return { rows: f ? [{ alcance: f.alcance }] : [] };
    }
    if (t.includes('FROM security_schema.membresia_estudio')) {
      const m = estado.membresias.find((x) => x.id_usuario === p[0] && x.id_estudio === p[1]);
      return { rows: m ? [m.fila] : [] };
    }
    if (t.includes('FROM security_schema.autorizacion')) return { rows: [] };
    if (t.includes('FROM research_schema.estudio')) return { rows: [{ estado: 'activo' }] };
    if (t.startsWith('INSERT INTO security_schema.auditoria')) {
      estado.auditoria.push(Object.fromEntries(ORDEN_INSERT_AUDITORIA.map((c, i) => [c, p[i]])));
      return { rows: [], rowCount: 1 };
    }
    if (t.includes('COUNT(*)') && t.includes('security_schema.auditoria')) return { rows: [{ total: estado.auditoria.length }] };
    if (t.includes('FROM security_schema.auditoria')) return { rows: [] };
    throw new Error(`Consulta no prevista en la prueba: ${t.slice(0, 120)}`);
  },
};

require('../src/db/pool').obtenerPool = () => bdFalsa;

const { crearApp } = require('../src/app');
const { auditoria, marcarAuditoria } = require('../src/middlewares/auditoria');
const { autenticacion } = require('../src/middlewares/autenticacion');
const { requierePermiso } = require('../src/middlewares/controlAcceso');
const { filtroPrivacidad, CAMPOS_PROHIBIDOS } = require('../src/middlewares/filtroPrivacidad');
const { rutaNoEncontrada, manejadorErrores } = require('../src/middlewares/manejadorErrores');
const auditoriaRepository = require('../src/repositories/auditoriaRepository');

// ---------- Ayudas ----------
function crearSesion({ idUsuario, rol }) {
  const token = jwt.sign({ sub: idUsuario }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const hash = crypto.createHash('sha256').update(token).digest('hex'); // igual que scripts/sesion-prueba.js
  estado.sesiones.set(hash, { id_sesion: crypto.randomUUID(), id_usuario: idUsuario, nombre_rol: rol, cerrada: false });
  return { token, hash };
}
const darPermiso = (rol, recurso, accion, alcance) => estado.permisos.push({ rol, recurso, accion, alcance });
const darMembresia = (idUsuario, idEstudio, permisos = {}) => estado.membresias.push({
  id_usuario: idUsuario,
  id_estudio: idEstudio,
  fila: { id_membresia: crypto.randomUUID(), puede_consultar: false, puede_cargar: false, puede_modificar: false, puede_descargar: false, puede_exportar: false, ...permisos },
});

async function iniciar(app) {
  const servidor = app.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  return {
    base: `http://127.0.0.1:${servidor.address().port}`,
    cerrar: () => new Promise((r) => { if (servidor.closeAllConnections) servidor.closeAllConnections(); servidor.close(r); }),
  };
}
const pedir = (srv, ruta, { metodo = 'GET', token } = {}) =>
  fetch(srv.base + ruta, { method: metodo, headers: token ? { Authorization: `Bearer ${token}` } : {} });

/** La auditoría se inserta al terminar la respuesta ('finish'): se espera a que aparezca. */
async function esperarAuditoria(cantidad = 1) {
  for (let i = 0; i < 100; i++) {
    if (estado.auditoria.length >= cantidad) return estado.auditoria;
    await new Promise((r) => setTimeout(r, 10));
  }
  assert.fail(`No se creó la fila de auditoría (hay ${estado.auditoria.length}, se esperaban ${cantidad})`);
}

/** Misma cadena que routes/index.js, con rutas propias para probar la membresía y el filtro de datos personales. */
function crearAppDePrueba() {
  const app = express();
  app.use(auditoria);
  app.use(autenticacion);
  app.use(filtroPrivacidad);
  app.get('/prueba/estudios/:idEstudio',
    marcarAuditoria('estudio', 'leer'),
    requierePermiso({ recurso: 'estudio', accion: 'leer', permisoEstudio: 'puede_consultar' }),
    (req, res) => res.json({ ok: true }));
  app.get('/prueba/datos-personales',
    marcarAuditoria('identidad', 'leer'),
    requierePermiso({ recurso: 'identidad', accion: 'leer' }),
    (req, res) => res.json(cuerpoConDatosPersonales()));
  app.use(rutaNoEncontrada);
  app.use(manejadorErrores);
  return app;
}

function cuerpoConDatosPersonales() {
  const prohibidos = Object.fromEntries(CAMPOS_PROHIBIDOS.map((c) => [c, 'valor-sensible']));
  return {
    codigo_seudonimo: 'P-ABC234',
    estado: 'activo',
    ...prohibidos,
    participaciones: [{ codigo_seudonimo: 'P-XYZ789', ...prohibidos }],
    anidado: { nivel2: { ...prohibidos, dato_de_estudio: 42 } },
  };
}

function clavesDe(valor, acumulado = []) {
  if (Array.isArray(valor)) valor.forEach((v) => clavesDe(v, acumulado));
  else if (valor && typeof valor === 'object') {
    for (const [k, v] of Object.entries(valor)) { acumulado.push(k.toLowerCase()); clavesDe(v, acumulado); }
  }
  return acumulado;
}

// ---------- Pruebas ----------
describe('Seguridad del backend', () => {
  let real; // app real (crearApp): para GET /auditoria
  let prueba; // app de prueba: membresía y filtro de datos personales

  before(async () => {
    real = await iniciar(crearApp({ pool: bdFalsa }));
    prueba = await iniciar(crearAppDePrueba());
  });
  after(async () => {
    await real.cerrar();
    await prueba.cerrar();
  });
  beforeEach(reiniciar);

  describe('401 · no autenticado', () => {
    it('401 sin token, con el formato común de error', async () => {
      const r = await pedir(real, '/auditoria');
      assert.equal(r.status, 401);
      const cuerpo = await r.json();
      assert.ok(cuerpo.error && cuerpo.error.codigo && cuerpo.error.mensaje, 'debe responder { error: { codigo, mensaje } }');
    });

    it('401 con un token inválido (firma que no corresponde)', async () => {
      const falso = jwt.sign({ sub: U_DIRECTOR }, 'otro-secreto');
      const r = await pedir(real, '/auditoria', { token: falso });
      assert.equal(r.status, 401);
    });

    it('401 con la sesión cerrada, aunque el JWT siga vigente', async () => {
      darPermiso('Director', 'auditoria', 'leer', 'global');
      const { token, hash } = crearSesion({ idUsuario: U_DIRECTOR, rol: 'Director' });

      assert.equal((await pedir(real, '/auditoria', { token })).status, 200, 'control: con la sesión abierta pasa');

      estado.sesiones.get(hash).cerrada = true; // logout
      assert.equal((await pedir(real, '/auditoria', { token })).status, 401);

      // El SQL real debe seguir exigiendo sesión sin cerrar y sin vencer (en el SELECT o en el UPDATE ... RETURNING).
      const sqlSesion = estado.consultas
        .filter((c) => c.includes('security_schema.sesion_usuario') && c.includes('token_hash'))
        .join(' ; ');
      assert.match(sqlSesion, /fecha_cierre IS NULL/);
      assert.match(sqlSesion, /fecha_expiracion > now\(\)/);
    });
  });

  describe('403 · sin permiso', () => {
    it('403 si el rol no tiene el permiso (Investigador en GET /auditoria)', async () => {
      const { token } = crearSesion({ idUsuario: U_INVESTIGADOR, rol: 'Investigador' });
      const r = await pedir(real, '/auditoria', { token });
      assert.equal(r.status, 403);
      assert.ok((await r.json()).error.codigo);
      assert.ok(!estado.consultas.some((c) => c.includes('COUNT(*)')), 'no debe consultar la bitácora si no hay permiso');
    });

    it('403 si el rol tiene permiso pero el usuario no tiene membresía en el estudio', async () => {
      darPermiso('Investigador', 'estudio', 'leer', 'estudio');
      const { token } = crearSesion({ idUsuario: U_INVESTIGADOR, rol: 'Investigador' });
      const r = await pedir(prueba, `/prueba/estudios/${E1}`, { token });
      assert.equal(r.status, 403);
    });

    it('200 con membresía que incluye puede_consultar (control de las pruebas de 403)', async () => {
      darPermiso('Investigador', 'estudio', 'leer', 'estudio');
      darMembresia(U_INVESTIGADOR, E1, { puede_consultar: true });
      const { token } = crearSesion({ idUsuario: U_INVESTIGADOR, rol: 'Investigador' });
      assert.equal((await pedir(prueba, `/prueba/estudios/${E1}`, { token })).status, 200);
    });

    it('403 si la membresía existe pero sin el permiso puede_consultar', async () => {
      darPermiso('Investigador', 'estudio', 'leer', 'estudio');
      darMembresia(U_INVESTIGADOR, E1, { puede_consultar: false, puede_cargar: true });
      const { token } = crearSesion({ idUsuario: U_INVESTIGADOR, rol: 'Investigador' });
      assert.equal((await pedir(prueba, `/prueba/estudios/${E1}`, { token })).status, 403);
    });
  });

  describe('Auditoría · fila creada', () => {
    it('crea la fila en un éxito (200)', async () => {
      darPermiso('Director', 'auditoria', 'leer', 'global');
      const { token } = crearSesion({ idUsuario: U_DIRECTOR, rol: 'Director' });
      assert.equal((await pedir(real, '/auditoria', { token })).status, 200);

      const [fila] = await esperarAuditoria(1);
      assert.equal(fila.resultado, 'exito');
      assert.equal(fila.accion, 'leer');
      assert.equal(fila.entidad, 'auditoria');
      assert.equal(fila.id_usuario, U_DIRECTOR);
      assert.ok(fila.id_sesion, 'debe registrar la sesión');
      assert.ok(fila.ip, 'debe registrar la IP');
      assert.ok(fila.fecha_hora instanceof Date);
    });

    it('crea la fila en un rechazo 401 (sin usuario identificado)', async () => {
      assert.equal((await pedir(real, '/auditoria')).status, 401);
      const [fila] = await esperarAuditoria(1);
      assert.equal(fila.resultado, 'error');
      assert.equal(fila.id_usuario, null);
      assert.equal(fila.accion, 'leer');
    });

    it('crea la fila en un rechazo 403 (con el usuario que lo intentó)', async () => {
      const { token } = crearSesion({ idUsuario: U_INVESTIGADOR, rol: 'Investigador' });
      assert.equal((await pedir(real, '/auditoria', { token })).status, 403);
      const [fila] = await esperarAuditoria(1);
      assert.equal(fila.resultado, 'error');
      assert.equal(fila.id_usuario, U_INVESTIGADOR);
      assert.equal(fila.entidad, 'auditoria');
    });
  });

  describe('Privacidad · datos personales', () => {
    it('la respuesta no trae ningún campo de CAMPOS_PROHIBIDOS, en ningún nivel', async () => {
      assert.ok(Array.isArray(CAMPOS_PROHIBIDOS) && CAMPOS_PROHIBIDOS.length > 0,
        'filtroPrivacidad.js debe exportar CAMPOS_PROHIBIDOS y no debe estar vacía');
      darPermiso('Investigador', 'identidad', 'leer', 'global');
      const { token } = crearSesion({ idUsuario: U_INVESTIGADOR, rol: 'Investigador' });

      const r = await pedir(prueba, '/prueba/datos-personales', { token });
      assert.equal(r.status, 200);
      const cuerpo = await r.json();

      const presentes = clavesDe(cuerpo);
      for (const campo of CAMPOS_PROHIBIDOS) {
        assert.ok(!presentes.includes(campo.toLowerCase()), `el campo "${campo}" no debe salir en la respuesta`);
      }
      // Lo que no es dato personal se conserva.
      assert.equal(cuerpo.codigo_seudonimo, 'P-ABC234');
      assert.equal(cuerpo.participaciones[0].codigo_seudonimo, 'P-XYZ789');
      assert.equal(cuerpo.anidado.nivel2.dato_de_estudio, 42);
    });
  });

  describe('Auditoría · solo lectura', () => {
    it('PUT, PATCH, POST y DELETE sobre /auditoria responden 405 y no tocan la tabla', async () => {
      darPermiso('Director', 'auditoria', 'leer', 'global');
      const { token } = crearSesion({ idUsuario: U_DIRECTOR, rol: 'Director' });
      for (const metodo of ['PUT', 'PATCH', 'POST', 'DELETE']) {
        for (const ruta of ['/auditoria', '/auditoria/abc']) {
          const r = await pedir(real, ruta, { metodo, token });
          assert.equal(r.status, 405, `${metodo} ${ruta}`);
          assert.equal(r.headers.get('allow'), 'GET');
        }
      }
      const escrituras = estado.consultas.filter((c) => /^(UPDATE|DELETE|TRUNCATE)\b.*security_schema\.auditoria/i.test(c));
      assert.deepEqual(escrituras, [], 'no debe ejecutarse ningún UPDATE/DELETE/TRUNCATE sobre security_schema.auditoria');
    });

    it('el repositorio solo ofrece registrar (INSERT) y consultar (SELECT)', () => {
      assert.deepEqual(Object.keys(auditoriaRepository).sort(), ['consultar', 'registrar']);
    });
  });
});