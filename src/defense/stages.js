// Ғылыми жобаны қорғау: 10 кезеңнің мазмұны.
// Барлық сан src/model/energy.js функцияларынан есептеледі — мұнда қолмен көшірілген нәтиже жоқ.
import { REAL, MODEL } from '../data/schoolData.js';
import { baseResults, hoursScenario, ledPhases, seasonBills, totalLamps, lampDay, mixedDay, savingPct } from '../model/energy.js';

const N = totalLamps();
const { currentLampW: P0, ledLampW: P1, hoursPerDay: H, daysPerYear: DY } = MODEL;

export const NUM = {
  N,
  base: baseResults(),
  hours: hoursScenario([10, 9, 8, 7]),
  phases: ledPhases([0, 25, 50, 75, 100]),
  bills: seasonBills(),
  classroomLamps: REAL.classrooms * REAL.lampsPerClassroom,
};

/** 3-эксперимент: төрт сценарий (жылдық тұтыну, кВт·сағ) */
export const SCENARIOS = [
  { id: 's1', label: '60 Вт · 10 сағ', ledPct: 0, hours: 10 },
  { id: 's2', label: 'LED 12 Вт · 10 сағ', ledPct: 100, hours: 10 },
  { id: 's3', label: 'LED 12 Вт · 8 сағ', ledPct: 100, hours: 8 },
  { id: 's4', label: 'LED 12 Вт · 7 сағ', ledPct: 100, hours: 7 },
].map((s) => {
  const day = mixedDay(N, s.ledPct, P0, P1, s.hours);
  const base = lampDay(N, P0, H);
  return { ...s, day, year: day * DY, q: savingPct(base, day) };
});

// Камера кадрлары (схемалық 3D модель координаттары)
export const SHOTS = {
  heroOrbit: { view: 'exterior', pos: [-38, 22, 62], look: [6, 3, 4], orbit: 0.3 },
  side: { view: 'exterior', pos: [56, 28, 60], look: [6, 3, 4], orbit: 0.22 },
  front: { view: 'exterior', pos: [-6, 10, 42], look: [2, 4, 6] },
  wide: { view: 'exterior', pos: [-30, 40, 72], look: [6, 3, 4] },
  overview: { view: 'overview', pos: [10, 88, 60], look: [10, 0, 1] },
  classroom: { view: 'walk', room: 'classA' },
  sport: { view: 'walk', room: 'sport' },
  lamps: { view: 'walk', pos: [-28.2, 1.6, -2.4], look: [-31.6, 3.2, -6.2] },
  lampsLed: { view: 'walk', pos: [-27.8, 1.5, -2.3], look: [-32, 2.9, -7] },
  windows: { view: 'walk', pos: [-28.4, 1.6, -2.6], look: [-32.4, 2.1, -9.4] },
  finale: { view: 'exterior', pos: [-46, 30, 76], look: [6, 3, 4], orbit: 0.25 },
};

export const STAGES = [
  {
    id: 'intro', short: 'Кіріспе', eyebrow: 'Ғылыми жоба', title: 'Электр энергиясын үнемдеудің математикалық моделі',
    shot: 'heroOrbit', scene: { mode: 'normal' },
  },
  {
    id: 'relevance', short: 'Өзектілігі', eyebrow: 'Өзектілігі', title: 'Неліктен бұл маңызды?',
    shot: 'side', scene: { mode: 'normal' },
  },
  {
    id: 'goal', short: 'Мақсат', eyebrow: 'Мақсат, міндеттер және болжам', title: 'Модель арқылы тиімді шешім іздеу',
    shot: 'front', scene: { mode: 'normal' },
  },
  {
    id: 'object', short: 'Нысан', eyebrow: 'Зерттеу нысаны', title: 'Біздің мектеп',
    shot: 'wide', scene: { mode: 'normal' },
    tour: [
      { label: 'Мектеп', shot: 'wide', hl: ['classrooms', 'sport', 'shifts'] },
      { label: 'Кабинеттер', shot: 'overview', hl: ['classrooms', 'clLamps'] },
      { label: 'Кабинет ішінде', shot: 'classroom', hl: ['clLamps'] },
      { label: 'Спортзал', shot: 'sport', hl: ['spLamps', 'total'] },
    ],
  },
  {
    id: 'model', short: 'Модель', eyebrow: 'Математикалық модель', title: 'Энергия қалай есептеледі',
    shot: 'lamps', scene: { mode: 'normal' },
  },
  {
    id: 'led', short: 'LED', eyebrow: 'Бірінші эксперимент', title: 'LED шамдары',
    shot: 'lampsLed', scene: { mode: 'led', ledPct: 0 },
  },
  {
    id: 'hours', short: 'Уақыт', eyebrow: 'Екінші эксперимент', title: 'Жарықтандыру уақыты',
    shot: 'windows', scene: { mode: 'daylight', hours: 10 },
  },
  {
    id: 'compare', short: 'Салыстыру', eyebrow: 'Үшінші эксперимент', title: 'Сценарийлерді салыстыру',
    shot: 'overview', scene: { mode: 'combo', ledPct: 0, hours: 10 },
  },
  {
    id: 'product', short: '3D өнім', eyebrow: 'Практикалық өнім', title: '3D мектеп',
    shot: 'heroOrbit', scene: { mode: 'normal' },
  },
  {
    id: 'conclusion', short: 'Қорытынды', eyebrow: 'Қорытынды', title: 'Негізгі нәтижелер',
    shot: 'finale', scene: { mode: 'normal' },
  },
];

