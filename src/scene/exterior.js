// Мектептің сыртқы көрінісі — 1000293803/804/805 фотоларына сүйенген СХЕМАЛЫҚ модель.
// Белгілер: екі қабат, ақ сайдинг, көк шатыр мен үшбұрышты шатыр терезелері, көк терезе жиектері,
// шыны кіреберіс пен көк қалқа, сары баспалдақ, көк тұтқалы пандус, оң жақ қанат, қоршау мен қақпа, қарағай.
import * as THREE from 'three';
import { Batcher, plane, meshBox, pineTree } from './builders.js';
import { getMaterials } from './materials.js';

const H = 7.2; // қабырға биіктігі (шартты)

function windowAt(b, glassB, M, x, y, z, face) {
  // face: 'z+' | 'z-' | 'x-' | 'x+'
  const o = 0.06;
  if (face[0] === 'z') {
    const s = face[1] === '+' ? 1 : -1;
    b.box(M.blueTrim, 1.75, 1.65, 0.1, x, y, z + s * o);
    b.box(M.white, 1.45, 1.35, 0.1, x, y, z + s * (o + 0.03));
    glassB.box(M.extGlass, 1.3, 1.2, 0.05, x, y, z + s * (o + 0.07));
    b.box(M.white, 0.06, 1.2, 0.06, x - 0.2, y, z + s * (o + 0.1));
    b.box(M.white, 1.75, 0.08, 0.3, x, y - 0.86, z + s * 0.15);
  } else {
    const s = face[1] === '+' ? 1 : -1;
    b.box(M.blueTrim, 0.1, 1.65, 1.75, x + s * o, y, z);
    b.box(M.white, 0.1, 1.35, 1.45, x + s * (o + 0.03), y, z);
    glassB.box(M.extGlass, 0.05, 1.2, 1.3, x + s * (o + 0.07), y, z);
    b.box(M.white, 0.3, 0.08, 1.75, x + s * 0.15, y - 0.86, z);
  }
}

function gableTriangle(material, width, rise) {
  const s = new THREE.Shape();
  s.moveTo(-width / 2, 0); s.lineTo(width / 2, 0); s.lineTo(0, rise); s.closePath();
  return new THREE.Mesh(new THREE.ShapeGeometry(s), material);
}

export function buildExterior() {
  const M = getMaterials();
  const group = new THREE.Group();
  group.name = 'exterior';
  const b = new Batcher();
  const glassB = new Batcher();
  const hotspots = [];

  // --- Жер, асфальт ---
  const ground = plane(M.grass, 300, 300, 0, 0, 0, 0, -Math.PI / 2);
  group.add(ground);
  const yard = plane(M.asphalt, 80, 24, 6, 0.02, 15, 0, -Math.PI / 2);
  group.add(yard);

  // --- Негізгі блок ---
  b.box(M.siding, 44, H, 12, 0, H / 2, 0);
  b.box(M.plinth, 44.3, 0.6, 12.3, 0, 0.3, 0);
  b.box(M.blueTrim, 44.4, 0.35, 12.4, 0, H - 0.1, 0);          // көк корниз
  b.box(M.blueTrim, 44.3, 0.12, 12.3, 0, 3.75, 0);              // қабат арасы жолақ

  // --- Оң жақ қанат (перпендикуляр) ---
  b.box(M.sidingWing, 12, H, 24, 28, H / 2, 6);
  b.box(M.plinth, 12.3, 0.6, 24.3, 28, 0.3, 6);
  b.box(M.blueTrim, 12.4, 0.35, 24.4, 28, H - 0.1, 6);
  b.box(M.blueTrim, 12.3, 0.12, 24.3, 28, 3.75, 6);

  // --- Терезелер ---
  for (let x = -20; x <= 20; x += 3.4) {
    for (const y of [2.2, 5.4]) {
      if (y < 3 && Math.abs(x) < 4.8) continue; // кіреберіс
      if (y < 3 && x > 16) continue;            // бүйір есік
      windowAt(b, glassB, M, x, y, 6, 'z+');
      windowAt(b, glassB, M, x, y, -6, 'z-');
    }
  }
  for (let z = 8.5; z <= 16.5; z += 2.8) for (const y of [2.2, 5.4]) windowAt(b, glassB, M, 22, y, z, 'x-');
  for (let z = -3; z <= 16; z += 3.2) for (const y of [2.2, 5.4]) windowAt(b, glassB, M, 34, y, z, 'x+');
  for (const x of [25, 28, 31]) for (const y of [2.2, 5.4]) windowAt(b, glassB, M, x, y, 18, 'z+');

  // бүйір қоңыр есік (фотода қанат жанында)
  b.box(M.door, 1.4, 2.4, 0.12, 19, 1.5, 6.08);
  b.box(M.blueTrim, 2.2, 0.15, 1.2, 19, 2.9, 6.6);

  // --- Негізгі шатыр (қос беткей) ---
  const rise = 2.6, half = 6.8;
  const slopeW = Math.hypot(half, rise), ang = Math.atan2(rise, half);
  for (const s of [1, -1]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(45.6, 0.16, slopeW), M.roof);
    m.position.set(-0.8, H + rise / 2, (s * half) / 2);
    m.rotation.x = s * ang;
    group.add(m);
  }
  for (const x of [-22.0]) {
    const tri = gableTriangle(M.white, 12.4, rise - 0.1);
    tri.position.set(x - 0.01, H, 0); tri.rotation.y = -Math.PI / 2; group.add(tri);
  }
  // қанат шатыры
  for (const s of [1, -1]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, slopeW * (12.6 / 13.6), 25.4), M.roofWing);
    const hw = 6.3;
    const sw = Math.hypot(hw, rise), a2 = Math.atan2(rise, hw);
    m.geometry.dispose();
    m.geometry = new THREE.BoxGeometry(sw, 0.16, 25.4);
    m.position.set(28 + (s * hw) / 2, H + rise / 2, 6);
    m.rotation.z = -s * a2;
    group.add(m);
  }
  const triW = gableTriangle(M.white, 12.4, rise - 0.1);
  triW.position.set(28, H, 18.02); group.add(triW);

  // үшбұрышты шатыр терезелері (фотодағы «дормерлер»)
  for (const x of [-11, 0.5, 11]) {
    const d = gableTriangle(M.white, 2.4, 1.7);
    d.position.set(x, H + 0.55, 4.05); group.add(d);
    const shape = new THREE.Shape(); shape.moveTo(-1.35, 0); shape.lineTo(1.35, 0); shape.lineTo(0, 1.9); shape.closePath();
    const eg = new THREE.ExtrudeGeometry(shape, { depth: 2.2, bevelEnabled: false });
    const em = new THREE.Mesh(eg, M.blue); em.position.set(x, H + 0.5, 1.8); group.add(em);
  }
  // желдету құбырлары
  for (const [x, z] of [[-17, -1.5], [-6, -1.5], [6, -1.5], [15, -1.5], [-12, 1], [20, 0.5], [28, 10]]) {
    b.cyl(M.steel, 0.22, 0.22, 1.6, x, H + rise - Math.abs(z) * (rise / half) + 0.6, z, 10);
    b.cyl(M.steel, 0.38, 0.38, 0.12, x, H + rise - Math.abs(z) * (rise / half) + 1.45, z, 10);
  }

  // --- Кіреберіс (шыны вестибюль, көк қалқа) ---
  const vx = 0, vz0 = 6, vz1 = 9.6, vw = 8.4, vh = 3.3;
  b.box(M.white, vw, 0.3, vz1 - vz0, vx, vh, (vz0 + vz1) / 2);
  for (let x = -vw / 2; x <= vw / 2 + 0.01; x += vw / 8) b.box(M.white, 0.1, vh, 0.12, vx + x, vh / 2, vz1);
  b.box(M.white, vw, 0.1, 0.12, vx, 2.3, vz1);
  for (const s of [-1, 1]) for (let z = vz0; z <= vz1; z += 1.2) b.box(M.white, 0.12, vh, 0.1, vx + (s * vw) / 2, vh / 2, z);
  const vglass = new THREE.Mesh(new THREE.BoxGeometry(vw, vh - 0.3, vz1 - vz0), M.vestGlass);
  vglass.position.set(vx, (vh - 0.3) / 2, (vz0 + vz1) / 2);
  group.add(vglass);
  // қалқа шатыр
  const hip = new THREE.ConeGeometry(1, 1, 4, 1, false, Math.PI / 4);
  hip.scale(7.6, 1.3, 3.4);
  const hipM = new THREE.Mesh(hip, M.roof);
  hipM.position.set(vx, vh + 0.75, (vz0 + vz1) / 2 + 0.3);
  group.add(hipM);
  b.box(M.blueTrim, vw + 1.2, 0.35, vz1 - vz0 + 1, vx, vh + 0.12, (vz0 + vz1) / 2 + 0.3);
  // туы бар діңгек
  b.cyl(M.steel, 0.05, 0.05, 4, vx, H + 2.2, 5.6, 6);
  const flag = plane(new THREE.MeshLambertMaterial({ color: '#19b5d8', side: THREE.DoubleSide }), 1.3, 0.75, vx + 0.68, H + 3.7, 5.6);
  group.add(flag);

  // кіру есігі — hotspot
  const door = meshBox(new THREE.MeshLambertMaterial({ color: '#cfe8fb', emissive: '#2a6fb0', emissiveIntensity: 0.25 }), 2, 2.3, 0.1, vx, 1.15 + 0.8, vz1 + 0.02);
  door.userData.hotspot = { kind: 'enter', title: '3D мектепке кіру' };
  group.add(door); hotspots.push(door);
  b.box(M.blueTrim, 2.6, 0.5, 0.1, vx, 3.0, vz1 + 0.05);

  // баспалдақ
  for (let i = 0; i < 4; i++) b.box(M.stepOrange, 7.4 - i * 0.2, 0.2, 2.2 - i * 0.5, vx + 0.4, 0.1 + i * 0.2, vz1 + 1.1 - i * 0.25);
  b.box(M.stepOrange, vw, 0.8, 0.2, vx, 0.4, vz1 - 0.05);
  // пандус + көк тұтқа
  const rampLen = 10;
  const ramp = new THREE.BoxGeometry(rampLen, 0.15, 1.3);
  ramp.rotateZ(Math.atan2(0.8, rampLen));
  ramp.translate(vx - 4.2 - rampLen / 2, 0.42, vz1 + 1.5);
  b.add(M.stepOrange, ramp);
  for (const dz of [-0.65, 0.65]) {
    for (let i = 0; i <= 8; i++) {
      const x = vx - 4.2 - i * (rampLen / 8);
      const y = 0.8 - (i / 8) * 0.8;
      b.box(M.railBlue, 0.06, 1, 0.06, x, y + 0.5, vz1 + 1.5 + dz);
    }
    const rail = new THREE.BoxGeometry(rampLen, 0.07, 0.07);
    rail.rotateZ(Math.atan2(0.8, rampLen));
    rail.translate(vx - 4.2 - rampLen / 2, 1.42, vz1 + 1.5 + dz);
    b.add(M.railBlue, rail);
  }

  // --- Қоршау мен қақпа ---
  const fz = 27;
  b.box(M.curb, 96, 0.35, 0.4, 4, 0.17, fz);
  for (let x = -44; x <= 52; x += 3) {
    const isGate = x > -6 && x < 9;
    b.box(isGate ? M.postGreen : M.railBlue, 0.22, isGate ? 2.7 : 2, 0.22, x, isGate ? 1.35 : 1, fz);
    if (isGate) b.box(M.railBlue, 0.3, 0.2, 0.3, x, 2.75, fz);
  }
  const gateMesh = new THREE.Mesh(new THREE.PlaneGeometry(96, 1.8), M.gate);
  gateMesh.material = M.gate;
  gateMesh.geometry.attributes.uv.array.forEach((v, i, arr) => { if (i % 2 === 0) arr[i] = v * 32; });
  M.gate.map.repeat.set(1, 1);
  gateMesh.position.set(4, 1.15, fz);
  group.add(gateMesh);

  // ағаштар
  for (const [x, z, h] of [[-30, 18, 10], [-36, 8, 8], [42, 22, 9], [-26, -14, 9], [12, -16, 10], [46, 2, 8]]) pineTree(b, x, z, M, h);
  for (const [x, z] of [[-14, 12], [-9, 12.5], [14, 12], [22, 20]]) {
    const g = new THREE.IcosahedronGeometry(1, 0); g.scale(1.2, 0.8, 1.2); g.translate(x, 0.6, z); b.add(M.leaf, g);
  }

  b.flush(group);
  // терезе шынылары — hotspot (табиғи жарық)
  const glassGroup = new THREE.Group();
  glassB.flush(glassGroup);
  glassGroup.children.forEach((m) => { m.userData.hotspot = { kind: 'window', title: 'Терезе және табиғи жарық' }; hotspots.push(m); });
  group.add(glassGroup);

  return {
    group,
    hotspots,
    center: new THREE.Vector3(6, 3, 4),
    doorPos: new THREE.Vector3(vx, 1.6, vz1 + 3.5),
    labelAnchors: {
      school: new THREE.Vector3(-4, H + 5.2, 0),
      door: new THREE.Vector3(vx, 5.6, vz1 + 0.5),
    },
  };
}
