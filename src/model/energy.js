// Математикалық модель. Барлық сандар осы функциялар арқылы есептеледі.
// W = Σ(Pᵢ × nᵢ × tᵢ) / 1000   [кВт·сағ]
// E = W₀ − W₁
// q = (W₀ − W₁) / W₀ × 100%
// C = W × T

import { REAL, MODEL } from '../data/schoolData.js';

export const round = (x, d = 2) => Math.round((x + Number.EPSILON) * 10 ** d) / 10 ** d;

/** W = Σ(P·n·t)/1000. items: [{P, n, t}] */
export function energyKWh(items) {
  return items.reduce((s, { P, n, t }) => s + P * n * t, 0) / 1000;
}

export const saving = (W0, W1) => W0 - W1;
export const savingPct = (W0, W1) => (W0 > 0 ? ((W0 - W1) / W0) * 100 : 0);

/** C = W × T. Тариф берілмесе null (интерфейсте «—»). */
export function cost(W, tariff) {
  if (tariff === null || tariff === undefined || tariff === '' || !Number.isFinite(Number(tariff)) || Number(tariff) <= 0) return null;
  return W * Number(tariff);
}

export const totalLamps = (r = REAL) => r.classrooms * r.lampsPerClassroom + r.sportsHallLamps;

/** Шамдардың тәуліктік тұтынуы (бір түрлі қуат) */
export const lampDay = (n, P, t) => energyKWh([{ P, n, t }]);

/** LED үлесі pct% болғанда LED саны (бүтінге жуықтау, зерттеудегідей) */
export const ledCount = (n, pct) => Math.round((n * pct) / 100);

/** Аралас жүйе: k LED + (n−k) қазіргі шам */
export function mixedDay(n, pct, Pcur, Pled, t) {
  const k = ledCount(n, pct);
  return energyKWh([
    { P: Pcur, n: n - k, t },
    { P: Pled, n: k, t },
  ]);
}

/** Калькулятордың толық есебі */
export function calculate(p) {
  const { lamps, Pcur, Pled, hours, daysMonth, daysYear, ledPct, tariff, baseHours } = p;
  const t0 = baseHours ?? hours;
  const W0day = lampDay(lamps, Pcur, t0);
  const W1day = mixedDay(lamps, ledPct, Pcur, Pled, hours);
  const r = {
    ledN: ledCount(lamps, ledPct),
    W0: { day: W0day, month: W0day * daysMonth, year: W0day * daysYear },
    W1: { day: W1day, month: W1day * daysMonth, year: W1day * daysYear },
  };
  r.E = { day: saving(W0day, W1day), month: saving(r.W0.month, r.W1.month), year: saving(r.W0.year, r.W1.year) };
  r.q = savingPct(W0day, W1day);
  r.C = { W1year: cost(r.W1.year, tariff), Eyear: cost(r.E.year, tariff), Emonth: cost(r.E.month, tariff) };
  return r;
}

/** Техниканың параметрлік моделі: W = (20·Pк·tк + 5·Pп·tп + 2·Pт·tт)/1000. Бос мән болса null. */
export function techDay({ Pk, tk, Pp, tp, Pt, tt }, r = REAL) {
  const vals = [Pk, tk, Pp, tp, Pt, tt].map(Number);
  if ([Pk, tk, Pp, tp, Pt, tt].some((v) => v === '' || v === null || v === undefined) || vals.some((v) => !Number.isFinite(v) || v < 0)) return null;
  return energyKWh([
    { P: vals[0], n: r.computers, t: vals[1] },
    { P: vals[2], n: r.projectors, t: vals[3] },
    { P: vals[4], n: r.interactiveBoards, t: vals[5] },
  ]);
}

// ---------- Зерттеудің стандартты сценарийлері (базалық модельдік параметрлер) ----------
const N = totalLamps();
const { currentLampW: P0, ledLampW: P1, hoursPerDay: H, daysPerMonth: DM, daysPerYear: DY } = MODEL;

export function baseResults() {
  const cur = lampDay(N, P0, H);
  const led = lampDay(N, P1, H);
  return {
    N,
    cur: { day: cur, month: cur * DM, year: cur * DY },
    led: { day: led, month: led * DM, year: led * DY },
    sav: { day: cur - led, month: (cur - led) * DM, year: (cur - led) * DY },
    pct: savingPct(cur, led),
  };
}

/** Табиғи жарық / уақыт сценарийі: 60 Вт және LED үшін */
export function hoursScenario(hoursList) {
  const base = lampDay(N, P0, H);
  return hoursList.map((h) => {
    const cur = lampDay(N, P0, h);
    const led = lampDay(N, P1, h);
    return {
      h,
      curDay: cur, curYear: cur * DY, curPct: savingPct(base, cur), curSavYear: (base - cur) * DY,
      ledDay: led, ledYear: led * DY, ledPct: savingPct(base, led),
    };
  });
}

/** Сезімталдық: әр сағат үшін 60 Вт пен LED айырмасы */
export function sensitivity(hoursList) {
  return hoursList.map((h) => {
    const cur = lampDay(N, P0, h);
    const led = lampDay(N, P1, h);
    return { h, cur, led, savDay: cur - led, savYear: (cur - led) * DY };
  });
}

/** Кезеңді LED */
export function ledPhases(steps) {
  const base = lampDay(N, P0, H);
  return steps.map((pct) => {
    const day = mixedDay(N, pct, P0, P1, H);
    return { pct, ledN: ledCount(N, pct), curN: N - ledCount(N, pct), day, savDay: base - day, savYear: (base - day) * DY, q: savingPct(base, day) };
  });
}

/** Нысан бойынша: 1 кабинет, 21 кабинет, спорт залы */
export function byObject(r = REAL) {
  const rows = [
    { id: 'one', name: '1 орташа кабинет', n: r.lampsPerClassroom },
    { id: 'all', name: `${r.classrooms} кабинет`, n: r.classrooms * r.lampsPerClassroom },
    { id: 'sport', name: 'Спорт залы', n: r.sportsHallLamps },
    { id: 'total', name: 'Барлығы', n: totalLamps(r) },
  ];
  return rows.map((o) => {
    const cur = lampDay(o.n, P0, H);
    const led = lampDay(o.n, P1, H);
    return { ...o, cur, led, savDay: cur - led, savYear: (cur - led) * DY };
  });
}

/** Қыс/жаз төлем диапазоны (нақты дерек, тек сипаттамалық талдау) */
export function seasonBills(r = REAL) {
  const wMid = (r.winterBill.min + r.winterBill.max) / 2;
  const sMid = (r.summerBill.min + r.summerBill.max) / 2;
  return { winter: r.winterBill, summer: r.summerBill, wMid, sMid, ratio: wMid / sMid, diffMid: wMid - sMid };
}

// ---------- Пішімдеу ----------
const nf = (d) => new Intl.NumberFormat('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmt = (x, d = 2) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : nf(d).format(round(x, d)).replace(',', '.'));
export const fmtInt = (x) => (x === null || !Number.isFinite(x) ? '—' : nf(0).format(Math.round(x)));
