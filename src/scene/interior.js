// Ішкі кеңістік — СХЕМАЛЫҚ навигациялық модель.
// Бөлмелердің өлшемі мен орналасуы ойдан шартты түрде алынды (нақты жоспар берілмеген).
// Ішкі безендіру фотобақылаудағы типтік белгілерге сүйенеді.
import * as THREE from 'three';
import { Batcher, wallX, wallZ, deskSet, bookshelf, plant, plane, meshBox } from './builders.js';
import { getMaterials, lampMaterial } from './materials.js';
import { textPanel, poster } from './textures.js';

export const RH = 3.4;     // бөлме биіктігі (шартты)
const SH = 7;              // спорт залы биіктігі (шартты)
const EYE = 1.6;

const lampGeo = new THREE.BoxGeometry(0.22, 0.07, 1.25);
const lampBodyGeo = new THREE.BoxGeometry(0.3, 0.06, 1.35);

function textMat(key, text, opts) {
  return new THREE.MeshBasicMaterial({ map: textPanel(key, text, opts), toneMapped: false });
}

export function buildInterior() {
  const M = getMaterials();
  const group = new THREE.Group();
  group.name = 'interior';
  const b = new Batcher();
  const hotspots = [];
  const ceilings = [];
  const rooms = [];
  const pins = [];
  const walkRects = [];
  const lampMats = { shared: lampMaterial() };

  const room = (def) => {
    const r = { lamps: [], ...def };
    r.center = new THREE.Vector3((def.x0 + def.x1) / 2, 0, (def.z0 + def.z1) / 2);
    r.labelPos = new THREE.Vector3(r.center.x, (def.h ?? RH) + 0.6, r.center.z);
    r.labelPosIn = new THREE.Vector3(r.center.x, Math.min(def.h ?? RH, RH) - 1.0, r.center.z);
    rooms.push(r);
    walkRects.push([def.x0 + 0.45, def.x1 - 0.45, def.z0 + 0.45, def.z1 - 0.45]);
    // еден
    const fm = def.floorMat;
    const floor = plane(fm, def.x1 - def.x0, def.z1 - def.z0, r.center.x, 0.001, r.center.z, 0, -Math.PI / 2);
    floor.userData.floor = r.id;
    group.add(floor);
    r.floor = floor;
    // төбе
    const ceil = plane(M.ceiling, def.x1 - def.x0, def.z1 - def.z0, r.center.x, def.h ?? RH, r.center.z, 0, Math.PI / 2);
    group.add(ceil); ceilings.push(ceil);
    return r;
  };

  const door = (x0, x1, z0, z1) => walkRects.push([x0, x1, z0, z1]);

  const addLamp = (r, x, y, z, counted, rotY = 0) => {
    const body = new THREE.Mesh(lampBodyGeo, M.lampBody);
    body.position.set(x, y + 0.04, z); body.rotation.y = rotY;
    group.add(body);
    const tube = new THREE.Mesh(lampGeo, lampMats.shared);
    tube.position.set(x, y - 0.01, z); tube.rotation.y = rotY;
    tube.userData.hotspot = { kind: counted ? 'lamp' : 'lampExtra', roomId: r.id };
    tube.userData.lamp = { counted, roomId: r.id, index: r.lamps.length };
    group.add(tube);
    hotspots.push(tube);
    r.lamps.push(tube);
  };

  const hs = (mesh, kind, r, extra = {}) => {
    mesh.userData.hotspot = { kind, roomId: r.id, ...extra };
    hotspots.push(mesh);
    group.add(mesh);
    return mesh;
  };

  const pin = (kind, r, pos, label) => pins.push({ kind, roomId: r.id, pos, label });

  // ---------------- ДӘЛІЗ ----------------
  const corridor = room({ id: 'corridor', infoId: 'corridor', name: 'Дәліз', x0: -36, x1: 36, z0: -1.5, z1: 1.5, floorMat: M.tileCorridor });
  for (let x = -33; x <= 33; x += 6) addLamp(corridor, x, RH - 0.05, 0, false, Math.PI / 2);
  corridor.viewpoint = { pos: [-33, EYE, 0], look: [30, 1.4, 0] };

  // ---------------- СОЛТҮСТІК ҚАТАР: 8 КАБИНЕТ ----------------
  const northDefs = [
    { id: 'classA', infoId: 'classA', short: 'Типтік кабинет', name: 'Типтік кабинет', x0: -36, x1: -27, style: 'yellow' },
    { id: 'math', infoId: 'math', short: 'Математика', name: 'Математика кабинеті', x0: -27, x1: -18, style: 'math' },
    { id: 'computer', infoId: 'computer', short: 'Компьютер', name: 'Компьютер / ноутбук кабинеті', x0: -18, x1: -9, style: 'computer' },
    { id: 'reading', infoId: 'reading', short: 'Кітап бұрышы', name: 'Кітап бұрышы бар кабинет', x0: -9, x1: 0, style: 'reading' },
    { id: 'primary', infoId: 'primary', short: 'Бастауыш', name: 'Бастауыш сынып кабинеті', x0: 0, x1: 9, style: 'primary' },
    { id: 'typ1', infoId: 'module', short: 'Модуль', name: 'Типтік кабинет модулі', x0: 9, x1: 18, style: 'plain' },
    { id: 'typ2', infoId: 'module', short: 'Модуль', name: 'Типтік кабинет модулі', x0: 18, x1: 27, style: 'plain' },
    { id: 'typ3', infoId: 'module', short: 'Модуль', name: 'Типтік кабинет модулі', x0: 27, x1: 36, style: 'plain' },
  ];
  const z0 = -9.5, z1 = -1.5;
  for (const d of northDefs) {
    const r = room({ ...d, z0, z1, floorMat: M.wood, role: 'classroom' });
    const { x0, x1 } = d;
    const doorX = x1 - 1.4;
    r.doorX = doorX;
    door(doorX - 0.6, doorX + 0.6, -2.2, -0.8);
    // қабырға: аралық
    wallZ(b, M.wallWhite, x0, z0, z1, RH);
    // тақта (алдыңғы қабырға x0)
    const board = plane(M.chalk, 3.6, 1.2, x0 + 0.12, 1.6, (z0 + z1) / 2 + 0.6, Math.PI / 2);
    group.add(board);
    // терезелер (солтүстік сыртқы қабырға)
    for (const wx of [x0 + 2.6, x0 + 6.4]) {
      const glass = plane(M.windowGlass, 1.9, 1.8, wx, 1.85, z0 + 0.11);
      hs(glass, 'window', r);
      b.box(M.white, 2.1, 0.08, 0.32, wx, 0.92, z0 + 0.16);
      b.box(M.white, 0.06, 1.8, 0.04, wx, 1.85, z0 + 0.13);
      if (d.style === 'computer') {
        for (const s of [-1, 1]) group.add(plane(M.blueCurtain, 0.55, 2.3, wx + s * 1.05, 1.95, z0 + 0.3));
      } else {
        group.add(plane(M.curtain, 2.3, 2.3, wx, 1.95, z0 + 0.3));
      }
      plant(b, wx - 0.5, 0.96, z0 + 0.2, M, 0.7);
      // терезе астындағы панельдік құрылғы (фотобақылау)
      const panel = meshBox(M.radiatorPanel, 1.1, 0.55, 0.06, wx, 0.45, z0 + 0.15);
      hs(panel, 'panel', r);
    }
    pin('panel', r, new THREE.Vector3(x0 + 2.6, 1.05, z0 + 0.4), 'Панель');
    pin('window', r, new THREE.Vector3(x0 + 6.4, 2.95, z0 + 0.4), 'Терезе');
    // парталар
    for (let cx = 0; cx < 3; cx++) for (let rz = 0; rz < 4; rz++) {
      deskSet(b, x0 + 3.1 + cx * 2.05, z0 + 1.3 + rz * 1.55, Math.PI / 2, M);
    }
    // мұғалім үстелі
    b.box(M.deskTop, 0.7, 0.75, 1.4, x0 + 1.3, 0.38, z0 + 1.4);
    // 6 шам: 2 қатар × 3
    for (const lx of [x0 + 3.3, x0 + 6.3]) for (const lz of [z0 + 1.8, z0 + 4, z0 + 6.2]) addLamp(r, lx, RH - 0.05, lz, true);
    pin('lamp', r, new THREE.Vector3(x0 + 4.8, RH - 0.35, z0 + 4), '6 шам');

    // ---- стильдер ----
    if (d.style === 'yellow') {
      group.add(plane(M.wallYellow, 7.6, 1.6, (x0 + x1) / 2 + 0.6, 0.8, z1 - 0.12, Math.PI));
      group.add(plane(M.wallYellow, 7.6, 1.6, x1 - 0.12 - 0.0, 0.8, (z0 + z1) / 2, -Math.PI / 2));
      for (let i = 0; i < 4; i++) group.add(plane(new THREE.MeshLambertMaterial({ map: poster(i + 1) }), 0.8, 1.05, x0 + 2.2 + i * 1.6, 2.2, z1 - 0.13, Math.PI));
      bookshelf(b, x0 + 1.0, z0 + 0.4, 0, M, 1.2, 2);
    }
    if (d.style === 'math') {
      group.add(plane(M.trig, 6.6, 2.3, x1 - 0.12, 2.05, (z0 + z1) / 2, -Math.PI / 2));
      group.add(plane(textMat('mathq', 'МАТЕМАТИКА — БАРЛЫҚ ҒЫЛЫМНЫҢ ІРГЕТАСЫ', { bg: '#ffffff', fg: '#2a6fc0', font: 'bold 54px "Golos Text", Arial' }), 4.2, 0.55, (x0 + x1) / 2, 2.85, z1 - 0.13, Math.PI));
      bookshelf(b, x1 - 1.2, z0 + 0.4, 0, M, 1.3, 2);
    }
    if (d.style === 'computer') {
      // ноутбуктер
      const lapGroup = new THREE.Group();
      let n = 0;
      for (let cx = 0; cx < 3; cx++) for (let rz = 0; rz < 4; rz++) {
        if ((cx + rz) % 2 && n > 3) continue;
        const lx = x0 + 3.1 + cx * 2.05, lz = z0 + 1.3 + rz * 1.55 - 0.25;
        const base = meshBox(M.tvBlack, 0.35, 0.02, 0.25, lx, 0.77, lz); base.rotation.y = Math.PI / 2;
        const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.22), M.laptopScreen);
        scr.position.set(lx - 0.13, 0.89, lz); scr.rotation.set(0, Math.PI / 2, 0); scr.rotateX(-0.25);
        const back = meshBox(M.tvBlack, 0.015, 0.23, 0.35, lx - 0.14, 0.89, lz);
        for (const m of [base, scr, back]) { m.userData.hotspot = { kind: 'computer', roomId: r.id }; hotspots.push(m); lapGroup.add(m); }
        n++;
      }
      group.add(lapGroup);
      // мұғалім мониторы
      hs(meshBox(M.tvBlack, 0.08, 0.4, 0.6, x0 + 1.2, 1.0, z0 + 1.4), 'computer', r);
      // интерактивті панель тұғырда (фото 1000293791)
      const ip = new THREE.Group();
      const frame = meshBox(M.tvBlack, 0.08, 1.15, 1.95, 0, 1.6, 0);
      const scr = plane(M.boardScreen, 1.8, 1.0, 0.05, 1.6, 0, Math.PI / 2);
      const stand = meshBox(M.metal, 0.08, 1.1, 0.12, -0.02, 0.55, 0);
      const foot = meshBox(M.metal, 0.6, 0.06, 0.9, 0, 0.05, 0);
      for (const m of [frame, scr, stand, foot]) { m.userData.hotspot = { kind: 'board', roomId: r.id }; hotspots.push(m); ip.add(m); }
      ip.position.set(x0 + 0.7, 0, z1 - 1.3);
      group.add(ip);
      pin('board', r, new THREE.Vector3(x0 + 0.75, 2.45, z1 - 1.3), 'Панель');
      pin('computer', r, new THREE.Vector3(x0 + 5, 1.4, z0 + 3), 'Ноутбуктер');
      for (let i = 0; i < 4; i++) group.add(plane(new THREE.MeshLambertMaterial({ map: poster(10 + i, ['#1f5ea8', '#7cc4f2', '#e9f4fd']) }), 0.8, 1.05, x0 + 2.2 + i * 1.5, 2.1, z1 - 0.13, Math.PI));
    }
    if (d.style === 'reading') {
      for (let i = 0; i < 3; i++) {
        bookshelf(b, x0 + 2.4 + i * 1.75, z1 - 0.45, Math.PI, M, 1.7, 2.1);
        plant(b, x0 + 2.4 + i * 1.75, 2.1, z1 - 0.45, M, 1);
      }
      bookshelf(b, x1 - 0.45, (z0 + z1) / 2, -Math.PI / 2, M, 1.6, 2);
      plant(b, x0 + 0.6, 0, z1 - 0.7, M, 2.4);
      b.cyl(M.steel, 0.01, 0.01, 0.4, x0 + 1.4, 0.95, z0 + 1.0, 4);
      group.add(plane(new THREE.MeshLambertMaterial({ color: '#19b5d8', side: THREE.DoubleSide }), 0.3, 0.18, x0 + 1.55, 1.08, z0 + 1.0));
    }
    if (d.style === 'primary') {
      const pastel = ['#f7c6d9', '#fde68a', '#bfe3c8', '#bfdbfe'];
      pastel.forEach((c, i) => {
        const m = plane(new THREE.MeshLambertMaterial({ color: c }), 1.9, 1.9, x0 + 1.6 + i * 2, 1.8, z1 - 0.12, Math.PI);
        m.rotation.z = Math.PI / 4; group.add(m);
      });
      const tv = meshBox(M.tvBlack, 1.1, 0.65, 0.06, (x0 + x1) / 2 + 2.2, 2.2, z1 - 0.16);
      hs(tv, 'tv', r);
      hs(plane(M.tvScreen, 1.0, 0.56, (x0 + x1) / 2 + 2.2, 2.2, z1 - 0.2, Math.PI), 'tv', r);
      pin('tv', r, new THREE.Vector3((x0 + x1) / 2 + 2.2, 2.75, z1 - 0.3), 'Экран');
      b.box(M.white, 0.5, 0.2, 0.4, x1 - 0.5, 0.85, z1 - 1.6);
      b.cyl(M.white, 0.08, 0.08, 0.8, x1 - 0.5, 0.4, z1 - 1.6, 8);
      group.add(plane(textMat('nums', '1  2  3  4  5  6  7  8  9  10', { bg: '#ffffff', fg: '#e0503a', font: 'bold 80px Arial' }), 3.6, 0.5, x0 + 0.13, 2.65, (z0 + z1) / 2 + 0.6, Math.PI / 2));
    }
    if (d.style === 'plain') {
      for (let i = 0; i < 3; i++) group.add(plane(new THREE.MeshLambertMaterial({ map: poster(20 + i + x0, ['#2d8fd6', '#f6d24a', '#ffffff']) }), 0.8, 1.05, x0 + 2.4 + i * 1.8, 2.1, z1 - 0.13, Math.PI));
      group.add(plane(textMat('mod' + d.id, 'ТИПТІК МОДУЛЬ', { bg: '#e8f1fb', fg: '#1f5ea8', font: 'bold 70px "Golos Text", Arial' }), 1.8, 0.3, x1 - 0.12, 2.9, (z0 + z1) / 2, -Math.PI / 2));
    }
    r.viewpoint = d.style === 'math'
      ? { pos: [x0 + 1.0, EYE, z1 - 0.8], look: [x1 - 0.3, 1.7, (z0 + z1) / 2 - 0.6] }
      : { pos: [x1 - 0.9, EYE, z1 - 0.9], look: [x0 + 1.5, 1.25, z0 + 2.2] };
  }
  // солтүстік сыртқы қабырға, дәліздің солтүстік қабырғасы
  wallX(b, M.wallWhite, z0, -36, 36, RH);
  wallX(b, M.wallWhite, -1.5, -36, 36, RH, northDefs.map((d) => ({ c: d.x1 - 1.4, w: 1.1 })));
  // дәліздің төменгі боялған бөлігі (фото 1000293797)
  const bandSegments = (z, gaps, rot) => {
    let cur = -36;
    for (const g of [...gaps, { a: 36, e: 36 }].sort((p, q) => p.a - q.a)) {
      if (g.a - cur > 0.05) group.add(plane(M.wallTeal, g.a - cur, 1.3, (cur + g.a) / 2, 0.65, z, rot));
      cur = g.e;
    }
  };
  bandSegments(-1.38, northDefs.map((d) => ({ a: d.x1 - 1.95, e: d.x1 - 0.85 })), 0);
  bandSegments(1.38, [{ a: -21.55, e: -20.45 }, { a: -2.8, e: 2.8 }, { a: 12.45, e: 13.55 }], Math.PI);
  for (let i = 0; i < 8; i++) group.add(plane(new THREE.MeshLambertMaterial({ map: poster(40 + i) }), 0.9, 1.2, -31.5 + i * 8.5, 1.95, -1.38));

  // ---------------- ОҢТҮСТІК: АКТ ЗАЛЫ ----------------
  const hall = room({ id: 'hall', infoId: 'hall', name: 'Акт залы', x0: -36, x1: -18, z0: 1.5, z1: 13.5, floorMat: M.woodLong, role: 'other' });
  door(-21.6, -20.4, 0.8, 2.2);
  wallZ(b, M.wallWhite, -18, 1.5, 13.5, RH);
  wallX(b, M.wallWhite, 13.5, -36, -18, RH);
  // сахна (батыс жақ)
  b.box(M.stage, 4, 0.6, 12, -34, 0.3, 7.5);
  const scr = plane(M.screen, 5.2, 2.4, -35.85, 2.0, 7.5, Math.PI / 2);
  hs(scr, 'projector', hall);
  for (const s of [-1, 1]) {
    group.add(plane(M.curtainPink, 2.6, 2.9, -33.2, 2.05, 7.5 + s * 4.2, Math.PI / 2));
  }
  group.add(plane(M.ornament, 11.8, 0.6, -33.25, RH - 0.35, 7.5, Math.PI / 2));
  const proj = meshBox(M.white, 0.45, 0.18, 0.4, -24, RH - 0.35, 7.5);
  hs(proj, 'projector', hall);
  b.box(M.metal, 0.05, 0.25, 0.05, -24, RH - 0.12, 7.5);
  for (const s of [-1, 1]) hs(meshBox(M.speaker, 0.45, 0.8, 0.45, -35.3, 1.0, 7.5 + s * 3.4), 'speaker', hall);
  pin('projector', hall, new THREE.Vector3(-35.6, 3.35, 7.5), 'Экран');
  pin('projector', hall, new THREE.Vector3(-24, 2.75, 7.5), 'Проектор');
  // көрермен орындықтары (қара)
  for (let rI = 0; rI < 6; rI++) for (let c = 0; c < 9; c++) {
    const x = -29.5 + rI * 1.6, z = 3.4 + c * 0.95 + (c > 4 ? 0.8 : 0);
    b.box(M.blackChair, 0.45, 0.06, 0.45, x, 0.46, z);
    b.box(M.blackChair, 0.06, 0.5, 0.45, x + 0.22, 0.75, z);
    b.box(M.metal, 0.04, 0.46, 0.04, x, 0.23, z);
  }
  b.box(M.white, 1.0, 0.76, 2.6, -31.5, 0.38, 11.6);
  for (const wx of [-32, -27, -22]) {
    hs(plane(M.windowGlass, 1.9, 1.8, wx, 1.85, 13.39, Math.PI), 'window', hall);
    group.add(plane(M.curtain, 2.3, 2.3, wx, 1.95, 13.2, Math.PI));
  }
  for (const lx of [-30, -26, -22]) for (const lz of [4.5, 10.5]) addLamp(hall, lx, RH - 0.05, lz, false);
  hall.viewpoint = { pos: [-19, EYE + 0.2, 12.4], look: [-34.5, 1.6, 6.5] };

  // ---------------- ФОЙЕ ----------------
  const lobby = room({ id: 'lobby', infoId: 'lobby', name: 'Кіреберіс фойе', x0: -6, x1: 6, z0: 1.5, z1: 10, floorMat: M.tileLobby, role: 'other' });
  door(-2.8, 2.8, 0.8, 2.2);
  wallZ(b, M.wallWhite, -6, 1.5, 10, RH);
  wallZ(b, M.wallWhite, 6, 1.5, 10, RH);
  wallX(b, M.wallWhite, 10, -6, 6, RH, [{ c: 0, w: 2.2, h: 2.6 }]);
  // шыны кіру есігі — сыртқа шығу
  const exitDoor = plane(new THREE.MeshLambertMaterial({ color: '#cfe8fb', emissive: '#4a8fd0', emissiveIntensity: 0.35, side: THREE.DoubleSide }), 2.1, 2.5, 0, 1.25, 9.98, Math.PI);
  exitDoor.userData.hotspot = { kind: 'exit', roomId: 'lobby' };
  hotspots.push(exitDoor); group.add(exitDoor);
  pin('exit', lobby, new THREE.Vector3(0, 2.9, 9.7), 'Сыртқа');
  for (const s of [-1, 1]) group.add(plane(M.wallBlueLow, 8.5, 1.4, s * 5.88, 0.7, 5.75, s > 0 ? -Math.PI / 2 : Math.PI / 2));
  group.add(plane(textMat('welcome', 'Қош келдіңіздер!', { bg: '#dff1fb', fg: '#c9a400', font: 'italic bold 92px "Golos Text", Georgia, serif', border: '#4a9fd8' }), 5.5, 0.75, 0, 2.9, 1.62));
  // екінші қабатқа қызыл баспалдақ (фото 1000293810)
  for (let i = 0; i < 9; i++) b.box(M.redStair, 1.6, 0.18, 0.32, 4.6, 0.09 + i * 0.18, 2.4 + i * 0.32 + 0.16);
  b.box(M.metal, 0.05, 1, 3, 3.75, 1.4, 3.8);
  // шарлар
  const balloonGeo = new THREE.SphereGeometry(0.16, 12, 10);
  const red = new THREE.MeshLambertMaterial({ color: '#d81f2a' });
  for (const [bx, bz] of [[-5.4, 2.2], [-5.4, 6.5], [5.4, 7.6], [-1.8, 9.4], [1.8, 9.4]]) { const m = new THREE.Mesh(balloonGeo, red); m.position.set(bx, RH - 0.3, bz); group.add(m); }
  plant(b, -5.3, 0, 8.8, M, 2.6);
  plant(b, -5.3, 0, 3.2, M, 2.2);
  for (const lx of [-3, 3]) for (const lz of [4, 7.5]) addLamp(lobby, lx, RH - 0.05, lz, false, Math.PI / 2);
  lobby.viewpoint = { pos: [0, EYE, 9.2], look: [0, 1.5, 0] };

  // ---------------- АСХАНА + АСҮЙ ----------------
  const canteen = room({ id: 'canteen', infoId: 'canteen', name: 'Асхана және асүй', x0: 10, x1: 28, z0: 1.5, z1: 11.5, floorMat: M.tile, role: 'other' });
  door(12.4, 13.6, 0.8, 2.2);
  wallZ(b, M.wallWhite, 10, 1.5, 11.5, RH);
  wallZ(b, M.wallWhite, 28, 1.5, 11.5, RH);
  wallZ(b, M.wallWhite, 22, 1.5, 11.5, RH, [{ c: 6.5, w: 2.4, h: 2.3 }, { c: 3, w: 1.1 }]);
  wallX(b, M.wallWhite, 11.5, 10, 28, RH);
  wallX(b, M.wallWhite, 1.5, -36, 36, RH, [{ c: -21, w: 1.1 }, { c: 0, w: 5.6, h: 2.9 }, { c: 13, w: 1.1 }]);
  // үстелдер
  for (const tz of [4, 7, 10]) {
    b.box(M.deskTop, 7.5, 0.05, 0.9, 15.8, 0.75, tz);
    for (const ex of [-3.6, 3.6]) b.box(M.deskTop, 0.05, 0.72, 0.85, 15.8 + ex, 0.37, tz);
    for (let c = 0; c < 6; c++) for (const s of [-1, 1]) {
      const x = 13 + c * 1.15, z = tz + s * 0.7;
      b.box(M.blackChair, 0.42, 0.06, 0.42, x, 0.46, z);
      b.box(M.blackChair, 0.42, 0.5, 0.05, x, 0.74, z + s * 0.2);
    }
  }
  group.add(plane(textMat('ashana', 'АСХАНА', { bg: '#fff7e0', fg: '#d8282f', font: 'bold 110px "Golos Text", Arial', border: '#f2b632' }), 2.4, 0.5, 21.88, 2.85, 6.5, -Math.PI / 2));
  for (const wx of [13, 18]) { hs(plane(M.windowGlass, 1.9, 1.8, wx, 1.85, 11.39, Math.PI), 'window', canteen); }
  // асүй: көк плитка қабырға, плита, сорғыш, тоңазытқыш
  group.add(plane(M.tileBlue, 5.8, 1.8, 25, 1.4, 11.38, Math.PI));
  hs(meshBox(M.steel, 1.6, 0.85, 0.8, 24.2, 0.43, 10.9), 'kitchen', canteen);
  hs(meshBox(M.tvBlack, 1.6, 0.03, 0.8, 24.2, 0.87, 10.9), 'kitchen', canteen);
  b.box(M.steel, 2, 0.5, 0.9, 24.2, 2.7, 10.95);
  hs(meshBox(M.fridge, 0.8, 1.9, 0.7, 27.4, 0.95, 8.5), 'kitchen', canteen);
  b.box(M.steel, 3.2, 0.9, 0.7, 23.2, 0.45, 6.5);
  pin('kitchen', canteen, new THREE.Vector3(24.2, 1.6, 10.6), 'Асүй жабдығы');
  for (const lx of [13, 17, 21]) for (const lz of [4, 9]) addLamp(canteen, lx, RH - 0.05, lz, false, Math.PI / 2);
  addLamp(canteen, 25, RH - 0.05, 5, false, Math.PI / 2);
  canteen.viewpoint = { pos: [10.8, EYE, 2.3], look: [26, 1.1, 10] };

  // ---------------- СПОРТ ЗАЛЫ ----------------
  const sport = room({ id: 'sport', infoId: 'sport', name: 'Спорт залы', x0: 36, x1: 56, z0: -10, z1: 10, h: SH, floorMat: M.sportFloor, role: 'sport' });
  door(35.3, 36.7, -0.6, 0.6);
  wallZ(b, M.wallWhite, 36, -10, 10, SH, [{ c: 0, w: 1.4, h: 2.4 }]);
  wallZ(b, M.wallWhite, 56, -10, 10, SH);
  wallX(b, M.wallWhite, -10, 36, 56, SH);
  wallX(b, M.wallWhite, 10, 36, 56, SH);
  // қабырғаның төменгі көк бөлігі
  group.add(plane(M.sportBlue, 20, 2.6, 46, 1.3, -9.88));
  group.add(plane(M.sportBlue, 20, 2.6, 46, 1.3, 9.88, Math.PI));
  group.add(plane(M.sportBlue, 20, 2.6, 55.88, 1.3, 0, -Math.PI / 2));
  group.add(plane(M.sportBlue, 9.3, 2.6, 36.12, 1.3, -5.35, Math.PI / 2));
  group.add(plane(M.sportBlue, 9.3, 2.6, 36.12, 1.3, 5.35, Math.PI / 2));
  // жоғарғы терезелер
  for (let x = 39; x <= 53; x += 3.5) for (const s of [-1, 1]) {
    hs(plane(M.windowGlass, 1.9, 1.8, x, 4.6, s * 9.89, s > 0 ? Math.PI : 0), 'window', sport);
  }
  // ағаш орындықтар
  for (const s of [-1, 1]) { b.box(M.chair, 16, 0.08, 0.45, 46, 0.45, s * 9.4); b.box(M.chair, 16, 0.6, 0.06, 46, 0.75, s * 9.7); }
  // волейбол торы
  for (const s of [-1, 1]) b.cyl(M.blueDark, 0.06, 0.06, 2.6, 46, 1.3, s * 8.6, 8);
  group.add(plane(new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, side: THREE.DoubleSide }), 17.2, 0.9, 46, 2.1, 0, Math.PI / 2));
  // баскетбол қалқандары
  for (const [x, rot] of [[36.3, Math.PI / 2], [55.7, -Math.PI / 2]]) {
    group.add(plane(new THREE.MeshLambertMaterial({ color: '#d7ecfb', side: THREE.DoubleSide }), 1.8, 1.1, x, 3.3, 0 + (x > 50 ? 0 : 4.2), rot));
  }
  // қабырға сатысы
  for (let i = 0; i < 4; i++) { b.box(M.chair, 0.06, 3, 0.06, 55.8, 1.5, -6 + i * 0.9); }
  for (let k = 0; k < 10; k++) b.box(M.chair, 0.05, 0.05, 2.8, 55.75, 0.3 + k * 0.28, -4.65);
  // доп
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), new THREE.MeshLambertMaterial({ color: '#9b4a22' }));
  ball.position.set(44, 0.12, 2); group.add(ball);
  // 15 шам: 3 × 5
  for (const lz of [-6, 0, 6]) for (let i = 0; i < 5; i++) addLamp(sport, 39 + i * 3.5, SH - 0.1, lz, true);
  pin('lamp', sport, new THREE.Vector3(46, SH - 0.5, 0), '15 шам');
  sport.viewpoint = { pos: [37.4, 2.0, 8.6], look: [54, 1.4, -6] };

  // батыс шеткі қабырға
  wallZ(b, M.wallWhite, -36, -1.5, 13.5, RH);
  // қалған оңтүстік бос аймақтар (шартты, кірмейтін)
  wallX(b, M.wallWhite, 10.6, -18, -6, RH);
  wallX(b, M.wallWhite, 10, 6, 10, RH);
  wallX(b, M.wallWhite, 11.5, 28, 36, RH);

  b.flush(group);

  // бөлмелердің индексі
  const byId = Object.fromEntries(rooms.map((r) => [r.id, r]));

  return {
    group, hotspots, ceilings, rooms, byId, pins, walkRects,
    lampMats,
    bounds: { x0: -36, x1: 56, z0: -10, z1: 13.5 },
    overview: { pos: [6, 82, 52], look: [6, 0, 1] },
  };
}
