// Процедуралық canvas-текстуралар: сыртқы файл жүктемейді, сондықтан «missing texture» болмайды.
import * as THREE from 'three';

const cache = new Map();

function make(key, w, h, draw, { repeat = [1, 1], srgb = true } = {}) {
  const k = key + repeat.join('x');
  if (cache.has(k)) return cache.get(k);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  cache.set(k, t);
  return t;
}

const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

export const siding = (rx = 1, ry = 1) => make('siding', 256, 256, (g, w, h) => {
  g.fillStyle = '#eef1f5'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 16) {
    const grd = g.createLinearGradient(0, y, 0, y + 16);
    grd.addColorStop(0, '#f8fafc'); grd.addColorStop(0.85, '#e3e8ef'); grd.addColorStop(1, '#c9d1dc');
    g.fillStyle = grd; g.fillRect(0, y, w, 16);
  }
}, { repeat: [rx, ry] });

export const roofMetal = (rx = 1, ry = 1) => make('roof', 256, 256, (g, w, h) => {
  g.fillStyle = '#2462c9'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 32) {
    g.fillStyle = '#3a7be0'; g.fillRect(x, 0, 6, h);
    g.fillStyle = '#1b4fa6'; g.fillRect(x + 6, 0, 3, h);
  }
}, { repeat: [rx, ry] });

export const woodFloor = (rx = 1, ry = 1) => make('wood', 512, 512, (g, w, h) => {
  const plank = 512 / 8;
  for (let i = 0; i < 8; i++) {
    const v = 0.85 + rnd() * 0.2;
    g.fillStyle = `rgb(${Math.round(150 * v)},${Math.round(62 * v)},${Math.round(30 * v)})`;
    g.fillRect(i * plank, 0, plank, h);
    g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(i * plank + 6, 0, 10, h);
    g.fillStyle = 'rgba(40,10,0,0.55)'; g.fillRect(i * plank, 0, 2, h);
    const cut = rnd() * h; g.fillRect(i * plank, cut, plank, 2);
  }
}, { repeat: [rx, ry] });

export const tileFloor = (rx = 1, ry = 1, base = '#d9dde2') => make('tile' + base, 256, 256, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(90,100,115,0.45)'; g.lineWidth = 3;
  for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 128); g.lineTo(w, i * 128); g.stroke(); }
}, { repeat: [rx, ry] });

export const sportFloor = () => make('sport', 1024, 1024, (g, w, h) => {
  g.fillStyle = '#9a2b22'; g.fillRect(0, 0, w, h);               // қызыл шет
  g.fillStyle = '#1f8a4c'; g.fillRect(70, 70, w - 140, h - 140);  // жасыл алаң
  g.fillStyle = '#e0a347';
  g.beginPath(); g.arc(w / 2, h / 2, 110, 0, Math.PI * 2); g.fill();
  [[70, 1], [w - 70, -1]].forEach(([x, s]) => {
    g.beginPath(); g.moveTo(x, h / 2 - 260); g.arc(x, h / 2, 260, -Math.PI / 2, Math.PI / 2, s < 0); g.closePath(); g.fill();
  });
  g.strokeStyle = '#ffffff'; g.lineWidth = 8;
  g.strokeRect(70, 70, w - 140, h - 140);
  g.beginPath(); g.moveTo(w / 2, 70); g.lineTo(w / 2, h - 70); g.stroke();
  g.beginPath(); g.arc(w / 2, h / 2, 110, 0, Math.PI * 2); g.stroke();
});

export const curtain = () => make('curtain', 256, 256, (g, w, h) => {
  // фотодағы көк-сары жолақты перде және сатылы «арка»
  for (let x = 0, i = 0; x < w; x += 16, i++) {
    g.fillStyle = i % 2 ? '#f4c531' : '#58b9e6'; g.fillRect(x, 0, 16, h);
  }
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000';
  for (let s = 0; s < 8; s++) {
    const y = 130 + s * 16, half = 16 + s * 13;
    g.fillRect(w / 2 - half, y, half * 2, h - y);
  }
  g.globalCompositeOperation = 'source-over';
}, { srgb: true });

export const blueCurtain = () => make('bcurtain', 64, 256, (g, w, h) => {
  for (let x = 0; x < w; x += 8) { g.fillStyle = x % 16 ? '#5aa2e6' : '#4a8fd6'; g.fillRect(x, 0, 8, h); }
});

export const chalkboard = () => make('chalk', 512, 256, (g, w, h) => {
  g.fillStyle = '#1f4d3c'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 60; i++) g.fillRect(rnd() * w, rnd() * h, 40 + rnd() * 60, 2);
  g.strokeStyle = '#c9b48a'; g.lineWidth = 10; g.strokeRect(0, 0, w, h);
  g.fillStyle = '#c9b48a'; g.fillRect(w / 3 - 2, 0, 4, h); g.fillRect((2 * w) / 3 - 2, 0, 4, h);
});

export function textPanel(key, text, { w = 1024, h = 160, bg = '#2a7fd4', fg = '#ffffff', font = 'bold 64px "Golos Text", Arial, sans-serif', border } = {}) {
  return make('txt' + key, w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    if (border) { g.strokeStyle = border; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); }
    g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = String(text).split('\n');
    lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * (h / (lines.length + 0.6))));
  });
}

export const poster = (seed, palette = ['#2d8fd6', '#f6d24a', '#ffffff']) => make('poster' + seed, 128, 160, (g, w, h) => {
  g.fillStyle = palette[0]; g.fillRect(0, 0, w, h);
  g.fillStyle = palette[2]; g.fillRect(8, 8, w - 16, h - 16);
  g.fillStyle = palette[1]; g.fillRect(8, 8, w - 16, 26);
  g.fillStyle = palette[0];
  for (let i = 0; i < 7; i++) g.fillRect(16, 46 + i * 15, 40 + ((seed * 13 + i * 29) % 56), 6);
});

export const trigStand = () => make('trig', 1024, 360, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  const blob = (x, y, r) => {
    g.fillStyle = '#2f78c4'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#dcecfb'; g.beginPath(); g.arc(x, y, r * 0.8, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#2f78c4'; g.lineWidth = 3;
    for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(x - r * 0.6, y - r * 0.45 + i * r * 0.18); g.lineTo(x + r * 0.6, y - r * 0.45 + i * r * 0.18); g.stroke(); }
  };
  blob(200, 180, 150); blob(520, 170, 130); blob(820, 170, 120);
  g.fillStyle = '#ffffff'; g.font = 'bold 34px Arial'; g.textAlign = 'center';
  g.fillStyle = '#1f5ea8'; g.fillText('ТРИГОНОМЕТРИЯ', 200, 50);
  [['#e94b6a', 380, 320], ['#5ab0f0', 660, 330], ['#b98ae6', 960, 300]].forEach(([c, x, y]) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, 16, 0, 7); g.fill(); });
});

export const gateSwirl = () => make('gate', 256, 256, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  g.strokeStyle = '#3aa9d8'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
  g.strokeStyle = '#d6343a'; g.lineWidth = 6;
  for (let i = 0; i < 4; i++) {
    const cx = 64 + (i % 2) * 128, cy = 64 + Math.floor(i / 2) * 128;
    g.beginPath();
    for (let a = 0; a < Math.PI * 5; a += 0.1) { const r = 6 + a * 3.4; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    g.stroke();
  }
});

export const ornament = () => make('orn', 256, 64, (g, w, h) => {
  g.fillStyle = '#d6418f'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#e8c15a';
  for (let x = 0; x < w; x += 64) {
    g.beginPath(); g.moveTo(x + 32, 8); g.quadraticCurveTo(x + 56, 32, x + 32, 56); g.quadraticCurveTo(x + 8, 32, x + 32, 8); g.fill();
  }
  g.fillRect(0, h - 6, w, 6);
}, { repeat: [6, 1] });

export const grass = () => make('grass', 256, 256, (g, w, h) => {
  g.fillStyle = '#7c9a55'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1500; i++) { g.fillStyle = rnd() > 0.5 ? '#6d8a48' : '#8fae62'; g.fillRect(rnd() * w, rnd() * h, 2, 3); }
}, { repeat: [30, 30] });

export const asphalt = () => make('asph', 256, 256, (g, w, h) => {
  g.fillStyle = '#7d7f84'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2500; i++) { g.fillStyle = rnd() > 0.5 ? '#72747a' : '#8a8c91'; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
}, { repeat: [12, 12] });

export const screenTex = (key, colors = ['#0d1b2a', '#1f6fd1']) => make('scr' + key, 256, 160, (g, w, h) => {
  const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, colors[0]); grd.addColorStop(1, colors[1]);
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(24, 26, 90, 10); g.fillRect(24, 46, 140, 6); g.fillRect(24, 60, 120, 6);
});

export const skyTexture = () => make('sky', 16, 256, (g, w, h) => {
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, '#1d5fbf'); grd.addColorStop(0.55, '#7fb6ec'); grd.addColorStop(1, '#e6f1fb');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
});
