// Геометрия көмекшілері. Batcher — көп ұсақ бөлшекті бір материалға біріктіріп, draw call санын азайтады.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const matCache = new Map();
/** Lambert материалы (мобильдіге жеңіл) */
export function mat(color, opts = {}) {
  const key = JSON.stringify([color, Object.keys(opts).sort().map((k) => [k, opts[k] && opts[k].uuid ? opts[k].uuid : opts[k]])]);
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshLambertMaterial({ color, ...opts });
  matCache.set(key, m);
  return m;
}

export class Batcher {
  constructor() { this.buckets = new Map(); }
  /** w,h,d өлшемді қорапты (x,y,z) центрге, rotY бұрышымен қосу */
  box(material, w, h, d, x, y, z, rotY = 0) {
    const g = new THREE.BoxGeometry(w, h, d);
    if (rotY) g.rotateY(rotY);
    g.translate(x, y, z);
    this.add(material, g);
  }
  cyl(material, rt, rb, h, x, y, z, seg = 10) {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg);
    g.translate(x, y, z);
    this.add(material, g);
  }
  add(material, geom) {
    const g = geom.index ? geom.toNonIndexed() : geom;
    if (!g.attributes.uv) return;
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!this.buckets.has(material)) this.buckets.set(material, []);
    this.buckets.get(material).push(g);
  }
  flush(parent) {
    for (const [m, list] of this.buckets) {
      const merged = mergeGeometries(list, false);
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, m);
      mesh.matrixAutoUpdate = false;
      parent.add(mesh);
      list.forEach((g) => g.dispose());
    }
    this.buckets.clear();
  }
}

/** Жеке меш (hotspot үшін — біріктірілмейді) */
export function meshBox(material, w, h, d, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  return m;
}

export function plane(material, w, h, x, y, z, rotY = 0, rotX = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  m.position.set(x, y, z);
  m.rotation.set(rotX, rotY, 0, 'YXZ');
  return m;
}

/**
 * X осі бойындағы қабырға (z тұрақты), x0..x1 аралығында, gaps: [{c, w, h}] — есік/ойық.
 * Есік үстіне арқалық (lintel) қосылады.
 */
export function wallX(b, material, z, x0, x1, H, gaps = [], t = 0.2) {
  const sorted = [...gaps].sort((a, c) => a.c - c.c);
  let cur = x0;
  for (const gp of sorted) {
    const a = gp.c - gp.w / 2, e = gp.c + gp.w / 2;
    if (a > cur) b.box(material, a - cur, H, t, (cur + a) / 2, H / 2, z);
    const gh = gp.h ?? 2.3;
    if (gh < H) b.box(material, gp.w, H - gh, t, gp.c, gh + (H - gh) / 2, z);
    cur = e;
  }
  if (x1 > cur) b.box(material, x1 - cur, H, t, (cur + x1) / 2, H / 2, z);
}

/** Z осі бойындағы қабырға (x тұрақты) */
export function wallZ(b, material, x, z0, z1, H, gaps = [], t = 0.2) {
  const sorted = [...gaps].sort((a, c) => a.c - c.c);
  let cur = z0;
  for (const gp of sorted) {
    const a = gp.c - gp.w / 2, e = gp.c + gp.w / 2;
    if (a > cur) b.box(material, t, H, a - cur, x, H / 2, (cur + a) / 2);
    const gh = gp.h ?? 2.3;
    if (gh < H) b.box(material, t, H - gh, gp.w, x, gh + (H - gh) / 2, gp.c);
    cur = e;
  }
  if (z1 > cur) b.box(material, t, H, z1 - cur, x, H / 2, (cur + z1) / 2);
}

/** Мектеп партасы + 2 орындық (фотодағы ағаш-металл үлгі) */
export function deskSet(b, x, z, rotY = 0, M) {
  const c = Math.cos(rotY), s = Math.sin(rotY);
  const P = (dx, dz) => [x + dx * c + dz * s, z - dx * s + dz * c];
  let [px, pz] = P(0, 0);
  b.box(M.deskTop, 1.2, 0.04, 0.5, px, 0.74, pz, rotY);
  for (const [dx, dz] of [[-0.55, -0.2], [0.55, -0.2], [-0.55, 0.2], [0.55, 0.2]]) { [px, pz] = P(dx, dz); b.box(M.metal, 0.04, 0.72, 0.04, px, 0.36, pz, rotY); }
  [px, pz] = P(0, -0.22); b.box(M.deskTop, 1.15, 0.3, 0.02, px, 0.55, pz, rotY);
  for (const dx of [-0.3, 0.3]) {
    [px, pz] = P(dx, 0.55); b.box(M.chair, 0.4, 0.04, 0.38, px, 0.44, pz, rotY);
    [px, pz] = P(dx, 0.75); b.box(M.chair, 0.4, 0.3, 0.03, px, 0.72, pz, rotY);
    for (const [ex, ez] of [[-0.17, -0.15], [0.17, -0.15], [-0.17, 0.15], [0.17, 0.15]]) { [px, pz] = P(dx + ex, 0.55 + ez); b.box(M.metal, 0.03, 0.44, 0.03, px, 0.22, pz, rotY); }
  }
}

export function bookshelf(b, x, z, rotY, M, w = 1.6, h = 2) {
  const c = Math.cos(rotY), s = Math.sin(rotY);
  b.box(M.shelf, w, h, 0.4, x, h / 2, z, rotY);
  const colors = [M.bookA, M.bookB, M.bookC];
  for (let r = 0; r < 4; r++) {
    for (let i = 0; i < 6; i++) {
      const dx = -w / 2 + 0.15 + i * (w - 0.3) / 6 + 0.1;
      const dz = 0.21;
      b.box(colors[(r + i) % 3], 0.16, 0.3, 0.05, x + dx * c + dz * s, 0.3 + r * (h / 4.3), z - dx * s + dz * c, rotY);
    }
  }
}

export function plant(b, x, y, z, M, scale = 1) {
  b.cyl(M.pot, 0.12 * scale, 0.09 * scale, 0.18 * scale, x, y + 0.09 * scale, z);
  const g = new THREE.IcosahedronGeometry(0.28 * scale, 0);
  g.translate(x, y + 0.4 * scale, z);
  b.add(M.leaf, g);
}

export function pineTree(b, x, z, M, h = 9) {
  b.cyl(M.trunk, 0.18, 0.25, 1.2, x, 0.6, z, 6);
  for (let i = 0; i < 4; i++) {
    const g = new THREE.ConeGeometry(2.4 - i * 0.5, h / 3, 8);
    g.translate(x, 1.2 + i * (h / 5) + h / 6, z);
    b.add(M.pine, g);
  }
}
