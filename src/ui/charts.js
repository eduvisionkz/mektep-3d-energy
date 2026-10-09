// Тәуелсіз SVG диаграммалары: бір y-шкала, жұқа бағандар, hover/tap tooltip, кесте көрінісі.
import { fmt, fmtInt } from '../model/energy.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (parent) parent.appendChild(n);
  return n;
};

function niceMax(v) {
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

let tipEl = null;
function tip() {
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.className = 'chart-tip';
    tipEl.hidden = true;
    document.body.appendChild(tipEl);
  }
  return tipEl;
}
function showTip(html, x, y) {
  const t = tip();
  t.innerHTML = html;
  t.hidden = false;
  const r = t.getBoundingClientRect();
  let left = x + 12, top = y - r.height - 10;
  if (left + r.width > innerWidth - 8) left = x - r.width - 12;
  if (top < 8) top = y + 14;
  t.style.left = `${Math.max(8, left)}px`;
  t.style.top = `${top}px`;
}
export const hideTip = () => { if (tipEl) tipEl.hidden = true; };

/**
 * Топтастырылған бағанды диаграмма.
 * opts: { title, badge, categories, series:[{name, cls, values}], unit, digits, note }
 */
export function barChart(host, opts) {
  const { categories, series, unit = 'кВт·сағ', digits = 2, yLabel } = opts;
  const W = 360, H = 210, L = 46, R = 8, T = 14, B = 34;
  const maxV = niceMax(Math.max(...series.flatMap((s) => s.values)) * 1.04);
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': opts.title });
  const y = (v) => T + (H - T - B) * (1 - v / maxV);
  // тор
  for (let i = 0; i <= 4; i++) {
    const v = (maxV / 4) * i;
    el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: i ? 'grid' : 'axis' }, svg);
    const t = el('text', { x: L - 6, y: y(v) + 3.5, class: 'tick', 'text-anchor': 'end' }, svg);
    t.textContent = v >= 1000 ? fmtInt(v) : fmt(v, maxV < 10 ? 1 : 0);
  }
  if (yLabel) { const t = el('text', { x: 4, y: 9, class: 'tick' }, svg); t.textContent = yLabel; }
  const band = (W - L - R) / categories.length;
  const gap = 2;
  const barW = Math.min(30, (band * 0.66 - gap * (series.length - 1)) / series.length);
  categories.forEach((c, ci) => {
    const cx = L + band * ci + band / 2;
    const groupW = barW * series.length + gap * (series.length - 1);
    series.forEach((s, si) => {
      const v = s.values[ci];
      const x = cx - groupW / 2 + si * (barW + gap);
      const h = Math.max(0.5, y(0) - y(v));
      const r = Math.min(4, barW / 2, h);
      // жоғарғы жағы дөңгеленген баған
      const d = `M${x},${y(0)} V${y(v) + r} Q${x},${y(v)} ${x + r},${y(v)} H${x + barW - r} Q${x + barW},${y(v)} ${x + barW},${y(v) + r} V${y(0)} Z`;
      el('path', { d, class: `bar ${s.cls}` }, svg);
      const hit = el('rect', { x: x - 2, y: T, width: barW + 4, height: H - T - B, class: 'hit', tabindex: 0 }, svg);
      const html = `<b>${c}</b><span><i class="sw ${s.cls}"></i>${s.name}</span><strong>${fmt(v, digits)} ${unit}</strong>`;
      const on = (e) => { const b = hit.getBoundingClientRect(); showTip(html, e.clientX ?? b.left + b.width / 2, e.clientY ?? b.top + 20); };
      hit.addEventListener('pointerenter', on);
      hit.addEventListener('pointermove', on);
      hit.addEventListener('pointerleave', hideTip);
      hit.addEventListener('focus', () => { const b = hit.getBoundingClientRect(); showTip(html, b.left + b.width / 2, b.top + 30); });
      hit.addEventListener('blur', hideTip);
    });
    const t = el('text', { x: cx, y: H - B + 15, class: 'cat', 'text-anchor': 'middle' }, svg);
    t.textContent = c;
  });
  // таңдамалы тікелей белгі: әр серияның соңғы мәні
  series.forEach((s, si) => {
    if (!opts.labelLast) return;
    const ci = categories.length - 1, v = s.values[ci];
    const cx = L + band * ci + band / 2;
    const groupW = barW * series.length + gap * (series.length - 1);
    const x = cx - groupW / 2 + si * (barW + gap) + barW / 2;
    const t = el('text', { x, y: y(v) - 4, class: 'val', 'text-anchor': 'middle' }, svg);
    t.textContent = fmt(v, opts.labelDigits ?? 0);
  });
  return wrap(host, opts, svg, series, categories, digits, unit);
}

/** Қыс/жаз төлем диапазоны: min–max жолақ + орта нүкте */
export function rangeChart(host, opts) {
  const { rows } = opts; // [{name, min, max, mid}]
  const W = 360, H = 150, L = 58, R = 16, T = 12, B = 30;
  const maxV = niceMax(Math.max(...rows.map((r) => r.max)) * 1.05);
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': opts.title });
  const x = (v) => L + (W - L - R) * (v / maxV);
  for (let i = 0; i <= 4; i++) {
    const v = (maxV / 4) * i;
    el('line', { x1: x(v), x2: x(v), y1: T, y2: H - B, class: i ? 'grid' : 'axis' }, svg);
    const t = el('text', { x: x(v), y: H - B + 14, class: 'tick', 'text-anchor': 'middle' }, svg);
    t.textContent = v === 0 ? '0' : `${fmt(v / 1e6, 1)} млн`;
  }
  const rowH = (H - T - B) / rows.length;
  rows.forEach((r, i) => {
    const cy = T + rowH * i + rowH / 2;
    const t = el('text', { x: L - 8, y: cy + 4, class: 'cat', 'text-anchor': 'end' }, svg);
    t.textContent = r.name;
    const w = Math.max(6, x(r.max) - x(r.min));
    el('rect', { x: x(r.min), y: cy - 9, width: w, height: 18, rx: 4, class: 'bar s-real' }, svg);
    el('circle', { cx: x(r.mid), cy, r: 4.5, class: 'mid' }, svg);
    const hit = el('rect', { x: L, y: cy - rowH / 2, width: W - L - R, height: rowH, class: 'hit', tabindex: 0 }, svg);
    const html = `<b>${r.name}</b><span>${fmtInt(r.min)}–${fmtInt(r.max)} ₸/ай</span><strong>орта нүкте ${fmtInt(r.mid)} ₸</strong>`;
    const on = (e) => showTip(html, e.clientX, e.clientY);
    hit.addEventListener('pointerenter', on); hit.addEventListener('pointermove', on); hit.addEventListener('pointerleave', hideTip);
    hit.addEventListener('focus', () => { const b = hit.getBoundingClientRect(); showTip(html, b.left + b.width / 2, b.top + 10); });
    hit.addEventListener('blur', hideTip);
  });
  const fig = document.createElement('figure');
  fig.className = 'fig';
  fig.innerHTML = `<figcaption><span class="fig-title">${opts.title}</span>${opts.badge || ''}</figcaption>`;
  fig.appendChild(svg);
  if (opts.note) { const n = document.createElement('p'); n.className = 'fig-note'; n.innerHTML = opts.note; fig.appendChild(n); }
  host.appendChild(fig);
  return fig;
}

function wrap(host, opts, svg, series, categories, digits, unit) {
  const fig = document.createElement('figure');
  fig.className = 'fig';
  const legend = series.length > 1
    ? `<div class="legend">${series.map((s) => `<span><i class="sw ${s.cls}"></i>${s.name}</span>`).join('')}</div>`
    : '';
  fig.innerHTML = `<figcaption><span class="fig-title">${opts.title}</span>${opts.badge || ''}</figcaption>${legend}`;
  fig.appendChild(svg);
  // кесте көрінісі (қолжетімділік)
  const det = document.createElement('details');
  det.className = 'fig-table';
  det.innerHTML = `<summary>Кесте түрінде</summary><div class="table-wrap"><table><thead><tr><th></th>${series.map((s) => `<th>${s.name}</th>`).join('')}</tr></thead><tbody>${categories
    .map((c, i) => `<tr><th>${c}</th>${series.map((s) => `<td>${fmt(s.values[i], digits)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table></div><p class="fig-unit">Өлшем бірлігі: ${unit}</p>`;
  fig.appendChild(det);
  if (opts.note) { const n = document.createElement('p'); n.className = 'fig-note'; n.innerHTML = opts.note; fig.appendChild(n); }
  host.appendChild(fig);
  return fig;
}
