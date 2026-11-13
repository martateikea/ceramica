// Mi taller · app. Los datos viven en Google Sheets; este archivo habla con el puente de Apps Script.
// URL de la aplicación web de Apps Script. Vacía = modo demo con datos de ejemplo.
const API = 'https://script.google.com/macros/s/AKfycbw7-kTuUK5EJ9YeWG3Uy3_gEX9F2TIMhus8wS_XFqdTagHJHFrfje-LTUKxeuBuUyQg/exec';

/* =========================================================
   Conexión con el puente (o modo demo si no hay API)
   ========================================================= */
const ES_GAS = !!API && !new URLSearchParams(location.search).has('demo');
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};
let PIN = store.get('taller-pin') || '';

async function api(action, ...args) {
  if (!ES_GAS) return new Promise(ok => setTimeout(() => ok(JSON.parse(JSON.stringify(Demo[action](...args)))), 150));
  let r;
  try {
    r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ pin: PIN, action, args }) });
  } catch (e) { throw new Error('Sin conexión con Google'); }
  const j = await r.json().catch(() => { throw new Error('El puente de Google no responde bien. Revisa la implementación.'); });
  if (!j.ok) {
    if (j.error === 'PIN incorrecto') { PIN = ''; store.del('taller-pin'); }
    throw new Error(j.error);
  }
  return j.data;
}

/* =========================================================
   Utilidades
   ========================================================= */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const hoy = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const fmtFecha = s => { if (!s) return ''; const d = new Date(s.length === 10 ? s + 'T12:00' : s); return isNaN(d) ? s : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }); };
const imgUrl = (id, w = 1000) => String(id).startsWith('data:') ? id : `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${w}`;
const estrellas = (n, cls = 'stars-s') => n ? `<p class="${cls}">${'★'.repeat(n)}<span>${'★'.repeat(5 - n)}</span></p>` : '';
const dominio = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

const ICONS = {
  back: '<path d="M15 18l-6-6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
  link: '<path d="M10 14a4 4 0 006 0l3-3a4 4 0 00-6-6l-1 1M14 10a4 4 0 00-6 0l-3 3a4 4 0 006 6l1-1"/>',
  library: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  idea: '<path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z"/>',
  flask: '<path d="M9 3h6M10 3v6L5 19a1.5 1.5 0 001.3 2h11.4A1.5 1.5 0 0019 19l-5-10V3"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
};
const ic = n => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

const COLOR_ESTADO = { Modelando: '#a8917c', Secando: '#c9a66b', Bizcochado: '#d08a5c', Esmaltado: '#5f86a3', Terminado: '#6d8a5e', Fallido: '#a35a5a' };

let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2400); }

/* =========================================================
   Qué se pregunta en cada formulario
   ========================================================= */
const FASES_PIEZA = ['Crudo', 'Bizcocho', 'Esmaltado', 'Terminado', 'Detalle'];
const FASES_PLACA = ['Antes de cocer', 'Después de cocer'];

const SCHEMA = {
  proyectos: [
    { sec: 'Fotos', hint: 'Una por fase si puedes: así verás cómo cambia el esmalte en el horno.', campos: [
      { k: 'fotos', t: 'fotos', fases: FASES_PIEZA }] },
    { sec: 'La pieza', campos: [
      { k: 'titulo', t: 'text', l: 'Nombre', ph: 'Taza de desayuno' },
      { k: 'fecha', t: 'date', l: 'Fecha' },
      { k: 'estado', t: 'uno', l: 'Estado', lista: 'estados' },
      { k: 'tecnica', t: 'uno', l: 'Técnica', lista: 'tecnicas' },
      { k: 'barro', t: 'uno', l: 'Barro', lista: 'barros' }] },
    { sec: 'Esmalte y cocción', campos: [
      { k: 'esmaltes', t: 'varios', l: 'Esmaltes', lista: 'esmaltes', orden: true, hint: 'Si combinas varios, márcalos en el orden en que los aplicas.' },
      { k: 'capas', t: 'num', l: 'Capas' },
      { k: 'aplicacion', t: 'uno', l: 'Aplicación', lista: 'aplicacion' },
      { k: 'coccion', t: 'uno', l: 'Cocción', lista: 'coccion' },
      { k: 'horno', t: 'uno', l: 'Horno / taller', lista: 'hornos' }] },
    { sec: 'Resultado', hint: 'Lo que más te va a enseñar dentro de seis meses.', campos: [
      { k: 'valoracion', t: 'estrellas', l: '¿Cómo salió?' },
      { k: 'defectos', t: 'varios', l: 'Defectos', lista: 'defectos' },
      { k: 'hariaDistinto', t: 'area', l: 'Qué haría distinto', destacado: true, ph: 'Lo que quieres recordar la próxima vez…' },
      { k: 'notas', t: 'area', l: 'Notas del proceso', ph: 'Tiempos de secado, grosor, lo que pasó en el horno…' }] },
  ],
  placas: [
    { sec: 'Fotos', campos: [{ k: 'fotos', t: 'fotos', fases: FASES_PLACA }] },
    { sec: 'La prueba', campos: [
      { k: 'titulo', t: 'text', l: 'Nombre', ph: 'Se rellena solo si lo dejas vacío' },
      { k: 'fecha', t: 'date', l: 'Fecha' },
      { k: 'barro', t: 'uno', l: 'Barro', lista: 'barros' }] },
    { sec: 'Esmalte y cocción', campos: [
      { k: 'esmaltes', t: 'varios', l: 'Esmaltes', lista: 'esmaltes', orden: true, hint: 'En el orden en que los aplicas.' },
      { k: 'capas', t: 'num', l: 'Capas' },
      { k: 'aplicacion', t: 'uno', l: 'Aplicación', lista: 'aplicacion' },
      { k: 'coccion', t: 'uno', l: 'Cocción', lista: 'coccion' },
      { k: 'horno', t: 'uno', l: 'Horno / taller', lista: 'hornos' }] },
    { sec: 'Resultado', campos: [
      { k: 'valoracion', t: 'estrellas', l: '¿Te gusta?' },
      { k: 'defectos', t: 'varios', l: 'Defectos', lista: 'defectos' },
      { k: 'hariaDistinto', t: 'area', l: 'Conclusión', destacado: true, ph: '¿Lo usarías en una pieza? ¿Con qué cambio?' },
      { k: 'notas', t: 'area', l: 'Notas' }] },
  ],
  ideas: [
    { sec: 'La idea', campos: [
      { k: 'titulo', t: 'text', l: 'Título', ph: 'Tazas con textura de corteza' },
      { k: 'texto', t: 'area', l: 'Descripción', ph: 'Qué te gusta, cómo lo harías, qué barro o esmalte te imaginas…' }] },
    { sec: 'Referencias', hint: 'Pega enlaces de Pinterest, Instagram o donde sea, y sube capturas si quieres verlas aquí.', campos: [
      { k: 'links', t: 'links', l: 'Enlaces (uno por línea)' },
      { k: 'fotos', t: 'fotos' }] },
    { sec: 'Etiquetas', campos: [{ k: 'etiquetas', t: 'varios', lista: 'etiquetasIdeas' }] },
  ],
};

/* =========================================================
   Estado y navegación
   ========================================================= */
let DB = { proyectos: [], ideas: [], placas: [], listas: {} };
let vista = { name: 'home', params: {} };
const historial = [];

function ir(name, params = {}, { reemplazar = false } = {}) {
  if (!reemplazar) historial.push(vista);
  vista = { name, params };
  render();
  window.scrollTo(0, 0);
}
function atras() { vista = historial.pop() || { name: 'home', params: {} }; render(); window.scrollTo(0, 0); }
function render() {
  const app = $('#app');
  document.body.className = 'v-' + (vista.name.startsWith('form') ? 'form' : vista.name);
  app.innerHTML = '';
  VISTAS[vista.name](app, vista.params || {});
  if (!ES_GAS && !$('.demo')) document.body.insertAdjacentHTML('beforeend', '<div class="demo">Modo demo · los datos no se guardan</div>');
}
function upsert(clave, o) { const a = DB[clave]; const i = a.findIndex(x => x.id === o.id); if (i >= 0) a[i] = o; else a.push(o); }
const recientes = arr => arr.slice().sort((a, b) => String(b.fecha || b.creado).localeCompare(String(a.fecha || a.creado)));

document.addEventListener('click', e => {
  const t = e.target.closest('[data-go],[data-abrir],[data-back]');
  if (!t) return;
  if (t.hasAttribute('data-back')) return atras();
  if (t.dataset.go) return ir(t.dataset.go);
  if (t.dataset.abrir) { const [tipo, id] = t.dataset.abrir.split(':'); ir(tipo === 'placas' ? 'placa' : 'proyecto', { id }); }
});

function cabecera(titulo, accion = '', sub = '') {
  return `<header class="top"><div class="top-in">
    <button class="icon-btn" data-back aria-label="Volver">${ic('back')}</button>
    <button class="brand" data-go="home">Mi taller</button>
    <div class="top-acc">${accion}</div></div></header>
    <div class="wrap head"><h1>${titulo}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>`;
}

/* Fotos ordenadas por fase y foto de portada (la fase más avanzada) */
function fotosOrd(p, clave) {
  const fases = clave === 'placas' ? FASES_PLACA : clave === 'proyectos' ? FASES_PIEZA : [];
  return (p.fotos || []).filter(f => f.id).slice().sort((a, b) => fases.indexOf(a.fase) - fases.indexOf(b.fase));
}
function portada(p, clave = 'proyectos') {
  const fs = fotosOrd(p, clave);
  const sinDet = fs.filter(f => f.fase !== 'Detalle');
  return (sinDet[sinDet.length - 1] || fs[0] || {}).id || null;
}

function tarjeta(p, clave = 'proyectos') {
  const f = portada(p, clave);
  const etiqueta = clave === 'placas' ? 'Placa de prueba' : p.estado;
  const color = clave === 'placas' ? '#b4552f' : COLOR_ESTADO[p.estado];
  return `<button class="card" data-abrir="${clave}:${esc(p.id)}">
    <div class="card-img">${f ? `<img loading="lazy" src="${imgUrl(f, 600)}" alt="">` : `<div class="noimg">${esc((p.titulo || '·')[0])}</div>`}
      ${etiqueta ? `<span class="badge" style="--c:${color || '#8b7d71'}">${esc(etiqueta)}</span>` : ''}</div>
    <div class="card-body"><h3>${esc(p.titulo || 'Sin título')}</h3>
      <p class="meta">${[p.barro, ...(p.esmaltes || [])].filter(Boolean).map(esc).join(' · ') || '&nbsp;'}</p>
      ${estrellas(+p.valoracion)}</div></button>`;
}

/* =========================================================
   Vistas
   ========================================================= */
const VISTAS = {};

/* ---------- Portada ---------- */
VISTAS.home = app => {
  const fotos = [...recientes(DB.proyectos).map(p => portada(p)), ...DB.placas.map(p => portada(p, 'placas'))].filter(Boolean);
  const ncol = innerWidth < 640 ? 3 : innerWidth < 1100 ? 5 : 6;
  const vacios = ['#e9dccb', '#dcc3a8', '#cfa98a', '#e6d3c0', '#d9b79b', '#efe4d6'];
  let mosaic = '';
  for (let c = 0; c < ncol; c++) {
    const items = [];
    for (let i = 0; i < 7; i++) items.push(fotos.length ? fotos[(c * 2 + i * ncol) % fotos.length] : null);
    const tile = (f, i) => f ? `<div class="tile"><img src="${imgUrl(f, 500)}" alt="" loading="lazy"></div>`
      : `<div class="tile" style="background:${vacios[(c + i) % vacios.length]}"></div>`;
    const html = items.map(tile).join('');
    mosaic += `<div class="mcol ${c % 2 ? 'down' : ''}" style="--dur:${90 + c * 13}s">${html}${html}</div>`;
  }
  const enMarcha = recientes(DB.proyectos).filter(p => p.estado && !['Terminado', 'Fallido'].includes(p.estado)).slice(0, 4);
  const nTerm = DB.proyectos.filter(p => p.estado === 'Terminado').length;
  const stats = DB.proyectos.length
    ? `${DB.proyectos.length} ${DB.proyectos.length === 1 ? 'pieza' : 'piezas'} · ${nTerm} terminadas · ${DB.ideas.length} ideas guardadas`
    : 'Tu cuaderno de barro, esmaltes y aprendizajes';

  app.innerHTML = `<div class="mosaic" aria-hidden="true">${mosaic}</div><div class="veil"></div>
  <main class="hero">
    <p class="eyebrow">Taller de cerámica</p>
    <h1 class="display">Mi <em>taller</em></h1>
    <p class="stats">${stats}</p>
    <nav class="menu">
      <button class="mcard primary" data-go="formProyecto"><span class="mi">${ic('plus')}</span><h2>Nuevo proyecto</h2><p>Fotos, barro, esmalte y cocción</p></button>
      <button class="mcard" data-go="biblioteca"><span class="mi">${ic('library')}</span><h2>Biblioteca</h2><p>Lo terminado y lo que está en marcha</p></button>
      <button class="mcard" data-go="ideas"><span class="mi">${ic('idea')}</span><h2>Cotillear ideas</h2><p>Notas, fotos y enlaces de Pinterest</p></button>
    </nav>
    ${enMarcha.length ? `<div class="marcha"><span>En marcha:</span>${enMarcha.map(p => {
      const f = portada(p);
      return `<button class="mpill" data-abrir="proyectos:${esc(p.id)}">${f ? `<img src="${imgUrl(f, 120)}" alt="">` : '<i></i>'}<b>${esc(p.titulo || 'Sin título')}</b><em>${esc(p.estado)}</em></button>`;
    }).join('')}</div>` : ''}
    <button class="mlink" data-go="placas">${ic('flask')} Placas de prueba ${ic('arrow')}</button>
  </main>`;
};

/* ---------- Biblioteca ---------- */
const F = { q: '', estado: [], barro: [], esmaltes: [], tecnica: [], defectos: [], minVal: 0 };
const FACETAS = [['estado', 'Estado'], ['barro', 'Barro'], ['esmaltes', 'Esmalte'], ['tecnica', 'Técnica'], ['defectos', 'Defectos']];
let bibTab = 'piezas', filtrosAbiertos = false;

function pasaFiltros(p) {
  if (F.q) {
    const txt = [p.titulo, p.notas, p.hariaDistinto, p.barro, p.tecnica, p.estado, ...(p.esmaltes || []), ...(p.defectos || [])].join(' ').toLowerCase();
    if (!txt.includes(F.q.toLowerCase())) return false;
  }
  for (const k of ['estado', 'barro', 'tecnica']) if (F[k].length && !F[k].includes(p[k])) return false;
  for (const k of ['esmaltes', 'defectos']) if (F[k].length && !F[k].some(v => (p[k] || []).includes(v))) return false;
  if (F.minVal && (+p.valoracion || 0) < F.minVal) return false;
  return true;
}

VISTAS.biblioteca = app => {
  app.innerHTML = cabecera('Biblioteca', `<button class="btn primary sm" data-go="formProyecto">${ic('plus')}<span>Nuevo</span></button>`) +
    `<div class="wrap">
      <div class="tabs" role="tablist">
        <button class="tab ${bibTab === 'piezas' ? 'on' : ''}" data-tab="piezas">Piezas</button>
        <button class="tab ${bibTab === 'cruces' ? 'on' : ''}" data-tab="cruces">Barro × esmalte</button>
      </div><div id="bib"></div></div>`;
  app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { bibTab = b.dataset.tab; render(); });
  const bib = $('#bib', app);
  if (bibTab === 'cruces') return pintarCruces(bib);

  if (!DB.proyectos.length) {
    bib.innerHTML = `<div class="vacio"><h3>Todavía no hay piezas</h3><p>Sube la primera y empieza tu cuaderno.</p><button class="btn primary" data-go="formProyecto">${ic('plus')} Nuevo proyecto</button></div>`;
    return;
  }
  bib.innerHTML = `<div class="toolbar">
      <label class="search">${ic('search')}<input type="search" placeholder="Buscar en nombres y notas…" value="${esc(F.q)}"></label>
      <button class="btn ghost" id="btnF">${ic('filter')}<span>Filtros</span><b id="nf"></b></button></div>
    <div id="panelF" class="panel-f" ${filtrosAbiertos ? '' : 'hidden'}></div>
    <div id="activos" class="activos"></div><p id="cuenta" class="cuenta"></p><div id="res" class="grid"></div>`;
  $('input', bib).addEventListener('input', e => { F.q = e.target.value; pintar(); });
  $('#btnF', bib).onclick = () => { filtrosAbiertos = !filtrosAbiertos; $('#panelF', bib).hidden = !filtrosAbiertos; };
  bib.addEventListener('click', e => {
    if (e.target.closest('[data-limpiar]')) { FACETAS.forEach(([k]) => F[k] = []); F.minVal = 0; return pintar(); }
    const c = e.target.closest('[data-f]'); if (!c) return;
    const k = c.dataset.f, v = c.dataset.v;
    if (k === 'minVal') F.minVal = F.minVal === +v ? 0 : +v;
    else F[k] = F[k].includes(v) ? F[k].filter(x => x !== v) : [...F[k], v];
    pintar();
  });
  pintar();

  function pintar() {
    // Panel de filtros: solo valores que aparecen en alguna pieza
    let panel = '';
    for (const [k, nombre] of FACETAS) {
      const cuenta = {};
      DB.proyectos.forEach(p => [].concat(p[k] || []).filter(Boolean).forEach(v => cuenta[v] = (cuenta[v] || 0) + 1));
      const orden = [...(DB.listas[k === 'estado' ? 'estados' : k === 'barro' ? 'barros' : k === 'tecnica' ? 'tecnicas' : k] || [])];
      const vals = Object.keys(cuenta).sort((a, b) => (orden.indexOf(a) + 1 || 99) - (orden.indexOf(b) + 1 || 99) || a.localeCompare(b));
      if (!vals.length) continue;
      panel += `<div><h4>${nombre}</h4><div class="chips">${vals.map(v => `<button class="chip sm ${F[k].includes(v) ? 'on' : ''}" data-f="${k}" data-v="${esc(v)}">${esc(v)} <small>${cuenta[v]}</small></button>`).join('')}</div></div>`;
    }
    panel += `<div><h4>Valoración mínima</h4><div class="chips">${[3, 4, 5].map(n => `<button class="chip sm ${F.minVal === n ? 'on' : ''}" data-f="minVal" data-v="${n}">${'★'.repeat(n)}</button>`).join('')}</div></div>`;
    $('#panelF', bib).innerHTML = panel;

    const activos = FACETAS.flatMap(([k]) => F[k].map(v => `<button class="chip sm on x" data-f="${k}" data-v="${esc(v)}">${esc(v)}</button>`));
    if (F.minVal) activos.push(`<button class="chip sm on x" data-f="minVal" data-v="${F.minVal}">≥ ${'★'.repeat(F.minVal)}</button>`);
    $('#activos', bib).innerHTML = activos.length ? activos.join('') + `<button class="chip sm add" data-limpiar>Limpiar</button>` : '';
    $('#nf', bib).textContent = activos.length || '';

    const res = recientes(DB.proyectos).filter(pasaFiltros);
    $('#cuenta', bib).textContent = `${res.length} de ${DB.proyectos.length} piezas`;
    $('#res', bib).innerHTML = res.length ? res.map(p => tarjeta(p)).join('')
      : `<div class="vacio" style="grid-column:1/-1"><h3>Nada por aquí</h3><p>Ninguna pieza cumple esos filtros.</p></div>`;
  }
};

/* ---------- Cruce barro × esmalte ---------- */
const COLOR_BARRO = { 'Luna': '#d9c7ad', 'Marte': '#b0623e', 'Blanco CT': '#ece6db', 'Blanco Impalpable': '#f7f3ec', 'Negro': '#3a3330' };

function pintarCruces(cont) {
  const items = [...DB.proyectos.map(p => ({ ...p, _c: 'proyectos' })), ...DB.placas.map(p => ({ ...p, _c: 'placas' }))];
  const esm = [...new Set([...(DB.listas.esmaltes || []), ...items.flatMap(p => p.esmaltes || [])])];
  const barros = [...new Set([...(DB.listas.barros || []), ...items.map(p => p.barro).filter(Boolean)])];
  if (!esm.length || !barros.length) {
    cont.innerHTML = `<div class="vacio"><h3>Aún no hay combinaciones</h3><p>En cuanto guardes piezas con barro y esmalte aparecerá aquí el mapa de lo que has probado.</p></div>`;
    return;
  }
  const probadas = new Set(items.flatMap(p => (p.esmaltes || []).map(e => p.barro + '|' + e)));
  cont.innerHTML = `<p class="cruces-intro">Cada casilla es una combinación de barro y esmalte. Las vacías son las que aún no has probado: buenas candidatas para una placa de prueba. Llevas <b>${probadas.size}</b> de ${barros.length * esm.length}.</p>
  <div class="tabla-w"><table class="tabla"><thead><tr><th></th>${esm.map(e => `<th>${esc(e)}</th>`).join('')}</tr></thead><tbody>
  ${barros.map(b => `<tr><th><i style="background:${COLOR_BARRO[b] || '#cdbba5'}"></i>${esc(b)}</th>${esm.map(e => {
    const m = items.filter(p => p.barro === b && (p.esmaltes || []).includes(e));
    if (!m.length) return `<td><button class="celda no" data-combo="${esc(b)}|${esc(e)}" title="Sin probar: ${esc(b)} + ${esc(e)}">+</button></td>`;
    const f = m.map(p => portada(p, p._c)).find(Boolean);
    return `<td><button class="celda si" data-combo="${esc(b)}|${esc(e)}" title="${esc(b)} + ${esc(e)}">${f ? `<img src="${imgUrl(f, 200)}" alt="">` : ''}<b>${m.length}</b></button></td>`;
  }).join('')}</tr>`).join('')}
  </tbody></table></div>`;
  cont.querySelectorAll('[data-combo]').forEach(b => b.onclick = () => {
    const [barro, esmalte] = b.dataset.combo.split('|');
    ir('combo', { barro, esmalte });
  });
}

VISTAS.combo = (app, { barro, esmalte }) => {
  const m = c => recientes(DB[c]).filter(p => p.barro === barro && (p.esmaltes || []).includes(esmalte));
  const piezas = m('proyectos'), placas = m('placas');
  app.innerHTML = cabecera(`${esc(barro)} <em style="color:var(--clay)">+</em> ${esc(esmalte)}`,
    `<button class="btn ghost sm" id="probar">${ic('flask')}<span>Probar en placa</span></button>`,
    piezas.length + placas.length ? `${piezas.length} piezas y ${placas.length} placas con esta combinación.` : 'Aún no has probado esta combinación.') +
    `<div class="wrap" style="padding-top:24px"><div class="grid">${[...piezas.map(p => tarjeta(p)), ...placas.map(p => tarjeta(p, 'placas'))].join('')}</div>
    ${piezas.length + placas.length ? '' : `<div class="vacio"><p>Haz una placa de prueba y apunta cómo queda.</p></div>`}</div>`;
  $('#probar', app).onclick = () => ir('formPlaca', { prefill: { barro, esmaltes: [esmalte] } });
};

/* ---------- Detalle (pieza o placa) ---------- */
VISTAS.proyecto = (app, { id }) => detalle(app, 'proyectos', id);
VISTAS.placa = (app, { id }) => detalle(app, 'placas', id);

function detalle(app, clave, id) {
  const p = DB[clave].find(x => x.id === id);
  if (!p) { vista = { name: 'home', params: {} }; return render(); }
  const campos = SCHEMA[clave].flatMap(s => s.campos);
  const fotos = fotosOrd(p, clave);
  const ini = Math.max(0, fotos.findIndex(f => f.id === portada(p, clave)));
  const esPieza = clave === 'proyectos';

  const filas = campos.filter(c => !['fotos', 'titulo', 'fecha', 'estado', 'valoracion'].includes(c.k) && c.t !== 'area').map(c => {
    let v = p[c.k];
    if (Array.isArray(v)) {
      if (!v.length) return '';
      v = c.orden ? v.map((x, i) => `<span class="pill">${v.length > 1 ? `<i>${i + 1}</i>` : ''}${esc(x)}</span>`).join('<span class="arrow">→</span>')
        : v.map(x => `<span class="pill">${esc(x)}</span>`).join('');
    } else { if (!v) return ''; v = esc(v); }
    return `<div class="row"><dt>${c.l}</dt><dd>${v}</dd></div>`;
  }).join('');
  const areas = campos.filter(c => c.t === 'area' && p[c.k]).map(c => c.destacado
    ? `<div class="callout"><h4>${c.l}</h4><p>${esc(p[c.k])}</p></div>`
    : `<div class="det-sec"><h4>${c.l}</h4><p>${esc(p[c.k])}</p></div>`).join('');

  const rel = p.barro && (p.esmaltes || []).length
    ? [...DB.proyectos.map(x => [x, 'proyectos']), ...DB.placas.map(x => [x, 'placas'])]
      .filter(([x]) => x.id !== p.id && x.barro === p.barro && (x.esmaltes || []).some(e => p.esmaltes.includes(e)))
    : [];
  const idea = esPieza && p.ideaId && DB.ideas.find(i => i.id === p.ideaId);

  app.innerHTML = cabecera('', `<button class="btn ghost sm" id="editar">${ic('edit')}<span>Editar</span></button>`) +
  `<div class="wrap"><div class="det">
    <div>${fotos.length ? `<figure class="gal-main"><img id="gm" src="${imgUrl(fotos[ini].id, 1400)}" alt=""><figcaption id="gc">${esc(fotos[ini].fase || '')}</figcaption></figure>
      ${fotos.length > 1 ? `<div class="gal-th">${fotos.map((f, i) => `<button data-gi="${i}" class="${i === ini ? 'on' : ''}"><img src="${imgUrl(f.id, 300)}" alt="${esc(f.fase || 'Foto ' + (i + 1))}">${esc(f.fase || '')}</button>`).join('')}</div>` : ''}`
      : `<div class="empty-gal"><button class="btn ghost" id="addFotos">${ic('camera')} Añadir fotos</button></div>`}</div>
    <div class="det-info">
      <p class="eyebrow">${[esPieza ? '' : 'Placa de prueba', fmtFecha(p.fecha || p.creado), p.tecnica].filter(Boolean).map(esc).join(' · ')}</p>
      <h1>${esc(p.titulo || 'Sin título')}</h1>
      ${estrellas(+p.valoracion, 'det-stars')}
      ${esPieza ? `<div class="estado-q"><h4>¿En qué punto está?</h4><div class="chips">${(DB.listas.estados || []).map(s => `<button class="chip sm ${p.estado === s ? 'on' : ''}" data-estado="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>` : ''}
      ${filas ? `<dl class="ficha">${filas}</dl>` : ''}
      ${areas}
      ${idea ? `<div class="det-sec"><h4>Nació de la idea</h4><p><button class="mpill" data-go="ideas"><b>${esc(idea.titulo || 'Idea')}</b><em>ver ideas</em></button></p></div>` : ''}
      <div class="det-acc"><button class="btn danger" id="borrar">${ic('trash')} Borrar</button></div>
    </div></div>
    ${rel.length ? `<section class="rel"><h2>Con la misma combinación</h2><p class="hint">Mismo barro (${esc(p.barro)}) y algún esmalte en común. Compara resultados.</p><div class="grid">${rel.map(([x, c]) => tarjeta(x, c)).join('')}</div></section>` : ''}
  </div>`;

  const editar = () => ir(esPieza ? 'formProyecto' : 'formPlaca', { id: p.id }, { reemplazar: true });
  $('#editar', app).onclick = editar;
  if ($('#addFotos', app)) $('#addFotos', app).onclick = editar;
  app.querySelectorAll('[data-gi]').forEach(b => b.onclick = () => {
    const f = fotos[+b.dataset.gi];
    $('#gm', app).src = imgUrl(f.id, 1400); $('#gc', app).textContent = f.fase || '';
    app.querySelectorAll('[data-gi]').forEach(x => x.classList.toggle('on', x === b));
  });
  app.querySelectorAll('[data-estado]').forEach(b => b.onclick = async () => {
    const antes = p.estado;
    p.estado = b.dataset.estado;
    app.querySelectorAll('[data-estado]').forEach(x => x.classList.toggle('on', x === b));
    try { upsert(clave, await api('guardar', clave, clone(p))); toast('Estado: ' + p.estado); }
    catch (err) { p.estado = antes; toast('No se pudo guardar'); render(); }
  });
  $('#borrar', app).onclick = async () => {
    if (!confirm(`¿Borrar "${p.titulo || 'Sin título'}"? No se puede deshacer.`)) return;
    try { await api('borrar', clave, p.id); DB[clave] = DB[clave].filter(x => x.id !== p.id); toast('Borrado'); atras(); }
    catch (err) { toast('No se pudo borrar'); }
  };
}

/* ---------- Ideas ---------- */
let ideaTag = null;
VISTAS.ideas = app => {
  const tags = [...new Set(DB.ideas.flatMap(i => i.etiquetas || []))];
  const lista = recientes(DB.ideas).filter(i => !ideaTag || (i.etiquetas || []).includes(ideaTag));
  app.innerHTML = cabecera('Cotillear ideas', `<button class="btn primary sm" data-go="formIdea">${ic('plus')}<span>Idea</span></button>`,
    'Lo que te gustaría hacer. Cuando te pongas con una, conviértela en proyecto.') +
  `<div class="wrap">
    ${tags.length ? `<div class="ideas-tags"><button class="chip sm ${!ideaTag ? 'on' : ''}" data-tag="">Todas</button>${tags.map(t => `<button class="chip sm ${ideaTag === t ? 'on' : ''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : '<div style="height:20px"></div>'}
    ${lista.length ? `<div class="masonry">${lista.map(tarjetaIdea).join('')}</div>`
      : `<div class="vacio"><h3>Sin ideas todavía</h3><p>Guarda lo que veas por ahí: una foto, un enlace de Pinterest o dos líneas.</p><button class="btn primary" data-go="formIdea">${ic('plus')} Nueva idea</button></div>`}
  </div>`;
  app.querySelectorAll('[data-tag]').forEach(b => b.onclick = () => { ideaTag = b.dataset.tag || null; render(); });
  app.querySelectorAll('[data-idea]').forEach(b => b.onclick = () => ir('formIdea', { id: b.dataset.idea }));
  app.querySelectorAll('[data-conv]').forEach(b => b.onclick = () => ir('formProyecto', { desdeIdea: b.dataset.conv }));
};

function tarjetaIdea(i) {
  const f = (i.fotos || []).find(x => x.id);
  return `<article class="idea ${f ? '' : 'solo-texto'}">
    <button class="idea-open" data-idea="${esc(i.id)}">
      ${f ? `<img src="${imgUrl(f.id, 700)}" alt="" loading="lazy">` : ''}
      <div class="idea-b"><h3>${esc(i.titulo || 'Idea sin título')}</h3>${i.texto ? `<p>${esc(i.texto)}</p>` : ''}</div>
    </button>
    ${(i.links || []).length ? `<div class="links">${i.links.map(u => `<a href="${esc(u)}" target="_blank" rel="noopener">${ic('link')}${esc(dominio(u))}</a>`).join('')}</div>` : ''}
    ${(i.etiquetas || []).length ? `<div class="idea-tags">${i.etiquetas.map(t => `<span>#${esc(t)}</span>`).join('')}</div>` : ''}
    <div class="idea-f">${i.proyectoId && DB.proyectos.some(p => p.id === i.proyectoId)
      ? `<button class="hecha" data-abrir="proyectos:${esc(i.proyectoId)}">${ic('check')} Ya es proyecto</button>`
      : `<button class="conv" data-conv="${esc(i.id)}">Convertir en proyecto ${ic('arrow')}</button>`}
      <button class="icon-btn" data-idea="${esc(i.id)}" aria-label="Editar idea">${ic('edit')}</button></div>
  </article>`;
}

/* ---------- Placas de prueba ---------- */
VISTAS.placas = app => {
  const lista = recientes(DB.placas);
  app.innerHTML = cabecera('Placas de prueba', `<button class="btn primary sm" data-go="formPlaca">${ic('plus')}<span>Placa</span></button>`) +
  `<div class="wrap">
    <div class="intro-placas"><span class="mi">${ic('flask')}</span><p>Una placa es un trocito de barro para probar un esmalte antes de usarlo en una pieza. Es la forma más barata de aprender: cada una alimenta el mapa <b>Barro × esmalte</b> de la biblioteca.</p></div>
    ${lista.length ? `<div class="grid">${lista.map(p => tarjeta(p, 'placas')).join('')}</div>`
      : `<div class="vacio"><h3>Ninguna placa aún</h3><p>Cuando hagas la primera, apúntala aquí.</p><button class="btn primary" data-go="formPlaca">${ic('plus')} Nueva placa</button></div>`}
  </div>`;
};

/* ---------- Formularios ---------- */
VISTAS.formProyecto = (app, { id, desdeIdea, prefill }) => {
  const ex = id && DB.proyectos.find(p => p.id === id);
  const datos = ex ? clone(ex) : { fecha: hoy(), estado: 'Modelando', esmaltes: [], defectos: [], fotos: [], ...(prefill || {}) };
  if (desdeIdea) {
    const i = DB.ideas.find(x => x.id === desdeIdea);
    if (i) { datos.titulo = i.titulo; datos.notas = [i.texto, ...(i.links || [])].filter(Boolean).join('\n'); datos.ideaId = i.id; }
  }
  vistaForm(app, {
    clave: 'proyectos', datos,
    titulo: ex ? 'Editar pieza' : 'Nuevo proyecto',
    sub: ex ? '' : 'Rellena lo que sepas ahora. Puedes volver a completarlo cuando salga del horno.',
    alGuardar: async r => {
      if (r.ideaId) {
        const i = DB.ideas.find(x => x.id === r.ideaId);
        if (i && i.proyectoId !== r.id) { i.proyectoId = r.id; upsert('ideas', await api('guardar', 'ideas', clone(i))); }
      }
      ir('proyecto', { id: r.id }, { reemplazar: true });
    },
  });
};

VISTAS.formPlaca = (app, { id, prefill }) => {
  const ex = id && DB.placas.find(p => p.id === id);
  const datos = ex ? clone(ex) : { fecha: hoy(), esmaltes: [], defectos: [], fotos: [], ...(prefill || {}) };
  vistaForm(app, {
    clave: 'placas', datos, titulo: ex ? 'Editar placa' : 'Nueva placa de prueba',
    antes: o => { if (!o.titulo) o.titulo = [o.barro, (o.esmaltes || []).join(' + ')].filter(Boolean).join(' · ') || 'Placa'; },
    alGuardar: r => ir('placa', { id: r.id }, { reemplazar: true }),
  });
};

VISTAS.formIdea = (app, { id }) => {
  const ex = id && DB.ideas.find(i => i.id === id);
  const datos = ex ? clone(ex) : { links: [], etiquetas: [], fotos: [] };
  vistaForm(app, {
    clave: 'ideas', datos, titulo: ex ? 'Editar idea' : 'Nueva idea',
    borrable: !!ex,
    alGuardar: () => ir('ideas', {}, { reemplazar: true }),
  });
};

function vistaForm(app, { clave, datos, titulo, sub = '', antes, alGuardar, borrable }) {
  app.innerHTML = cabecera(titulo, borrable ? `<button class="btn danger sm" id="borrarF">${ic('trash')}<span>Borrar</span></button>` : '', sub) +
    `<div class="wrap narrow" id="fw"></div>
    <div class="savebar"><div class="savebar-in"><button class="btn ghost" data-back>Cancelar</button><button class="btn primary" id="guardar">Guardar</button></div></div>`;
  const f = construirForm(SCHEMA[clave], datos);
  $('#fw', app).appendChild(f.el);
  const t = $('input.inp', f.el); if (t && !datos.id && !datos.titulo && innerWidth > 720) t.focus();

  $('#guardar', app).onclick = async e => {
    const b = e.currentTarget;
    b.disabled = true;
    b.textContent = f.pendientes.size ? 'Subiendo fotos…' : 'Guardando…';
    try {
      await f.esperar();
      const obj = limpiar(f.val);
      if (antes) antes(obj);
      const r = await api('guardar', clave, obj);
      upsert(clave, r);
      toast('Guardado');
      await alGuardar(r);
    } catch (err) {
      console.error(err);
      toast('No se pudo guardar. Inténtalo otra vez.');
      b.disabled = false; b.textContent = 'Guardar';
    }
  };
  if (borrable) $('#borrarF', app).onclick = async () => {
    if (!confirm('¿Borrar esta idea?')) return;
    await api('borrar', clave, datos.id);
    DB[clave] = DB[clave].filter(x => x.id !== datos.id);
    toast('Borrada'); atras();
  };
}

function limpiar(val) {
  const o = {};
  for (const k in val) if (!k.startsWith('_')) o[k] = val[k];
  if (o.fotos) o.fotos = o.fotos.filter(f => f.id).map(f => f.fase ? { id: f.id, fase: f.fase } : { id: f.id });
  if (typeof o.titulo === 'string') o.titulo = o.titulo.trim();
  return o;
}

function construirForm(schema, datos) {
  const val = clone(datos);
  const pendientes = new Set();
  const el = document.createElement('div'); el.className = 'form';
  schema.forEach(sec => {
    const s = document.createElement('section'); s.className = 'fsec';
    s.innerHTML = `<h2>${sec.sec}</h2>${sec.hint ? `<p class="hint">${sec.hint}</p>` : ''}`;
    sec.campos.forEach(c => s.appendChild(campo(c, val, pendientes)));
    el.appendChild(s);
  });
  return { el, val, pendientes, esperar: async () => { while (pendientes.size) await Promise.all([...pendientes]); } };
}

function campo(c, val, pend) {
  const w = document.createElement('div');
  w.className = 'field' + (c.destacado ? ' destacado' : '');
  if (c.l) w.innerHTML = `<label class="flabel" for="f-${c.k}">${c.l}</label>${c.hint ? `<p class="hint">${c.hint}</p>` : ''}`;
  CAMPO[c.t](w, c, val, pend);
  return w;
}

const CAMPO = {
  text(w, c, val) {
    w.insertAdjacentHTML('beforeend', `<input id="f-${c.k}" class="inp" type="text" placeholder="${esc(c.ph || '')}" value="${esc(val[c.k] || '')}">`);
    w.lastElementChild.oninput = e => val[c.k] = e.target.value;
  },
  date(w, c, val) {
    w.insertAdjacentHTML('beforeend', `<input id="f-${c.k}" class="inp" type="date" value="${esc(val[c.k] || '')}" style="max-width:220px">`);
    w.lastElementChild.oninput = e => val[c.k] = e.target.value;
  },
  area(w, c, val) {
    w.insertAdjacentHTML('beforeend', `<textarea id="f-${c.k}" class="inp" placeholder="${esc(c.ph || '')}">${esc(val[c.k] || '')}</textarea>`);
    w.lastElementChild.oninput = e => val[c.k] = e.target.value;
  },
  links(w, c, val) {
    w.insertAdjacentHTML('beforeend', `<textarea id="f-${c.k}" class="inp" placeholder="https://www.pinterest.com/pin/…">${esc((val[c.k] || []).join('\n'))}</textarea>`);
    w.lastElementChild.oninput = e => val[c.k] = e.target.value.split(/\s*\n\s*/).map(s => s.trim()).filter(Boolean);
  },
  num(w, c, val) {
    const box = document.createElement('div'); box.className = 'stepper';
    const pintar = () => box.innerHTML = `<button type="button" data-d="-1" aria-label="Menos">−</button><span>${val[c.k] || '–'}</span><button type="button" data-d="1" aria-label="Más">+</button>`;
    box.onclick = e => { const b = e.target.closest('[data-d]'); if (!b) return; const n = Math.max(0, (+val[c.k] || 0) + +b.dataset.d); val[c.k] = n ? String(n) : ''; pintar(); };
    pintar(); w.appendChild(box);
  },
  estrellas(w, c, val) {
    const box = document.createElement('div'); box.className = 'stars';
    const pintar = () => box.innerHTML = [1, 2, 3, 4, 5].map(n => `<button type="button" data-n="${n}" class="${n <= (+val[c.k] || 0) ? 'on' : ''}" aria-label="${n} de 5">★</button>`).join('');
    box.onclick = e => { const b = e.target.closest('[data-n]'); if (!b) return; val[c.k] = +b.dataset.n === +val[c.k] ? '' : b.dataset.n; pintar(); };
    pintar(); w.appendChild(box);
  },
  uno(w, c, val) { chips(w, c, val, false); },
  varios(w, c, val) { chips(w, c, val, true); },
  fotos(w, c, val, pend) {
    val[c.k] = val[c.k] || [];
    const grid = document.createElement('div'); grid.className = 'fotos-grid'; w.appendChild(grid);
    const faseDefecto = () => ({ Bizcochado: 'Bizcocho', Esmaltado: 'Esmaltado', Terminado: 'Terminado', Fallido: 'Terminado' }[val.estado]
      || (c.fases === FASES_PLACA ? 'Después de cocer' : 'Crudo'));
    const pintar = () => {
      grid.innerHTML = val[c.k].map((f, i) => `<div class="ph ${f._subiendo ? 'subiendo' : ''}">
        <img src="${f._local || imgUrl(f.id, 400)}" alt="">
        ${c.fases ? `<select data-i="${i}" aria-label="Fase">${c.fases.map(x => `<option${x === f.fase ? ' selected' : ''}>${x}</option>`).join('')}</select>` : ''}
        <button type="button" class="ph-x" data-x="${i}" aria-label="Quitar foto">×</button>${f._subiendo ? '<span class="spin"></span>' : ''}</div>`).join('') +
        `<label class="ph-add">${ic('camera')}<span>Añadir fotos</span><input type="file" accept="image/*" multiple hidden></label>`;
      grid.querySelector('input[type=file]').onchange = e => anadir([...e.target.files]);
    };
    grid.addEventListener('change', e => { if (e.target.matches('select')) val[c.k][+e.target.dataset.i].fase = e.target.value; });
    grid.addEventListener('click', e => { const x = e.target.closest('[data-x]'); if (x) { val[c.k].splice(+x.dataset.x, 1); pintar(); } });
    async function anadir(files) {
      for (const file of files) {
        let local;
        try { local = await comprimir(file); } catch { toast('No pude leer esa imagen'); continue; }
        const f = { _local: local, _subiendo: true };
        if (c.fases) f.fase = faseDefecto();
        val[c.k].push(f); pintar();
        const p = api('subirFoto', local)
          .then(id => { f.id = id; })
          .catch(() => { toast('Una foto no se pudo subir'); val[c.k] = val[c.k].filter(x => x !== f); })
          .finally(() => { f._subiendo = false; pend.delete(p); pintar(); });
        pend.add(p);
      }
    }
    pintar();
  },
};

function chips(w, c, val, multi) {
  const box = document.createElement('div'); box.className = 'chips'; w.appendChild(box);
  if (multi) val[c.k] = val[c.k] || [];
  const pintar = () => {
    const sel = multi ? val[c.k] : (val[c.k] ? [val[c.k]] : []);
    const opts = [...new Set([...(DB.listas[c.lista] || []), ...sel])];
    box.innerHTML = opts.map(o => {
      const on = sel.includes(o);
      const n = multi && c.orden && on && sel.length > 1 ? `<i>${sel.indexOf(o) + 1}</i>` : '';
      return `<button type="button" class="chip ${on ? 'on' : ''}" data-v="${esc(o)}">${n}${esc(o)}</button>`;
    }).join('') + `<button type="button" class="chip add">+ añadir</button>`;
  };
  const elegir = v => {
    if (multi) val[c.k] = val[c.k].includes(v) ? val[c.k].filter(x => x !== v) : [...val[c.k], v];
    else val[c.k] = val[c.k] === v ? '' : v;
  };
  box.addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    if (b.classList.contains('add')) {
      const inp = document.createElement('input');
      inp.className = 'chip-input'; inp.placeholder = 'Escribe y pulsa Enter';
      b.replaceWith(inp); inp.focus();
      inp.addEventListener('keydown', ev => {
        if (ev.key === 'Enter') { ev.preventDefault(); inp.blur(); }
        if (ev.key === 'Escape') { inp.value = ''; inp.blur(); }
      });
      inp.addEventListener('blur', () => {
        const v = inp.value.trim();
        if (v) {
          const l = DB.listas[c.lista] = DB.listas[c.lista] || [];
          if (!l.includes(v)) { l.push(v); api('anadirALista', c.lista, v).catch(() => toast('No se guardó la etiqueta en la lista')); }
          if (!(multi ? val[c.k].includes(v) : val[c.k] === v)) elegir(v);
        }
        pintar();
      }, { once: true });
      return;
    }
    elegir(b.dataset.v); pintar();
  });
  pintar();
}

/* Reduce la foto antes de subirla (más rápido y ocupa menos en Drive) */
function comprimir(file, max = 1600) {
  return new Promise((ok, ko) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(img.src);
      ok(cv.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = ko;
    img.src = URL.createObjectURL(file);
  });
}

/* =========================================================
   Modo demo (solo cuando el archivo se abre fuera de Apps Script)
   ========================================================= */
const Demo = (() => {
  const CB = { 'Luna': '#d6c3a5', 'Marte': '#a95a37', 'Blanco CT': '#e9e2d6', 'Blanco Impalpable': '#f3eee6', 'Negro': '#3b3431' };
  const CE = { 'Celadón': '#9dbcaa', 'Azul cobalto': '#2e4c8c', 'Blanco satinado': '#f0ebe1', 'Óxido de hierro': '#8a4a24', 'Tenmoku': '#3a2318' };
  function pieza(forma, barro, esm, fondo, crudo) {
    const body = { taza: 'M118 120 L282 120 L274 300 Q271 334 238 334 L162 334 Q129 334 126 300 Z',
      jarron: 'M172 70 L228 70 L226 116 Q306 170 300 252 Q294 336 200 340 Q106 336 100 252 Q94 170 174 116 Z',
      cuenco: 'M78 190 L322 190 Q316 300 200 316 Q84 300 78 190 Z',
      plato: 'M60 236 Q200 196 340 236 Q330 290 200 300 Q70 290 60 236 Z' }[forma];
    const asa = forma === 'taza' ? `<path d="M280 160 Q336 164 332 222 Q328 278 276 280" fill="none" stroke="${crudo ? CB[barro] : (CE[esm[0]] || CB[barro])}" stroke-width="20" stroke-linecap="round"/>` : '';
    const y = { taza: 250, jarron: 270, cuenco: 270, plato: 290 }[forma];
    const ola = `M0 0 H400 V${y} Q370 ${y + 10} 350 ${y - 4} Q330 ${y + 34} 312 ${y} Q280 ${y - 8} 250 ${y + 6} Q228 ${y + 26} 206 ${y} Q170 ${y - 10} 140 ${y + 8} Q120 ${y + 30} 100 ${y} Q60 ${y - 8} 0 ${y} Z`;
    const g1 = CE[esm[0]], g2 = CE[esm[1]];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><defs><clipPath id="b"><path d="${body}" transform="translate(0 60)"/></clipPath>
      <linearGradient id="l" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".0"/><stop offset=".3" stop-color="#fff" stop-opacity=".28"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient></defs>
      <rect width="400" height="500" fill="${fondo}"/><rect y="380" width="400" height="120" fill="#000" opacity=".05"/>
      <ellipse cx="200" cy="${forma === 'plato' ? 362 : 396}" rx="${forma === 'jarron' ? 100 : 130}" ry="16" fill="#000" opacity=".13"/>
      <g transform="translate(0 60)">${asa}</g>
      <path d="${body}" transform="translate(0 60)" fill="${CB[barro]}"/>
      ${!crudo && g1 ? `<g clip-path="url(#b)"><path d="${ola}" transform="translate(0 60)" fill="${g1}"/>${g2 ? `<path d="M0 0 H400 V${y - 120} Q300 ${y - 90} 200 ${y - 118} Q100 ${y - 92} 0 ${y - 120} Z" transform="translate(0 60)" fill="${g2}" opacity=".9"/>` : ''}</g>` : ''}
      <path d="${body}" transform="translate(0 60)" fill="url(#l)"/></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  const P = (id, fecha, titulo, estado, tecnica, barro, esmaltes, extra, forma, fondo, fases) => ({
    id, fecha, creado: fecha, titulo, estado, tecnica, barro, esmaltes, capas: esmaltes.length ? '2' : '', aplicacion: esmaltes.length ? 'Inmersión' : '',
    coccion: esmaltes.length ? 'Alta (≈1250 °C)' : '', horno: 'Taller', valoracion: '', defectos: [], notas: '', hariaDistinto: '',
    fotos: fases.map(f => ({ id: pieza(forma, barro, esmaltes, fondo, f === 'Crudo' || f === 'Bizcocho'), fase: f })), ...extra,
  });
  const db = {
    listas: {
      barros: ['Luna', 'Marte', 'Blanco CT', 'Blanco Impalpable', 'Negro'],
      esmaltes: ['Celadón', 'Azul cobalto', 'Blanco satinado', 'Óxido de hierro', 'Tenmoku'],
      estados: ['Modelando', 'Secando', 'Bizcochado', 'Esmaltado', 'Terminado', 'Fallido'],
      tecnicas: ['Torno', 'Pellizco', 'Churros', 'Planchas', 'Molde'],
      aplicacion: ['Inmersión', 'Pincel', 'Aspersión', 'Vertido'],
      coccion: ['Baja (≈1000 °C)', 'Media (≈1150 °C)', 'Alta (≈1250 °C)'],
      hornos: ['Taller'],
      defectos: ['Escurrido', 'Burbujas', 'Craquelado', 'Pinhole', 'Grieta', 'Alabeo', 'Se pegó a la placa', 'Color inesperado'],
      etiquetasIdeas: ['Taza', 'Plato', 'Cuenco', 'Jarrón', 'Textura', 'Color', 'Forma'],
    },
    proyectos: [
      P('p1', '2026-10-02', 'Taza de desayuno', 'Terminado', 'Torno', 'Luna', ['Celadón'], { valoracion: '5', hariaDistinto: 'Dejar 3 mm sin esmaltar en la base: se pegó un poco a la placa.', notas: 'Paredes de 5 mm. Secado lento con plástico 3 días.' }, 'taza', '#e8dccb', ['Crudo', 'Bizcocho', 'Terminado']),
      P('p2', '2026-10-15', 'Cuenco de ramen', 'Terminado', 'Torno', 'Negro', ['Blanco satinado', 'Óxido de hierro'], { valoracion: '4', defectos: ['Escurrido'], hariaDistinto: 'La segunda capa más fina: escurrió en el borde inferior.' }, 'cuenco', '#d9cbb8', ['Bizcocho', 'Terminado']),
      P('p3', '2026-11-04', 'Jarrón estriado', 'Esmaltado', 'Churros', 'Marte', ['Azul cobalto'], {}, 'jarron', '#efe4d4', ['Crudo']),
      P('p4', '2026-11-08', 'Plato llano', 'Bizcochado', 'Planchas', 'Blanco CT', [], {}, 'plato', '#dfd2c0', ['Bizcocho']),
      P('p5', '2026-09-20', 'Taza espresso', 'Fallido', 'Pellizco', 'Blanco Impalpable', ['Celadón'], { valoracion: '1', defectos: ['Grieta'], hariaDistinto: 'Se secó demasiado rápido junto a la ventana. Tapar con plástico los primeros días.' }, 'taza', '#e4d6c4', ['Terminado']),
      P('p6', '2026-09-28', 'Cuenco pequeño', 'Terminado', 'Pellizco', 'Luna', ['Azul cobalto'], { valoracion: '4' }, 'cuenco', '#ece2d3', ['Terminado']),
      P('p7', '2026-11-10', 'Taza alta', 'Secando', 'Torno', 'Negro', [], {}, 'taza', '#d6c6b2', ['Crudo']),
      P('p8', '2026-10-25', 'Jarrón para flores secas', 'Terminado', 'Torno', 'Blanco CT', ['Tenmoku'], { valoracion: '5', hariaDistinto: 'El tenmoku rompe precioso en los bordes: repetir con borde más marcado.' }, 'jarron', '#e6dccd', ['Terminado']),
    ],
    placas: [
      { id: 'pl1', fecha: '2026-10-20', creado: '2026-10-20', titulo: 'Celadón sobre Negro', barro: 'Negro', esmaltes: ['Celadón'], capas: '2', aplicacion: 'Inmersión', coccion: 'Alta (≈1250 °C)', horno: 'Taller', valoracion: '3', defectos: [], notas: '', hariaDistinto: 'Se oscurece muchísimo. Mejor sobre barro claro.', fotos: [{ id: pieza('plato', 'Negro', ['Celadón'], '#e3d7c6'), fase: 'Después de cocer' }] },
    ],
    ideas: [
      { id: 'i1', creado: '2026-11-01', titulo: 'Tazas con textura de corteza', texto: 'Marcar la superficie con una corteza real antes de que esté de cuero. Esmalte transparente para que se vea la textura.', links: ['https://www.pinterest.com/pin/123456789/'], etiquetas: ['Taza', 'Textura'], fotos: [{ id: pieza('taza', 'Marte', ['Tenmoku'], '#e9dfd1') }], proyectoId: '' },
      { id: 'i2', creado: '2026-11-06', titulo: 'Esmalte que cambie de color en el borde', texto: 'Buscar esmaltes que rompan en los cantos. Probar primero en placa.', links: [], etiquetas: ['Color'], fotos: [], proyectoId: '' },
      { id: 'i3', creado: '2026-10-12', titulo: 'Set de platos para cuatro', texto: '', links: ['https://www.pinterest.com/pin/987654321/', 'https://www.instagram.com/p/abc123/'], etiquetas: ['Plato'], fotos: [{ id: pieza('plato', 'Luna', ['Blanco satinado'], '#ddd0bd') }], proyectoId: '' },
    ],
  };
  return {
    getTodo: () => db,
    guardar(clave, o) {
      const ahora = new Date().toISOString();
      if (!o.id) { o.id = Math.random().toString(36).slice(2, 10); o.creado = ahora; }
      o.actualizado = ahora;
      const a = db[clave], i = a.findIndex(x => x.id === o.id);
      if (i >= 0) a[i] = o; else a.push(o);
      return o;
    },
    borrar(clave, id) { db[clave] = db[clave].filter(x => x.id !== id); return true; },
    subirFoto: dataUrl => dataUrl,
    anadirALista(l, v) { (db.listas[l] = db.listas[l] || []).includes(v) || db.listas[l].push(v); return db.listas; },
  };
})();

/* =========================================================
   Arranque
   ========================================================= */
function pantallaPin(error = '') {
  $('#app').innerHTML = `<div class="loading login">
    <p class="eyebrow">Taller de cerámica</p>
    <h1 class="display">Mi <em>taller</em></h1>
    <form id="fpin">
      <input id="pin" class="inp" type="password" inputmode="numeric" autocomplete="current-password" placeholder="PIN" aria-label="PIN">
      <button class="btn primary" type="submit">Entrar</button>
    </form>
    ${error ? `<p class="hint err">${esc(error)}</p>` : ''}</div>`;
  $('#pin').focus();
  $('#fpin').onsubmit = e => {
    e.preventDefault();
    PIN = $('#pin').value.trim();
    if (!PIN) return;
    store.set('taller-pin', PIN);
    init();
  };
}

async function init() {
  if (ES_GAS && !PIN) return pantallaPin();
  $('#app').innerHTML = `<div class="loading"><div class="kiln"></div><p>Encendiendo el horno…</p></div>`;
  try {
    DB = await api('getTodo');
    render();
  } catch (err) {
    const msg = err && err.message || String(err);
    if (!PIN || msg.includes('PIN') || msg.includes('intentos')) return pantallaPin(msg);
    $('#app').innerHTML = `<div class="loading"><h2>No se pudieron cargar los datos</h2>
      <p class="hint">${esc(msg)}</p><button class="btn ghost" onclick="init()">Reintentar</button></div>`;
  }
}
init();
