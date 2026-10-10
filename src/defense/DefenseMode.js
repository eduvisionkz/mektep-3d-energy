// Ғылыми жобаны қорғау режимі: 3D мектеп ішіндегі басқарылатын экскурсия (10 кезең).
// Сайттың өз 3D сахнасы мен есептері қолданылады; бөлек сайт емес.
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { STAGES, SHOTS, NUM, SCENARIOS } from './stages.js';
import { REAL, MODEL, PROJECT } from '../data/schoolData.js';
import { lampDay, mixedDay, savingPct, fmt, fmtInt } from '../model/energy.js';

const STORE_KEY = 'mektep-defense-meta';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const { currentLampW: P0, ledLampW: P1, hoursPerDay: H, daysPerYear: DY } = MODEL;

const DEFAULT_META = {
  author: `${PROJECT.author}, ${PROJECT.grade}`,
  advisor: PROJECT.advisor,
  school: `${PROJECT.school}, ${PROJECT.region}`,
};
function loadMeta() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { /* жеке терезе */ }
  const m = { ...DEFAULT_META };
  for (const k of Object.keys(m)) if (typeof saved[k] === 'string' && saved[k].trim()) m[k] = saved[k];
  return m;
}
function saveMeta(m) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(m)); } catch (e) { /* жеке терезе */ }
}

/** Санды жұмсақ өзгерту */
function countTo(el, to, digits = 2, dur = 650) {
  if (!el) return;
  const from = Number(el.dataset.v ?? 0);
  el.dataset.v = to;
  if (reduced() || dur === 0) { el.textContent = fmt(to, digits); return; }
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(from + (to - from) * e, digits);
    if (k < 1 && el.dataset.v == to) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const tex = (src) => katex.renderToString(src, {
  throwOnError: false,
  output: 'html',
  displayMode: true,
  trust: (c) => c.command === '\\htmlClass',
  strict: false,
});

const badge = (t) => ({
  real: '<span class="dbadge b-real">● Нақты мектеп дерегі</span>',
  model: '<span class="dbadge b-model">◇ Модельдік есептеу</span>',
  photo: '<span class="dbadge b-photo">◐ Фотобақылау</span>',
  calc: '<span class="dbadge b-model">◇ Есептік эксперимент</span>',
}[t]);

const MODEL_NOTE = '<p class="dnote dnote-strong">Бұл — модельдік есептеу, нақты өлшеу нәтижесі емес.</p>';

export class DefenseMode {
  /**
   * @param {object} o
   * @param {import('../scene/SceneApp.js').SceneApp} o.app
   * @param {object} o.site — сайттың функциялары: setMode, openPanel, closePanel, setHash, restoreSceneState
   */
  constructor({ app, site }) {
    this.app = app;
    this.site = site;
    this.i = 0;
    this.open = false;
    this.free = false;
    this.meta = loadMeta();
    this.build();
    this.onKey = this.onKey.bind(this);
    window.addEventListener('resize', () => this.layout());
  }

  // ---------------- DOM ----------------
  build() {
    const root = document.createElement('div');
    root.id = 'defense';
    root.className = 'df';
    root.hidden = true;
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Ғылыми жобаны қорғау режимі');
    root.innerHTML = `
      <header class="df-top">
        <div class="df-brand"><span class="df-eyebrow">Ғылыми жобаны қорғау</span><span class="df-ttl">Электр энергиясын үнемдеудің математикалық моделі</span></div>
        <nav class="df-steps" aria-label="Қорғау кезеңдері">
          ${STAGES.map((s, k) => `<button type="button" data-go="${k}" title="${k + 1}. ${esc(s.short)}"><b>${k + 1}</b><span>${esc(s.short)}</span></button>`).join('')}
        </nav>
        <div class="df-tools">
          <button type="button" data-act="free" aria-pressed="false" title="Еркін 3D режимі (E)">Еркін 3D</button>
          <button type="button" data-act="fs" title="Толық экран (F)">Толық экран</button>
          <button type="button" data-act="end" class="df-end" title="Қорғауды аяқтап, сайтқа оралу">Қорғауды аяқтау</button>
        </div>
      </header>
      <section class="df-card" aria-live="polite">
        <div class="df-card-head">
          <p class="df-count"><span id="dfNum">1</span> / ${STAGES.length}</p>
          <p class="df-eb" id="dfEyebrow"></p>
        </div>
        <h2 class="df-h" id="dfTitle"></h2>
        <div class="df-body" id="dfBody"></div>
      </section>
      <footer class="df-bottom">
        <button type="button" class="df-nav" data-act="prev" aria-label="Артқа">‹ Артқа</button>
        <div class="df-progress" aria-hidden="true"><i id="dfBar"></i></div>
        <p class="df-foot">Схемалық 3D модель · барлық сан — модельдік есептеу немесе мектеп дерегі</p>
        <button type="button" class="df-nav df-next" data-act="next" aria-label="Келесі">Келесі ›</button>
      </footer>
      <div class="df-freebar">
        <button type="button" data-act="prev" aria-label="Артқа">‹</button>
        <span id="dfFreeLabel"></span>
        <button type="button" data-act="next" aria-label="Келесі">›</button>
        <button type="button" data-act="free" class="df-freeback">Қорғау экранына оралу</button>
        <button type="button" data-act="end" class="df-end">Аяқтау</button>
      </div>
      <div class="df-toast" id="dfToast" hidden></div>`;
    document.getElementById('app').appendChild(root);
    this.root = root;
    this.el = {
      body: root.querySelector('#dfBody'), title: root.querySelector('#dfTitle'), eyebrow: root.querySelector('#dfEyebrow'),
      num: root.querySelector('#dfNum'), bar: root.querySelector('#dfBar'), card: root.querySelector('.df-card'),
      freeLabel: root.querySelector('#dfFreeLabel'), toast: root.querySelector('#dfToast'),
    };
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act], [data-go]');
      if (!b || !root.contains(b)) return;
      if (b.dataset.go !== undefined) return this.go(Number(b.dataset.go));
      const a = b.dataset.act;
      if (a === 'next') this.next();
      if (a === 'prev') this.prev();
      if (a === 'free') this.toggleFree();
      if (a === 'fs') this.toggleFullscreen();
      if (a === 'end') this.close();
    });
    document.addEventListener('fullscreenchange', () => {
      const on = !!document.fullscreenElement;
      root.querySelector('[data-act="fs"]').textContent = on ? 'Толық экраннан шығу' : 'Толық экран';
      setTimeout(() => this.layout(), 120);
    });
  }

  // ---------------- ашу / жабу ----------------
  start(index = 0) {
    if (!this.open) {
      this.open = true;
      this.root.hidden = false;
      document.body.classList.add('defense');
      this.site.closePanel();
      this.app.ignoreArrows = true;
      window.addEventListener('keydown', this.onKey, true);
      this.checkPerformance();
    }
    this.go(index, true);
  }

  close() {
    if (!this.open) return;
    this.open = false;
    window.removeEventListener('keydown', this.onKey, true);
    this.root.hidden = true;
    document.body.classList.remove('defense', 'df-free');
    this.free = false;
    this.app.ignoreArrows = false;
    this.app.setFrameShift(0);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    this.site.restoreSceneState();
    this.site.setHash('');
    this.app.showShot?.(SHOTS.heroOrbit);
  }

  // ---------------- навигация ----------------
  next() { if (this.i < STAGES.length - 1) this.go(this.i + 1); }
  prev() { if (this.i > 0) this.go(this.i - 1); }

  go(i, force) {
    i = Math.max(0, Math.min(STAGES.length - 1, i));
    if (i === this.i && !force) return;
    clearTimeout(this.tourTimer);
    this.i = i;
    const st = STAGES[i];
    this.root.dataset.stage = st.id;
    this.el.num.textContent = i + 1;
    this.el.eyebrow.textContent = st.eyebrow;
    this.el.title.textContent = st.title;
    this.el.bar.style.width = `${((i + 1) / STAGES.length) * 100}%`;
    this.el.freeLabel.textContent = `${i + 1} / ${STAGES.length} · ${st.short}`;
    this.root.querySelectorAll('.df-steps [data-go]').forEach((b, k) => {
      b.classList.toggle('on', k === i);
      b.classList.toggle('done', k < i);
      if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    this.root.querySelector('.df-bottom [data-act="prev"]').disabled = i === 0;
    this.root.querySelector('.df-bottom [data-act="next"]').disabled = i === STAGES.length - 1;
    // 3D: сахна режимі мен камера
    this.applyScene(st.scene);
    this.el.card.classList.remove('enter');
    void this.el.card.offsetWidth;
    this.el.card.classList.add('enter');
    this.el.body.innerHTML = '';
    this.renderers[st.id].call(this, this.el.body, st);
    this.el.body.scrollTop = 0;
    if (st.id === 'product' && !this.free) { /* 9-кезең: карточкадағы батырмалар арқылы еркін басқару */ }
    this.layout();
    if (!st.tour) this.app.showShot?.(SHOTS[st.shot]);
    this.site.setHash(`defense-${i + 1}`);
  }

  applyScene(sc = {}) {
    const a = this.app;
    if (!a.setMode) return;
    if (sc.ledPct !== undefined) a.ledPct = sc.ledPct;
    if (sc.hours !== undefined) a.dayHours = sc.hours;
    a.setMode(sc.mode || 'normal');
  }

  layout() {
    if (!this.open) return;
    const wide = innerWidth > 900;
    const cardVisible = !this.free && wide;
    const w = cardVisible ? this.el.card.getBoundingClientRect().width : 0;
    this.app.setFrameShift?.(cardVisible ? Math.round((w + 16) / 2) : 0);
  }

  // ---------------- құралдар ----------------
  toggleFree(force) {
    this.free = force ?? !this.free;
    document.body.classList.toggle('df-free', this.free);
    this.root.querySelector('.df-tools [data-act="free"]').setAttribute('aria-pressed', String(this.free));
    if (this.free) this.site.syncFromScene?.();
    else this.site.closePanel();
    this.layout();
  }

  toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => this.toast('Толық экран бұл браузерде рұқсат етілмеген. F11 пернесін басып көріңіз.'));
  }

  toast(msg, ms = 3200) {
    const t = this.el.toast;
    t.textContent = msg; t.hidden = false;
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => (t.hidden = true), ms);
  }

  /** Баяу құрылғы: алғашқы ~1,5 с ішінде FPS өлшеп, жеңіл режимді қосу */
  checkPerformance() {
    if (!this.app.renderer || this.app.lowPower) return;
    let frames = 0; const t0 = performance.now();
    const count = (now) => {
      frames++;
      if (now - t0 < 1500) return requestAnimationFrame(count);
      const fps = (frames * 1000) / (now - t0);
      if (fps < 24) {
        this.app.setLowPower(true);
        this.toast('3D баяу жұмыс істеп тұр — жеңіл режим қосылды: камера бірден ауысады, сапа сәл төмендеді.', 5000);
      }
    };
    requestAnimationFrame(count);
  }

  onKey(e) {
    if (!this.open) return;
    const t = e.target;
    // ползунок фокуста болса да, көрсеткілер кезеңді ауыстырады (ползунок тінтуірмен басқарылады)
    const typing = t && (t.isContentEditable || /^(TEXTAREA|SELECT)$/.test(t.tagName)
      || (t.tagName === 'INPUT' && !/^(range|checkbox|radio|button)$/.test(t.type)));
    if (t && t.tagName === 'INPUT' && t.type === 'range' && /^Arrow(Left|Right)$/.test(e.key)) t.blur();
    const k = e.key;
    if (k === 'PageDown') { e.preventDefault(); return this.next(); }
    if (k === 'PageUp') { e.preventDefault(); return this.prev(); }
    if (typing) return;
    if (k === 'ArrowRight' || (k === ' ' && t.tagName !== 'BUTTON')) { e.preventDefault(); e.stopPropagation(); return this.next(); }
    if (k === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); return this.prev(); }
    if (k === 'Home') { e.preventDefault(); return this.go(0); }
    if (k === 'End') { e.preventDefault(); return this.go(STAGES.length - 1); }
    if (/^[0-9]$/.test(k)) { e.preventDefault(); return this.go(k === '0' ? 9 : Number(k) - 1); }
    const lk = k.toLowerCase();
    if (lk === 'e' || lk === 'у') { e.preventDefault(); return this.toggleFree(); }
    if (lk === 'f' || lk === 'а') { e.preventDefault(); return this.toggleFullscreen(); }
    if (k === 'Escape') {
      if (this.free) { e.stopPropagation(); return this.toggleFree(false); }
    }
  }

  // ---------------- кезеңдердің визуалы ----------------
  renderers = {
    intro(body) {
      const m = this.meta;
      const field = (k, ph) => `<span class="dmeta-v" contenteditable="true" spellcheck="false" data-k="${k}" data-ph="${esc(ph)}">${esc(m[k] || '')}</span>`;
      body.innerHTML = `
        <p class="dlead">Мектептің жарықтандыру жүйесі бойынша есептік-имитациялық зерттеу және оның практикалық өнімі — интерактивті 3D мектеп.</p>
        <dl class="dmeta">
          <dt>Автор</dt><dd>${field('author', '[автордың аты-жөні, сыныбы]')}</dd>
          <dt>Ғылыми жетекші</dt><dd>${field('advisor', '[жетекшінің аты-жөні]')}</dd>
          <dt>Мектеп</dt><dd>${field('school', '[мектеп атауы]')}</dd>
        </dl>
`;
      body.querySelectorAll('.dmeta-v').forEach((f) => {
        f.addEventListener('input', () => { this.meta[f.dataset.k] = f.textContent.trim(); saveMeta(this.meta); });
        f.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); f.blur(); } });
      });
    },

    relevance(body) {
      const b = NUM.bills;
      const max = 1_200_000;
      const bar = (name, r, mid, cls) => `
        <div class="drange">
          <span class="drange-n">${name}</span>
          <div class="drange-track">
            <i class="drange-bar ${cls}" style="--l:${(r.min / max) * 100}%;--w:${((r.max - r.min) / max) * 100}%"></i>
            <i class="drange-mid" style="--x:${(mid / max) * 100}%"></i>
          </div>
          <span class="drange-v">${fmtInt(r.min)}–${fmtInt(r.max)} ₸</span>
        </div>`;
      body.innerHTML = `
        <p class="dlead">Электр энергиясы жарықтандыруға, компьютерлерге, интерактивті тақталарға және басқа құрылғыларға жұмсалады.</p>
        <div class="dchart">
          <p class="dchart-t">Айлық электр төлемі ${badge('real')}</p>
          ${bar('Қыс', b.winter, b.wMid, 'c-winter')}
          ${bar('Жаз', b.summer, b.sMid, 'c-summer')}
          <div class="daxis"><span>0</span><span>0,4 млн</span><span>0,8 млн</span><span>1,2 млн ₸</span></div>
        </div>
        <div class="dstats">
          <div><b>≈ ${fmt(b.ratio)}</b><span>есе — орта нүктелер қатынасы (${fmtInt(b.wMid)} / ${fmtInt(b.sMid)} ₸)</span></div>
        </div>
        <p class="dnote">Бұл айырманың бәрі жарықтандырудан деп айтылмайды: төлемге басқа жүктемелер мен маусымдық факторлар да әсер етеді.</p>`;
      requestAnimationFrame(() => body.querySelectorAll('.drange-bar').forEach((x) => x.classList.add('go')));
    },

    goal(body) {
      const steps = ['Деректер', 'Модель', 'Есептеу', 'Салыстыру', '3D өнім'];
      body.innerHTML = `
        <div class="dflow" role="list">${steps.map((s, k) => `<div class="dflow-n" role="listitem" style="--d:${k * 0.45}s"><b>${k + 1}</b>${s}</div>${k < steps.length - 1 ? `<i class="dflow-a" style="--d:${k * 0.45 + 0.25}s" aria-hidden="true">→</i>` : ''}`).join('')}</div>
        <div class="dbox"><h3>Мақсат</h3><p>Мектептің жарықтандыру жүйесі үшін математикалық модель құрып, энергияны үнемдеу сценарийлерін салыстыру.</p></div>
        <div class="dbox"><h3>Болжам</h3><p>Шамдардың қуаты мен жұмыс уақытын өзгерту арқылы тұтынуды алдын ала есептеп, тиімді шешімді анықтауға болады.</p></div>
        <ul class="dtasks"><li>Нақты деректерді жинау</li><li>Формула құру</li><li>Сценарийлерді есептеу</li><li>Нәтижені 3D-де көрсету</li></ul>`;
    },

    object(body, st) {
      const items = [
        ['classrooms', REAL.classrooms, 'оқу кабинеті'],
        ['sport', REAL.sportsHalls, 'спортзал'],
        ['shifts', REAL.shifts, 'ауысым'],
        ['clLamps', NUM.classroomLamps, `кабинет шамы (${REAL.classrooms} × ${REAL.lampsPerClassroom})`],
        ['spLamps', REAL.sportsHallLamps, 'спортзал шамы'],
        ['total', NUM.N, 'барлық шам'],
      ];
      body.innerHTML = `
        <div class="dtour" role="group" aria-label="Камера маршруты">${st.tour.map((t, k) => `<button type="button" data-tour="${k}">${t.label}</button>`).join('')}</div>
        <div class="dnums">${items.map(([id, v, l]) => `<div class="dnum" data-id="${id}"><b>${v}</b><span>${l}</span></div>`).join('')}</div>
        <p class="ddev">Құрылғылар: <b>${REAL.computers}</b> компьютер · <b>${REAL.projectors}</b> проектор · <b>${REAL.interactiveBoards}</b> интерактивті тақта ${badge('real')}</p>
        <p class="dnote">3D-де 21 кабинеттің 8-і көрсетілген; кеңістік фотолар негізінде схемалық түрде жасалған.</p>`;
      const show = (k) => {
        clearTimeout(this.tourTimer);
        const t = st.tour[k];
        body.querySelectorAll('[data-tour]').forEach((b, j) => b.classList.toggle('on', j === k));
        body.querySelectorAll('.dnum').forEach((n) => n.classList.toggle('hl', t.hl.includes(n.dataset.id)));
        this.app.showShot?.(SHOTS[t.shot]);
        if (k < st.tour.length - 1 && !this.app.lowPower) this.tourTimer = setTimeout(() => this.i === STAGES.indexOf(st) && show(k + 1), 6500);
      };
      body.querySelectorAll('[data-tour]').forEach((b) => b.addEventListener('click', () => show(Number(b.dataset.tour))));
      show(0);
    },

    model(body) {
      const cls = (c, x) => `\\htmlClass{fv fv-${c}}{${x}}`;
      const W = `${cls('W', 'W')} = \\frac{\\sum_{i} ${cls('P', 'P_i')} \\cdot ${cls('n', 'n_i')} \\cdot ${cls('t', 't_i')}}{1000}`;
      const E = `${cls('E', 'E')} = ${cls('W0', 'W_0')} - ${cls('W1', 'W_1')}`;
      const Q = `${cls('q', 'q')} = \\frac{${cls('W0', 'W_0')} - ${cls('W1', 'W_1')}}{${cls('W0', 'W_0')}} \\cdot 100\\%`;
      const r = NUM.base;
      const EXPL = {
        W: ['W', 'электр энергиясы, кВт·сағ. 1000-ға бөлу Вт·сағ-ты кВт·сағ-қа айналдырады.', 'calc'],
        P: ['Pᵢ', `бір құрылғының қуаты, Вт. Модельде ${P0} Вт (қазіргі шам) және ${P1} Вт (LED).`, 'model'],
        n: ['nᵢ', `құрылғылар саны: ${REAL.classrooms} × ${REAL.lampsPerClassroom} + ${REAL.sportsHallLamps} = ${NUM.N} шам.`, 'real'],
        t: ['tᵢ', `тәуліктік жұмыс уақыты, сағ. Модельде ${H} сағ.`, 'model'],
        W0: ['W₀', `бастапқы тұтыну: ${NUM.N} · ${P0} · ${H} / 1000 = ${fmt(r.cur.day)} кВт·сағ/тәул.`, 'calc'],
        W1: ['W₁', `жаңа тұтыну (LED): ${NUM.N} · ${P1} · ${H} / 1000 = ${fmt(r.led.day)} кВт·сағ/тәул.`, 'calc'],
        E: ['E', `үнемделген энергия: ${fmt(r.cur.day)} − ${fmt(r.led.day)} = ${fmt(r.sav.day)} кВт·сағ/тәул.`, 'calc'],
        q: ['q', `пайыздық үнем: ${fmt(r.sav.day)} / ${fmt(r.cur.day)} · 100% = ${fmt(r.pct, 0)}%.`, 'calc'],
      };
      body.innerHTML = `
        <div class="dformulas">
          <div class="dformula">${tex(W)}</div>
          <div class="dformula">${tex(E)}</div>
          <div class="dformula">${tex(Q)}</div>
        </div>
        <div class="dvars" role="group" aria-label="Айнымалылар">${Object.entries(EXPL).map(([k, [sym]]) => `<button type="button" data-v="${k}">${sym}</button>`).join('')}</div>
        <p class="dexpl" id="dExpl" aria-live="polite"></p>
        <p class="dnote">Формуладағы әріпті немесе төмендегі белгіні басыңыз — мағынасы шығады.</p>`;
      const ex = body.querySelector('#dExpl');
      const pick = (k) => {
        const [sym, txt, type] = EXPL[k];
        ex.innerHTML = `<b class="dexpl-s">${sym}</b> — ${esc(txt)} ${badge(type === 'real' ? 'real' : 'model')}`;
        body.querySelectorAll('.fv').forEach((n) => n.classList.toggle('on', n.classList.contains(`fv-${k}`)));
        body.querySelectorAll('[data-v]').forEach((b) => b.classList.toggle('on', b.dataset.v === k));
      };
      body.querySelectorAll('[data-v]').forEach((b) => { b.addEventListener('click', () => pick(b.dataset.v)); b.addEventListener('mouseenter', () => pick(b.dataset.v)); });
      body.querySelectorAll('.fv').forEach((n) => {
        const k = [...n.classList].find((c) => c.startsWith('fv-')).slice(3);
        n.setAttribute('tabindex', '0'); n.setAttribute('role', 'button');
        n.addEventListener('click', () => pick(k)); n.addEventListener('mouseenter', () => pick(k));
        n.addEventListener('keydown', (e) => { if (e.key === 'Enter') pick(k); });
      });
      pick('W');
    },

    led(body) {
      const base = NUM.base.cur;
      body.innerHTML = `
        <div class="dseg" role="group" aria-label="Шам түрі">
          <button type="button" data-led="0">60 Вт шам</button>
          <button type="button" data-led="100">LED 12 Вт</button>
        </div>
        <label class="dslider" for="dLedPct"><span>LED үлесі: <b id="dLedOut">0%</b></span>
          <input id="dLedPct" type="range" min="0" max="4" step="1" value="0">
          <span class="dticks" aria-hidden="true"><span>0</span><span>25</span><span>50</span><span>75</span><span>100%</span></span></label>
        <div class="dkpis">
          <div><span>Тәулігіне</span><b><i data-k="day">${fmt(base.day)}</i></b><small>кВт·сағ</small></div>
          <div><span>170 оқу күні</span><b><i data-k="year">${fmt(base.year)}</i></b><small>кВт·сағ</small></div>
          <div class="kpi-acc"><span>Үнем</span><b><i data-k="sav">0,00</i></b><small><i data-k="pct">0</i>% · кВт·сағ/жыл</small></div>
        </div>
        <div class="dbars">
          <div class="dbar-row"><span>Бастапқы · 60 Вт</span><div class="dbar-track"><i class="dbar c-cur" style="--w:100%"></i></div><b>${fmt(base.year)}</b></div>
          <div class="dbar-row"><span>Таңдалған режим</span><div class="dbar-track"><i class="dbar c-led" id="dLedBar" style="--w:100%"></i></div><b id="dLedYear">${fmt(base.year)}</b></div>
        </div>
        <p class="dunit">кВт·сағ / 170 оқу күні · ${NUM.N} шам · 10 сағ/тәул</p>
        ${MODEL_NOTE}`;
      const steps = [0, 25, 50, 75, 100];
      const set = (pct) => {
        this.app.ledPct = pct; this.app.setMode?.('led');
        const day = mixedDay(NUM.N, pct, P0, P1, H);
        const year = day * DY;
        body.querySelector('#dLedOut').textContent = `${pct}% (${Math.round((NUM.N * pct) / 100)} LED)`;
        body.querySelector('#dLedPct').value = steps.indexOf(pct);
        countTo(body.querySelector('[data-k="day"]'), day);
        countTo(body.querySelector('[data-k="year"]'), year);
        countTo(body.querySelector('[data-k="sav"]'), base.year - year);
        countTo(body.querySelector('[data-k="pct"]'), savingPct(base.day, day), 0);
        countTo(body.querySelector('#dLedYear'), year);
        body.querySelector('#dLedBar').style.setProperty('--w', `${(year / base.year) * 100}%`);
        body.querySelectorAll('[data-led]').forEach((b) => b.classList.toggle('on', Number(b.dataset.led) === pct));
      };
      body.querySelectorAll('[data-led]').forEach((b) => b.addEventListener('click', () => set(Number(b.dataset.led))));
      body.querySelector('#dLedPct').addEventListener('input', (e) => set(steps[Number(e.target.value)]));
      body.querySelectorAll('[data-k]').forEach((n) => (n.dataset.v = n.textContent.replace(/\s/g, '').replace(',', '.')));
      set(0);
    },

    hours(body) {
      const rows = NUM.hours;
      const max = rows[0].curDay;
      body.innerHTML = `
        <label class="dslider" for="dHours"><span>Жарықтандыру уақыты: <b id="dHoursOut">10 сағ</b></span>
          <input id="dHours" type="range" min="7" max="10" step="1" value="10">
          <span class="dticks" aria-hidden="true"><span>7</span><span>8</span><span>9</span><span>10 сағ</span></span></label>
        <div class="dbars dbars-h">${rows.map((r) => `
          <div class="dbar-row" data-h="${r.h}"><span>${r.h} сағ</span><div class="dbar-track"><i class="dbar c-cur" style="--w:${(r.curDay / max) * 100}%"></i></div><b>${fmt(r.curDay)}</b></div>`).join('')}
        </div>
        <p class="dunit">60 Вт шамдар · ${NUM.N} шам · кВт·сағ/тәулік</p>
        <div class="dkpis">
          <div><span>Тәулігіне</span><b><i data-k="day">${fmt(max)}</i></b><small>кВт·сағ</small></div>
          <div class="kpi-acc"><span>Үнем (10 сағ-пен)</span><b><i data-k="pct">0</i>%</b><small>жарықтандыру моделі</small></div>
          <div><span>170 оқу күні</span><b><i data-k="year">${fmt(rows[0].curYear)}</i></b><small>кВт·сағ</small></div>
        </div>
        <p class="dnote">Іс жүзінде жарықты азайту кабинеттегі қажетті жарық деңгейін төмендетпеуі тиіс. Бұл — есептік сценарий.</p>`;
      body.querySelectorAll('[data-k]').forEach((n) => (n.dataset.v = n.textContent.replace(/\s/g, '').replace(',', '.')));
      const set = (h) => {
        const r = rows.find((x) => x.h === h);
        this.app.dayHours = h; this.app.setMode?.('daylight');
        body.querySelector('#dHoursOut').textContent = `${h} сағ`;
        body.querySelectorAll('.dbar-row[data-h]').forEach((x) => x.classList.toggle('sel', Number(x.dataset.h) === h));
        countTo(body.querySelector('[data-k="day"]'), r.curDay);
        countTo(body.querySelector('[data-k="pct"]'), r.curPct, 0);
        countTo(body.querySelector('[data-k="year"]'), r.curYear);
      };
      body.querySelector('#dHours').addEventListener('input', (e) => set(Number(e.target.value)));
      body.querySelectorAll('.dbar-row[data-h]').forEach((x) => x.addEventListener('click', () => { body.querySelector('#dHours').value = x.dataset.h; set(Number(x.dataset.h)); }));
      set(10);
    },

    compare(body) {
      const max = SCENARIOS[0].year;
      body.innerHTML = `
        <div class="dscen" role="group" aria-label="Сценарийлер">${SCENARIOS.map((s, k) => `
          <button type="button" class="dscen-row" data-s="${k}">
            <span class="dscen-l"><b>${k + 1}</b>${s.label}</span>
            <span class="dbar-track"><i class="dbar ${k === 0 ? 'c-cur' : 'c-led'}" style="--w:${(s.year / max) * 100}%"></i></span>
            <span class="dscen-v">${fmt(s.year)}</span>
            <span class="dscen-q">${k === 0 ? 'база' : `−${fmt(s.q, 0)}%`}</span>
          </button>`).join('')}
        </div>
        <p class="dunit">кВт·сағ/жыл (170 оқу күні) · ${NUM.N} шам · үнем — 60 Вт, 10 сағ базасымен салыстырғанда</p>
        <p class="dsel" id="dSel" aria-live="polite"></p>
        <p class="dnote">Нәтиже тек зерттелген жарықтандыру жүйесіне қатысты, бүкіл мектептің электр энергиясына емес. ${badge('calc')}</p>`;
      const set = (k) => {
        const s = SCENARIOS[k];
        this.app.ledPct = s.ledPct; this.app.dayHours = s.hours; this.app.setMode?.('combo');
        body.querySelectorAll('.dscen-row').forEach((b, j) => b.classList.toggle('on', j === k));
        body.querySelector('#dSel').innerHTML = `Сахнада: <b>${s.label}</b> — тәулігіне ${fmt(s.day)} кВт·сағ${k ? `, үнем ${fmt(s.q, 0)}%` : ''}. Бөлмелер үстіндегі белгілер осы сценарий бойынша.`;
      };
      body.querySelectorAll('.dscen-row').forEach((b) => b.addEventListener('click', () => set(Number(b.dataset.s))));
      set(0);
    },

    product(body) {
      const rooms = [['math', 'Математика'], ['computer', 'Компьютер'], ['reading', 'Кітап бұрышы'], ['hall', 'Акт залы'], ['canteen', 'Асхана'], ['sport', 'Спортзал']];
      body.innerHTML = `
        <p class="dlead">Параметрді өзгертсе, тұтыну бірден қайта есептеледі. Төмендегінің бәрі сайтта жұмыс істейді.</p>
        <ul class="dfeat">
          <li><b>3D модельді айналдыру</b><span>Тінтуірмен сүйреу, доңғалақпен жақындату.</span><button type="button" data-p="orbit">Мектепке қарау</button></li>
          <li><b>Кабинеттерді көрсету</b><span class="dchips">${rooms.map(([id, n]) => `<button type="button" data-room="${id}">${n}</button>`).join('')}</span></li>
          <li><b>Энергия көрсеткіштері</b><span>Бөлмелер үстіндегі модельдік кВт·сағ.</span><button type="button" data-p="energy">Энергия картасы</button></li>
          <li><b>LED үлесі</b><span class="dchips">${[0, 25, 50, 75, 100].map((p) => `<button type="button" data-ledp="${p}">${p}%</button>`).join('')}</span></li>
          <li><b>Жарық уақыты</b><span class="dchips">${[10, 9, 8, 7].map((h) => `<button type="button" data-hh="${h}">${h} сағ</button>`).join('')}</span></li>
          <li><b>Есеп нәтижелері</b><span class="dchips"><button type="button" data-panel="results">Нәтижелер</button><button type="button" data-panel="calc">Калькулятор</button><button type="button" data-panel="photos">Фотолар</button></span></li>
        </ul>
        <button type="button" class="dbig" data-act="free">Еркін 3D режиміне өту</button>`;
      const markOn = (sel, b) => { body.querySelectorAll(sel).forEach((x) => x.classList.toggle('on', x === b)); };
      body.querySelector('[data-p="orbit"]').addEventListener('click', () => { this.app.setMode?.('normal'); this.app.showShot?.(SHOTS.heroOrbit); });
      body.querySelector('[data-p="energy"]').addEventListener('click', () => { this.app.setMode?.('energy'); this.app.showShot?.(SHOTS.overview); });
      body.querySelectorAll('[data-room]').forEach((b) => b.addEventListener('click', () => { markOn('[data-room]', b); this.app.showShot?.({ view: 'walk', room: b.dataset.room }); }));
      body.querySelectorAll('[data-ledp]').forEach((b) => b.addEventListener('click', () => { markOn('[data-ledp]', b); this.app.ledPct = Number(b.dataset.ledp); this.app.setMode?.('led'); }));
      body.querySelectorAll('[data-hh]').forEach((b) => b.addEventListener('click', () => { markOn('[data-hh]', b); this.app.dayHours = Number(b.dataset.hh); this.app.setMode?.('daylight'); }));
      body.querySelectorAll('[data-panel]').forEach((b) => b.addEventListener('click', () => { this.toggleFree(true); this.site.openPanel(b.dataset.panel); }));
    },

    conclusion(body) {
      const last = SCENARIOS[3];
      body.innerHTML = `
        <div class="dres">
          <div style="--d:0s"><b>${NUM.N}</b><span>шам бойынша математикалық модель құрылды</span></div>
          <div style="--d:.35s"><b>${fmt(NUM.base.pct, 0)}%</b><span>LED сценарийінде жарықтандыру энергиясының үнемі</span></div>
          <div style="--d:.7s"><b>${fmt(last.q, 0)}%</b><span>LED + 7 сағат сценарийіндегі үнем</span></div>
        </div>
        <p class="dlead">Шам қуаты мен жұмыс уақыты энергия тұтынуға тікелей әсер етеді. Болжам модельдік шарттар аясында расталды.</p>
        <p class="dnote">Пайыздар тек зерттелген жарықтандыру моделіне қатысты; нақты өлшеу емес. Тариф берілмегендіктен ақшалай үнем есептелмеді.</p>
        <p class="dnext"><b>Келесі қадам:</b> шамдардың нақты қуаты мен жұмыс уақытын өлшеп, модельді жетілдіру.</p>
        <p class="dthanks">Назарларыңызға рақмет!</p>`;
    },
  };
}
