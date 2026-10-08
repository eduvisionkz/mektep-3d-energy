// node --test tests/   — модельдің бақылау мәндері (ғылыми жұмыстағы кестелермен сәйкестік)
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  round, energyKWh, totalLamps, baseResults, hoursScenario, sensitivity, ledPhases,
  byObject, seasonBills, calculate, cost, techDay, fmt,
} from '../src/model/energy.js';
import { PHOTOS, MODEL } from '../src/data/schoolData.js';

const eq = (a, b, msg) => assert.equal(round(a, 3), round(b, 3), msg);

test('sanity: 21×6+15=141', () => assert.equal(totalLamps(), 141));
test('sanity: 141×60×10/1000=84.6', () => eq(energyKWh([{ P: 60, n: 141, t: 10 }]), 84.6));
test('sanity: 141×12×10/1000=16.92', () => eq(energyKWh([{ P: 12, n: 141, t: 10 }]), 16.92));
test('sanity: 84.6−16.92=67.68', () => eq(baseResults().sav.day, 67.68));

test('базалық нәтижелер', () => {
  const r = baseResults();
  eq(r.cur.month, 1861.2); eq(r.cur.year, 14382);
  eq(r.led.day, 16.92); eq(r.led.month, 372.24); eq(r.led.year, 2876.4);
  eq(r.sav.month, 1488.96); eq(r.sav.year, 11505.6);
  eq(r.pct, 80);
});

test('табиғи жарық сценарийі', () => {
  const s = hoursScenario([10, 9, 8, 7]);
  assert.deepEqual(s.map((x) => round(x.curYear, 2)), [14382, 12943.8, 11505.6, 10067.4]);
  assert.deepEqual(s.map((x) => round(x.curPct, 1)), [0, 10, 20, 30]);
  assert.deepEqual(s.map((x) => round(x.ledYear, 2)), [2876.4, 2588.76, 2301.12, 2013.48]);
  assert.deepEqual(s.map((x) => round(x.ledPct, 1)), [80, 82, 84, 86]);
  assert.deepEqual(s.map((x) => round(x.curSavYear, 2)), [0, 1438.2, 2876.4, 4314.6]);
});

test('сезімталдық', () => {
  const s = sensitivity([6, 8, 10, 12]);
  assert.deepEqual(s.map((x) => round(x.cur, 3)), [50.76, 67.68, 84.6, 101.52]);
  assert.deepEqual(s.map((x) => round(x.led, 3)), [10.152, 13.536, 16.92, 20.304]);
  assert.deepEqual(s.map((x) => round(x.savYear, 2)), [6903.36, 9204.48, 11505.6, 13806.72]);
});

test('кезеңді LED', () => {
  const p = ledPhases([0, 25, 50, 75, 100]);
  assert.deepEqual(p.map((x) => x.ledN), [0, 35, 71, 106, 141]);
  assert.deepEqual(p.map((x) => round(x.day, 2)), [84.6, 67.8, 50.52, 33.72, 16.92]);
  assert.deepEqual(p.map((x) => round(x.savYear, 2)), [0, 2856, 5793.6, 8649.6, 11505.6]);
});

test('нысан бойынша', () => {
  const [one, all, sport, total] = byObject();
  eq(one.cur, 3.6); eq(one.led, 0.72); eq(one.savDay, 2.88); eq(one.savYear, 489.6);
  eq(all.cur, 75.6); eq(all.led, 15.12); eq(all.savYear, 10281.6);
  eq(sport.cur, 9); eq(sport.led, 1.8); eq(sport.savYear, 1224);
  eq(total.savDay, 67.68);
});

test('қыс/жаз', () => {
  const s = seasonBills();
  assert.equal(s.wMid, 1_100_000); assert.equal(s.sMid, 175_000);
  assert.equal(round(s.ratio, 2), 6.29);
});

test('тарифсіз ақша есептелмейді', () => {
  assert.equal(cost(100, ''), null);
  assert.equal(cost(100, null), null);
  assert.equal(cost(100, 0), null);
  const r = calculate({ lamps: 141, Pcur: 60, Pled: 12, hours: 10, daysMonth: 22, daysYear: 170, ledPct: 100, tariff: '' });
  assert.equal(r.C.Eyear, null);
  assert.equal(fmt(r.C.Eyear), '—');
  eq(r.E.year, 11505.6); eq(r.q, 80);
  const r2 = calculate({ lamps: 141, Pcur: 60, Pled: 12, hours: 10, daysMonth: 22, daysYear: 170, ledPct: 100, tariff: 10 });
  eq(r2.C.Eyear, 115056);
});

test('калькулятор: 50% LED + 8 сағ (база 10 сағ)', () => {
  const r = calculate({ lamps: 141, Pcur: 60, Pled: 12, hours: 8, baseHours: 10, daysMonth: 22, daysYear: 170, ledPct: 50, tariff: '' });
  // 70×60×8 + 71×12×8 = 33600 + 6816 = 40416 Вт·сағ = 40.416 кВт·сағ
  eq(r.W1.day, 40.416);
});

test('техника: бос параметр → null', () => {
  assert.equal(techDay({ Pk: '', tk: 6, Pp: 200, tp: 2, Pt: 150, tt: 3 }), null);
  eq(techDay({ Pk: 100, tk: 1, Pp: 0, tp: 0, Pt: 0, tt: 0 }), 2);
});

test('модельдік параметрлер', () => {
  assert.deepEqual(MODEL, { currentLampW: 60, ledLampW: 12, hoursPerDay: 10, daysPerMonth: 22, daysPerYear: 170 });
});

test('барлық фото файлдары бар', () => {
  assert.equal(PHOTOS.length, 36);
  for (const p of PHOTOS) {
    assert.ok(existsSync(new URL(`../public/photos/full/${p.file}`, import.meta.url)), p.file);
    assert.ok(existsSync(new URL(`../public/photos/thumb/${p.file}`, import.meta.url)), p.file);
  }
});
