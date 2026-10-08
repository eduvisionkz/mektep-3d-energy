// WebGL 3D мектеп: сахна, камера, басқару, режимдер, hotspot.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { buildExterior } from './exterior.js';
import { buildInterior } from './interior.js';
import { LAMP_COLORS } from './materials.js';
import { skyTexture } from './textures.js';
import { lampDay, mixedDay, fmt } from '../model/energy.js';
import { MODEL, REAL } from '../data/schoolData.js';

const EYE = 1.6;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Салыстырмалы түс шкаласы (жылукамера емес): 0 → көгілдір, 1 → қызғылт-қызыл */
export function heatColor(v) {
  const stops = [[0, [56, 189, 198]], [0.35, [120, 200, 120]], [0.6, [245, 196, 60]], [1, [228, 88, 66]]];
  v = Math.max(0, Math.min(1, v));
  for (let i = 1; i < stops.length; i++) {
    if (v <= stops[i][0]) {
      const [a, ca] = stops[i - 1], [bb, cb] = stops[i];
      const t = (v - a) / (bb - a);
      return ca.map((c, k) => Math.round(c + (cb[k] - c) * t));
    }
  }
  return stops[stops.length - 1][1];
}

export class SceneApp {
  constructor(container, cb = {}) {
    this.container = container;
    this.cb = cb;
    this.view = 'exterior';     // exterior | walk | overview
    this.mode = 'normal';       // normal | energy | led | daylight
    this.ledPct = 100;
    this.dayHours = 8;
    this.keys = new Set();
    this.tweens = [];
    this.dirty = true;
    this.currentRoom = null;
    this.isMobile = matchMedia('(pointer: coarse)').matches || innerWidth < 760;
  }

  async init() {
    const progress = (p, label) => this.cb.onProgress?.(p, label);
    progress(0.05, 'WebGL іске қосылуда');
    await nextFrame();

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !this.isMobile || devicePixelRatio < 2, powerPreference: 'high-performance' });
    } catch (e) {
      throw new Error('WEBGL_UNAVAILABLE');
    }
    if (!renderer.getContext()) throw new Error('WEBGL_UNAVAILABLE');
    this.renderer = renderer;
    renderer.setPixelRatio(Math.min(devicePixelRatio, this.isMobile ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !this.isMobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', '3D мектеп көрінісі');

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.className = 'label-layer';
    this.container.appendChild(this.labelRenderer.domElement);

    this.scene = new THREE.Scene();
    this.skyTex = skyTexture();
    this.scene.background = this.skyTex;
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.05, 600);

    // жарық
    this.hemi = new THREE.HemisphereLight('#eaf4ff', '#7a6a55', 1.25);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff6e6', 1.6);
    this.sun.position.set(-40, 60, 50);
    this.sun.castShadow = !this.isMobile;
    Object.assign(this.sun.shadow.camera, { left: -60, right: 60, top: 50, bottom: -40, near: 10, far: 200 });
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0005;
    this.scene.add(this.sun);
    this.ambient = new THREE.AmbientLight('#ffffff', 0.25);
    this.scene.add(this.ambient);

    progress(0.2, 'Мектептің сыртқы көрінісі');
    await nextFrame();
    this.ext = buildExterior();
    this.ext.group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.scene.add(this.ext.group);

    progress(0.5, 'Ішкі кеңістіктер');
    await nextFrame();
    this.int = buildInterior();
    this.int.group.visible = false;
    this.scene.add(this.int.group);

    progress(0.75, 'Энергия нысандары');
    await nextFrame();
    this.setupLampMaterials();
    this.setupLabels();
    this.setupOverlays();

    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.addEventListener('change', () => (this.dirty = true));
    this.controls.addEventListener('start', () => { this.controls.autoRotate = false; this.userMoved = true; });
    this.setOrbit(this.ext.center, { minDistance: 14, maxDistance: 120, maxPolar: Math.PI / 2 - 0.06, pan: false });
    this.camera.position.set(-38, 22, 62);
    this.controls.target.copy(this.ext.center);
    this.controls.autoRotate = !reducedMotion();
    this.controls.autoRotateSpeed = 0.35;

    this.bindInput();
    this.onResize();
    window.addEventListener('resize', () => this.onResize());
    progress(0.95, 'Дайын');
    await nextFrame();
    this.applyMode();
    this.clock = new THREE.Clock();
    renderer.setAnimationLoop(() => this.loop());
    progress(1, 'Дайын');
  }

  // ---------- Материалдар ----------
  setupLampMaterials() {
    this.lampMat = {
      current: new THREE.MeshBasicMaterial({ color: LAMP_COLORS.current }),
      led: new THREE.MeshBasicMaterial({ color: LAMP_COLORS.led }),
      off: new THREE.MeshBasicMaterial({ color: LAMP_COLORS.off }),
      hover: new THREE.MeshBasicMaterial({ color: LAMP_COLORS.hover }),
    };
    // жарықтың «ореолы» (LED режимін көрнекі ажырату үшін)
    const glowGeo = new THREE.PlaneGeometry(0.9, 1.9);
    this.glowMats = {
      current: new THREE.MeshBasicMaterial({ color: '#ffd98a', transparent: true, opacity: 0.28, depthWrite: false }),
      led: new THREE.MeshBasicMaterial({ color: '#bfe3ff', transparent: true, opacity: 0.42, depthWrite: false }),
    };
    this.allLamps = [];
    for (const r of this.int.rooms) {
      for (const l of r.lamps) {
        const glow = new THREE.Mesh(glowGeo, this.glowMats.current);
        glow.rotation.copy(l.rotation); glow.rotateX(Math.PI / 2);
        glow.position.copy(l.position); glow.position.y -= 0.05;
        l.userData.glow = glow;
        l.parent.add(glow);
        this.allLamps.push(l);
      }
    }
  }

  // ---------- Белгілер (CSS2D) ----------
  setupLabels() {
    this.roomLabels = [];
    for (const r of this.int.rooms) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'room-label';
      el.innerHTML = `<span class="rl-name"></span><span class="rl-val"></span>`;
      el.querySelector('.rl-name').textContent = r.name;
      el.addEventListener('click', (e) => { e.stopPropagation(); this.cb.onHotspot?.({ kind: 'room', roomId: r.id }); });
      const obj = new CSS2DObject(el);
      obj.position.copy(r.labelPos);
      this.int.group.add(obj);
      this.roomLabels.push({ r, el, obj });
    }
    this.pinObjs = [];
    for (const p of this.int.pins) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `pin pin-${p.kind}`;
      el.innerHTML = `<i aria-hidden="true"></i><span></span>`;
      el.querySelector('span').textContent = p.label;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (p.kind === 'exit') this.exitSchool();
        else this.cb.onHotspot?.({ kind: p.kind, roomId: p.roomId });
      });
      const obj = new CSS2DObject(el);
      obj.position.copy(p.pos);
      this.int.group.add(obj);
      this.pinObjs.push({ p, el, obj });
    }
    // экстерьер белгілері
    const mk = (cls, html, pos, onClick) => {
      const el = document.createElement('button');
      el.type = 'button'; el.className = cls; el.innerHTML = html;
      if (onClick) el.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
      const obj = new CSS2DObject(el); obj.position.copy(pos); this.ext.group.add(obj);
      return el;
    };
    this.extDoorPin = mk('pin pin-enter', '<i aria-hidden="true"></i><span>Ішке кіру</span>', this.ext.labelAnchors.door, () => this.enterSchool());
    this.extSchoolLabel = mk('room-label room-label--school', '<span class="rl-name">Мектеп бойынша</span><span class="rl-val"></span>', this.ext.labelAnchors.school, () => this.cb.onHotspot?.({ kind: 'school' }));
  }

  // Еденге түсті «энергия картасы» қабаттары
  setupOverlays() {
    this.overlays = [];
    for (const r of this.int.rooms) {
      if (!['classroom', 'sport'].includes(r.role)) continue;
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(r.x1 - r.x0 - 0.3, r.z1 - r.z0 - 0.3),
        new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false }),
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(r.center.x, 0.03, r.center.z);
      m.visible = false;
      m.renderOrder = 2;
      this.int.group.add(m);
      this.overlays.push({ r, m });
    }
  }

  // ---------- Энергия есептері (бөлме деңгейі) ----------
  roomEnergy(r) {
    const n = r.role === 'sport' ? REAL.sportsHallLamps : r.role === 'classroom' ? REAL.lampsPerClassroom : 0;
    if (!n) return null;
    const { currentLampW: P0, ledLampW: P1, hoursPerDay: H } = MODEL;
    const base = lampDay(n, P0, H);
    let now = base;
    if (this.mode === 'led') now = mixedDay(n, this.ledPct, P0, P1, H);
    if (this.mode === 'daylight') now = lampDay(n, P0, this.dayHours);
    return { n, base, now };
  }

  schoolEnergy() {
    const N = REAL.classrooms * REAL.lampsPerClassroom + REAL.sportsHallLamps;
    const { currentLampW: P0, ledLampW: P1, hoursPerDay: H } = MODEL;
    if (this.mode === 'led') return { N, v: mixedDay(N, this.ledPct, P0, P1, H) };
    if (this.mode === 'daylight') return { N, v: lampDay(N, P0, this.dayHours) };
    return { N, v: lampDay(N, P0, H) };
  }

  // ---------- Режимдер ----------
  setMode(mode) { this.mode = mode; this.applyMode(); }
  setLedPct(p) { this.ledPct = p; this.applyMode(); }
  setDayHours(h) { this.dayHours = h; this.applyMode(); }

  applyMode() {
    const mode = this.mode;
    // шамдар
    for (const r of this.int.rooms) {
      const counted = r.lamps.filter((l) => l.userData.lamp.counted);
      const nLed = mode === 'led' ? Math.round((counted.length * this.ledPct) / 100) : 0;
      const nOff = mode === 'daylight' ? Math.round((counted.length * (MODEL.hoursPerDay - this.dayHours)) / MODEL.hoursPerDay) : 0;
      // терезеге жақын шамдар бірінші сөнеді
      const order = [...counted].sort((a, b) => (r.role === 'sport' ? 0 : a.position.z - b.position.z));
      for (const l of r.lamps) { l.userData.state = 'current'; }
      order.slice(0, nLed).forEach((l) => (l.userData.state = 'led'));
      order.slice(0, nOff).forEach((l) => (l.userData.state = 'off'));
      for (const l of r.lamps) this.paintLamp(l);
    }
    // күн жарығы
    const day = mode === 'daylight';
    this.hemi.intensity = day ? 1.55 : 1.25;
    this.sun.intensity = day ? 2.1 : 1.6;
    // еден қабаттары
    const showOverlay = mode !== 'normal';
    let maxBase = 0;
    for (const { r } of this.overlays) maxBase = Math.max(maxBase, this.roomEnergy(r).base);
    for (const { r, m } of this.overlays) {
      const e = this.roomEnergy(r);
      const [R, G, B] = heatColor(e.now / maxBase);
      m.material.color.setRGB(R / 255, G / 255, B / 255, THREE.SRGBColorSpace);
      m.visible = showOverlay && mode === 'energy' ? true : showOverlay;
    }
    this.updateLabels();
    this.dirty = true;
  }

  paintLamp(l) {
    const s = l.userData.hover ? 'hover' : l.userData.state || 'current';
    l.material = this.lampMat[s];
    const glow = l.userData.glow;
    if (glow) {
      glow.visible = s !== 'off';
      glow.material = s === 'led' ? this.glowMats.led : this.glowMats.current;
    }
  }

  updateLabels() {
    const mode = this.mode;
    const showVals = mode !== 'normal';
    let maxBase = 0;
    for (const { r } of this.roomLabels) { const e = this.roomEnergy(r); if (e) maxBase = Math.max(maxBase, e.base); }
    for (const { r, el } of this.roomLabels) {
      const e = this.roomEnergy(r);
      const val = el.querySelector('.rl-val');
      el.classList.toggle('has-val', showVals);
      if (!e) {
        val.textContent = showVals ? (this.view === 'overview' ? 'есепке кірмейді' : '141 шамға кірмейді') : '';
        el.style.removeProperty('--heat');
        el.classList.add('is-muted');
        continue;
      }
      el.classList.remove('is-muted');
      const [R, G, B] = heatColor(e.now / maxBase);
      el.style.setProperty('--heat', `rgb(${R},${G},${B})`);
      let t = this.view === 'overview' ? `${fmt(e.now)} кВт·сағ ◇` : `${e.n} шам · ${fmt(e.now)} кВт·сағ/тәул ◇`;
      if ((mode === 'led' || mode === 'daylight') && this.view !== 'overview') t = `${e.n} шам · ${fmt(e.base)} → ${fmt(e.now)} кВт·сағ ◇`;
      val.textContent = showVals ? t : '';
    }
    const s = this.schoolEnergy();
    const v = this.extSchoolLabel.querySelector('.rl-val');
    this.extSchoolLabel.classList.toggle('has-val', true);
    v.textContent = `${s.N} шам · ${fmt(s.v)} кВт·сағ/тәулік ◇`;
    this.updateLabelVisibility();
  }

  updateLabelVisibility() {
    const walk = this.view === 'walk', over = this.view === 'overview';
    const energy = this.mode !== 'normal';
    for (const { r, obj, el } of this.roomLabels) {
      const show = over || (walk && energy && this.currentRoom === r.id);
      obj.visible = show;
      el.hidden = !show;
      obj.position.copy(over ? r.labelPos : r.labelPosIn);
      if (over && r.role === 'classroom') obj.position.z += (this.int.rooms.indexOf(r) % 2 ? -2.6 : 1.6);
      el.classList.toggle('compact', over);
      el.querySelector('.rl-name').textContent = over && r.short ? r.short : r.name;
    }
    for (const { p, obj, el } of this.pinObjs) {
      const show = walk && this.currentRoom === p.roomId;
      obj.visible = show; el.hidden = !show;
    }
    this.extDoorPin.hidden = this.view !== 'exterior';
    this.extSchoolLabel.hidden = !(this.view === 'exterior' && energy);
    this.dirty = true;
  }

  // ---------- Камера / басқару ----------
  setOrbit(target, { minDistance = 1, maxDistance = 200, maxPolar = Math.PI / 2, pan = false } = {}) {
    const c = this.controls;
    c.enableZoom = true; c.enablePan = pan; c.enableRotate = true;
    c.minDistance = minDistance; c.maxDistance = maxDistance;
    c.minPolarAngle = 0.05; c.maxPolarAngle = maxPolar;
    c.rotateSpeed = 0.8;
    c.screenSpacePanning = false;
    c.target.copy(target);
  }

  setWalk() {
    const c = this.controls;
    c.enableZoom = false; c.enablePan = false; c.enableRotate = true;
    c.minDistance = 0.01; c.maxDistance = 1.0;
    c.minPolarAngle = 0.35; c.maxPolarAngle = Math.PI - 0.5;
    c.rotateSpeed = -0.38;
    c.autoRotate = false;
  }

  tween(dur, fn, done) {
    if (reducedMotion()) dur = Math.min(dur, 120);
    this.tweens.push({ t0: performance.now(), dur, fn, done });
  }

  flyTo(pos, target, dur = 1100) {
    return new Promise((resolve) => {
      const p0 = this.camera.position.clone(), t0 = this.controls.target.clone();
      const p1 = new THREE.Vector3(...pos), t1 = new THREE.Vector3(...target);
      this.flying = true;
      this.tween(dur, (k) => {
        const e = ease(k);
        this.camera.position.lerpVectors(p0, p1, e);
        this.controls.target.lerpVectors(t0, t1, e);
      }, () => { this.flying = false; resolve(); });
    });
  }

  walkTarget(pos, look) {
    const p = new THREE.Vector3(...pos), l = new THREE.Vector3(...look);
    const dir = l.sub(p).normalize().multiplyScalar(0.4);
    return p.clone().add(dir).toArray();
  }

  setView(view) {
    this.view = view;
    const inside = view !== 'exterior';
    this.ext.group.visible = !inside;
    this.int.group.visible = inside;
    this.scene.background = inside ? new THREE.Color('#dfe6ee') : this.skyTex;
    this.sun.castShadow = !inside && !this.isMobile;
    this.ambient.intensity = inside ? 0.55 : 0.25;
    for (const c of this.int.ceilings) c.visible = view === 'walk';
    if (view === 'overview') this.currentRoom = null;
    this.cb.onViewChange?.(view);
    this.updateLabels();
    this.dirty = true;
  }

  async enterSchool(roomId = 'lobby') {
    if (this.busy) return;
    this.busy = true;
    if (this.view === 'exterior') {
      this.controls.autoRotate = false;
      const d = this.ext.doorPos;
      await this.flyTo([d.x, 2.2, d.z + 6], [d.x, 1.6, d.z - 4], 1100);
      await this.flyTo([d.x, 1.7, d.z - 2.2], [d.x, 1.6, d.z - 8], 650);
      this.cb.onFade?.(true);
      await new Promise((r) => setTimeout(r, reducedMotion() ? 0 : 220));
      this.setView('walk');
      this.setWalk();
      const vp = this.int.byId[roomId === 'lobby' ? 'lobby' : 'lobby'].viewpoint;
      this.camera.position.set(...vp.pos);
      this.controls.target.set(...this.walkTarget(vp.pos, vp.look));
      this.controls.update();
      this.cb.onFade?.(false);
    }
    this.busy = false;
    if (roomId !== 'lobby') await this.goToRoom(roomId);
    else this.detectRoom(true);
  }

  async exitSchool() {
    if (this.busy) return;
    this.busy = true;
    this.cb.onFade?.(true);
    await new Promise((r) => setTimeout(r, reducedMotion() ? 0 : 220));
    this.setView('exterior');
    this.setOrbit(this.ext.center, { minDistance: 14, maxDistance: 120, maxPolar: Math.PI / 2 - 0.06 });
    const d = this.ext.doorPos;
    this.camera.position.set(d.x + 4, 4, d.z + 14);
    this.controls.target.copy(this.ext.center);
    this.controls.update();
    this.cb.onFade?.(false);
    await this.flyTo([-30, 20, 55], this.ext.center.toArray(), 1200);
    this.currentRoom = null;
    this.cb.onRoomChange?.(null);
    this.busy = false;
  }

  async goToRoom(id) {
    const r = this.int.byId[id];
    if (!r) return;
    if (this.view === 'exterior') return this.enterSchool(id);
    if (this.busy) return;
    this.busy = true;
    if (this.view === 'overview') {
      // үстінен бөлмеге түсу
      this.setView('walk');
      this.setWalk();
    }
    const vp = r.viewpoint;
    await this.flyTo(vp.pos, this.walkTarget(vp.pos, vp.look), 1000);
    this.busy = false;
    this.detectRoom(true);
  }

  async showOverview() {
    if (this.busy) return;
    if (this.view === 'exterior') {
      this.cb.onFade?.(true);
      await new Promise((r) => setTimeout(r, reducedMotion() ? 0 : 200));
      this.setView('overview');
      this.camera.position.set(6, 70, 60);
      this.cb.onFade?.(false);
    } else this.setView('overview');
    this.busy = true;
    const o = this.int.overview;
    this.setOrbit(new THREE.Vector3(...o.look), { minDistance: 12, maxDistance: 110, maxPolar: Math.PI / 2 - 0.15, pan: true });
    this.controls.target.set(...this.controls.target.toArray());
    await this.flyTo(o.pos, o.look, 1100);
    this.busy = false;
    this.cb.onRoomChange?.(null);
  }

  // ---------- Енгізу ----------
  bindInput() {
    const el = this.renderer.domElement;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    let down = null;
    el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    el.addEventListener('pointerup', (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const dt = performance.now() - down.t;
      down = null;
      if (moved < 8 && dt < 600) this.onClick(e);
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const now = performance.now();
      if (now - (this.lastHover || 0) < 60) return;
      this.lastHover = now;
      this.onHover(e);
    });
    el.addEventListener('pointerleave', () => this.clearHover());
    el.addEventListener('wheel', (e) => {
      if (this.view !== 'walk') return;
      e.preventDefault();
      this.moveForward(-Math.sign(e.deltaY) * 0.9);
    }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (e.target.closest && e.target.closest('input, textarea, select')) return;
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'ц', 'ф', 'ы', 'в', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        this.keys.add(k);
        if (this.view === 'walk') e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
  }

  pick(e, objects) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.intersectObjects(objects, false);
  }

  activeHotspots() {
    return this.view === 'exterior' ? this.ext.hotspots : this.int.hotspots;
  }

  onClick(e) {
    if (this.busy) return;
    const objs = [...this.activeHotspots()];
    const floors = this.view !== 'exterior' ? this.int.rooms.map((r) => r.floor) : [];
    const walls = [];
    const hits = this.pick(e, [...objs, ...floors, ...walls]);
    if (!hits.length) return;
    const hit = hits[0];
    const hsd = hit.object.userData.hotspot;
    if (hsd) {
      if (hsd.kind === 'enter') return this.enterSchool();
      if (hsd.kind === 'exit') return this.exitSchool();
      if (this.view === 'overview' && hsd.roomId) return this.goToRoom(hsd.roomId);
      this.cb.onHotspot?.({ ...hsd, lampIndex: hit.object.userData.lamp?.index });
      return;
    }
    const floorRoom = hit.object.userData.floor;
    if (floorRoom) {
      if (this.view === 'overview') return this.goToRoom(floorRoom);
      if (this.view === 'walk') this.walkTo(hit.point);
    }
  }

  onHover(e) {
    if (this.busy) return;
    const hits = this.pick(e, this.activeHotspots());
    const obj = hits[0]?.object;
    const el = this.renderer.domElement;
    if (this.hovered && this.hovered !== obj) this.clearHover();
    if (obj) {
      el.style.cursor = 'pointer';
      if (obj.userData.lamp && !obj.userData.hover) { obj.userData.hover = true; this.paintLamp(obj); this.dirty = true; }
      this.hovered = obj;
      this.cb.onHover?.(obj.userData.hotspot, e.clientX, e.clientY);
    } else {
      el.style.cursor = this.view === 'walk' ? 'crosshair' : 'grab';
      this.cb.onHover?.(null);
    }
  }

  clearHover() {
    const h = this.hovered;
    if (h && h.userData.lamp) { h.userData.hover = false; this.paintLamp(h); this.dirty = true; }
    this.hovered = null;
    this.cb.onHover?.(null);
  }

  canStand(x, z) {
    return this.int.walkRects.some(([x0, x1, z0, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1);
  }

  translateWalk(dx, dz) {
    const p = this.camera.position;
    let mx = dx, mz = dz;
    if (!this.canStand(p.x + mx, p.z + mz)) {
      if (this.canStand(p.x + mx, p.z)) mz = 0;
      else if (this.canStand(p.x, p.z + mz)) mx = 0;
      else return;
    }
    p.x += mx; p.z += mz;
    this.controls.target.x += mx; this.controls.target.z += mz;
    this.dirty = true;
  }

  moveForward(dist) {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    dir.y = 0; dir.normalize();
    const steps = 6;
    for (let i = 0; i < steps; i++) this.translateWalk((dir.x * dist) / steps, (dir.z * dist) / steps);
    this.detectRoom();
  }

  walkTo(point) {
    const dest = new THREE.Vector3(point.x, EYE, point.z);
    if (!this.canStand(dest.x, dest.z)) {
      // ең жақын тұруға болатын нүктеге
      for (let k = 1; k <= 10; k++) {
        const t = new THREE.Vector3().lerpVectors(dest, this.camera.position, k / 10);
        if (this.canStand(t.x, t.z)) { dest.copy(t); dest.y = EYE; break; }
      }
    }
    const off = this.controls.target.clone().sub(this.camera.position);
    const dist = dest.distanceTo(this.camera.position);
    this.flyTo(dest.toArray(), dest.clone().add(off).toArray(), Math.min(1200, 250 + dist * 110)).then(() => this.detectRoom());
  }

  detectRoom(force) {
    if (this.view !== 'walk') return;
    const { x, z } = this.camera.position;
    const r = this.int.rooms.find((q) => x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1);
    const id = r ? r.id : this.currentRoom;
    if (force || id !== this.currentRoom) {
      this.currentRoom = id;
      this.cb.onRoomChange?.(id);
      this.updateLabelVisibility();
    }
  }

  onResize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
    this.dirty = true;
  }

  loop() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const now = performance.now();
    if (this.tweens.length) {
      this.tweens = this.tweens.filter((tw) => {
        const k = Math.min(1, (now - tw.t0) / tw.dur);
        tw.fn(k);
        if (k >= 1) { tw.done?.(); return false; }
        return true;
      });
      this.dirty = true;
    }
    if (this.view === 'walk' && this.keys.size && !this.flying) {
      const k = this.keys;
      const f = (k.has('w') || k.has('ц') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('ы') || k.has('arrowdown') ? 1 : 0);
      const s = (k.has('d') || k.has('в') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('ф') || k.has('arrowleft') ? 1 : 0);
      const dir = new THREE.Vector3(); this.camera.getWorldDirection(dir); dir.y = 0; dir.normalize();
      const right = new THREE.Vector3(-dir.z, 0, dir.x);
      const v = dir.multiplyScalar(f).add(right.multiplyScalar(s));
      if (v.lengthSq() > 0) {
        v.normalize().multiplyScalar(3.6 * dt);
        this.translateWalk(v.x, v.z);
        if (now - (this.lastDetect || 0) > 200) { this.lastDetect = now; this.detectRoom(); }
      }
    }
    const changed = this.controls.update();
    if (this.controls.autoRotate) this.dirty = true;
    if (changed || this.dirty) {
      this.renderer.render(this.scene, this.camera);
      this.labelRenderer.render(this.scene, this.camera);
      this.dirty = false;
    }
  }
}
