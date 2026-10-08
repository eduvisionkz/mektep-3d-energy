import './styles.css';
import { SceneApp } from './scene/SceneApp.js';
import { PHOTOS, PHOTO_GROUPS, LED_STEPS } from './data/schoolData.js';
import {
  renderAbout, renderResults, renderEnergyMap, renderCalculator, renderGallery, hotspotContent, modeSummary,
} from './ui/panels.js';
import { hideTip } from './ui/charts.js';
import { lampDay, fmt } from './model/energy.js';
import { MODEL, REAL } from './data/schoolData.js';

const $ = (s) => document.querySelector(s);
const stage = $('#stage');
const panel = $('#panel');
const panelBody = $('#panelBody');
const panelTitle = $('#panelTitle');

// ---------- орналасу айнымалылары ----------
function measure() {
  const brand = document.querySelector('.brand');
  const top = document.querySelector('.topbar');
  const note = $('#geoNote');
  const root = document.documentElement.style;
  root.setProperty('--brand-h', `${brand.offsetHeight}px`);
  root.setProperty('--top-h', `${top.offsetHeight}px`);
  root.setProperty('--note-h', `${note.offsetHeight}px`);
}
window.addEventListener('resize', measure);
measure();
document.fonts?.ready.then(measure);

// ---------- жүктеу ----------
const loader = $('#loader');
const setProgress = (p, label) => {
  $('#loadBar').style.width = `${Math.round(p * 100)}%`;
  $('#loadLabel').textContent = label;
};

// ---------- 3D ----------
let state = { mode: 'normal', ledPct: 100, dayHours: 8, view: 'exterior', room: null, panel: null };

const ROOM_ORDER = ['lobby', 'corridor', 'classA', 'math', 'computer', 'reading', 'primary', 'typ1', 'hall', 'canteen', 'sport'];

const app = new SceneApp(stage, {
  onProgress: setProgress,
  onFade: (on) => $('#fade').classList.toggle('on', on),
  onHotspot: (h) => showHotspot(h),
  onViewChange: (v) => { state.view = v; updateChrome(); },
  onRoomChange: (id) => { state.room = id; updateRoomNav(); },
  onHover: (h, x, y) => hoverTip(h, x, y),
});

const ctx = {
  goToRoom: (id) => { if (matchMedia('(max-width: 760px)').matches) closePanel(); app.goToRoom(id); },
  roomById: (id) => app.int?.byId[id],
  mode: () => state.mode,
  showLed: (pct) => { state.ledPct = nearestStep(pct); setMode('led'); $('#ledRange').value = LED_STEPS.indexOf(state.ledPct); app.setLedPct(state.ledPct); updateModeCard(); },
};
const nearestStep = (p) => LED_STEPS.reduce((a, b) => (Math.abs(b - p) < Math.abs(a - p) ? b : a), 0);

window.mektep3d = app; // тексеру мен отладка үшін
app.init().then(() => {
  loader.classList.add('done');
  setTimeout(() => loader.remove(), 500);
  buildRoomNav();
  setMode('normal');
  updateChrome();
  openFromHash();
}).catch((err) => {
  console.warn(err);
  loader.querySelector('.loader-card').innerHTML = `
    <p class="eyebrow">3D көрініс ашылмады</p>
    <p class="err">Бұл құрылғыда немесе браузерде WebGL қолжетімсіз. Зерттеу нәтижелері, калькулятор мен фотолар жұмыс істейді.</p>
    <button class="btn btn-primary" type="button" id="noGlOk">Панельдерді ашу</button>`;
  $('#noGlOk').addEventListener('click', () => { loader.remove(); openPanel('results'); });
});

// ---------- режимдер ----------
const MODE_NOTES = {
  normal: '',
  energy: 'Түстер тек салыстыру үшін; жылулық камера дерегі емес. Фойе, дәліз, акт залы мен асхана 141 шамға кірмейді.',
  led: 'Модельдік сценарий: 60 Вт → 12 Вт. 80% үнем тек жарықтандыру бөлігіне қатысты.',
  daylight: 'Модельдік сценарий: жарықты күніне 1–3 сағат аз қосу. Нақты сөндіру уақыты өлшенбеген. Терезеге жақын шамдар сұр түспен көрсетілді.',
};

function setMode(m) {
  state.mode = m;
  document.body.className = document.body.className.replace(/\bmode-\w+/g, '').trim() + ` mode-${m}`;
  document.querySelectorAll('#modes [data-mode]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === m)));
  app.setMode?.(m);
  updateModeCard();
  if (state.panel === 'hotspot') {/* панель өз күйін сақтайды */}
}

function updateModeCard() {
  const card = $('#modeCard');
  const m = state.mode;
  card.hidden = m === 'normal' && state.view === 'exterior';
  $('#mcLed').hidden = m !== 'led';
  $('#mcDay').hidden = m !== 'daylight';
  $('#mcEnergy').hidden = m !== 'energy';
  $('#modeSum').innerHTML = modeSummary(m, state.ledPct, state.dayHours);
  $('#modeNote').textContent = MODE_NOTES[m];
  $('#ledRange').setAttribute('aria-valuetext', `${state.ledPct}%`);
  document.querySelectorAll('#dayHours [data-h]').forEach((b) => b.classList.toggle('on', Number(b.dataset.h) === state.dayHours));
  updateRoomNav();
}

document.querySelectorAll('#modes [data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
$('#ledRange').addEventListener('input', (e) => { state.ledPct = LED_STEPS[Number(e.target.value)]; app.setLedPct?.(state.ledPct); updateModeCard(); });
document.querySelectorAll('#dayHours [data-h]').forEach((b) => b.addEventListener('click', () => { state.dayHours = Number(b.dataset.h); app.setDayHours?.(state.dayHours); updateModeCard(); }));

// ---------- бөлме навигациясы ----------
function roomKwh(r) {
  const n = r.role === 'sport' ? REAL.sportsHallLamps : r.role === 'classroom' ? REAL.lampsPerClassroom : 0;
  return n ? fmt(lampDay(n, MODEL.currentLampW, MODEL.hoursPerDay)) : '';
}
function buildRoomNav() {
  const nav = $('#roomNav');
  const rooms = ROOM_ORDER.map((id) => app.int.byId[id]).filter(Boolean);
  nav.innerHTML = `<p class="rn-title">Бөлмелер</p>${rooms
    .map((r) => `<button type="button" data-room="${r.id}"><span>${r.id === 'typ1' ? 'Типтік модуль ×3' : r.name}</span><small>${roomKwh(r)}</small></button>`)
    .join('')}<div class="rn-sep"></div>
    <button type="button" data-act="overview"><span>Жоғарыдан көру</span></button>
    <button type="button" data-act="exit"><span>Сыртқа шығу</span></button>`;
  nav.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.room) app.goToRoom(b.dataset.room);
    if (b.dataset.act === 'overview') app.showOverview();
    if (b.dataset.act === 'exit') app.exitSchool();
  });
}
function updateRoomNav() {
  const nav = $('#roomNav');
  const rid = state.room && state.room.startsWith('typ') ? 'typ1' : state.room;
  nav.querySelectorAll('[data-room]').forEach((b) => b.classList.toggle('on', b.dataset.room === rid));
  nav.querySelectorAll('[data-act="overview"]').forEach((b) => b.classList.toggle('on', state.view === 'overview'));
}

const HINTS = {
  exterior: 'Сүйреп айналдырыңыз · доңғалақ / екі саусақ — масштаб · кіреберісті басып ішке кіріңіз',
  walk: 'Сүйреп — айналаға қарау · еденді басу — жүру · W A S D · шам мен құрылғыны басыңыз',
  overview: 'Сүйреп айналдыру · бөлмені басып, ішіне түсіңіз',
};
function updateChrome() {
  const inside = state.view !== 'exterior';
  document.body.classList.toggle('inside', inside);
  $('#roomNav').hidden = !inside;
  $('#hint').textContent = HINTS[state.view] || '';
  const enter = document.querySelector('.dock-btn[data-act="enter"] span');
  enter.textContent = inside ? 'Фойеге оралу' : '3D мектепке кіру';
  updateModeCard();
  updateRoomNav();
  measure();
}

// ---------- панель ----------
const PANELS = {
  results: { title: 'Зерттеу нәтижелері', render: (b) => renderResults(b) },
  calc: { title: 'Модельдік калькулятор', render: (b) => renderCalculator(b, ctx) },
  photos: { title: 'Нақты фотолар', render: (b) => renderGallery(b, openPhoto) },
  about: { title: 'Жоба туралы', render: (b) => renderAbout(b) },
  energy: { title: 'Энергия картасы', render: (b) => renderEnergyMap(b, ctx) },
};

function openPanel(id, custom) {
  hideTip();
  state.panel = id;
  if (HASH_PANELS.includes(id)) setHash(id);
  if (custom) { panelTitle.textContent = custom.title; panelBody.innerHTML = custom.html; }
  else { panelTitle.textContent = PANELS[id].title; panelBody.innerHTML = ''; PANELS[id].render(panelBody); }
  panelBody.scrollTop = 0;
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  document.querySelectorAll('.dock-btn').forEach((b) => b.classList.toggle('on', b.dataset.act === id));
  wirePanelButtons();
}
// ---------- тікелей сілтемелер: #results, #calc, #photos, #about, #energy, #enter, #room-<id> ----------
const HASH_PANELS = ['results', 'calc', 'photos', 'about', 'energy'];
function setHash(h) {
  try { history.replaceState(null, '', h ? `#${h}` : location.pathname + location.search); } catch (e) { /* sandbox */ }
}
function openFromHash() {
  const h = (location.hash || '').replace('#', '');
  if (!h) return;
  if (HASH_PANELS.includes(h)) {
    if (h === 'energy') { setMode('energy'); app.showOverview(); }
    openPanel(h);
  } else if (h === 'enter') app.enterSchool();
  else if (h.startsWith('room-') && app.int?.byId[h.slice(5)]) app.enterSchool(h.slice(5));
}
window.addEventListener('hashchange', openFromHash);

function closePanel() {
  hideTip();
  if (HASH_PANELS.includes(state.panel)) setHash('');
  state.panel = null;
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  document.querySelectorAll('.dock-btn').forEach((b) => b.classList.remove('on'));
}
$('#panelClose').addEventListener('click', closePanel);
panelBody.addEventListener('scroll', hideTip, { passive: true });

function wirePanelButtons() {
  panelBody.querySelectorAll('[data-photos]').forEach((b) => b.addEventListener('click', () => {
    const groups = b.dataset.photos.split(',').filter(Boolean);
    const first = PHOTOS.find((p) => groups.includes(p.group));
    if (first) openPhoto(first.file, groups);
  }));
  panelBody.querySelectorAll('[data-lamp]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.lamp === 'led') { state.ledPct = 100; $('#ledRange').value = 4; app.setLedPct(100); setMode('led'); }
    else setMode('normal');
    panelBody.querySelectorAll('[data-lamp]').forEach((x) => x.classList.toggle('on', x === b));
  }));
  panelBody.querySelectorAll('[data-daylight]').forEach((b) => b.addEventListener('click', () => setMode('daylight')));
}

function showHotspot(h) {
  const c = hotspotContent(h, ctx);
  openPanel('hotspot', c);
}

// мобильді: панельді төмен сүйреп жабу
(() => {
  const head = panel.querySelector('.panel-head');
  let y0 = null;
  head.addEventListener('touchstart', (e) => { y0 = e.touches[0].clientY; }, { passive: true });
  head.addEventListener('touchmove', (e) => {
    if (y0 === null) return;
    const dy = Math.max(0, e.touches[0].clientY - y0);
    panel.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  head.addEventListener('touchend', (e) => {
    const dy = e.changedTouches[0].clientY - (y0 ?? 0);
    panel.style.transform = '';
    y0 = null;
    if (dy > 80) closePanel();
  });
})();

// ---------- төменгі мәзір ----------
document.querySelectorAll('.dock-btn').forEach((b) => b.addEventListener('click', () => {
  const act = b.dataset.act;
  if (act === 'enter') {
    if (state.view === 'exterior') app.enterSchool?.();
    else app.goToRoom?.('lobby');
    if (matchMedia('(max-width: 760px)').matches) closePanel();
    return;
  }
  if (act === 'energy') {
    setMode('energy');
    if (state.view !== 'overview' && app.int) app.showOverview();
  }
  if (state.panel === act) closePanel();
  else openPanel(act);
}));

// ---------- дерек түрлері ----------
$('#infoBtn').addEventListener('click', (e) => {
  const pop = $('#legendPop');
  pop.hidden = !pop.hidden;
  e.currentTarget.setAttribute('aria-expanded', String(!pop.hidden));
});
document.addEventListener('click', (e) => {
  const pop = $('#legendPop');
  if (!pop.hidden && !e.target.closest('#legendPop, #infoBtn')) { pop.hidden = true; $('#infoBtn').setAttribute('aria-expanded', 'false'); }
});
$('#geoNote').addEventListener('click', () => { $('#geoNote').classList.toggle('open'); measure(); });

// ---------- лайтбокс ----------
let lbList = [], lbIndex = 0;
function openPhoto(file, groups) {
  lbList = groups ? PHOTOS.filter((p) => groups.includes(p.group)) : PHOTOS;
  lbIndex = Math.max(0, lbList.findIndex((p) => p.file === file));
  showPhoto();
  $('#lightbox').hidden = false;
  $('#lbClose').focus();
}
function showPhoto() {
  const p = lbList[lbIndex];
  const img = $('#lbImg');
  img.src = `photos/full/${p.file}`;
  img.alt = p.caption;
  const g = PHOTO_GROUPS.find((x) => x.id === p.group);
  $('#lbCap').textContent = `${g ? g.name + ': ' : ''}${p.caption}`;
  $('#lbFile').textContent = `${p.file} · ${lbIndex + 1}/${lbList.length}`;
}
const lbStep = (d) => { lbIndex = (lbIndex + d + lbList.length) % lbList.length; showPhoto(); };
$('#lbPrev').addEventListener('click', () => lbStep(-1));
$('#lbNext').addEventListener('click', () => lbStep(1));
$('#lbClose').addEventListener('click', () => ($('#lightbox').hidden = true));
$('#lbImg').addEventListener('error', () => { $('#lbCap').textContent = 'Фото жүктелмеді. Файл жолын тексеріңіз.'; });
(() => {
  let x0 = null;
  const lb = $('#lightbox');
  lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) lbStep(dx < 0 ? 1 : -1); x0 = null; });
})();

document.addEventListener('keydown', (e) => {
  const lb = $('#lightbox');
  if (!lb.hidden) {
    if (e.key === 'Escape') lb.hidden = true;
    if (e.key === 'ArrowRight') lbStep(1);
    if (e.key === 'ArrowLeft') lbStep(-1);
    e.stopPropagation();
    return;
  }
  if (e.key === 'Escape') { $('#legendPop').hidden = true; closePanel(); }
}, true);

// ---------- hover tooltip ----------
const HOVER_NAMES = {
  lamp: 'Шам — басыңыз', lampExtra: 'Шам (141-ге кірмейді)', computer: 'Ноутбук / компьютер', board: 'Интерактивті панель',
  projector: 'Проектор / экран', tv: 'Қабырғадағы экран', panel: 'Панельдік құрылғы', kitchen: 'Асүй жабдығы',
  speaker: 'Дыбыс колонкасы', window: 'Терезе · табиғи жарық', enter: 'Ішке кіру', exit: 'Сыртқа шығу',
};
function hoverTip(h, x, y) {
  const t = $('#hoverTip');
  if (!h) { t.hidden = true; return; }
  t.textContent = HOVER_NAMES[h.kind] || h.title || '';
  t.hidden = false;
  t.style.left = `${x + 14}px`;
  t.style.top = `${y + 12}px`;
}
