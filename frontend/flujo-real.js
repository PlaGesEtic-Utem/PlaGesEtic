
/* plaGesEtic · Capa que conecta el prototipo navegable v2.3.1 con la API real (SOLO DEMO / DESARROLLO).
 * No cambia el diseño: reemplaza los datos de ejemplo por los de la API en estas pantallas:
 *   A1/A2  ingreso con contraseña + código (o código de recuperación)  → POST /auth/login, /auth/login/mfa
 *   A3     panel con el nombre y rol reales
 *   C1     estudios del usuario                                       → GET  /estudios
 *   C3     participantes de un estudio (solo seudónimos)               → GET  /estudios/{id}/participaciones
 *   B0-B5  alta de participante: busca, y al guardar la decisión del consentimiento registra la identidad cifrada
 *          e inscribe → POST /identidades(/buscar), /estudios/{id}/participaciones
 *   Cerrar sesión                                                      → POST /auth/logout
 *   Cambio obligatorio de contraseña                                  → POST /auth/password
 * Administración y archivos de sesión siguen pendientes de integración; exportaciones y consentimientos PDF usan la API.
 * La experiencia continúa siendo una demo de desarrollo.
 */
(function () {
  'use strict';
  const API = '/api';
  const R2 = { token: null, tmp: null, correo: null, usuario: null, estudios: [],
    participaciones: new Map(), estudioParticipacion: new Map(), idsConsentimiento: new Map(),
    documentos: null, altaProceso: null, confirmacion: null, ficha: null,
    eventoTipo: null, sensible: null, contactoMotivo: null, pantallaAnterior: null };
  const ROLES = ['Director', 'Soporte', 'Investigador', 'Asistente', 'Estudiante', 'Invitado'];

  // ---------- estilos de la capa ----------
  const css = document.createElement('style');
  css.textContent = `
  body>div:first-of-type{display:none!important} #idx{display:none!important}
  #rl-badge{position:fixed;left:12px;bottom:12px;z-index:9999;background:#000B78;color:#fff;font:600 12px Inter,Arial,sans-serif;padding:7px 12px;border-radius:99px;box-shadow:0 4px 14px rgba(0,0,0,.18)}
  #rl-badge i{display:inline-block;width:8px;height:8px;border-radius:50%;background:#B9E20E;margin-right:7px}
  #rl-badge.off i{background:#E5484D}
  #rl-cel{position:fixed;right:16px;bottom:16px;z-index:9999;width:230px;background:#0B0E32;color:#fff;border-radius:22px;padding:16px 16px 14px;font-family:Inter,Arial,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35);display:none}
  #rl-cel small{display:block;color:#AEB7FF;font-size:11px}
  #rl-cel .c{font:800 30px/1.2 'Plus Jakarta Sans',Inter,sans-serif;letter-spacing:.12em;margin:6px 0 4px;color:#B9E20E;cursor:pointer}
  #rl-cel .b{height:4px;background:#242A5C;border-radius:9px;overflow:hidden}#rl-cel .b>div{height:100%;background:#B9E20E}
  #rl-toast{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:10000;background:#131315;color:#fff;font:500 14px Inter,Arial,sans-serif;padding:10px 16px;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.25);display:none;max-width:90vw}
  #rl-toast.err{background:#B42318}#rl-toast.ok{background:#1C7A3D}
  .rl-busy{opacity:.6;pointer-events:none}
  .rl-pw{position:relative}.rl-pw input{width:100%;padding-right:92px!important}
  .rl-ver{position:absolute;right:8px;top:50%;transform:translateY(-50%);border:0;background:#EEF0FF;color:#1C2FB9;font:600 12.5px Inter,Arial,sans-serif;padding:6px 10px;border-radius:8px;cursor:pointer}
  #rl-qr{position:fixed;inset:0;z-index:10001;background:rgba(11,14,50,.55);display:none;align-items:center;justify-content:center;padding:16px}
  #rl-qr .box{background:#fff;color:#131315;border-radius:18px;max-width:420px;width:100%;padding:22px 22px 18px;font-family:Inter,Arial,sans-serif;box-shadow:0 20px 50px rgba(0,0,0,.3)}
  #rl-qr h3{margin:0 0 4px;font:700 19px 'Plus Jakarta Sans',Inter,sans-serif;color:#000B78}
  #rl-qr p{margin:6px 0;font-size:13.5px;color:#4B4F6B;line-height:1.45}
  #rl-qr .img{display:flex;justify-content:center;margin:12px 0}#rl-qr .img img{width:220px;height:220px;image-rendering:pixelated}
  #rl-qr ol{margin:6px 0 10px;padding-left:20px;font-size:13.5px;line-height:1.5}
  #rl-qr .row{display:flex;justify-content:flex-end;gap:8px}
  #rl-qr button{border:0;border-radius:10px;padding:9px 16px;font:600 14px Inter,Arial,sans-serif;cursor:pointer;background:#000B78;color:#fff}
  .rl-qrlink{display:inline-block;margin:2px 0 8px;border:0;background:none;color:#1C2FB9;font:600 13px Inter,Arial,sans-serif;text-decoration:underline;cursor:pointer;padding:0}
  .rl-ver:hover{background:#DDE2FF}.rl-ver:focus-visible{outline:2px solid #253FF6;outline-offset:2px}`;
  css.textContent += '\n#rl-cel,[data-act="verqr"]{display:none!important}';
  document.head.appendChild(css);
  const badge = document.createElement('div'); badge.id = 'rl-badge'; badge.innerHTML = '<i></i>Comprobando conexión…';
  const cel = document.createElement('div'); cel.id = 'rl-cel';
  cel.innerHTML = '<small>Celular simulado · app de autenticación</small><div class="c" title="Clic para copiarlo al campo">------</div><div class="b"><div></div></div><small style="margin-top:6px" id="rl-cel-u"></small>';
  const toastEl = document.createElement('div'); toastEl.id = 'rl-toast';
  const qrEl = document.createElement('div'); qrEl.id = 'rl-qr'; qrEl.setAttribute('role', 'dialog'); qrEl.setAttribute('aria-modal', 'true');
  document.body.append(badge, cel, toastEl, qrEl);

  // ---------- ACT74: enrolamiento MFA real, sin simulador ----------
  let act74MfaEnrolamiento = false;
  let act74MfaEtapa = '';

  async function mostrarQR() {
    if (!act74MfaEnrolamiento || !R2.tmp) return;
    if (typeof qrcode !== 'function') {
      throw new Error('No se cargó qrcode.js. Comprueba el servidor de frontend.');
    }

    const respuesta = await api('POST', '/auth/mfa/enrolar',
      { token_temporal: R2.tmp }, false);
    if (!respuesta.otpauth_uri) throw new Error('La API no entregó otpauth_uri.');

    const qr = qrcode(0, 'M');
    qr.addData(respuesta.otpauth_uri);
    qr.make();
    act74MfaEtapa = 'qr';

    qrEl.innerHTML = `<div class="box">
      <h3>Activa la verificación en dos pasos</h3>
      <p>Escanea este QR con Google Authenticator o Microsoft Authenticator.
        Se genera desde la API real y todavía <b>no activa</b> el MFA.</p>
      <div class="img">${qr.createImgTag(6, 8)}</div>
      <p style="overflow-wrap:anywhere;font-size:12px">Cuenta: ${h(R2.correo)}</p>
      <form id="act74-mfa-form">
        <label for="act74-mfa-codigo">Código actual de 6 dígitos de tu aplicación</label>
        <input id="act74-mfa-codigo" type="text" inputmode="numeric" pattern="[0-9]{6}"
          maxlength="6" autocomplete="one-time-code" required
          style="width:100%;padding:10px;margin-top:6px;box-sizing:border-box">
        <p id="act74-mfa-error" role="alert" aria-live="polite"
          style="min-height:18px;color:#b42318;font-size:13px"></p>
        <div class="row">
          <button type="button" data-act="act74MfaCancelar">Cancelar</button>
          <button id="act74-mfa-guardar" type="submit">Activar MFA</button>
        </div>
      </form>
      <p style="font-size:12px">Este pase vence a los 5 minutos. Si vence, inicia sesión otra vez.</p>
    </div>`;
    qrEl.style.display = 'flex';
  }

  function act74MfaCerrar() {
    qrEl.style.display = 'none';
    qrEl.innerHTML = '';
    act74MfaEtapa = '';
  }

  qrEl.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-act="act74MfaCancelar"], [data-act="act74MfaContinuar"]');
    if (!boton) return;
    e.preventDefault();
    e.stopPropagation();

    if (boton.dataset.act === 'act74MfaCancelar') {
      act74MfaCerrar();
      act74MfaEnrolamiento = false;
      R2.tmp = null;
      R2.correo = null;
      goProto('a1');
      return;
    }

    if (boton.dataset.act === 'act74MfaContinuar' && act74MfaEtapa === 'recuperacion') {
      act74MfaCerrar(); // Borra los códigos del DOM, sin guardarlos en storage.
      goProto('a2');
      toast('MFA activado. Ingresa el código de tu aplicación para iniciar sesión.', 'ok');
    }
  });

  qrEl.addEventListener('submit', (e) => {
    if (e.target?.id !== 'act74-mfa-form') return;
    e.preventDefault();
    e.stopPropagation();
    if (ocupado || !act74MfaEnrolamiento || act74MfaEtapa !== 'qr') return;

    const codigo = (qrEl.querySelector('#act74-mfa-codigo')?.value || '').trim();
    const error = qrEl.querySelector('#act74-mfa-error');
    if (!/^[0-9]{6}$/.test(codigo)) {
      error.textContent = 'Introduce los 6 dígitos de tu aplicación.';
      return;
    }

    conEspera(async () => {
      const boton = qrEl.querySelector('#act74-mfa-guardar');
      if (boton) boton.disabled = true;
      error.textContent = '';
      try {
        const respuesta = await api('POST', '/auth/mfa/confirmar',
          { token_temporal: R2.tmp, codigo }, false);
        if (!respuesta.token_temporal || !Array.isArray(respuesta.codigos_recuperacion)) {
          throw new Error('El servidor confirmó MFA pero faltan los códigos de recuperación.');
        }
        R2.tmp = respuesta.token_temporal;
        act74MfaEnrolamiento = false;
        act74MfaEtapa = 'recuperacion';

        qrEl.innerHTML = `<div class="box">
          <h3>Segundo factor activado</h3>
          <p><b>Guarda ahora estos códigos de recuperación.</b> Se muestran una sola vez.
            Cada código permite recuperar el acceso si pierdes tu aplicación.</p>
          <div style="background:#f1f3fc;padding:12px;border-radius:9px;
            display:grid;grid-template-columns:1fr 1fr;gap:8px;user-select:all">
            ${respuesta.codigos_recuperacion.map(c => `<code style="color:#111">${h(c)}</code>`).join('')}
          </div>
          <p style="font-size:12px">No los guardes en el navegador ni los compartas.
            Anótalos o consérvalos en un gestor seguro.</p>
          <div class="row"><button type="button" data-act="act74MfaContinuar">
            Ya guardé mis códigos; continuar
          </button></div>
        </div>`;
      } catch (err) {
        error.textContent = err.mensaje || err.message || 'No se pudo activar MFA.';
      } finally {
        if (boton?.isConnected) boton.disabled = false;
      }
    });
  });

  let tt;
  function toast(msg, tipo) { toastEl.textContent = msg; toastEl.className = tipo || ''; toastEl.style.display = 'block'; clearTimeout(tt); tt = setTimeout(() => (toastEl.style.display = 'none'), 4200); }

  // ---------- llamadas a la API ----------
  async function api(metodo, ruta, cuerpo, conToken = true) {
    const cab = { 'Content-Type': 'application/json' };
    if (conToken && R2.token) cab.Authorization = 'Bearer ' + R2.token;
    let r, j = {};
    try { r = await fetch(API + ruta, { method: metodo, headers: cab, cache: 'no-store', body: cuerpo ? JSON.stringify(cuerpo) : undefined }); }
    catch (e) { throw { codigo: 'SIN_RED', mensaje: 'No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente.' }; }
    try { j = await r.json(); } catch (e) { /* sin cuerpo */ }
    if (!r.ok) throw Object.assign({ status: r.status }, j.error || { codigo: 'ERROR', mensaje: 'Error ' + r.status });
    return j;
  }

  // FormData: el navegador asigna el boundary; no enviar Content-Type manualmente.
  async function apiArchivo(ruta, datos) {
    let respuesta, cuerpo = {};
    try {
      respuesta = await fetch(API + ruta, {
        method: 'POST',
        cache: 'no-store',
        headers: { Authorization: 'Bearer ' + R2.token },
        body: datos,
      });
    } catch (_) {
      throw { codigo: 'SIN_RED', mensaje: 'No se pudo contactar el servidor.' };
    }
    try { cuerpo = await respuesta.json(); } catch (_) { /* sin JSON */ }
    if (!respuesta.ok) throw Object.assign({ status: respuesta.status },
      cuerpo.error || { codigo: 'ERROR', mensaje: 'Error ' + respuesta.status });
    return cuerpo;
  }

  const h = (v) => String(v == null ? '' : v).replace(/[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const lista = (respuesta) => Array.isArray(respuesta) ? respuesta : (respuesta.datos || []);
  const VERSION_FALTA = 'Este estudio no tiene un documento de consentimiento vigente. Solicita que lo carguen antes de continuar.';

  async function documentosVigentes() {
    const estudio = uuidDe(S.study);
    if (!estudio) throw new Error('Selecciona un estudio activo antes de registrar la decisión.');
    const documentos = lista(await api('GET', '/estudios/' + estudio + '/documentos-consentimiento'));
    const vigente = documentos.find((d) => d.tipo === 'consentimiento' && d.vigente === true);
    if (!vigente || !vigente.version) throw new Error(VERSION_FALTA);
    R2.documentos = { consentimiento: vigente };
  }

  // API del consentimiento: se usa un servicio reutilizable y comprobable por separado.
  const act58 = window.PlaGesActividad58;
  if (!act58) throw new Error('No se cargó actividad58-eventos.js');
  const flujoConsentimiento = window.PlaGesConsentimiento;
  if (!flujoConsentimiento) throw new Error('No se cargó consentimiento-integracion.js');

  api('GET', '/salud', null, false).then(() => { badge.classList.remove('off'); badge.innerHTML = '<i></i>Servidor disponible al iniciar'; }).catch(() => { badge.classList.add('off'); badge.innerHTML = '<i></i>No se pudo comprobar la conexión'; });

  // ---------- celular simulado ----------
  setInterval(async () => {
    const enA2 = typeof cur !== 'undefined' && (cur === 'a2');
    cel.style.display = enA2 && R2.correo ? 'block' : 'none';
    if (!enA2 || !R2.correo) return;
    try {
      const r = await fetch('/codigo?correo=' + encodeURIComponent(R2.correo)); const j = await r.json();
      if (j.codigo) { cel.querySelector('.c').textContent = j.codigo.slice(0, 3) + ' ' + j.codigo.slice(3); cel.querySelector('.b>div').style.width = (j.segundos_restantes / 30 * 100) + '%'; document.getElementById('rl-cel-u').textContent = R2.correo; }
    } catch (e) { /* ignora */ }
  }, 1000);

  cel.querySelector('.c').onclick = () => { const o = document.getElementById('otp'); if (o) o.value = cel.querySelector('.c').textContent.replace(/\s/g, ''); };

  // ---------- datos reales → estructuras del prototipo ----------
  const FECHA = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '—');
  const ESTADO = { activo: 'Activo', borrador: 'Borrador', cerrado: 'Cerrado' };

  async function cargarEstudios() {
    const lista = await api('GET', '/estudios');
    R2.estudios = Array.isArray(lista) ? lista : (lista.datos || []);
    const nuevos = [];
    for (const e of R2.estudios) {
      let p = '—';
      try { const ps = await api('GET', '/estudios/' + e.id_estudio + '/participaciones'); p = (Array.isArray(ps) ? ps : ps.datos || []).length; } catch (x) { /* sin permiso de consulta */ }
      const activo = e.estado === 'activo';
      nuevos.push({ id: e.codigo_estudio, n: e.nombre, e: ESTADO[e.estado] || e.estado, cec: activo ? 'Aprobado · estudio activo' : 'Pendiente de aprobación', p, cecOk: activo, _uuid: e.id_estudio });
    }
    STUDIES.length = 0; nuevos.forEach((s) => STUDIES.push(s));
    // El panel cuenta participantes con PARTS: se llena con los reales de todos los estudios visibles.
    PARTS.length = 0;
    for (const s of nuevos) { try { await cargarParticipantes(s.id, true); } catch (x) { /* sin permiso */ } }
    if (STUDIES[0]) S.ceId = STUDIES[0].id;
  }

  const uuidDe = (codigo) => (STUDIES.find((s) => s.id === codigo) || {})._uuid;

  async function cargarParticipantes(codigo, acumular) {
    const id = uuidDe(codigo); if (!id) return;
    const ps = await api('GET', '/estudios/' + id + '/participaciones');
    const filas = Array.isArray(ps) ? ps : ps.datos || [];
    if (!acumular) PARTS.length = 0;
    filas.forEach((p) => {
      if (p.id_participacion && p.codigo_seudonimo) {
        R2.participaciones.set(p.codigo_seudonimo, p.id_participacion);
        R2.estudioParticipacion.set(p.codigo_seudonimo, codigo);
      }
      PARTS.push([p.codigo_seudonimo, p.estado === 'activo' ? 'Activo' : 'Retirado',
        p.estado === 'activo' ? 'ok' : 'err', FECHA(p.fecha_inicio), p.es_menor_al_enrolar ? 'Sí' : 'No']);
    });
  }

  function aplicarUsuario(u) {
    R2.usuario = u;
    const rol = ROLES.includes(u.rol) ? u.rol : 'Investigador';
    S.role = rol; FULL[rol] = u.nombre; NAME[rol] = String(u.nombre).split(' ')[0];
    const sel = document.getElementById('roleSel'); if (sel) sel.value = rol;
  }

  // ---------- pantallas: pequeños ajustes de texto sobre el prototipo ----------
  const a1V = R.a1;
  R.a1 = () => a1V()
    .replace(/value="test_[a-z]+@uxlab\.utem\.cl"/, `value="${R2.correo || 'test_investigador@uxlab.test'}"`)
    .replace('<input id="pw" type="password" value="••••••••">', '<div class="rl-pw"><input id="pw" type="password" value="Plagesetic.2026" autocomplete="current-password"><button type="button" class="rl-ver" data-act="verpw" aria-pressed="false" aria-label="Mostrar contraseña">Mostrar</button></div>')
    .replace(/<label class="chk">[\s\S]*?<\/label>/, '')
    .replace('<button class="lnk" data-act="err">Simular contraseña incorrecta</button>', '<span class="hint">Usuarios de prueba: test_[rol]@uxlab.test · clave Plagesetic.2026</span>')
    .replace('Usuario o contraseña incorrectos.', S.errMsg || 'Usuario o contraseña incorrectos.');

  const a2V = R.a2;
  R.a2 = () => a2V().replace('<button class="lnk" data-go="a2r">', (S.otpErr ? `<div class="msg err" role="alert">${S.otpErr}</div>` : '') + '<button type="button" class="rl-qrlink" data-act="verqr">¿Primera vez? Configura tu celular con un código QR</button><br><button class="lnk" data-go="a2r">');

  const a2rV = R.a2r;
  R.a2r = () => a2rV().replace('<button class="lnk" data-go="a2">', (S.otpErr ? `<div class="msg err" role="alert">${S.otpErr}</div>` : '') + '<button class="lnk" data-go="a2">');

  // Mis estudios: cada fila abre SU estudio (el prototipo esperaba códigos UX-2026-0X)
  const c1V = R.c1;
  R.c1 = () => c1V().replace(/<tr><td><code>([^<]+)<\/code><\/td>([\s\S]*?)<\/tr>/g, (m, id, resto) =>
    `<tr><td><code>${id}</code></td>` + resto
      .replace('<button class="lnk" data-go="c3">Ver</button>', `<button class="lnk" data-act="stuVer" data-id="${id}">Ver participantes</button>`)
      .replace('<button class="lnk" data-go="c2">Editar</button>', `<button class="lnk" data-act="stuEdit" data-id="${id}">Editar</button>`) + '</tr>');

  // Buscador de estudios (C1): filtra las filas por código o nombre, sin llamar a la API
  const c1Base = R.c1;
  R.c1 = () => c1Base().replace('<div class="tw">',
    '<div class="fld"><input id="buscaEst" type="search" placeholder="Buscar por código o nombre"></div><div class="tw">');

  document.addEventListener('input', (e) => {
    if (e.target.id !== 'buscaEst') return;
    const texto = e.target.value.trim().toLowerCase();
    document.querySelectorAll('#app .tw tr').forEach((fila, i) => {
      if (i === 0) return; // la primera fila son los títulos
      fila.style.display = fila.textContent.toLowerCase().includes(texto) ? '' : 'none';
    });
  });

  // Textos de «prototipo» → datos reales
  const shellV = shell;
  shell = function (mc, inner) { return shellV(mc, inner).replace('· nombre ficticio', '· usuario de prueba'); };
  const a3V = R.a3;
  R.a3 = () => a3V().replace(/· PROTOTIPO/gi, '· plaGesEtic');

  const c2V = R.c2;
  R.c2 = () => c2V().replace(btn('Guardar', 'c1', 's'), '<button class="btn s" data-act="estGuardar">Guardar</button>');

  const c3V = R.c3;
  R.c3 = () => {
    const s = STUDIES.find((x) => x.id === S.ceId) || STUDIES[0] || { id: '—', n: '' };
    return c3V()
      .replace(/UX-2026-07 · Usabilidad del portal estudiantil/g, `${s.id} · ${s.n}`)
      .replace(/Activo · Aprobado por el Comité de Ética hasta el 30\/06\/2027/g, `${s.e} · ${s.cec}`)
      .replace('<th>¿Aceptó?</th>', '<th>Estado</th>').replace('<th>Versión firmada</th>', '<th>Inscrito el</th>').replace('<th>Sesiones</th>', '<th>Menor al inscribir</th>');
  };

  // B3: mostrar metadatos verdaderos de la versión vigente. El texto del prototipo
  // NO sustituye al documento aprobado por el CEC, que se firma fuera de esta demo.
  const b3V = R.b3;
  R.b3 = () => {
    let pagina = b3V();
    if (S.recons || !R2.documentos) return pagina;
    const d = R2.documentos.consentimiento;
    const info = `<div class="msg info"><b>Documento vigente de consentimiento:</b>
      versión ${h(d.version)} · huella SHA-256: <code>${h(d.documento_hash || '—')}</code>.</div>
      <div class="msg warn">El texto que aparece a continuación es ilustrativo y no reemplaza
      el PDF aprobado por el Comité de Ética. Presenta el documento original a la persona antes de registrar su decisión.</div>`;
    return pagina.replace(/<div class="msg info">Versión vigente:[\s\S]*?<\/div>/, info);
  };

  // B4: conserva el diseño, pero utiliza la versión real y admite PDF, JPEG y PNG.
  const b4V = R.b4;
  R.b4 = () => {
    let pagina = b4V();
    if (S.recons || !R2.documentos) return pagina;
    const version = R2.documentos.consentimiento.version;
    pagina = pagina.replace(/<label>Versión leída<\/label><input class="auto" readonly value="[^"]*"/,
      `<label>Versión vigente del consentimiento</label><input class="auto" readonly value="${h(version)}"`);
    pagina = pagina.replace(/<label for="ev">Documento firmado \(PDF\)<\/label><input id="ev" type="file" accept=".pdf">/,
      '<label for="ev">Evidencia firmada (obligatoria al aceptar)</label><input id="ev" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png">');
    pagina = pagina.replace('Se guarda aparte de los datos del estudio, en una zona protegida.',
      'PDF, JPEG o PNG · máximo 10 MB. Si la persona niega, no debes adjuntar evidencia.');
    if (S.menor) pagina = pagina.replace('<div class="acts">',
      '<div class="msg warn">El alta de menores requiere vincular previamente al representante legal mediante una representación vigente. Esta demo todavía no incorpora ese vínculo: no completes un alta de menor desde aquí.</div><div class="acts">');
    return pagina;
  };

  // B5: mostrar solo el resultado confirmado por la API, no una confirmación ficticia.
  const b5V = R.b5;
  R.b5 = () => {
    if (S.recons || !R2.confirmacion) return b5V();
    const c = R2.confirmacion;
    return shell('b1', `<div class="card">${steps(SB,4)}<div class="check">✓</div>
      <h2 class="t">Decisión registrada</h2><p class="sub">La inscripción y su consentimiento fueron confirmados por la API.</p>
      <div class="tw"><table class="sumtbl" style="min-width:0">
      <tr><td>Código seudónimo</td><td><b>${h(c.codigo)}</b></td></tr>
      <tr><td>Estudio</td><td>${h(c.estudio)}</td></tr>
      <tr><td>Decisión</td><td>${h(c.decision)}</td></tr>
      <tr><td>Versión</td><td>${h(c.version)}</td></tr>
      <tr><td>Estado vigente</td><td>${h(c.estado)}</td></tr></table></div>
      ${c.decision === 'Niega' ? '<div class="msg warn">Consentimiento negado: no se deben realizar sesiones ni recolectar datos de investigación.</div>' : '<div class="msg ok">Consentimiento otorgado y evidencia registrada.</div>'}
      <div class="acts"><button class="btn s" data-act="ficha" data-c="${h(c.codigo)}">Ver ficha</button>
      ${btn('Registrar otra persona', 'b1', 's')}${btn('Volver al panel', 'a3')}</div></div>`);
  };

  // Ficha real: mostrar estado efectivo e historial de eventos, sin datos de identidad.
  R.c6 = () => {
    const c = S.ficha || '';
    const datos = R2.ficha;
    if (!datos || datos.codigo !== c) return shell('c1', `<div class="card wide">
      <h2 class="t">Ficha de consentimiento · ${h(c)}</h2>
      <div class="msg warn">No se pudo cargar la ficha desde la API.</div>
      <div class="acts">${btn('Volver', 'c3', 's')}</div></div>`);
    const f = datos.datos;
    const estados = Array.isArray(f.estado_vigente) ? f.estado_vigente : [];
    const historial = Array.isArray(f.historial) ? f.historial : [];
    const nombreEstado = { otorgado: 'Otorgado', negado: 'Negado', revocado: 'Revocado',
      pendiente_reconsentir: 'Pendiente de reconsentimiento', sin_registro: 'Sin registro' };
    return shell('c1', `<div class="card wide"><h2 class="t">Ficha de consentimiento · ${h(c)}</h2>
      <p class="sub">Información consultada en la API · sin nombre, RUT ni correo.</p>
      <h3>Estado vigente</h3>
      <div class="tw"><table><tr><th>Tipo</th><th>Estado</th><th>Versión</th><th>Fecha</th></tr>
      ${estados.map(e => `<tr><td>${h(e.tipo)}</td><td>${h(nombreEstado[e.estado] || e.estado)}</td>
      <td>${h(e.version || '—')}</td><td>${h(e.fecha ? new Date(e.fecha).toLocaleString('es-CL') : '—')}</td></tr>`).join('')}
      </table></div><h3 style="margin-top:22px">Historial de decisiones</h3>
      <div class="tw"><table><tr><th>Fecha</th><th>Decisión</th><th>Tipo</th><th>Versión</th><th>Huella de evidencia</th></tr>
      ${historial.map(e => `<tr><td>${h(e.fecha ? new Date(e.fecha).toLocaleString('es-CL') : '—')}</td>
      <td>${h(e.tipo_evento)}</td><td>${h(e.tipo)}</td><td>${h(e.version)}</td>
      <td><code>${h(e.evidencia_hash || '—')}</code></td></tr>`).join('')}
      </table></div>${!historial.length ? '<div class="msg info">Todavía no hay decisiones registradas.</div>' : ''}
      <div class="acts" style="flex-wrap:wrap">${btn('Volver a participantes', 'c3', 's')}
      ${['otorgado', 'pendiente_reconsentir'].includes((estados.find(x => x.tipo === 'consentimiento') || {}).estado)
        ? `<button class="btn s" data-act="act58RetiroForm">Registrar retiro</button>` : ''}
      ${(estados.find(x => x.tipo === 'consentimiento') || {}).estado !== 'revocado'
        ? `<button class="btn s" data-act="act58ReconsForm">Reconsentir (nueva versión)</button>` : ''}
      ${['Investigador','Director'].includes(S.role)
        ? `<button class="btn s" data-act="act58ContactForm">Datos de contacto</button>` : ''}
      <button class="btn s" data-act="act58IdentityForm">Desenmascarar (acceso excepcional)</button>
      </div></div>`);
  };

  async function cargarFicha(codigo) {
    const id = R2.participaciones.get(codigo);
    if (!id) throw new Error('No se encontró la participación. Vuelve a cargar la lista del estudio.');
    const datos = await api('GET', '/participaciones/' + encodeURIComponent(id) + '/consentimientos');
    R2.ficha = { codigo, datos };
    S.ficha = codigo;
  }

  async function registrarAlta() {
    if (S.menor) throw new Error('El registro de menores requiere una representación legal vigente. Esta demo aún no permite vincularla.');
    const decision = S.dec.Consentimiento;
    if (!['Acepta', 'Niega'].includes(decision)) throw new Error('Selecciona si la persona acepta o niega.');
    if (!R2.documentos || !R2.documentos.consentimiento) throw new Error(VERSION_FALTA);
    const archivo = document.getElementById('ev')?.files?.[0] || null;
    flujoConsentimiento.validarEvidencia(decision, archivo);
    const d = S.alta || {};
    const estudio = uuidDe(S.study);
    if (!estudio) throw new Error('No se encontró el estudio seleccionado.');
    const nombre = ((d.nom || '') + ' ' + (d.ape || '')).trim();
    const cuerpo = { nombre, correo: d.mail || '', telefono: (d.tel || '').replace(/\s/g, ''), fecha_nacimiento: d.fn || '' };
    if (d.rut) cuerpo.rut = d.rut;
    const clave = estudio; // No conservar RUT ni correo como clave del intento.
    if (R2.altaProceso && R2.altaProceso.clave !== clave) R2.altaProceso = null;
    if (!R2.altaProceso) R2.altaProceso = { clave };
    const proceso = R2.altaProceso;
    const resultado = await flujoConsentimiento.completarAlta({
      estado: proceso,
      obtenerIdentidad: async () => {
        try { return (await api('POST', '/identidades', cuerpo)).ux_lab_id; }
        catch (e) {
          if (e.status !== 409) throw e;
          const q = cuerpo.rut ? { rut: cuerpo.rut } : { correo: cuerpo.correo };
          const b = await api('POST', '/identidades/buscar', q);
          const id = (b.ux_lab_ids || [])[0] || b.ux_lab_id;
          if (!id) throw new Error('La persona ya existe, pero no se encontró su identificador UX Lab.');
          return id;
        }
      },
      inscribir: (uxLabId) => api('POST', '/estudios/' + estudio + '/participaciones', { ux_lab_id: uxLabId }),
      registrar: (idParticipacion) => {
        const form = new FormData();
        form.append('tipo', 'consentimiento');
        form.append('tipo_evento', decision === 'Acepta' ? 'aceptar' : 'negar');
        form.append('version', R2.documentos.consentimiento.version);
        if (decision === 'Acepta') form.append('evidencia', archivo, archivo.name);
        return apiArchivo('/participaciones/' + idParticipacion + '/consentimientos', form);
      }
    });
    S.code = resultado.codigo;
    R2.participaciones.set(resultado.codigo, resultado.idParticipacion);
    R2.estudioParticipacion.set(resultado.codigo, S.study);
    if (resultado.consentimiento.id_consentimiento)
      R2.idsConsentimiento.set(resultado.idParticipacion, resultado.consentimiento.id_consentimiento);
    R2.confirmacion = { codigo: resultado.codigo, estudio: S.study, decision,
      version: R2.documentos.consentimiento.version,
      estado: resultado.consentimiento.estado_vigente };
    S.alta = null; // No retener nombres, RUT ni correo después de finalizar.
    R2.altaProceso = null;
  }

  // ---------- Actividad 58 (jueves): eventos, contacto e identidad ----------
  const tipoActual = () => (R2.ficha?.datos?.estado_vigente || []).find(e => e.tipo === 'consentimiento') || null;
  const fichaActual = () => R2.ficha && R2.ficha.codigo === S.ficha ? R2.ficha : null;
  const idParticipacionActual = () => R2.participaciones.get(S.ficha);
  const avisoD21 = '<div class="msg warn"><b>Privacidad D21:</b> no escribas nombres, RUT, correos ni otros datos identificatorios en el motivo, la observación o la justificación.</div>';

  function borrarSensibles() {
    // Los datos solo viven durante la pantalla que los muestra, nunca en storage/logs.
    R2.sensible = null;
    R2.contactoMotivo = null;
  }

  async function idConsentimientoActual() {
    const id = idParticipacionActual();
    if (!id) throw new Error('No se encontró la participación. Vuelve a cargar sus participantes.');
    const datos = fichaActual()?.datos || {};
    const tipo = tipoActual();
    const encontrado = tipo?.id_consentimiento || datos.id_consentimiento ||
      R2.idsConsentimiento.get(id) || (datos.historial || []).find(e => e.tipo === 'consentimiento')?.id_consentimiento;
    if (encontrado) return encontrado;
    // Solo entrega un UUID opaco; aplica los mismos controles de acceso que la ficha.
    const r = await api('GET', '/participaciones/' + encodeURIComponent(id) + '/consentimientos/identificador');
    if (!r.id_consentimiento) throw new Error('La API no devolvió el identificador del consentimiento.');
    R2.idsConsentimiento.set(id, r.id_consentimiento);
    return r.id_consentimiento;
  }

  async function abrirEvento(tipo) {
    if (!fichaActual()) await cargarFicha(S.ficha);
    if (!tipoActual()) throw new Error('No existe un consentimiento registrado para esta participación.');
    if (tipoActual().estado === 'revocado') throw new Error('El consentimiento está retirado: no admite más eventos.');
    if (tipo === 'retirar' && !['otorgado','pendiente_reconsentir'].includes(tipoActual().estado))
      throw new Error('Solo se puede retirar un consentimiento otorgado o pendiente de nueva versión.');
    R2.eventoTipo = tipo;
    if (tipo === 'reconsentir') {
      const codEstudio = R2.estudioParticipacion.get(S.ficha) || S.ceId;
      const uuid = uuidDe(codEstudio);
      if (!uuid) throw new Error('No se identificó el estudio de la participación.');
      const docs = lista(await api('GET', '/estudios/' + uuid + '/documentos-consentimiento'));
      const actual = docs.find(d => d.tipo === 'consentimiento' && d.vigente === true);
      if (!actual) throw new Error(VERSION_FALTA);
      if (tipoActual().version === actual.version && tipoActual().estado !== 'pendiente_reconsentir')
        throw new Error('Esta persona ya tiene registrada la versión vigente. Primero debe existir una nueva versión aprobada.');
      R2.documentoReconsentimiento = actual;
    }
    goProto('act58evento');
  }

  R.act58evento = () => {
    const retiro = R2.eventoTipo === 'retirar';
    const actual = tipoActual() || {};
    if (!R2.eventoTipo || !fichaActual()) return shell('c1', `<div class="card">No se encontró una ficha válida.${btn('Volver','c6','s')}</div>`);
    const version = retiro ? actual.version : R2.documentoReconsentimiento?.version;
    return shell('c1', `<div class="card"><h2 class="t">${retiro ? 'Registrar retiro' : 'Registrar reconsentimiento'} · ${h(S.ficha)}</h2>
      <p class="sub">${retiro ? 'La persona deja de participar. No es obligatorio que explique por qué.' : 'La persona debe conocer y firmar la nueva versión aprobada antes de continuar.'}</p>
      ${avisoD21}
      <div class="msg info">Evento: <b>${retiro?'retirar':'reconsentir'}</b> · Versión: <b>${h(version || '—')}</b>.</div>
      ${!retiro ? `<div class="msg warn">Este texto no sustituye al documento aprobado por el Comité de Ética. Entrega y explica el documento vigente antes de obtener la firma.</div>` : ''}
      <div class="fld"><label for="act58Archivo">${retiro ? 'Evidencia del retiro (opcional)' : 'Evidencia firmada de la nueva versión (obligatoria)'}</label>
      <input type="file" id="act58Archivo" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png">
      <div class="hint">PDF, JPEG o PNG · máximo 10 MB.</div></div>
      <div class="acts">${btn('Cancelar','c6','s')}
        <button type="button" class="btn p" data-act="act58GuardarEvento">${retiro?'Confirmar retiro':'Guardar reconsentimiento'}</button></div></div>`);
  };

  async function guardarEvento() {
    if (!R2.eventoTipo) throw new Error('Selecciona un evento.');
    const tipo = R2.eventoTipo;
    const archivo = document.getElementById('act58Archivo')?.files?.[0] || null;
    act58.validarEvidenciaEvento(tipo, archivo, flujoConsentimiento.validarEvidencia);
    const version = tipo === 'retirar' ? tipoActual()?.version : R2.documentoReconsentimiento?.version;
    if (!version) throw new Error('No se pudo determinar la versión del documento.');
    const id = await idConsentimientoActual();
    const form = new FormData();
    form.append('tipo_evento', tipo);
    form.append('tipo', 'consentimiento');
    form.append('version', version);
    if (archivo) form.append('evidencia', archivo, archivo.name);
    await apiArchivo('/consentimientos/' + encodeURIComponent(id) + '/eventos', form);
    await cargarFicha(S.ficha);
    const codigoEstudio = R2.estudioParticipacion.get(S.ficha) || S.ceId;
    // La participación retirada aparece como retirada en C3; otras se recargan igualmente.
    try { await cargarParticipantes(codigoEstudio); } catch (_) { /* la ficha igual se actualizó */ }
    R2.eventoTipo = null;
    R2.documentoReconsentimiento = null;
    toast(tipo === 'retirar' ? 'Retiro registrado.' : 'Reconsentimiento registrado.', 'ok');
    goProto('c6');
  }

  R.act58contact = () => shell('c1', `<div class="card"><h2 class="t">Datos de contacto · ${h(S.ficha || '—')}</h2>
    <p class="sub">Acceso excepcional para el Investigador responsable o el Director. La consulta queda auditada.</p>
    ${avisoD21}
    <div class="fld"><label for="act58Motivo">Motivo del contacto *</label>
    <select id="act58Motivo"><option value="">Selecciona un motivo</option>
    <option value="coordinar_sesion">Coordinar o reprogramar una sesión</option>
    <option value="retiro">Gestión de retiro</option><option value="otro">Otro (requiere detalle)</option></select></div>
    <div class="fld"><label for="act58Detalle">Detalle para «Otro»</label>
    <textarea id="act58Detalle" rows="3" placeholder="Explica el propósito sin datos identificatorios"></textarea></div>
    <div class="acts">${btn('Cancelar','c6','s')}<button class="btn p" data-act="act58ConsultarContacto">Consultar contacto</button></div></div>`);

  async function consultarContacto() {
    const id = idParticipacionActual();
    if (!id) throw new Error('No se encontró la participación.');
    const motivo = val('act58Motivo'), detalle = val('act58Detalle');
    const body = act58.validarMotivo(motivo, detalle);
    const resultado = await api('POST', '/participaciones/' + encodeURIComponent(id) + '/contacto', body);
    R2.sensible = { clase: 'contacto', datos: act58.soloContacto(resultado) };
    R2.contactoMotivo = motivo;
    goProto('act58resultado');
  }

  R.act58identity = () => {
    const codigoEstudio = R2.estudioParticipacion.get(S.ficha) || S.ceId;
    const estudios = STUDIES.map(s => `<option value="${h(s.id)}" ${s.id === codigoEstudio ? 'selected' : ''}>${h(s.id)} · ${h(s.n)}</option>`).join('');
    return shell('c1', `<div class="card"><h2 class="t">Desenmascarar identidad (acceso excepcional)</h2>
    <p class="sub">Solo Director o usuario con autorización especial vigente de «ver_identidad». Toda consulta queda auditada.</p>
    ${avisoD21}
    <div class="fld"><label for="act58UXL">UX Lab ID de la identidad *</label>
      <input id="act58UXL" placeholder="UXL-XXXXXXXX" autocomplete="off" autocapitalize="characters"></div>
    <div class="fld"><label for="act58Estudio">Estudio al que pertenece *</label><select id="act58Estudio">${estudios}</select></div>
    <div class="fld"><label for="act58Justificacion">Justificación (mínimo 20 caracteres) *</label>
      <textarea id="act58Justificacion" rows="4" placeholder="Indica el propósito autorizado, sin nombres ni RUT"></textarea></div>
    <div class="acts">${btn('Cancelar', fichaActual() ? 'c6' : 'a3','s')}
      <button class="btn p" data-act="act58Desenmascarar">Solicitar desenmascaramiento</button></div></div>`);
  };

  async function consultarIdentidad() {
    const ux = val('act58UXL').toUpperCase();
    const uuid = uuidDe(val('act58Estudio'));
    if (!uuid) throw new Error('Selecciona un estudio válido.');
    const justificacion = act58.validarJustificacion(val('act58Justificacion'));
    if (!/^UXL-[A-HJ-NP-Z2-9]{8}$/.test(ux)) throw new Error('Ingresa un UX Lab ID con formato UXL-XXXXXXXX válido.');
    const resultado = await api('POST', '/identidades/' + encodeURIComponent(ux) + '/desenmascarar',
      { id_estudio: uuid, justificacion });
    R2.sensible = { clase: 'identidad', datos: act58.soloIdentidad(resultado) };
    goProto('act58resultado');
  }

  R.act58resultado = () => {
    const datos = R2.sensible;
    if (!datos) return shell('c1', `<div class="card"><h2 class="t">Datos no disponibles</h2>
      <p class="sub">La información se eliminó al salir de la consulta.</p><div class="acts">${btn('Volver al panel','a3')}</div></div>`);
    const campos = datos.clase === 'contacto' ?
      [['codigo_seudonimo','Código seudónimo'],['nombre','Nombre'],['correo','Correo'],['telefono','Teléfono']] :
      [['ux_lab_id','UX Lab ID'],['nombre','Nombre'],['rut','RUT'],['correo','Correo'],['telefono','Teléfono'],['fecha_nacimiento','Fecha de nacimiento']];
    return shell('c1', `<div class="card"><h2 class="t">${datos.clase === 'contacto' ? 'Datos de contacto' : 'Identidad desenmascarada'}</h2>
      <div class="msg warn">Datos sensibles: no copies, compartas ni guardes esta pantalla. Se eliminan al salir.</div>
      <div class="tw"><table class="sumtbl" style="min-width:0">
      ${campos.map(([key, titulo]) => `<tr><td>${titulo}</td><td>${h(datos.datos[key] ?? '—')}</td></tr>`).join('')}</table></div>
      <div class="acts"><button type="button" class="btn p" data-act="act58CerrarSensibles">Cerrar y borrar datos</button></div></div>`);
  };

  // Captura de los botones heredados del prototipo ANTES de que puedan activar sus simulaciones.
  // No se emiten datos personales a consola, storage ni a otros componentes.
  const accionAct58 = async (accion) => {
    try {
      if (accion === 'act58RetiroForm') await abrirEvento('retirar');
      else if (accion === 'act58ReconsForm') await abrirEvento('reconsentir');
      else if (accion === 'act58ContactForm' || accion === 'contacto') { borrarSensibles(); go('act58contact'); }
      else if (accion === 'act58IdentityForm') { borrarSensibles(); go('act58identity'); }
      else if (accion === 'act58GuardarEvento') await guardarEvento();
      else if (accion === 'act58ConsultarContacto' || accion === 'contactOk') await consultarContacto();
      else if (accion === 'act58Desenmascarar') await consultarIdentidad();
      else if (accion === 'act58CerrarSensibles') { borrarSensibles(); go('a3'); }
    } catch (e) { toast(act58.mensajeError(e), 'err'); }
  };

  const accionesAct58 = new Set(['act58RetiroForm','act58ReconsForm','act58ContactForm','contacto',
    'act58IdentityForm','act58GuardarEvento','act58ConsultarContacto','contactOk','act58Desenmascarar',
    'act58CerrarSensibles','retirar']);
  let enviandoAct58 = false;
  window.addEventListener('click', e => {
    const a = e.target.closest('[data-act]');
    if (!a || !accionesAct58.has(a.dataset.act)) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    const accion = a.dataset.act;
    if (accion === 'contacto' && a.dataset.c) S.ficha = a.dataset.c;
    if (accion === 'retirar') { accionAct58('act58RetiroForm'); return; }
    if (enviandoAct58) return;
    enviandoAct58 = true;
    document.getElementById('app').classList.add('rl-busy');
    Promise.resolve(accionAct58(accion)).finally(() => {
      enviandoAct58 = false;
      document.getElementById('app').classList.remove('rl-busy');
    });
  }, true);

  // ---------- navegación: donde hay API, se llama antes de cambiar de pantalla ----------
  const goProto = go;
  let ocupado = false;
  async function conEspera(fn) {
    if (ocupado) return; ocupado = true; document.getElementById('app').classList.add('rl-busy');
    try { await fn(); } finally { ocupado = false; document.getElementById('app').classList.remove('rl-busy'); }
  }
  const val = (id) => ((document.getElementById(id) || {}).value || '').trim();

  // ---------- Actividad 73: cambio obligatorio de contrasena ----------
  // Este formulario se abre solamente despues de verificar el MFA.
  // No guarda contrasenas en localStorage, sessionStorage ni en la consola.
  const cambioClave = document.createElement('div');
  cambioClave.id = 'rl-cambio-clave';
  cambioClave.setAttribute('role', 'dialog');
  cambioClave.setAttribute('aria-modal', 'true');
  cambioClave.setAttribute('aria-labelledby', 'rl-cambio-titulo');
  cambioClave.style.cssText = 'display:none;position:fixed;inset:0;z-index:10010;background:rgba(11,14,50,.88);align-items:center;justify-content:center;padding:16px';
  cambioClave.innerHTML = `
    <form id="rl-form-cambio" style="background:#fff;color:#131315;width:100%;max-width:440px;padding:26px;border-radius:16px;font-family:Inter,Arial,sans-serif;box-shadow:0 20px 50px rgba(0,0,0,.3)">
      <h2 id="rl-cambio-titulo" style="color:#000B78;margin:0 0 10px;font-size:21px">Cambio obligatorio de contraseña</h2>
      <p style="font-size:14px;line-height:1.5;margin:0 0 14px">Por seguridad, debes reemplazar tu contraseña temporal antes de usar el sistema.</p>
      <label for="rl-clave-actual" style="display:block;margin-top:14px;font-size:14px">Contraseña temporal</label>
      <input id="rl-clave-actual" type="password" autocomplete="current-password" required
        style="width:100%;box-sizing:border-box;padding:10px;margin-top:5px">
      <label for="rl-clave-nueva" style="display:block;margin-top:14px;font-size:14px">Nueva contraseña (mínimo 12 caracteres)</label>
      <input id="rl-clave-nueva" type="password" autocomplete="new-password" minlength="12" required
        style="width:100%;box-sizing:border-box;padding:10px;margin-top:5px">
      <p style="font-size:12px;line-height:1.4;color:#4B4F6B;margin:7px 0 0">Usa al menos 12 caracteres. Debe ser distinta de la contraseña anterior y de tu correo electrónico.</p>
      <label for="rl-clave-confirmar" style="display:block;margin-top:14px;font-size:14px">Confirmar nueva contraseña</label>
      <input id="rl-clave-confirmar" type="password" autocomplete="new-password" minlength="12" required
        style="width:100%;box-sizing:border-box;padding:10px;margin-top:5px">
      <p id="rl-cambio-error" role="alert" aria-live="polite" style="color:#B42318;font-size:13px;min-height:18px"></p>
      <button id="rl-cambio-guardar" type="submit"
        style="width:100%;background:#000B78;color:#fff;border:0;border-radius:9px;padding:12px;cursor:pointer">Actualizar contraseña</button>
      <button id="rl-cambio-salir" type="button"
        style="width:100%;margin-top:10px;background:#eee;color:#131315;border:0;border-radius:9px;padding:10px;cursor:pointer">Cerrar sesión</button>
    </form>`;
  document.body.appendChild(cambioClave);

  function abrirCambioClave() {
    cambioClave.style.display = 'flex';
    document.getElementById('rl-cambio-error').textContent = '';
    document.getElementById('rl-clave-actual').focus();
  }

  function ocultarCambioClave() {
    cambioClave.querySelector('#rl-form-cambio').reset();
    cambioClave.style.display = 'none';
  }

  cambioClave.querySelector('#rl-form-cambio').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!R2.token || !R2.usuario?.debe_cambiar_password) return;

    const actual = document.getElementById('rl-clave-actual').value;
    const nueva = document.getElementById('rl-clave-nueva').value;
    const confirmar = document.getElementById('rl-clave-confirmar').value;
    const error = document.getElementById('rl-cambio-error');
    const boton = document.getElementById('rl-cambio-guardar');
    error.textContent = '';

    if (nueva.length < 12) {
      error.textContent = 'La nueva contraseña debe tener al menos 12 caracteres.';
      return;
    }
    if (nueva === actual) {
      error.textContent = 'La nueva contraseña debe ser distinta de la temporal.';
      return;
    }
    const correoCuenta = String(R2.usuario?.correo || R2.correo || '').trim().toLowerCase();
    if (correoCuenta && nueva.trim().toLowerCase() === correoCuenta) {
      error.textContent = 'La nueva contraseña debe ser distinta del correo de la cuenta.';
      return;
    }
    if (nueva !== confirmar) {
      error.textContent = 'Las contraseñas nuevas no coinciden.';
      return;
    }

    boton.disabled = true;
    try {
      await api('POST', '/auth/password', { password_actual: actual, password_nueva: nueva });
      R2.usuario.debe_cambiar_password = false;
      ocultarCambioClave();
      try { await cargarEstudios(); } catch (_) { /* El panel se muestra igualmente. */ }
      goProto('a3');
      toast('Contraseña actualizada correctamente.', 'ok');
    } catch (err) {
      error.textContent = err.mensaje || 'No se pudo actualizar la contraseña.';
    } finally {
      boton.disabled = false;
    }
  });

  cambioClave.querySelector('#rl-cambio-salir').addEventListener('click', async () => {
    await go('a1');
    if (!R2.token) ocultarCambioClave();
    else document.getElementById('rl-cambio-error').textContent =
      'No se pudo cerrar la sesión. Inténtalo nuevamente.';
  });

  go = function (id) {
    // Mientras se deba cambiar la contrasena, no se puede acceder a otras pantallas.
    // El backend tambien restringe las rutas hasta completar el cambio.
    if (R2.token && R2.usuario?.debe_cambiar_password && id !== 'a1') {
      abrirCambioClave();
      return;
    }
    if (cur === 'act58resultado' && id !== 'act58resultado') borrarSensibles();
    if (id === 'bdir' || id === 'bid') { borrarSensibles(); return goProto('act58identity'); }
    if (id === 'c8') { borrarSensibles(); return goProto('act58contact'); }
    if (id === 'b6' || id === 'rec') {
      return conEspera(async () => {
        try { await abrirEvento(id === 'b6' ? 'retirar' : 'reconsentir'); }
        catch (e) { toast(act58.mensajeError(e), 'err'); }
      });
    }

    // Paso 1: correo y contraseña
    if (cur === 'a1' && id === 'a2') {
      return conEspera(async () => {
        const correo = val('u').toLowerCase(), password = (document.getElementById('pw') || {}).value || '';
        R2.correo = correo; S.err = false; S.errMsg = '';
        try {
          const r = await api('POST', '/auth/login', { correo, password }, false);
          R2.tmp = r.token_temporal; S.first = false; S.otpErr = '';
          if (r.enrolamiento_requerido) {
            act74MfaEnrolamiento = true;
            try { await mostrarQR(); }
            catch (err) {
              toast(err.mensaje || err.message || 'No se pudo preparar el segundo factor.', 'err');
              if (err.codigo === 'TOKEN_TEMPORAL_INVALIDO') { R2.tmp = null; act74MfaEnrolamiento = false; }
            }
            return;
          }
          act74MfaEnrolamiento = false;
          goProto('a2');
        } catch (e) {
          S.err = true; S.errMsg = e.codigo === 'MFA_PENDIENTE' ? 'Tu cuenta aún no tiene configurada la verificación en dos pasos. Contacta a Soporte.' : e.codigo === 'CREDENCIALES_INVALIDAS' ? 'Correo o contraseña incorrectos.' : e.codigo === 'DEMASIADOS_INTENTOS' ? 'Demasiados intentos. Espera un momento antes de volver a ingresar.' : e.codigo === 'SIN_RED' ? e.mensaje : 'No se pudo iniciar sesión. Intenta nuevamente más tarde.';
          render();
        }
      });
    }

    // Paso 2: código de la app o código de recuperación
    if ((cur === 'a2' || cur === 'a2r') && (id === 'a3' || id === 'a2c')) {
      return conEspera(async () => {
        const cuerpo = { token_temporal: R2.tmp };
        if (cur === 'a2') cuerpo.codigo = val('otp').replace(/\s/g, ''); else cuerpo.codigo_recuperacion = val('rc');
        try {
          const r = await api('POST', '/auth/login/mfa', cuerpo, false);
          R2.token = r.token;
          R2.tmp = null;
          S.otpErr = '';
          aplicarUsuario(r.usuario);
          if (r.usuario.debe_cambiar_password) {
            abrirCambioClave();
            return;
          }
          try { await cargarEstudios(); } catch (e) { /* el panel se muestra igual */ }
          toast('Sesión iniciada como ' + r.usuario.nombre + ' (' + r.usuario.rol + ')', 'ok');
          goProto('a3');
        } catch (e) {
          if (e.codigo === 'TOKEN_TEMPORAL_INVALIDO') { S.err = true; S.errMsg = e.mensaje; return goProto('a1'); }
          S.otpErr = e.codigo === 'CODIGO_INVALIDO' ? 'El código no es correcto. Revisa el celular y vuelve a intentar.' : (e.mensaje || 'No se pudo verificar.');
          render();
        }
      });
    }

    // Cerrar sesión (menú lateral)
    if (id === 'a1' && R2.token) {
      return conEspera(async () => {
        try {
          // Esperar la confirmación del backend antes de cerrar la sesión local.
          await api('POST', '/auth/logout');

          // Eliminar los datos de autenticación y de la sesión anterior.
          R2.token = null;
          R2.tmp = null;
          R2.correo = null;
          R2.usuario = null;
          R2.estudios = [];

          // Limpiar datos relacionados con participantes y consentimientos.
          R2.participaciones.clear();
          R2.estudioParticipacion.clear();
          R2.idsConsentimiento.clear();
          borrarSensibles();

          R2.eventoTipo = null;
          R2.documentos = null;
          R2.altaProceso = null;
          R2.confirmacion = null;
          R2.ficha = null;
          R2.pantallaAnterior = null;
          S.alta = null;
          S.err = false;
          ocultarCambioClave();

          // Volver al ingreso solamente después del cierre exitoso.
          goProto('a1');
          toast('Sesión cerrada correctamente.', 'ok');
        } catch (e) {
          toast(
            e.mensaje || 'No se pudo cerrar la sesión. Inténtalo nuevamente.',
            'err'
          );
        }
      });
    }

    // Sin sesión real no se entra a pantallas internas
    if (!R2.token && !id.startsWith('a')) { toast('Primero inicia sesión.', 'err'); return goProto('a1'); }

    // Estudios y participantes
    if (id === 'c1') return conEspera(async () => { try { await cargarEstudios(); } catch (e) { toast(e.mensaje || 'No se pudieron cargar los estudios. Intenta nuevamente.', 'err'); } goProto('c1'); });
    if (id === 'c3') return conEspera(async () => { try { await cargarParticipantes(S.ceId); } catch (e) { toast(e.mensaje || 'No se pudieron cargar los participantes. Intenta nuevamente.', 'err'); return; } goProto('c3'); });
    if (id === 'b3' && !S.recons) {
      return conEspera(async () => {
        try { await documentosVigentes(); goProto('b3'); }
        catch (e) { toast(e.mensaje || e.message || 'No se pudo consultar el consentimiento vigente.', 'err'); }
      });
    }
    if (id === 'c6') {
      return conEspera(async () => {
        try { await cargarFicha(S.ficha); goProto('c6'); }
        catch (e) { toast(e.mensaje || e.message || 'No se pudo abrir la ficha.', 'err'); }
      });
    }

    // B4: inscribir y luego guardar la decisión con la evidencia requerida.
    // Si falla el segundo POST se conserva el UUID en memoria: no se repite la inscripción.
    if (cur === 'b4' && id === 'b5' && !S.recons) {
      return conEspera(async () => {
        try {
          await registrarAlta();
          toast('Participación y consentimiento registrados correctamente.', 'ok');
          goProto('b5');
        } catch (e) {
          const detalle = e.mensaje || e.message || 'No se pudo registrar el consentimiento.';
          toast(e.codigo === 'YA_PARTICIPA' ? 'La persona ya está inscrita. Revisa su ficha antes de intentar otra alta.' : detalle, 'err');
        }
      });
    }
    return goProto(id);
  };

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-act="b0ok"]')) {
      R2.altaProceso = null; R2.confirmacion = null; R2.documentos = null;
    }
  }, true);

  document.addEventListener('click', (e) => { if (e.target.closest('[data-act="verqr"]')) { e.preventDefault(); e.stopImmediatePropagation(); mostrarQR(); } }, true);

  // Mostrar / ocultar contraseña
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act="verpw"]'); if (!b) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const pw = document.getElementById('pw'); if (!pw) return;
    const ver = pw.type === 'password'; pw.type = ver ? 'text' : 'password';
    b.textContent = ver ? 'Ocultar' : 'Mostrar'; b.setAttribute('aria-pressed', String(ver));
    b.setAttribute('aria-label', ver ? 'Ocultar contraseña' : 'Mostrar contraseña'); pw.focus();
  }, true);

  // Buscar persona existente (RUT o correo) sin mostrar datos personales
  document.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-act="buscar"]'); if (!a) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const q = val('brut'); const out = document.getElementById('bres'); if (!q) return;
    try {
      const r = await api('POST', '/identidades/buscar', q.includes('@') ? { correo: q.toLowerCase() } : { rut: q });
      const ids = r.ux_lab_ids || (r.ux_lab_id ? [r.ux_lab_id] : []);
      out.innerHTML = r.existe || ids.length ? `Ya existe: <b>${ids.join(', ')}</b>. Se inscribirá sin duplicarla.` : 'No existe: completa sus datos para registrarla.';
    } catch (err) { out.textContent = err.mensaje || 'No se pudo buscar.'; }
  }, true);

  window.addEventListener('hashchange', () => {
    if (location.hash !== '#act58resultado' && R2.sensible) {
      borrarSensibles();
      if (cur === 'act58resultado') go('a3');
    }
  });

  // Guardar estudio (C2): si el código ya existe, lo edita; si no, lo crea
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act="estGuardar"]'); if (!b) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const datos = {};
    if (val('cn')) datos.nombre = val('cn');
    if (val('cd')) datos.descripcion = val('cd');
    if (val('fi')) datos.fecha_inicio = val('fi');
    if (val('rh')) datos.retencion_hasta = val('rh');
    const idExistente = uuidDe(val('cc'));
    await conEspera(async () => {
      try {
        if (idExistente) await api('PATCH', '/estudios/' + idExistente, datos);
        else await api('POST', '/estudios', { codigo_estudio: val('cc'), ...datos });
        toast('Estudio guardado.', 'ok');
        await cargarEstudios();
        goProto('c1');
      } catch (err) {
        toast(err.mensaje || 'No se pudo guardar el estudio.', 'err');
      }
    });
  }, true);

  // ---------- ACT73_DOCUMENTOS_REAL: versiones PDF de consentimiento ----------
  // Se reemplazan solamente d1/d2; no se simulan archivos de sesiones.
  const ACT73_MAX_PDF = 10 * 1024 * 1024;
  const ACT73_VERSION_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,19}$/;
  let act73Documentos = [];
  let act73EstudioConsultado = null;
  let act73ErrorConsulta = '';

  async function consultarDocumentosAct73(codigo) {
    act73Documentos = [];
    act73EstudioConsultado = codigo;
    act73ErrorConsulta = '';
    const id = uuidDe(codigo);
    if (!id) return;
    try {
      act73Documentos = lista(await api('GET', '/estudios/' + encodeURIComponent(id) + '/documentos-consentimiento'));
    } catch (e) {
      act73ErrorConsulta = e.mensaje || 'No se pudieron consultar los documentos del estudio.';
    }
  }

  R.d2 = () => {
    const estudio = STUDIES.find(s => s.id === S.fstudy);
    const docs = act73EstudioConsultado === S.fstudy ? act73Documentos : [];
    const error = act73EstudioConsultado === S.fstudy ? act73ErrorConsulta : '';
    const opciones = STUDIES.map(s => `<option value="${h(s.id)}" ${s.id === S.fstudy ? 'selected' : ''}>${h(s.id)} · ${h(s.n)}</option>`).join('');
    const permiteCarga = estudio && estudio.e !== 'Cerrado' && ['Director', 'Investigador', 'Asistente'].includes(S.role);
    return shell('d2', `<div class="card wide">
      <h2 class="t">Documentos de consentimiento</h2>
      <p class="sub">Versiones PDF registradas en la API. Los audios, videos y archivos de sesiones no se administran desde este módulo.</p>
      <div class="fld" style="max-width:580px"><label for="act73Estudio">Estudio</label>
        <select id="act73Estudio"><option value="">Selecciona un estudio</option>${opciones}</select></div>
      ${!estudio ? '<div class="msg info">Selecciona un estudio para consultar sus documentos.</div>' :
        error ? `<div class="msg err" role="alert">${h(error)}</div>` :
        !docs.length ? '<div class="msg info">No hay documentos registrados para este estudio.</div>' :
        `<div class="tw"><table><tr><th>Tipo</th><th>Versión</th><th>Estado</th><th>Huella SHA-256</th></tr>
        ${docs.map(d => `<tr><td>${h(d.tipo || '—')}</td><td>${h(d.version || '—')}</td>
          <td>${d.vigente ? '<span class="pill ok">Vigente</span>' : '<span class="pill n">Anterior</span>'}</td>
          <td><code style="overflow-wrap:anywhere">${h(d.documento_hash || '—')}</code></td></tr>`).join('')}
        </table></div>`}
      ${estudio?.e === 'Cerrado' ? '<div class="msg warn">Estudio cerrado: no se pueden subir nuevas versiones.</div>' : ''}
      <div class="acts"><span></span>
        ${permiteCarga ? '<button type="button" class="btn p" data-go="d1">+ Nueva versión PDF</button>' : ''}
      </div>
    </div>`);
  };

  R.d1 = () => {
    const estudio = STUDIES.find(s => s.id === S.fstudy);
    if (!estudio) return shell('d2', `<div class="card"><h2 class="t">Selecciona primero un estudio</h2>${btn('Volver', 'd2', 's')}</div>`);
    return shell('d2', `<div class="card">
      <h2 class="t">Subir nueva versión de consentimiento</h2>
      <p class="sub">Estudio: <b>${h(estudio.id)}</b> · ${h(estudio.n)}</p>
      <div class="msg info">El nuevo PDF reemplaza la versión vigente del mismo tipo, pero mantiene su registro histórico.</div>
      <form id="act73-form-doc">
        <div class="fld"><label for="act73Tipo">Tipo</label><select id="act73Tipo" required>
          <option value="consentimiento">Consentimiento</option><option value="asentimiento">Asentimiento</option></select></div>
        <div class="fld"><label for="act73Version">Nueva versión (por ejemplo v1.2)</label>
          <input id="act73Version" placeholder="v1.2" maxlength="20" required autocomplete="off">
          <div class="hint">1 a 20 caracteres: letras, números, punto, guion y guion bajo.</div></div>
        <div class="fld"><label for="act73Archivo">Archivo PDF</label>
          <input id="act73Archivo" type="file" accept=".pdf,application/pdf" required>
          <div class="hint">Solo PDF de hasta 10 MB. El servidor revisa también su contenido.</div></div>
        <p id="act73Error" role="alert" style="color:#B42318;font-size:13px"></p>
        <div class="acts">${btn('Cancelar', 'd2', 's')}
          <button type="submit" class="btn p">Subir versión</button></div>
      </form>
    </div>`);
  };

  document.addEventListener('change', e => {
    if (e.target?.id !== 'act73Estudio') return;
    S.fstudy = e.target.value || null;
    conEspera(async () => {
      await consultarDocumentosAct73(S.fstudy);
      goProto('d2');
    });
  });

  document.addEventListener('submit', e => {
    if (e.target?.id !== 'act73-form-doc') return;
    e.preventDefault();
    if (ocupado) return;
    const uuid = uuidDe(S.fstudy);
    const tipo = document.getElementById('act73Tipo').value;
    const version = document.getElementById('act73Version').value.trim();
    const archivo = document.getElementById('act73Archivo').files[0];
    const salida = document.getElementById('act73Error');
    salida.textContent = '';
    if (!R2.token || !uuid) { salida.textContent = 'Selecciona un estudio e inicia sesión.'; return; }
    if (!['Director', 'Investigador', 'Asistente'].includes(S.role)) {
      salida.textContent = 'Tu rol no puede subir documentos desde esta pantalla.'; return;
    }
    if (!['consentimiento', 'asentimiento'].includes(tipo)) { salida.textContent = 'Selecciona un tipo válido.'; return; }
    if (!ACT73_VERSION_RE.test(version)) { salida.textContent = 'Versión inválida: hasta 20 caracteres, letras, números, punto o guion.'; return; }
    if (!archivo) { salida.textContent = 'Selecciona un archivo PDF.'; return; }
    if (!/\.pdf$/i.test(archivo.name) || (archivo.type && archivo.type !== 'application/pdf')) {
      salida.textContent = 'Solo se admiten archivos PDF.'; return;
    }
    if (archivo.size === 0 || archivo.size > ACT73_MAX_PDF) {
      salida.textContent = 'El PDF debe tener contenido y no superar los 10 MB.'; return;
    }
    const form = new FormData();
    form.append('tipo', tipo);
    form.append('version', version);
    form.append('archivo', archivo, archivo.name);
    conEspera(async () => {
      try {
        await apiArchivo('/estudios/' + encodeURIComponent(uuid) + '/documentos-consentimiento', form);
        await consultarDocumentosAct73(S.fstudy);
        goProto('d2');
        toast('Nueva versión registrada correctamente.', 'ok');
      } catch (err) {
        const mensaje = err.codigo === 'VERSION_DUPLICADA' ? 'Esa versión ya existe para este tipo de documento.' :
          err.codigo === 'ARCHIVO_MUY_GRANDE' ? 'El PDF supera 10 MB.' :
          err.status === 403 ? 'No tienes permiso de carga en este estudio.' :
          (err.mensaje || 'No se pudo subir el documento.');
        const aviso = document.getElementById('act73Error');
        if (aviso) aviso.textContent = mensaje;
        else toast(mensaje, 'err');
      }
    });
  }, true);

  const act73GoAnterior = go;
  go = function (id) {
    if (id === 'a1') {
      act73Documentos = []; act73EstudioConsultado = null; act73ErrorConsulta = '';
      return act73GoAnterior(id);
    }
    if (!['d1', 'd2'].includes(id) || !R2.token || R2.usuario?.debe_cambiar_password)
      return act73GoAnterior(id);
    if (id === 'd2') return conEspera(async () => {
      await consultarDocumentosAct73(S.fstudy);
      goProto('d2');
    });
    const estudio = STUDIES.find(s => s.id === S.fstudy);
    if (!estudio) { toast('Selecciona primero un estudio.', 'err'); return go('d2'); }
    if (estudio.e === 'Cerrado') { toast('No se puede cargar en un estudio cerrado.', 'err'); return; }
    if (!['Director', 'Investigador', 'Asistente'].includes(S.role)) {
      toast('Tu rol no permite subir documentos.', 'err'); return;
    }
    return goProto('d1');
  };


  // ---------- ACT73_EXPORTACIONES_REAL: API real y ZIP autenticado ----------
  // Sin endpoint de listado global: se guardan solo IDs de esta sesion;
  // otro usuario autorizado puede consultar una solicitud con su UUID.
  const act73ExpConocidas = new Map();
  let act73ExpUltima = null;
  let act73ExpSeleccionada = null;
  const act73ExpUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const act73ExpEstados = {
    solicitada: 'Pendiente de aprobación',
    aprobada: 'Aprobada, preparando paquete',
    lista: 'Lista para descargar',
    rechazada: 'Rechazada',
    vencida: 'Vencida'
  };
  const act73ExpTextoEstado = e => act73ExpEstados[e] || String(e || '—');
  const act73ExpFecha = f => f ? new Date(f).toLocaleString('es-CL') : '—';
  const act73ExpNombreProp = {
    analisis: 'Análisis',
    informe: 'Informe',
    publicacion: 'Publicación'
  };

  function act73ExpGuardar(x) {
    if (!x || !act73ExpUuid.test(x.id_exportacion || '')) {
      throw new Error('La API no entregó un identificador de exportación válido.');
    }
    act73ExpConocidas.set(x.id_exportacion, x);
    return x;
  }

  function act73ExpListaHTML() {
    const items = Array.from(act73ExpConocidas.values());
    if (!items.length) {
      return '<div class="msg info">No hay solicitudes consultadas en esta sesión. Puedes solicitar una nueva o buscar una existente por su identificador.</div>';
    }
    return `<div class="tw"><table>
      <thead><tr><th>Código</th><th>Propósito</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>${items.map(x => `<tr>
        <td><code>${h(x.codigo_exportacion || x.id_exportacion)}</code></td>
        <td>${h(act73ExpNombreProp[x.proposito] || x.proposito)}</td>
        <td>${h(act73ExpFecha(x.fecha_solicitud))}</td>
        <td>${h(act73ExpTextoEstado(x.estado))}</td>
        <td>
          <button type="button" class="lnk" data-act="act73ExpVer"
            data-id="${h(x.id_exportacion)}">Consultar</button>
          ${x.estado === 'lista' ? ` · <button type="button" class="lnk"
            data-act="act73ExpBajar" data-id="${h(x.id_exportacion)}">Descargar ZIP</button>` : ''}
        </td>
      </tr>`).join('')}</tbody></table></div>`;
  }

  function act73ExpEstudios() {
    const actual = [S.fstudy, S.study, S.ceId]
      .find(c => STUDIES.some(s => s.id === c)) || '';
    return '<option value="">Selecciona un estudio</option>' +
      STUDIES.map(s => `<option value="${h(s.id)}" ${s.id === actual ? 'selected' : ''}>
        ${h(s.id)} · ${h(s.n)}</option>`).join('');
  }

  R.d3 = () => shell('d3', `<div class="card">
    <h2 class="t">Solicitar exportación de datos</h2>
    <p class="sub">La API genera un ZIP desidentificado con participantes elegibles:
      código E-, estado del consentimiento y mes de inscripción.</p>
    <form id="act73-exp-solicitar">
      <div class="fld">
        <label for="act73-exp-estudio">Estudio</label>
        <select id="act73-exp-estudio" required>${act73ExpEstudios()}</select>
      </div>
      <div class="fld">
        <label for="act73-exp-proposito">Propósito</label>
        <select id="act73-exp-proposito" required>
          <option value="analisis">Análisis</option>
          <option value="informe">Informe</option>
          <option value="publicacion">Publicación</option>
        </select>
      </div>
      <div class="msg info">La versión actual no admite filtros personalizados.
        No se exportan nombres, RUT, contacto ni archivos originales.</div>
      <div class="acts">
        <button type="button" class="btn s" data-go="d6">Mis solicitudes</button>
        <button type="submit" class="btn p">Solicitar exportación</button>
      </div>
    </form></div>`);

  R.d4 = () => {
    const x = act73ExpUltima && act73ExpConocidas.get(act73ExpUltima);
    if (!x) {
      return shell('d4', `<div class="card">
        <h2 class="t">Sin solicitud reciente</h2>
        <p class="sub">Crea una solicitud para ver su resultado.</p>
        <div class="acts">${btn('Solicitar exportación', 'd3')}</div></div>`);
    }
    return shell('d4', `<div class="card">
      <div class="check">✓</div>
      <h2 class="t">Solicitud registrada en la API</h2>
      <p class="sub">${x.estado === 'solicitada'
        ? 'Pendiente de la decisión del Investigador responsable.'
        : 'Consulta su estado y descarga el paquete cuando esté disponible.'}</p>
      <div class="big">${h(x.codigo_exportacion)}</div>
      <div class="tw"><table class="sumtbl" style="min-width:0">
        <tr><td>Identificador para consultas</td>
          <td><code style="overflow-wrap:anywhere">${h(x.id_exportacion)}</code></td></tr>
        <tr><td>Propósito</td><td>${h(act73ExpNombreProp[x.proposito] || x.proposito)}</td></tr>
        <tr><td>Estado</td><td>${h(act73ExpTextoEstado(x.estado))}</td></tr>
        <tr><td>Vencimiento</td><td>${h(act73ExpFecha(x.fecha_vencimiento))}</td></tr>
      </table></div>
      <div class="hint">Conserva el identificador si otra persona autorizada debe aprobarla:
        la API todavía no ofrece un listado global de solicitudes.</div>
      <div class="acts">
        ${btn('Ver solicitudes', 'd6', 's')}
        ${x.estado === 'lista' ? `<button type="button" class="btn p"
          data-act="act73ExpBajar" data-id="${h(x.id_exportacion)}">
          Descargar ZIP</button>` : ''}
      </div></div>`);
  };

  R.d6 = () => shell('d6', `<div class="card wide">
    <h2 class="t">Exportaciones del estudio</h2>
    <p class="sub">Se muestran solicitudes creadas o consultadas en esta sesión.
      El backend no dispone aún de un endpoint para listar todas las exportaciones.</p>
    ${act73ExpListaHTML()}
    <div class="fld" style="margin-top:18px">
      <label for="act73-exp-buscar">Consultar solicitud existente por UUID</label>
      <input id="act73-exp-buscar" type="text" autocomplete="off"
        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
      <div class="hint">El servidor solo permite consultar solicitudes propias o del
        Investigador responsable, con los permisos correspondientes.</div>
    </div>
    <div class="acts">
      <button type="button" class="btn s" data-act="act73ExpBuscar">Consultar ID</button>
      ${btn('Nueva solicitud', 'd3')}
    </div></div>`);

  R.d7 = () => {
    const x = act73ExpSeleccionada && act73ExpConocidas.get(act73ExpSeleccionada);
    if (!x) {
      return shell('d7', `<div class="card"><h2 class="t">Selecciona una solicitud</h2>
        <div class="acts">${btn('Volver', 'd6', 's')}</div></div>`);
    }
    return shell('d7', `<div class="card">
      <h2 class="t">Revisar solicitud · ${h(x.codigo_exportacion)}</h2>
      <p class="sub">La aprobación está reservada al Investigador responsable del estudio.</p>
      <div class="tw"><table class="sumtbl" style="min-width:0">
        <tr><td>UUID</td><td><code style="overflow-wrap:anywhere">${h(x.id_exportacion)}</code></td></tr>
        <tr><td>Propósito</td><td>${h(act73ExpNombreProp[x.proposito] || x.proposito)}</td></tr>
        <tr><td>Estado</td><td>${h(act73ExpTextoEstado(x.estado))}</td></tr>
        <tr><td>Solicitada el</td><td>${h(act73ExpFecha(x.fecha_solicitud))}</td></tr>
        <tr><td>Vence</td><td>${h(act73ExpFecha(x.fecha_vencimiento))}</td></tr>
      </table></div>
      ${x.estado === 'solicitada' ? `<div class="fld" style="margin-top:16px">
        <label for="act73-exp-motivo">Motivo de la decisión (mínimo 5 caracteres)</label>
        <textarea id="act73-exp-motivo" rows="3"
          placeholder="Explica la aprobación o rechazo, sin datos personales"></textarea>
      </div>` : ''}
      <div class="acts">
        ${btn('Volver', 'd6', 's')}
        ${x.estado === 'solicitada' && S.role === 'Investigador' ? `
          <button type="button" class="btn s"
            data-act="act73ExpDecidir" data-decision="rechazar">Rechazar</button>
          <button type="button" class="btn p"
            data-act="act73ExpDecidir" data-decision="aprobar">Aprobar</button>` : ''}
        ${x.estado === 'lista' ? `<button type="button" class="btn p"
          data-act="act73ExpBajar" data-id="${h(x.id_exportacion)}">Descargar ZIP</button>` : ''}
      </div></div>`);
  };

  async function act73ExpConsultar(id) {
    if (!act73ExpUuid.test(id)) {
      throw new Error('Escribe un identificador UUID válido.');
    }
    return act73ExpGuardar(
      await api('GET', '/exportaciones/' + encodeURIComponent(id))
    );
  }

  async function act73ExpDescargar(id) {
    const x = await act73ExpConsultar(id);
    if (x.estado !== 'lista') {
      throw new Error('La exportación no está disponible para descarga: ' +
        act73ExpTextoEstado(x.estado));
    }

    let respuesta;
    try {
      respuesta = await fetch(
        API + '/exportaciones/' + encodeURIComponent(id) + '/descarga',
        {
          method: 'GET',
          headers: { Authorization: 'Bearer ' + R2.token },
          cache: 'no-store'
        }
      );
    } catch (_) {
      throw new Error('No se pudo conectar con la API.');
    }

    if (!respuesta.ok) {
      let detalle = {};
      try { detalle = await respuesta.json(); } catch (_) {}
      throw new Error(detalle.error?.mensaje ||
        'La descarga fue rechazada por la API (HTTP ' + respuesta.status + ').');
    }

    const zip = await respuesta.blob();
    if (!zip.size) throw new Error('La API devolvió un archivo vacío.');

    const nombre = String(x.codigo_exportacion || 'exportacion')
      .replace(/[^A-Za-z0-9_-]/g, '') + '.zip';

    const enlace = URL.createObjectURL(zip);
    try {
      const a = document.createElement('a');
      a.href = enlace;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setTimeout(() => URL.revokeObjectURL(enlace), 30000);
    }
    toast('Descarga ZIP iniciada.', 'ok');
  }

  document.addEventListener('submit', e => {
    if (e.target?.id !== 'act73-exp-solicitar') return;
    e.preventDefault();
    e.stopImmediatePropagation();

    if (ocupado || !R2.token || R2.usuario?.debe_cambiar_password) return;

    const codigo = document.getElementById('act73-exp-estudio')?.value || '';
    const proposito = document.getElementById('act73-exp-proposito')?.value || '';
    const uuid = uuidDe(codigo);

    if (!uuid) {
      toast('Selecciona un estudio disponible.', 'err');
      return;
    }
    if (!['analisis', 'informe', 'publicacion'].includes(proposito)) {
      toast('Selecciona un propósito válido.', 'err');
      return;
    }

    conEspera(async () => {
      try {
        const x = act73ExpGuardar(
          await api('POST',
            '/estudios/' + encodeURIComponent(uuid) + '/exportaciones',
            { proposito, filtros: {} })
        );
        act73ExpUltima = x.id_exportacion;
        S.fstudy = codigo;
        goProto('d4');
        toast('Solicitud creada en la API.', 'ok');
      } catch (err) {
        toast(err.mensaje || err.message || 'No se pudo solicitar la exportación.', 'err');
      }
    });
  }, true);

  const act73ExpAcciones = new Set([
    'act73ExpBuscar', 'act73ExpVer', 'act73ExpDecidir', 'act73ExpBajar'
  ]);

  document.addEventListener('click', e => {
    const boton = e.target.closest('[data-act]');
    if (!boton || !act73ExpAcciones.has(boton.dataset.act)) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    if (ocupado || !R2.token || R2.usuario?.debe_cambiar_password) return;

    const accion = boton.dataset.act;
    const id = accion === 'act73ExpBuscar'
      ? (document.getElementById('act73-exp-buscar')?.value || '').trim()
      : accion === 'act73ExpDecidir'
        ? act73ExpSeleccionada
        : boton.dataset.id;

    conEspera(async () => {
      try {
        if (accion === 'act73ExpBajar') {
          await act73ExpDescargar(id);
          return;
        }

        if (accion === 'act73ExpDecidir') {
          if (S.role !== 'Investigador') {
            throw new Error('Solo el Investigador responsable puede decidir.');
          }

          const motivo =
            (document.getElementById('act73-exp-motivo')?.value || '').trim();
          const decision = boton.dataset.decision;

          if (motivo.length < 5) {
            throw new Error('El motivo debe tener al menos 5 caracteres.');
          }
          if (!['aprobar', 'rechazar'].includes(decision)) {
            throw new Error('Decisión inválida.');
          }

          act73ExpGuardar(
            await api('PATCH',
              '/exportaciones/' + encodeURIComponent(id) + '/aprobacion',
              { decision, motivo })
          );
          toast('Decisión registrada por la API.', 'ok');
          goProto('d7');
          return;
        }

        const x = await act73ExpConsultar(id);
        act73ExpSeleccionada = x.id_exportacion;
        goProto('d7');
      } catch (err) {
        toast(err.mensaje || err.message || 'Operación no disponible.', 'err');
      }
    });
  }, true);

  const act73ExpGoAnterior = go;
  go = function(id) {
    if (id === 'a1') {
      const salida = act73ExpGoAnterior(id);
      Promise.resolve(salida).then(() => {
        if (!R2.token) {
          act73ExpConocidas.clear();
          act73ExpUltima = null;
          act73ExpSeleccionada = null;
        }
      });
      return salida;
    }

    if (!['d3', 'd4', 'd6', 'd7'].includes(id) ||
        !R2.token || R2.usuario?.debe_cambiar_password) {
      return act73ExpGoAnterior(id);
    }
    return goProto(id);
  };

  // ---------- ACT73_CUENTAS_REAL: administración de cuentas mediante API ----------
  let act73Usuarios = [];
  const act73Roles = ['Director', 'Soporte', 'Investigador', 'Asistente', 'Estudiante', 'Invitado'];
  const act73FechaCorta = f => f ? String(f).slice(0, 10) : '—';

  // La contraseña temporal solo se muestra una vez, sin guardarla en storage.
  const act73ClaveDialogo = document.createElement('div');
  act73ClaveDialogo.id = 'act73-clave-dialogo';
  act73ClaveDialogo.setAttribute('role', 'dialog');
  act73ClaveDialogo.setAttribute('aria-modal', 'true');
  act73ClaveDialogo.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(11,14,50,.85);z-index:10020;align-items:center;justify-content:center;padding:16px';
  act73ClaveDialogo.innerHTML = `<div style="background:#fff;border-radius:16px;padding:24px;width:100%;max-width:440px;color:#131315;font-family:Inter,Arial,sans-serif">
    <h2 style="color:#000B78;margin:0 0 10px">Contraseña temporal</h2>
    <p id="act73-clave-cuenta" style="overflow-wrap:anywhere"></p>
    <p style="font-size:13px">Cópiala y entrégala mediante un canal seguro. No volverá a mostrarse al cerrar esta ventana.</p>
    <div id="act73-clave-valor" style="font-size:20px;font-weight:700;letter-spacing:.04em;padding:12px;background:#f2f3fa;border-radius:8px;user-select:all;overflow-wrap:anywhere"></div>
    <button type="button" id="act73-clave-cerrar" class="btn p" style="margin-top:18px">Ya la guardé; cerrar</button>
  </div>`;

  document.body.appendChild(act73ClaveDialogo);

  function act73OcultarClave() {
    act73ClaveDialogo.querySelector('#act73-clave-valor').textContent = '';
    act73ClaveDialogo.querySelector('#act73-clave-cuenta').textContent = '';
    act73ClaveDialogo.style.display = 'none';
  }

  function act73MostrarClave(correo, clave) {
    act73ClaveDialogo.querySelector('#act73-clave-cuenta').textContent = 'Cuenta: ' + correo;
    act73ClaveDialogo.querySelector('#act73-clave-valor').textContent = clave;
    act73ClaveDialogo.style.display = 'flex';
    act73ClaveDialogo.querySelector('#act73-clave-cerrar').focus();
  }

  act73ClaveDialogo.querySelector('#act73-clave-cerrar')
    .addEventListener('click', act73OcultarClave);

  const act73AdminPermitido = () =>
    R2.token && !R2.usuario?.debe_cambiar_password &&
    ['Director', 'Soporte'].includes(S.role);

  const act73PantallaCuentas = () => S.role === 'Soporte' ? 'e3' : 'e1';

  async function act73CargarUsuarios() {
    act73Usuarios = lista(await api('GET', '/usuarios'));
  }

  function act73FilaUsuario(u) {
    const puedeGestionar = S.role === 'Director' || u.nombre_rol !== 'Director';
    const esPropio = u.correo?.toLowerCase() === R2.usuario?.correo?.toLowerCase();
    const esDirector = S.role === 'Director';

    const opcionesRol = act73Roles
      .filter(r => esDirector || r !== 'Director')
      .map(r => `<option value="${h(r)}" ${r === u.nombre_rol ? 'selected' : ''}>${h(r)}</option>`)
      .join('');

    return `<tr>
      <td><b>${h(u.nombre)}</b><div class="hint">${h(u.correo)}</div><div class="hint">UUID: <code>${h(u.id_usuario)}</code></div></td>
      <td>${puedeGestionar && !esPropio
        ? `<select data-act73-rol="1" aria-label="Rol de ${h(u.correo)}">${opcionesRol}</select>
           <button type="button" class="lnk" data-act="act73UserRol"
             data-id="${h(u.id_usuario)}">Guardar rol</button>`
        : h(u.nombre_rol)}</td>
      <td>${u.activo
        ? '<span class="pill ok">Activa</span>'
        : '<span class="pill err">Bloqueada</span>'}</td>
      <td>${u.mfa_activo ? 'Configurado' : 'Pendiente'}</td>
      <td>${h(act73FechaCorta(u.fecha_expiracion))}</td>
      <td>${puedeGestionar && !esPropio ? `
        <button type="button" class="lnk" data-act="act73UserBloqueo"
          data-id="${h(u.id_usuario)}"
          data-activo="${u.activo ? 'false' : 'true'}">
          ${u.activo ? 'Bloquear' : 'Activar'}
        </button> ·
        <button type="button" class="lnk" data-act="act73UserClave"
          data-id="${h(u.id_usuario)}">Restablecer clave</button> ·
        <button type="button" class="lnk" data-act="act73UserMfa"
          data-id="${h(u.id_usuario)}">Reiniciar MFA</button>
        ` : 'Sin permisos'}
      </td>
    </tr>`;
  }

  function act73RenderUsuarios(pantalla) {
    const titulo = pantalla === 'e3' ? 'Cuentas de usuario' : 'Usuarios y roles';

    return shell(pantalla, `<div class="card wide">
      <div class="top" style="margin:0 0 14px">
        <div>
          <h2 class="t">${titulo}</h2>
          <p class="sub" style="margin:0">
            Cuentas obtenidas de la API real. Los cambios se auditan en el servidor.
          </p>
        </div>
        ${btn('+ Nueva cuenta', 'e2')}
      </div>

      <div class="tw"><table>
        <thead><tr>
          <th>Nombre / correo</th><th>Rol</th><th>Estado</th>
          <th>MFA</th><th>Vence</th><th>Acciones</th>
        </tr></thead>
        <tbody>${act73Usuarios.map(act73FilaUsuario).join('') ||
          '<tr><td colspan="6">No hay cuentas disponibles.</td></tr>'}</tbody>
      </table></div>

      <div class="hint" style="margin-top:12px">
        Solo Director puede administrar cuentas de Director.
        Restablecer una contraseña o reiniciar MFA puede cerrar sesiones activas.
      </div>
    </div>`);
  }

  R.e1 = () => act73RenderUsuarios('e1');
  R.e3 = () => act73RenderUsuarios('e3');

  R.e2 = () => shell('e2', `<div class="card">
    <h2 class="t">Crear cuenta</h2>
    <p class="sub">
      La API entrega una contraseña temporal que se muestra una sola vez.
    </p>

    <form id="act73-user-form">
      <div class="fld">
        <label for="act73-user-nombre">Nombre</label>
        <input id="act73-user-nombre" required maxlength="150" autocomplete="off">
      </div>
      <div class="fld">
        <label for="act73-user-correo">Correo</label>
        <input id="act73-user-correo" type="email" required autocomplete="off">
      </div>
      <div class="fld">
        <label for="act73-user-rol">Rol</label>
        <select id="act73-user-rol">
          ${act73Roles
            .filter(r => S.role === 'Director' || r !== 'Director')
            .map(r => `<option value="${h(r)}">${h(r)}</option>`)
            .join('')}
        </select>
      </div>
      <div class="fld">
        <label for="act73-user-fin">
          Fecha de término (requerida para roles temporales)
        </label>
        <input id="act73-user-fin" type="date">
        <div class="hint">
          El servidor valida qué roles necesitan fecha de expiración.
        </div>
      </div>
      <div class="acts">
        <button class="btn s" type="button"
          data-go="${act73PantallaCuentas()}">Cancelar</button>
        <button type="submit" class="btn p">Crear cuenta</button>
      </div>
    </form>
  </div>`);

  document.addEventListener('submit', e => {
    if (e.target?.id !== 'act73-user-form') return;

    e.preventDefault();
    e.stopImmediatePropagation();

    if (ocupado || !act73AdminPermitido()) return;

    const nombre = (document.getElementById('act73-user-nombre')?.value || '').trim();
    const correo = (document.getElementById('act73-user-correo')?.value || '')
      .trim().toLowerCase();
    const rol = document.getElementById('act73-user-rol')?.value || '';
    const fecha = document.getElementById('act73-user-fin')?.value || '';

    if (!nombre || !correo || !act73Roles.includes(rol)) {
      return toast('Completa los campos obligatorios.', 'err');
    }

    conEspera(async () => {
      try {
        const creado = await api('POST', '/usuarios', {
          nombre,
          correo,
          rol,
          ...(fecha ? { fecha_expiracion: fecha } : {})
        });

        try {
          await act73CargarUsuarios();
          goProto(act73PantallaCuentas());
        } catch (_) {
          toast('Cuenta creada; no se pudo actualizar el listado.', 'err');
        }

        if (creado.password_temporal) {
          act73MostrarClave(creado.correo || correo, creado.password_temporal);
        } else {
          toast('Cuenta creada sin contraseña temporal en la respuesta.', 'err');
        }
      } catch (err) {
        toast(err.mensaje || err.message || 'No se pudo crear la cuenta.', 'err');
      }
    });
  }, true);

  const act73AccionesUsuario = new Set([
    'act73UserBloqueo',
    'act73UserClave',
    'act73UserMfa',
    'act73UserRol'
  ]);

  document.addEventListener('click', e => {
    const boton = e.target.closest('[data-act]');
    if (!boton || !act73AccionesUsuario.has(boton.dataset.act)) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    if (ocupado || !act73AdminPermitido()) return;

    const user = act73Usuarios.find(u => u.id_usuario === boton.dataset.id);

    if (!user) {
      return toast('La cuenta ya no está disponible. Actualiza el listado.', 'err');
    }

    if (S.role !== 'Director' && user.nombre_rol === 'Director') {
      return toast('No tienes permiso para administrar Director.', 'err');
    }

    const accion = boton.dataset.act;
    const cuerpo =
      accion === 'act73UserBloqueo' ? { activo: boton.dataset.activo === 'true' } :
      accion === 'act73UserClave' ? { restablecer_password: true } :
      accion === 'act73UserMfa' ? { reiniciar_mfa: true } :
      { rol: boton.closest('tr')?.querySelector('select[data-act73-rol]')?.value };

    if (
      accion === 'act73UserRol' &&
      (!act73Roles.includes(cuerpo.rol) || cuerpo.rol === user.nombre_rol)
    ) {
      return toast('Selecciona un rol diferente.', 'err');
    }

    const textoAccion =
      accion === 'act73UserBloqueo' ? (cuerpo.activo ? 'activar' : 'bloquear') :
      accion === 'act73UserClave' ? 'restablecer la contraseña de' :
      accion === 'act73UserMfa' ? 'reiniciar el MFA de' :
      'cambiar el rol de';

    if (!confirm(`¿Confirmas ${textoAccion} ${user.correo}?`)) return;

    conEspera(async () => {
      try {
        const actualizado = await api(
          'PATCH',
          '/usuarios/' + encodeURIComponent(user.id_usuario),
          cuerpo
        );

        try {
          await act73CargarUsuarios();
          goProto(act73PantallaCuentas());
        } catch (_) {
          toast('Cambio aplicado; no se pudo actualizar el listado.', 'err');
        }

        if (actualizado.password_temporal) {
          act73MostrarClave(user.correo, actualizado.password_temporal);
        } else {
          toast('Cambio aplicado en la API.', 'ok');
        }
      } catch (err) {
        toast(err.mensaje || err.message || 'No se pudo actualizar la cuenta.', 'err');
      }
    });
  }, true);

  const act73CuentasGoAnterior = go;

  go = function(id) {
    if (id === 'a1') {
      const salida = act73CuentasGoAnterior(id);

      Promise.resolve(salida).then(() => {
        if (!R2.token) {
          act73Usuarios = [];
          act73OcultarClave();
        }
      });

      return salida;
    }

    if (!['e1', 'e2', 'e3'].includes(id)) {
      return act73CuentasGoAnterior(id);
    }

    if (!act73AdminPermitido()) {
      toast('Solo Director y Soporte pueden administrar cuentas.', 'err');
      return;
    }

    if (id === 'e2') return goProto('e2');

    return conEspera(async () => {
      try {
        await act73CargarUsuarios();
        goProto(id);
      } catch (err) {
        toast(
          err.mensaje || err.message || 'No se pudieron consultar las cuentas.',
          'err'
        );
      }
    });
  };

  // ---------- ACT73_ASIGNAR_ESTUDIO_REAL: asignación mínima de usuarios ----------
  const act73AsigUuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let act73AsigEstudio = null;
  let act73AsigMiembros = [];

  async function act73AsigConsultar(codigo) {
    const id = uuidDe(codigo);
    if (!id) throw new Error('Selecciona un estudio válido.');
    const respuesta = await api(
      'GET', '/estudios/' + encodeURIComponent(id) + '/membresias'
    );
    act73AsigMiembros = lista(respuesta);
    act73AsigEstudio = codigo;
  }

  R.c4 = () => {
    const codigo = act73AsigEstudio || S.ceId;
    const estudio = STUDIES.find(s => s.id === codigo);

    return shell('c1', `<div class="card wide">
      <h2 class="t">Asignar usuario a un estudio</h2>
      <p class="sub">Consulta las membresías reales y asigna una cuenta existente.
        El servidor verifica los permisos del Investigador.</p>

      <div class="fld" style="max-width:580px">
        <label for="act73-asig-estudio">Estudio</label>
        <select id="act73-asig-estudio">
          ${STUDIES.map(s =>
            `<option value="${h(s.id)}" ${s.id === codigo ? 'selected' : ''}>
              ${h(s.id)} · ${h(s.n)}
            </option>`
          ).join('')}
        </select>
      </div>

      ${estudio ? `<div class="msg info">
        Estudio: <b>${h(estudio.id)} · ${h(estudio.n)}</b>
      </div>` : ''}

      <h3 style="font-size:16px;margin:18px 0 8px">Integrantes actuales</h3>
      <div class="tw"><table>
        <tr><th>Nombre</th><th>Rol</th><th>Consultar</th><th>Vence</th></tr>
        ${act73AsigMiembros.map(m => `<tr>
          <td>${h(m.nombre)}<div class="hint">${h(m.correo)}</div></td>
          <td>${h(m.nombre_rol)}</td>
          <td>${m.puede_consultar ? 'Sí' : 'No'}</td>
          <td>${h(m.fecha_fin ? String(m.fecha_fin).slice(0, 10) : '—')}</td>
        </tr>`).join('') ||
        '<tr><td colspan="4">No hay membresías vigentes visibles.</td></tr>'}
      </table></div>

      <h3 style="font-size:16px;margin:20px 0 8px">Nueva asignación</h3>

      <form id="act73-asig-form">
        <div class="fld">
          <label for="act73-asig-usuario">UUID del usuario</label>
          <input id="act73-asig-usuario" required maxlength="36"
            autocomplete="off"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
          <div class="hint">
            El UUID se consulta desde Equipo y roles con una cuenta de Director.
          </div>
        </div>

        <div class="fld">
          <label for="act73-asig-fin">Acceso hasta (opcional)</label>
          <input id="act73-asig-fin" type="date">
        </div>

        <div class="msg info">
          La asignación otorgará solo el permiso <b>Consultar</b>.
          Los demás permisos permanecerán desactivados.
        </div>

        <div class="acts">
          ${btn('Volver', 'c3', 's')}
          <button type="submit" class="btn p">
            Asignar a este estudio
          </button>
        </div>
      </form>
    </div>`);
  };

  document.addEventListener('change', e => {
    if (e.target?.id !== 'act73-asig-estudio' ||
        ocupado || S.role !== 'Investigador') return;

    const codigo = e.target.value;

    conEspera(async () => {
      try {
        await act73AsigConsultar(codigo);
        S.ceId = codigo;
        goProto('c4');
      } catch (err) {
        toast(err.mensaje || err.message ||
          'No fue posible cargar las membresías.', 'err');
      }
    });
  });

  document.addEventListener('submit', e => {
    if (e.target?.id !== 'act73-asig-form') return;

    e.preventDefault();
    e.stopImmediatePropagation();

    if (ocupado || !R2.token || S.role !== 'Investigador' ||
        R2.usuario?.debe_cambiar_password) return;

    const usuario =
      (document.getElementById('act73-asig-usuario')?.value || '').trim();
    const fin =
      document.getElementById('act73-asig-fin')?.value || '';

    if (!act73AsigUuidRe.test(usuario)) {
      return toast('Introduce un UUID válido.', 'err');
    }

    const idEstudio = uuidDe(act73AsigEstudio);

    if (!idEstudio) {
      return toast('Estudio no disponible.', 'err');
    }

    if (!confirm('¿Asignar este usuario al estudio con permiso de consulta?')) {
      return;
    }

    conEspera(async () => {
      try {
        await api(
          'POST',
          '/estudios/' + encodeURIComponent(idEstudio) + '/membresias',
          {
            id_usuario: usuario,
            puede_consultar: true,
            ...(fin ? { fecha_fin: fin } : {})
          }
        );

        await act73AsigConsultar(act73AsigEstudio);
        goProto('c4');
        toast('Usuario asignado al estudio correctamente.', 'ok');
      } catch (err) {
        toast(err.mensaje || err.message ||
          'No se pudo asignar el usuario.', 'err');
      }
    });
  }, true);

  const act73AsigGoAnterior = go;

  go = function(id) {
    if (id === 'a1') {
      const salida = act73AsigGoAnterior(id);

      Promise.resolve(salida).then(() => {
        if (!R2.token) {
          act73AsigEstudio = null;
          act73AsigMiembros = [];
        }
      });

      return salida;
    }

    if (id !== 'c4') return act73AsigGoAnterior(id);

    if (S.role !== 'Investigador' || !R2.token ||
        R2.usuario?.debe_cambiar_password) {
      toast('Solo el Investigador autorizado puede asignar usuarios.', 'err');
      return;
    }

    return conEspera(async () => {
      try {
        await act73AsigConsultar(S.ceId || STUDIES[0]?.id);
        goProto('c4');
      } catch (err) {
        toast(err.mensaje || err.message ||
          'No se pudo consultar el equipo.', 'err');
      }
    });
  };

  // Arranque: siempre desde el ingreso
  S.err = false; goProto('a1');
})();
