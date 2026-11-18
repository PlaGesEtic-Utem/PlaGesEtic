'use strict';

/**
 * Actividad 79 - Datos sinteticos de usabilidad.
 *
 * 30 estudios nuevos y 40 participantes nuevos.
 * Usa exclusivamente la API aislada en localhost:3080.
 *
 * Simulacion:
 *   node scripts/datos-usabilidad.js --dry-run
 *
 * Ejecucion:
 *   ACT79_DB_AISLADA=CONFIRMADA \
 *   TOKEN_INV=... TOKEN_ASI=... \
 *   node scripts/datos-usabilidad.js --apply
 *
 * No elimina ni modifica registros anteriores.
 * Ante resultados inciertos, se detiene para evitar duplicados.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const BASE = 'http://localhost:3080';
const EST01 = '82bbf931-bc9f-594d-8203-77dc4608f2cc';

const TOTAL_ESTUDIOS = 30;
const TOTAL_PARTICIPANTES = 40;

const APPLY = process.argv.includes('--apply');

const DIR = path.resolve(
  process.cwd(),
  '../pruebas-respaldo/act79'
);

const ARCHIVO = path.join(
  DIR,
  'datos_usabilidad_estado.json'
);

const TOKEN_INV = process.env.TOKEN_INV;
const TOKEN_ASI = process.env.TOKEN_ASI;

function guardar(estado) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(
    ARCHIVO,
    JSON.stringify(estado, null, 2),
    { mode: 0o600 }
  );
}

function recuperar() {
  if (fs.existsSync(ARCHIVO)) {
    const estado = JSON.parse(
      fs.readFileSync(ARCHIVO, 'utf8')
    );

    if (
      estado.actividad !== 79 ||
      !Array.isArray(estado.estudios) ||
      !Array.isArray(estado.participantes) ||
      !estado.lote ||
      (estado.base && estado.base !== BASE)
    ) {
      throw new Error('Estado local incompatible.');
    }

    return estado;
  }

  return {
    actividad: 79,
    base: BASE,
    lote: crypto.randomBytes(4).toString('hex'),
    estudios: [],
    participantes: [],
    en_proceso: null,
    completo: false
  };
}

async function api(metodo, ruta, token, cuerpo, esperado) {
  const opciones = {
    method: metodo,
    headers: token
      ? { Authorization: `Bearer ${token}` }
      : {},
    signal: AbortSignal.timeout(30000)
  };

  if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }

  const respuesta = await fetch(BASE + ruta, opciones);
  const datos = await respuesta.json().catch(() => ({}));

  if (respuesta.status !== esperado) {
    const codigo = datos?.error?.codigo || 'SIN_CODIGO';

    throw new Error(
      `${metodo} ${ruta}: HTTP ${respuesta.status} (${codigo})`
    );
  }

  return datos;
}

function lista(datos) {
  if (Array.isArray(datos)) return datos;
  if (Array.isArray(datos.estudios)) return datos.estudios;
  if (Array.isArray(datos.datos)) return datos.datos;
  if (Array.isArray(datos.data)) return datos.data;

  throw new Error('Formato de listado no reconocido.');
}

function comenzarOperacion(estado, tipo, referencia) {
  if (estado.en_proceso) {
    throw new Error(
      'Existe una operacion pendiente de conciliacion. ' +
      'No se repetira automaticamente.'
    );
  }

  estado.en_proceso = { tipo, referencia };
  guardar(estado);
}

function finalizarOperacion(estado) {
  estado.en_proceso = null;
  guardar(estado);
}

async function comprobarEntorno() {
  const salud = await api(
    'GET', '/salud', null, undefined, 200
  );

  if (salud.estado !== 'ok' ||
      salud.base_datos !== 'ok') {
    throw new Error('La API aislada no esta saludable.');
  }

  const estudios = lista(
    await api('GET', '/estudios', TOKEN_INV, undefined, 200)
  );

  const principal = estudios.find(
    e => e.id_estudio === EST01
  );

  if (!principal || principal.estado !== 'activo') {
    throw new Error('EST-01 no existe o no esta activo.');
  }

  console.log('[OK] API aislada disponible.');
  console.log('Estudios visibles inicialmente:', estudios.length);

  return estudios;
}

async function crearEstudios(estado, existentes) {
  console.log('\n===== CREAR ESTUDIOS =====');

  const codigos = new Set(
    existentes.map(e => e.codigo_estudio || e.codigo)
  );

  for (let i = 1; i <= TOTAL_ESTUDIOS; i++) {
    const codigo = `EST-${String(i + 69)}`;

    if (estado.estudios.some(e => e.codigo === codigo)) {
      continue;
    }

    if (codigos.has(codigo)) {
      throw new Error(
        `${codigo} ya existe y no esta registrado en el lote.`
      );
    }

    const cuerpo = {
      codigo_estudio: codigo,
      nombre: `UX79 Estudio sintetico ${i}`,
      descripcion:
        'Datos ficticios para pruebas de usabilidad.',
      fecha_inicio: '2026-11-17',
      fecha_fin: '2027-03-31',
      retencion_hasta: '2031-12-31'
    };

    comenzarOperacion(estado, 'crear_estudio', codigo);

    const creado = await api(
      'POST', '/estudios', TOKEN_INV, cuerpo, 201
    );

    if (!creado.id_estudio) {
      throw new Error(
        `${codigo}: falta id_estudio en la respuesta.`
      );
    }

    estado.estudios.push({
      codigo,
      id_estudio: creado.id_estudio
    });

    finalizarOperacion(estado);

    console.log(`[OK] Estudios: ${estado.estudios.length}/30`);
  }
}

async function crearParticipantes(estado) {
  console.log('\n===== CREAR PARTICIPANTES =====');

  for (let i = 1; i <= TOTAL_PARTICIPANTES; i++) {
    let registro = estado.participantes.find(
      p => p.numero === i
    );

    const numero = String(i).padStart(2, '0');

    if (!registro) {
      comenzarOperacion(estado, 'crear_identidad', i);

      const identidad = await api(
        'POST',
        '/identidades',
        TOKEN_ASI,
        {
          nombre: `Persona Ficticia UX79 ${numero}`,
          correo:
            `ux79.${estado.lote}.${numero}@uxlab.test`,
          telefono: '+56 9 4444 2079',
          fecha_nacimiento: '1995-04-12',
          tipo: 'participante'
        },
        201
      );

      if (!/^UXL-[A-Z0-9]{8}$/.test(
        identidad.ux_lab_id || ''
      )) {
        throw new Error(
          `Identidad ${i}: UX Lab ID no reconocido.`
        );
      }

      registro = {
        numero: i,
        ux_lab_id: identidad.ux_lab_id,
        id_participacion: null,
        codigo_seudonimo: null
      };

      estado.participantes.push(registro);
      finalizarOperacion(estado);
    }

    if (registro.id_participacion) {
      continue;
    }

    comenzarOperacion(estado, 'inscribir_participante', i);

    const participacion = await api(
      'POST',
      `/estudios/${EST01}/participaciones`,
      TOKEN_ASI,
      { ux_lab_id: registro.ux_lab_id },
      201
    );

    if (!participacion.id_participacion ||
        !participacion.codigo_seudonimo) {
      throw new Error(
        `Participacion ${i}: respuesta incompleta.`
      );
    }

    registro.id_participacion =
      participacion.id_participacion;

    registro.codigo_seudonimo =
      participacion.codigo_seudonimo;

    finalizarOperacion(estado);

    const inscritos = estado.participantes.filter(
      p => p.id_participacion
    ).length;

    console.log(
      `[OK] Participantes inscritos: ${inscritos}/40`
    );
  }
}

async function main() {
  console.log('===== ACTIVIDAD 79 - DATOS SINTETICOS =====');
  console.log('API objetivo:', BASE);

  if (!APPLY) {
    console.log('Modo: simulacion');
    console.log('Estudios nuevos:', TOTAL_ESTUDIOS);
    console.log('Participantes nuevos:', TOTAL_PARTICIPANTES);
    console.log('[OK] Sin cambios en la base de datos.');
    return;
  }

  if (process.env.ACT79_DB_AISLADA !== 'CONFIRMADA') {
    throw new Error('Falta confirmar la base aislada.');
  }

  if (!TOKEN_INV || !TOKEN_ASI) {
    throw new Error('Faltan tokens de los perfiles.');
  }

  const estado = recuperar();

  if (estado.en_proceso) {
    throw new Error(
      'Hay una operacion de resultado incierto. ' +
      'Revisar datos_usabilidad_estado.json antes de continuar.'
    );
  }

  const existentes = await comprobarEntorno();

  if (!estado.completo) {
    guardar(estado);
    await crearEstudios(estado, existentes);
    await crearParticipantes(estado);
  }

  const inscritos = estado.participantes.filter(
    p => p.id_participacion
  ).length;

  const correcto =
    estado.estudios.length === TOTAL_ESTUDIOS &&
    inscritos === TOTAL_PARTICIPANTES;

  if (!correcto) {
    throw new Error('El lote no alcanzo los totales requeridos.');
  }

  estado.completo = true;
  guardar(estado);

  console.log('\n===== RESUMEN FINAL =====');
  console.log('Estudios nuevos:', estado.estudios.length);
  console.log('Participantes inscritos:', inscritos);
  console.log('Lote completo:', estado.completo);
  console.log('[OK] Generacion completada.');
}

main().catch(error => {
  console.error('[ERROR]', error.message);
  console.error(
    'Si hubo una operacion incierta, no repetir ' +
    '--apply sin conciliar el estado local.'
  );
  process.exitCode = 1;
});
