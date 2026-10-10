// Оң жақ панельдердің мазмұны. Барлық сан energy.js функцияларынан алынады.
import {
  PROJECT, DATA_TYPES, REAL, MODEL, ROOMS, DEVICE_INFO, PHOTOS, PHOTO_GROUPS,
  SCENARIO_HOURS, SENSITIVITY_HOURS, LED_STEPS,
} from '../data/schoolData.js';
import {
  baseResults, hoursScenario, sensitivity, ledPhases, byObject, seasonBills,
  calculate, techDay, lampDay, mixedDay, fmt, fmtInt, totalLamps,
} from '../model/energy.js';
import { barChart, rangeChart } from './charts.js';

export const badge = (t, short = false) =>
  `<span class="badge b-${t}" title="${DATA_TYPES[t].hint}"><span aria-hidden="true">${DATA_TYPES[t].mark}</span>${short ? '' : ' ' + DATA_TYPES[t].label}</span>`;
const mk = (t) => `<span class="mk b-${t}" title="${DATA_TYPES[t].label}" aria-label="${DATA_TYPES[t].label}">${DATA_TYPES[t].mark}</span>`;

const DEVICE_PHOTOS = {
  lamp: ['lighting', 'classroom'], lampExtra: ['lighting', 'corridor'], computer: ['computer'], board: ['computer'],
  projector: ['hall'], tv: ['primary'], panel: ['devices'], kitchen: ['canteen'], speaker: ['hall'], window: ['classroom', 'sport'],
  school: ['exterior'],
};

const roomInfo = (id) => ROOMS.find((r) => r.id === id);
const photoCount = (groups) => PHOTOS.filter((p) => groups.includes(p.group)).length;
const photoBtn = (groups, label = 'Нақты фото') =>
  `<button class="btn btn-photo" data-photos="${groups.join(',')}" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l2-2h6l2 2h3v12H4z M12 10a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7z"/></svg>${label} <span class="cnt">${photoCount(groups)}</span></button>`;

// ---------------- Жоба туралы ----------------
export function renderAbout(body) {
  body.innerHTML = `
  <section class="sec">
    <table class="kv">
      <tr><th>Жоба</th><td>${PROJECT.title}</td></tr>
      <tr><th>Автор</th><td>${PROJECT.author}, ${PROJECT.grade}</td></tr>
      <tr><th>Ғылыми жетекші</th><td>${PROJECT.advisor}</td></tr>
      <tr><th>Мектеп</th><td>${PROJECT.school}, ${PROJECT.region}</td></tr>
    </table>
  </section>
  <section class="sec">
    <p class="lead">Алдымен ғылыми зерттеу жүргізілді: мектеп туралы берілген деректер мен ашық белгіленген модельдік параметрлер бойынша жарықтандырудың энергия тұтынуы есептелді. Бұл 3D мектеп сол зерттеудің нәтижесін көрнекі көрсететін <b>практикалық өнім</b>. 3D модель зерттеудің дәлелі емес, оның көрнекі нұсқасы.</p>
  </section>
  <section class="sec">
    <h3>Дерек түрлері</h3>
    <ul class="types">
      ${Object.keys(DATA_TYPES).map((k) => `<li>${badge(k)}<span>${DATA_TYPES[k].hint}</span></li>`).join('')}
    </ul>
  </section>
  <section class="sec">
    <h3>3D модель туралы</h3>
    <p class="callout">${PROJECT.geometryNote}</p>
    <ul class="plain">
      <li>Сыртқы көрініс 3 фотоға сүйенеді: екі қабат, ақ қасбет, көк шатыр, көк терезе жиектері, шыны кіреберіс, баспалдақ пен пандус, қоршау.</li>
      <li>Бөлмелердің өлшемі, саны мен орналасуы — шартты навигациялық схема. Мектептің нақты қабат жоспары берілмеген.</li>
      <li>21 кабинеттің 8-і ғана 3D-де көрсетілген: бесеуі фотодағы кабинеттерге ұқсатылған, үшеуі — қайталанатын типтік модуль.</li>
      <li>Фойе, дәліз, акт залы мен асханадағы шамдар фотода көрінеді, бірақ зерттеудегі 141 шамға кірмейді.</li>
    </ul>
  </section>
  <section class="sec">
    <h3>Басқару</h3>
    <dl class="controls-help">
      <dt>Сыртта</dt><dd>Сүйреп айналдыру, доңғалақ немесе екі саусақпен масштаб. Кіреберісті басып ішке кіріңіз.</dd>
      <dt>Ішінде</dt><dd>Сүйреп айналаға қарау. Еденді басу — сол жерге бару. Пернетақта: W A S D немесе көрсеткілер.</dd>
      <dt>Нысандар</dt><dd>Шамды, ноутбукті, панельді, экранды, терезені басыңыз — оң жақта ақпарат ашылады.</dd>
    </dl>
  </section>
  <section class="sec">
    <h3>Не айтылмайды</h3>
    <ul class="plain">
      <li>60 Вт, 12 Вт және 10 сағат өлшенген дерек емес, модельдік параметр.</li>
      <li>80% үнем тек жарықтандыру моделіне қатысты, бүкіл мектептің электр шығынына емес.</li>
      <li>Қысқы және жазғы төлем айырмасы тек жарықтандырумен түсіндірілмейді.</li>
      <li>Ресми тариф берілмегендіктен ақшалай үнем тек калькуляторда, тарифті өзіңіз енгізгенде есептеледі.</li>
    </ul>
  </section>`;
}

// ---------------- Зерттеу нәтижелері ----------------
export function renderResults(body) {
  const b = baseResults();
  const hs = hoursScenario(SCENARIO_HOURS);
  const sens = sensitivity(SENSITIVITY_HOURS);
  const ph = ledPhases(LED_STEPS);
  const obj = byObject();
  const sb = seasonBills();

  body.innerHTML = `
  <section class="sec">
    <h3>Математикалық модель</h3>
    <div class="formula">
      <p><span class="f">W = Σ(P<sub>i</sub> × n<sub>i</sub> × t<sub>i</sub>) / 1000</span><span class="fd">W — кВт·сағ, P — қуат (Вт), n — құрылғы саны, t — жұмыс уақыты (сағ)</span></p>
      <p><span class="f">E = W<sub>0</sub> − W<sub>1</sub></span><span class="fd">үнем</span></p>
      <p><span class="f">q = (W<sub>0</sub> − W<sub>1</sub>) / W<sub>0</sub> × 100%</span><span class="fd">үнем пайызы</span></p>
      <p><span class="f">C = W × T</span><span class="fd">T — тариф, ₸/кВт·сағ (берілмеген)</span></p>
    </div>
  </section>
  <section class="sec">
    <h3>Бастапқы деректер</h3>
    <table class="kv">
      <tr><th>Оқу кабинеті</th><td>${REAL.classrooms}</td><td>${mk('real')}</td></tr>
      <tr><th>Спорт залы</th><td>${REAL.sportsHalls}</td><td>${mk('real')}</td></tr>
      <tr><th>Шам: ${REAL.classrooms} × ${REAL.lampsPerClassroom} + ${REAL.sportsHallLamps}</th><td>${totalLamps()}</td><td>${mk('real')}</td></tr>
      <tr><th>Қазіргі шам қуаты</th><td>${MODEL.currentLampW} Вт</td><td>${mk('model')}</td></tr>
      <tr><th>LED шам қуаты</th><td>${MODEL.ledLampW} Вт</td><td>${mk('model')}</td></tr>
      <tr><th>Жарық уақыты</th><td>${MODEL.hoursPerDay} сағ/тәулік</td><td>${mk('model')}</td></tr>
      <tr><th>Оқу күні: айына / жылына</th><td>${MODEL.daysPerMonth} / ${MODEL.daysPerYear}</td><td>${mk('model')}</td></tr>
    </table>
  </section>
  <section class="sec">
    <h3>Негізгі нәтиже: ${b.N} шам ${badge('model')}</h3>
    <div class="table-wrap"><table class="num">
      <thead><tr><th>Кезең</th><th>60 Вт</th><th>12 Вт LED</th><th>Үнем</th></tr></thead>
      <tbody>
        <tr><th>1 тәулік</th><td>${fmt(b.cur.day)}</td><td>${fmt(b.led.day)}</td><td><b>${fmt(b.sav.day)}</b></td></tr>
        <tr><th>${MODEL.daysPerMonth} оқу күні</th><td>${fmt(b.cur.month)}</td><td>${fmt(b.led.month)}</td><td><b>${fmt(b.sav.month)}</b></td></tr>
        <tr><th>${MODEL.daysPerYear} оқу күні</th><td>${fmt(b.cur.year)}</td><td>${fmt(b.led.year)}</td><td><b>${fmt(b.sav.year)}</b></td></tr>
      </tbody>
    </table></div>
    <p class="unit">кВт·сағ</p>
    <p class="callout warn"><b>${fmt(b.pct, 0)}%</b> — тек жарықтандыру компонентіндегі модельдік үнем (60 Вт пен 12 Вт шамды бірдей жұмыс уақытында салыстыру). Бұл бүкіл мектептің электр энергиясынан 80% үнем дегенді білдірмейді.</p>
  </section>
  <section class="sec" id="charts"></section>
  <section class="sec">
    <h3>Табиғи жарық сценарийі ${badge('model')}</h3>
    <p class="muted">Фотоларда кабинеттердің үлкен терезелері көрінеді. Жарықты 1, 2, 3 сағатқа аз қосу — модельдік сценарий; нақты сөндіру уақыты өлшенбеген.</p>
    <div class="table-wrap"><table class="num">
      <thead><tr><th>Сағ/тәул</th><th>60 Вт, жылына</th><th>Үнем</th><th>LED, жылына</th><th>Базадан</th></tr></thead>
      <tbody>${hs.map((r) => `<tr><th>${r.h}</th><td>${fmt(r.curYear)}</td><td>${fmt(r.curPct, 0)}%</td><td>${fmt(r.ledYear)}</td><td>${fmt(r.ledPct, 0)}%</td></tr>`).join('')}</tbody>
    </table></div>
  </section>
  <section class="sec">
    <h3>Сезімталдық талдауы ${badge('model')}</h3>
    <p class="muted">Нақты жарық уақыты белгісіз болғандықтан, 6–12 сағат аралығы тексерілді. Пайыздық үнем 80% болып қалады, ал абсолюттік үнем уақытпен бірге өседі.</p>
    <div class="table-wrap"><table class="num">
      <thead><tr><th>Сағ</th><th>60 Вт/тәул</th><th>LED/тәул</th><th>Жылдық үнем</th></tr></thead>
      <tbody>${sens.map((r) => `<tr><th>${r.h}</th><td>${fmt(r.cur)}</td><td>${fmt(r.led, 3)}</td><td>${fmt(r.savYear)}</td></tr>`).join('')}</tbody>
    </table></div>
  </section>
  <section class="sec">
    <h3>Кезеңді LED ауыстыру ${badge('model')}</h3>
    <div class="table-wrap"><table class="num">
      <thead><tr><th>Үлес</th><th>LED саны</th><th>кВт·сағ/тәул</th><th>Жылдық үнем</th></tr></thead>
      <tbody>${ph.map((r) => `<tr><th>${r.pct}%</th><td>${r.ledN}</td><td>${fmt(r.day)}</td><td>${fmt(r.savYear)}</td></tr>`).join('')}</tbody>
    </table></div>
  </section>
  <section class="sec">
    <h3>Нысан бойынша ${badge('model')}</h3>
    <div class="table-wrap"><table class="num">
      <thead><tr><th>Нысан</th><th>Шам</th><th>60 Вт</th><th>LED</th><th>Жылдық үнем</th></tr></thead>
      <tbody>${obj.map((r) => `<tr><th>${r.name}</th><td>${r.n}</td><td>${fmt(r.cur)}</td><td>${fmt(r.led)}</td><td>${fmt(r.savYear)}</td></tr>`).join('')}</tbody>
    </table></div>
    <p class="unit">кВт·сағ/тәулік, үнем — ${MODEL.daysPerYear} оқу күніне</p>
  </section>
  <section class="sec">
    <h3>Қыс пен жаз төлемі ${badge('real')}</h3>
    <table class="kv">
      <tr><th>Қыс</th><td>${fmtInt(sb.winter.min)}–${fmtInt(sb.winter.max)} ₸/ай</td></tr>
      <tr><th>Жаз</th><td>${fmtInt(sb.summer.min)}–${fmtInt(sb.summer.max)} ₸/ай</td></tr>
      <tr><th>Орта нүктелер</th><td>${fmtInt(sb.wMid)} және ${fmtInt(sb.sMid)} ₸</td></tr>
      <tr><th>Қатынас</th><td>≈ ${fmt(sb.ratio)} есе</td></tr>
    </table>
    <p class="callout warn">Бұл айырмашылықтың себебі тек жарықтандыру деп тұжырымдалмайды. Төлемге басқа электр жүктемелері мен маусымдық факторлар да әсер етуі мүмкін.</p>
  </section>`;

  const ch = body.querySelector('#charts');
  ch.insertAdjacentHTML('beforeend', '<h3>Диаграммалар</h3>');
  barChart(ch, {
    title: '60 Вт және 12 Вт LED: нысан бойынша, кВт·сағ/тәулік', badge: badge('model', true),
    categories: obj.map((o) => o.name.replace('1 орташа кабинет', '1 кабинет')),
    series: [
      { name: '60 Вт', cls: 's-cur', values: obj.map((o) => o.cur) },
      { name: '12 Вт LED', cls: 's-led', values: obj.map((o) => o.led) },
    ],
    unit: 'кВт·сағ/тәул', labelLast: true, labelDigits: 2,
  });
  barChart(ch, {
    title: 'Жарық уақыты: 10 / 9 / 8 / 7 сағ, кВт·сағ/жыл', badge: badge('model', true),
    categories: hs.map((r) => `${r.h} сағ`),
    series: [
      { name: '60 Вт', cls: 's-cur', values: hs.map((r) => r.curYear) },
      { name: '12 Вт LED', cls: 's-led', values: hs.map((r) => r.ledYear) },
    ],
    unit: 'кВт·сағ/жыл',
  });
  barChart(ch, {
    title: 'LED үлесі 0–100%: тұтыну, кВт·сағ/тәулік', badge: badge('model', true),
    categories: ph.map((r) => `${r.pct}%`),
    series: [{ name: 'Тұтыну', cls: 's-led', values: ph.map((r) => r.day) }],
    unit: 'кВт·сағ/тәул', labelLast: true, labelDigits: 2,
  });
  rangeChart(ch, {
    title: 'Қыс пен жаз: айлық төлем диапазоны', badge: badge('real', true),
    rows: [
      { name: 'Қыс', min: sb.winter.min, max: sb.winter.max, mid: sb.wMid },
      { name: 'Жаз', min: sb.summer.min, max: sb.summer.max, mid: sb.sMid },
    ],
    note: 'Жолақ — берілген диапазон, нүкте — оның ортасы. Себебі тек жарықтандыру деп тұжырымдалмайды.',
  });
}

// ---------------- Энергия картасы ----------------
export function renderEnergyMap(body, ctx) {
  const obj = byObject();
  const rooms = ROOMS.filter((r) => r.id !== 'module');
  body.innerHTML = `
  <section class="sec">
    <p class="lead">Еденнің түсі мен бөлме үстіндегі белгі әр нысанның жарықтандыруға кететін модельдік тәуліктік энергиясын көрсетеді.</p>
    <div class="scale"><span>аз</span><i></i><span>көп</span></div>
    <p class="muted small">Түстер тек салыстыру үшін. Бұл жылулық камера немесе өлшеу аспабының дерегі емес.</p>
  </section>
  <section class="sec">
    <h3>Мектеп бойынша ${badge('real')}</h3>
    <table class="kv">
      <tr><th>Оқу кабинеті</th><td>${REAL.classrooms}</td></tr>
      <tr><th>Спорт залы</th><td>${REAL.sportsHalls}</td></tr>
      <tr><th>Ауысым</th><td>${REAL.shifts}</td></tr>
      <tr><th>Есепке алынған шам</th><td>${REAL.classrooms} × ${REAL.lampsPerClassroom} + ${REAL.sportsHallLamps} = ${totalLamps()}</td></tr>
      <tr><th>Компьютер</th><td>${REAL.computers}</td></tr>
      <tr><th>Проектор</th><td>${REAL.projectors}</td></tr>
      <tr><th>Интерактивті тақта</th><td>${REAL.interactiveBoards}</td></tr>
    </table>
  </section>
  <section class="sec">
    <h3>Жарықтандыру, кВт·сағ/тәулік ${badge('model')}</h3>
    <div class="table-wrap"><table class="num">
      <thead><tr><th>Нысан</th><th>Шам</th><th>60 Вт</th><th>LED</th></tr></thead>
      <tbody>${obj.map((r) => `<tr><th>${r.name}</th><td>${r.n}</td><td>${fmt(r.cur)}</td><td>${fmt(r.led)}</td></tr>`).join('')}</tbody>
    </table></div>
    <p class="muted small">3D-де 21 кабинеттің 8-і көрсетілген; қалғандары сол типтік модульмен бірдей есептеледі.</p>
  </section>
  <section class="sec">
    <h3>Бөлмеге өту</h3>
    <div class="room-grid">${rooms.map((r) => `<button class="room-btn" data-room="${r.id === 'classA' ? 'classA' : r.id}" type="button"><span>${r.name}</span><small>${r.energyRole === 'classroom' ? '6 шам · есепте' : r.energyRole === 'sport' ? '15 шам · есепте' : '141-ге кірмейді'}</small></button>`).join('')}</div>
  </section>`;
  body.querySelectorAll('[data-room]').forEach((b) => b.addEventListener('click', () => ctx.goToRoom(b.dataset.room)));
}

// ---------------- Калькулятор ----------------
const DEFAULTS = () => ({
  lamps: totalLamps(), Pcur: MODEL.currentLampW, Pled: MODEL.ledLampW, baseHours: MODEL.hoursPerDay, hours: MODEL.hoursPerDay,
  daysMonth: MODEL.daysPerMonth, daysYear: MODEL.daysPerYear, ledPct: 100, tariff: '',
});
let calcState = DEFAULTS();
let techState = { Pk: '', tk: '', Pp: '', tp: '', Pt: '', tt: '' };

export function renderCalculator(body, ctx) {
  const field = (id, label, type, extra = '') => `
    <label class="field" for="c-${id}"><span class="fl">${label} ${mk(type)}</span>
      <input id="c-${id}" data-k="${id}" type="number" inputmode="decimal" step="any" min="0" ${extra} value="${calcState[id]}"></label>`;
  body.innerHTML = `
  <section class="sec">
    <p class="lead">Мәндерді өзгертіңіз — нәтиже бірден жаңарады. Әдепкі мәндер зерттеудегі базалық модельге сәйкес.</p>
    <form class="calc" id="calcForm" autocomplete="off">
      ${field('lamps', 'Шам саны', 'real')}
      ${field('Pcur', 'Қазіргі шам қуаты, Вт', 'model')}
      ${field('Pled', 'LED шам қуаты, Вт', 'model')}
      ${field('baseHours', 'Қазіргі режим, сағ/күн', 'model', 'max="24"')}
      ${field('hours', 'Жаңа режим, сағ/күн', 'model', 'max="24"')}
      ${field('daysMonth', 'Айдағы оқу күні', 'model')}
      ${field('daysYear', 'Жылдағы оқу күні', 'model')}
      <label class="field wide" for="c-ledPct"><span class="fl">LED-ке ауыстыру: <b id="ledPctOut">${calcState.ledPct}%</b> ${mk('model')}</span>
        <input id="c-ledPct" data-k="ledPct" type="range" min="0" max="100" step="1" value="${calcState.ledPct}" list="ledTicks">
        <datalist id="ledTicks"><option value="0"></option><option value="25"></option><option value="50"></option><option value="75"></option><option value="100"></option></datalist>
        <span class="ticks"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></span>
      </label>
      <label class="field wide" for="c-tariff"><span class="fl">Тариф, ₸/кВт·сағ <small>(ресми тариф берілмеген — өзіңіз енгізіңіз)</small></span>
        <input id="c-tariff" data-k="tariff" type="number" inputmode="decimal" step="any" min="0" placeholder="мысалы, шотыңыздағы тариф" value="${calcState.tariff}"></label>
    </form>
    <div class="calc-actions">
      <button class="btn" type="button" id="calcReset">Базалық мәндерге қайтару</button>
      <button class="btn btn-primary" type="button" id="calcTo3d">LED үлесін 3D-де көрсету</button>
    </div>
  </section>
  <section class="sec" aria-live="polite">
    <h3>Нәтиже ${badge('model')}</h3>
    <div class="table-wrap"><table class="num" id="calcOut"></table></div>
    <div class="big-results" id="calcBig"></div>
  </section>
  <section class="sec">
    <h3>Техника: параметрлік модель</h3>
    <p class="muted">Құрылғылар саны нақты ${mk('real')}, ал қуаты мен уақыты берілмеген. Техникалық жапсырмадан алынған мәндерді енгізіңіз.</p>
    <p class="formula-inline">W<sub>тех</sub> = (20·P<sub>к</sub>·t<sub>к</sub> + 5·P<sub>п</sub>·t<sub>п</sub> + 2·P<sub>т</sub>·t<sub>т</sub>) / 1000</p>
    <form class="calc tech" id="techForm" autocomplete="off">
      ${[['Pk', 'Компьютер (20), Вт'], ['tk', 'Компьютер, сағ/күн'], ['Pp', 'Проектор (5), Вт'], ['tp', 'Проектор, сағ/күн'], ['Pt', 'Интерактивті тақта (2), Вт'], ['tt', 'Тақта, сағ/күн']]
        .map(([k, l]) => `<label class="field" for="t-${k}"><span class="fl">${l}</span><input id="t-${k}" data-k="${k}" type="number" inputmode="decimal" step="any" min="0" placeholder="—" value="${techState[k]}"></label>`).join('')}
    </form>
    <p class="tech-out" id="techOut"></p>
  </section>`;

  const out = body.querySelector('#calcOut');
  const big = body.querySelector('#calcBig');
  const update = () => {
    const p = { ...calcState };
    for (const k of ['lamps', 'Pcur', 'Pled', 'baseHours', 'hours', 'daysMonth', 'daysYear', 'ledPct']) p[k] = Math.max(0, Number(p[k]) || 0);
    const r = calculate(p);
    body.querySelector('#ledPctOut').textContent = `${p.ledPct}% (${r.ledN} LED)`;
    out.innerHTML = `
      <thead><tr><th></th><th>Тәулік</th><th>Ай</th><th>Жыл</th></tr></thead>
      <tbody>
        <tr><th>Қазіргі, W<sub>0</sub></th><td>${fmt(r.W0.day)}</td><td>${fmt(r.W0.month)}</td><td>${fmt(r.W0.year)}</td></tr>
        <tr><th>Жаңа режим, W<sub>1</sub></th><td>${fmt(r.W1.day)}</td><td>${fmt(r.W1.month)}</td><td>${fmt(r.W1.year)}</td></tr>
        <tr class="hl"><th>Үнем, E</th><td>${fmt(r.E.day)}</td><td>${fmt(r.E.month)}</td><td>${fmt(r.E.year)}</td></tr>
      </tbody>`;
    big.innerHTML = `
      <div><span class="k">Үнем, q</span><span class="v">${fmt(r.q, 1)}%</span><span class="s">жарықтандыру бөлігі</span></div>
      <div><span class="k">Жылдық үнем</span><span class="v">${fmt(r.E.year)}</span><span class="s">кВт·сағ</span></div>
      <div><span class="k">Ақшалай үнем, жыл</span><span class="v">${r.C.Eyear === null ? '—' : fmtInt(r.C.Eyear) + ' ₸'}</span><span class="s">${r.C.Eyear === null ? 'тариф енгізілмеген' : 'C = E × T'}</span></div>`;
  };
  body.querySelector('#calcForm').addEventListener('input', (e) => {
    const k = e.target.dataset.k; if (!k) return;
    calcState[k] = e.target.value;
    update();
  });
  body.querySelector('#calcForm').addEventListener('submit', (e) => e.preventDefault());
  body.querySelector('#calcReset').addEventListener('click', () => { calcState = DEFAULTS(); renderCalculator(body, ctx); });
  body.querySelector('#calcTo3d').addEventListener('click', () => ctx.showLed(Math.max(0, Math.min(100, Number(calcState.ledPct) || 0))));

  const tOut = body.querySelector('#techOut');
  const updTech = () => {
    const w = techDay(techState);
    tOut.innerHTML = w === null
      ? 'Нәтиже: <b>—</b> <span class="muted">(барлық өрісті толтырыңыз)</span>'
      : `Нәтиже: <b>${fmt(w, 3)} кВт·сағ/тәулік</b> · ${calcState.daysYear || MODEL.daysPerYear} күнге <b>${fmt(w * (Number(calcState.daysYear) || MODEL.daysPerYear))} кВт·сағ</b> ${mk('model')}`;
  };
  body.querySelector('#techForm').addEventListener('input', (e) => { const k = e.target.dataset.k; if (!k) return; techState[k] = e.target.value; updTech(); });
  body.querySelector('#techForm').addEventListener('submit', (e) => e.preventDefault());
  update(); updTech();
}

// ---------------- Фотобақылау ----------------
export function renderGallery(body, openPhoto, only) {
  const groups = PHOTO_GROUPS.filter((g) => !only || only.includes(g.id));
  body.innerHTML = `
  <section class="sec">
    <p class="lead">${PHOTOS.length} фото зерттеу нысанын құжаттау үшін түсірілді: жарық көздері, терезелер және электр құрылғылары бар аймақтар.</p>
    <p class="muted small">${badge('photo')} Фотолар — ғылыми дәлелдің жалғыз көзі емес. Олардан шамның немесе құрылғының қуаты анықталмайды. Пән мен кабинет нөмірі фотода анық жазылмаса, болжанбайды.</p>
    ${only ? '<button class="btn" type="button" id="allPhotos">Барлық фотоны көрсету</button>' : ''}
  </section>
  ${groups.map((g) => {
    const ps = PHOTOS.filter((p) => p.group === g.id);
    return `<section class="sec"><h3>${g.name} <span class="cnt">${ps.length}</span></h3>
      <div class="gallery">${ps.map((p) => `<button type="button" class="thumb" data-file="${p.file}" aria-label="${p.caption}">
        <img src="photos/thumb/${p.file}" alt="" loading="lazy" decoding="async" width="210" height="118"></button>`).join('')}</div></section>`;
  }).join('')}`;
  body.querySelectorAll('.thumb').forEach((t) => t.addEventListener('click', () => openPhoto(t.dataset.file, only)));
  body.querySelector('#allPhotos')?.addEventListener('click', () => renderGallery(body, openPhoto));
  body.querySelectorAll('img').forEach((img) => img.addEventListener('error', () => img.closest('.thumb').classList.add('broken'), { once: true }));
}

// ---------------- Hotspot ----------------
export function hotspotContent(h, ctx) {
  const room = h.roomId ? ctx.roomById(h.roomId) : null;
  const info = room ? roomInfo(room.infoId) : null;
  const where = room ? `<p class="where">${room.name}</p>` : '';
  const { currentLampW: P0, ledLampW: P1, hoursPerDay: H, daysPerYear: DY } = MODEL;

  if (h.kind === 'school') {
    const b = baseResults();
    return {
      title: 'Мектеп бойынша',
      html: `<section class="sec"><table class="kv">
        <tr><th>Кабинет / спорт залы</th><td>${REAL.classrooms} / ${REAL.sportsHalls}</td><td>${mk('real')}</td></tr>
        <tr><th>Шам</th><td>${totalLamps()}</td><td>${mk('real')}</td></tr>
        <tr><th>60 Вт, 10 сағ</th><td>${fmt(b.cur.day)} кВт·сағ/тәул</td><td>${mk('model')}</td></tr>
        <tr><th>LED, 10 сағ</th><td>${fmt(b.led.day)} кВт·сағ/тәул</td><td>${mk('model')}</td></tr></table>
        <p class="muted small">${PROJECT.geometryNote}</p>${photoBtn(DEVICE_PHOTOS.school)}</section>`,
    };
  }

  if (h.kind === 'room') {
    const e = roomEnergyTable(info?.energyRole);
    return {
      title: room.name,
      html: `<section class="sec"><p>${info?.text ?? ''}</p>${e}${photoBtn(info?.photos ?? [])}</section>`,
    };
  }

  const isLamp = h.kind === 'lamp' || h.kind === 'lampExtra';
  const d = DEVICE_INFO[isLamp ? 'lamp' : h.kind];
  if (!d) return { title: 'Нысан', html: '<p>Ақпарат жоқ.</p>' };

  let extra = '';
  if (h.kind === 'lamp') {
    const n = info?.energyRole === 'sport' ? REAL.sportsHallLamps : REAL.lampsPerClassroom;
    const one0 = lampDay(1, P0, H), one1 = lampDay(1, P1, H);
    const r0 = lampDay(n, P0, H), r1 = lampDay(n, P1, H);
    extra = `
      <div class="seg" role="group" aria-label="Шам түрі">
        <button type="button" data-lamp="current" class="${ctx.mode() === 'led' ? '' : 'on'}">Қазіргі</button>
        <button type="button" data-lamp="led" class="${ctx.mode() === 'led' ? 'on' : ''}">LED</button>
      </div>
      <div class="table-wrap"><table class="num">
        <thead><tr><th></th><th>Қазіргі ${P0} Вт</th><th>LED ${P1} Вт</th></tr></thead>
        <tbody>
          <tr><th>1 шам, ${H} сағ</th><td>${fmt(one0)}</td><td>${fmt(one1)}</td></tr>
          <tr><th>${room?.name?.includes('Спорт') ? 'Спорт залы' : 'Кабинет'}: ${n} шам</th><td>${fmt(r0)}</td><td>${fmt(r1)}</td></tr>
          <tr class="hl"><th>Үнем, ${DY} күн</th><td colspan="2">${fmt((r0 - r1) * DY)} кВт·сағ</td></tr>
        </tbody></table></div>
      <p class="unit">кВт·сағ/тәулік ${mk('model')} · W = P × n × t / 1000</p>`;
  }
  if (h.kind === 'lampExtra') {
    extra = `<p class="callout">Бұл аймақтың шамдары фотода көрінеді ${mk('photo')}, бірақ зерттеудегі 141 шамға кірмейді. Олар нақты саналғанда модельге жеке блок ретінде қосылады.</p>`;
  }
  if (h.kind === 'window') {
    const hs = hoursScenario(SCENARIO_HOURS);
    extra = `<div class="table-wrap"><table class="num"><thead><tr><th>Сағ/тәул</th><th>60 Вт, жыл</th><th>Үнем</th></tr></thead>
      <tbody>${hs.map((r) => `<tr><th>${r.h}</th><td>${fmt(r.curYear)}</td><td>${fmt(r.curPct, 0)}%</td></tr>`).join('')}</tbody></table></div>
      <button class="btn btn-primary" type="button" data-daylight>Табиғи жарық сценарийін қосу</button>`;
  }

  const lines = d.lines.map(([t, s]) => `<li>${mk(t)}<span>${s}</span></li>`).join('');
  return {
    title: d.title,
    html: `<section class="sec">${where}${badge(d.type)}<ul class="facts">${lines}</ul>${extra}
      <p class="caution">${d.caution}</p>
      ${photoBtn(DEVICE_PHOTOS[h.kind] ?? info?.photos ?? [])}
      ${info ? `<p class="muted small room-note">${info.text}</p>` : ''}</section>`,
  };
}

function roomEnergyTable(role) {
  const { currentLampW: P0, ledLampW: P1, hoursPerDay: H, daysPerYear: DY } = MODEL;
  if (role !== 'classroom' && role !== 'sport') {
    return `<p class="callout">${mk('photo')} Бұл аймақ есептегі 141 шамға кірмейді.</p>`;
  }
  const n = role === 'sport' ? REAL.sportsHallLamps : REAL.lampsPerClassroom;
  const c = lampDay(n, P0, H), l = lampDay(n, P1, H);
  return `<table class="kv">
    <tr><th>Шам</th><td>${n}</td><td>${mk('real')}</td></tr>
    <tr><th>60 Вт, ${H} сағ</th><td>${fmt(c)} кВт·сағ/тәул</td><td>${mk('model')}</td></tr>
    <tr><th>LED 12 Вт</th><td>${fmt(l)} кВт·сағ/тәул</td><td>${mk('model')}</td></tr>
    <tr><th>Үнем, ${DY} күн</th><td>${fmt((c - l) * DY)} кВт·сағ</td><td>${mk('model')}</td></tr></table>`;
}

/** Режим картасындағы қысқа көрсеткіш */
export function modeSummary(mode, ledPct, hours) {
  const N = totalLamps();
  const { currentLampW: P0, ledLampW: P1, hoursPerDay: H, daysPerYear: DY } = MODEL;
  const base = lampDay(N, P0, H);
  if (mode === 'led') {
    const v = mixedDay(N, ledPct, P0, P1, H);
    return `${Math.round((N * ledPct) / 100)} LED · <b>${fmt(v)}</b> кВт·сағ/тәул · жылдық үнем <b>${fmt((base - v) * DY)}</b> ${mk('model')}`;
  }
  if (mode === 'daylight') {
    const v = lampDay(N, P0, hours);
    return `${hours} сағ · <b>${fmt(v)}</b> кВт·сағ/тәул · үнем <b>${fmt(((base - v) / base) * 100, 0)}%</b> · жылына <b>${fmt((base - v) * DY)}</b> ${mk('model')}`;
  }
  return `${N} шам · 60 Вт · 10 сағ → <b>${fmt(base)}</b> кВт·сағ/тәул ${mk('model')}`;
}
