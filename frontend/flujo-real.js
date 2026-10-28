/* plaGesEtic · Capa que conecta el prototipo navegable v2.3.1 con la API real (SOLO DEMO / DESARROLLO).
 * No cambia el diseño: reemplaza los datos de ejemplo por los de la API en estas pantallas:
 *   A1/A2  ingreso con contraseña + código (o código de recuperación)  → POST /auth/login, /auth/login/mfa
 *   A3     panel con el nombre y rol reales
 *   C1     estudios del usuario                                       → GET  /estudios
 *   C3     participantes de un estudio (solo seudónimos)               → GET  /estudios/{id}/participaciones
 *   B0-B5  alta de participante: busca, y al guardar la decisión del consentimiento registra la identidad cifrada
 *          e inscribe → POST /identidades(/buscar), /estudios/{id}/participaciones
 *   Cerrar sesión                                                      → POST /auth/logout
 * El resto de las pantallas sigue siendo el prototipo (aún no tiene API).
 */
(function () {
  'use strict';
  const API = '/api';
  const R2 = { token: null, tmp: null, correo: null, usuario: null, estudios: [],
    participaciones: new Map(), documentos: null, altaProceso: null, confirmacion: null, ficha: null };
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
  document.head.appendChild(css);
  const badge = document.createElement('div'); badge.id = 'rl-badge'; badge.innerHTML = '<i></i>Conectado a la API real';
  const cel = document.createElement('div'); cel.id = 'rl-cel';
  cel.innerHTML = '<small>Celular simulado · app de autenticación</small><div class="c" title="Clic para copiarlo al campo">------</div><div class="b"><div></div></div><small style="margin-top:6px" id="rl-cel-u"></small>';
  const toastEl = document.createElement('div'); toastEl.id = 'rl-toast';
  const qrEl = document.createElement('div'); qrEl.id = 'rl-qr'; qrEl.setAttribute('role', 'dialog'); qrEl.setAttribute('aria-modal', 'true');
  document.body.append(badge, cel, toastEl, qrEl);
  async function mostrarQR() {
    if (!R2.correo) return;
    let uri = '';
    try { uri = (await (await fetch('/otpauth?correo=' + encodeURIComponent(R2.correo))).json()).uri; } catch (e) { /* sin red */ }
    if (!uri || typeof qrcode === 'undefined') { toast('No se pudo generar el código QR.', 'err'); return; }
    const q = qrcode(0, 'M'); q.addData(uri); q.make();
    qrEl.innerHTML = `<div class="box"><h3>Configura tu celular</h3>
      <p>Escanea este código con <b>Google Authenticator</b> o <b>Microsoft Authenticator</b> (gratis en App Store y Google Play).</p>
      <div class="img">${q.createImgTag(6, 8)}</div>
      <ol><li>Abre la app y toca <b>+</b> → <b>Escanear un código QR</b>.</li><li>Apunta la cámara a este código.</li><li>Aparecerá «plaGesEtic» con un código de 6 dígitos que cambia cada 30 segundos: escríbelo y presiona <b>Verificar</b>.</li></ol>
      <p style="font-size:12px">Cuenta: ${R2.correo}. En el sistema final este QR se muestra una sola vez, en el primer ingreso (Act. 74).</p>
      <div class="row"><button type="button" data-act="qrX">Listo</button></div></div>`;
    qrEl.style.display = 'flex';
  }
  qrEl.addEventListener('click', (e) => { if (e.target === qrEl || e.target.closest('[data-act="qrX"]')) qrEl.style.display = 'none'; });
  let tt;
  function toast(msg, tipo) { toastEl.textContent = msg; toastEl.className = tipo || ''; toastEl.style.display = 'block'; clearTimeout(tt); tt = setTimeout(() => (toastEl.style.display = 'none'), 4200); }

  // ---------- llamadas a la API ----------
  async function api(metodo, ruta, cuerpo, conToken = true) {
    const cab = { 'Content-Type': 'application/json' };
    if (conToken && R2.token) cab.Authorization = 'Bearer ' + R2.token;
    let r, j = {};
    try { r = await fetch(API + ruta, { method: metodo, headers: cab, body: cuerpo ? JSON.stringify(cuerpo) : undefined }); }
    catch (e) { throw { codigo: 'SIN_RED', mensaje: 'No se pudo contactar el servidor de la demo.' }; }
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
  const flujoConsentimiento = window.PlaGesConsentimiento;
  if (!flujoConsentimiento) throw new Error('No se cargó consentimiento-integracion.js');

  api('GET', '/salud', null, false).then(() => badge.classList.remove('off')).catch(() => { badge.classList.add('off'); badge.innerHTML = '<i></i>API apagada: ejecuta «docker compose up -d»'; });

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
  // Textos de «prototipo» → datos reales
  const shellV = shell;
  shell = function (mc, inner) { return shellV(mc, inner).replace('· nombre ficticio', '· usuario de prueba'); };
  const a3V = R.a3;
  R.a3 = () => a3V().replace(/· PROTOTIPO/gi, '· plaGesEtic');
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
      <div class="acts">${btn('Volver a participantes', 'c3', 's')}</div></div>`);
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
    R2.confirmacion = { codigo: resultado.codigo, estudio: S.study, decision,
      version: R2.documentos.consentimiento.version,
      estado: resultado.consentimiento.estado_vigente };
    S.alta = null; // No retener nombres, RUT ni correo después de finalizar.
    R2.altaProceso = null;
  }

  // ---------- navegación: donde hay API, se llama antes de cambiar de pantalla ----------
  const goProto = go;
  let ocupado = false;
  async function conEspera(fn) {
    if (ocupado) return; ocupado = true; document.getElementById('app').classList.add('rl-busy');
    try { await fn(); } finally { ocupado = false; document.getElementById('app').classList.remove('rl-busy'); }
  }
  const val = (id) => ((document.getElementById(id) || {}).value || '').trim();

  go = function (id) {
    // Paso 1: correo y contraseña
    if (cur === 'a1' && id === 'a2') {
      return conEspera(async () => {
        const correo = val('u').toLowerCase(), password = (document.getElementById('pw') || {}).value || '';
        R2.correo = correo; S.err = false; S.errMsg = '';
        try {
          const r = await api('POST', '/auth/login', { correo, password }, false);
          R2.tmp = r.token_temporal; S.first = false; S.otpErr = '';
          goProto('a2');
        } catch (e) {
          S.err = true; S.errMsg = e.codigo === 'MFA_PENDIENTE' ? 'Tu cuenta aún no tiene configurada la verificación en dos pasos (se habilita en la Act. 74).' : e.codigo === 'DEMASIADOS_INTENTOS' ? e.mensaje : 'Usuario o contraseña incorrectos.';
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
          R2.token = r.token; S.otpErr = ''; aplicarUsuario(r.usuario);
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
      const t = R2.token; R2.token = null; R2.tmp = null;
      R2.participaciones.clear(); R2.documentos = null; R2.altaProceso = null;
      R2.confirmacion = null; R2.ficha = null; S.alta = null;
      fetch(API + '/auth/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + t } }).catch(() => {});
      toast('Sesión cerrada: el token ya no sirve.', 'ok');
      S.err = false; return goProto('a1');
    }
    // Sin sesión real no se entra a pantallas internas
    if (!R2.token && !id.startsWith('a')) { toast('Primero inicia sesión.', 'err'); return goProto('a1'); }
    // Estudios y participantes
    if (id === 'c1') return conEspera(async () => { try { await cargarEstudios(); } catch (e) { toast(e.mensaje || 'No se pudieron cargar los estudios', 'err'); } goProto('c1'); });
    if (id === 'c3') return conEspera(async () => { try { await cargarParticipantes(S.ceId); } catch (e) { toast(e.mensaje || 'Sin permiso para ver participantes', 'err'); return; } goProto('c3'); });
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

  // Arranque: siempre desde el ingreso
  S.err = false; goProto('a1');
})();
