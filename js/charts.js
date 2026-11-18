// Small charts as HTML/SVG strings. No DOM access: the views drop them in and the app's tooltip layer
// reads data-tip on hover, focus or tap. Marks follow one spec: columns at most 24px wide with a 4px
// rounded data end and a square baseline, hairline solid grid, values labelled sparingly, and every chart
// comes with its table (the caller puts it in a <details>).
import { fmt, esc } from './model.js';
import { t, locale } from './i18n.js';

const nice = (v) => {
  if (v <= 0) return 0;
  const p = 10 ** Math.floor(Math.log10(v)), n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
};
const compact = (v) => (Math.abs(v) >= 10000 ? Math.round(v / 1000) + 'K' : new Intl.NumberFormat(locale, { useGrouping: 'always' }).format(Math.round(v)));

/** A bar from y0 (baseline) to y1, rounded 4px at the data end only. */
function colPath(x, w, y0, y1) {
  const up = y1 < y0, h = Math.abs(y0 - y1), r = Math.min(4, h, w / 2);
  if (h < 0.5) return '';
  return up
    ? `M${x} ${y0}V${y1 + r}Q${x} ${y1} ${x + r} ${y1}H${x + w - r}Q${x + w} ${y1} ${x + w} ${y1 + r}V${y0}Z`
    : `M${x} ${y0}V${y1 - r}Q${x} ${y1} ${x + r} ${y1}H${x + w - r}Q${x + w} ${y1} ${x + w} ${y1 - r}V${y0}Z`;
}

/**
 * Column chart over months.
 * cols: [{ label, value (null = no data yet), tip, cls, fill, mark (a short line across the column: its own target) }] — cls picks the fill (see .ch-* in styles.css); fill overrides it
 * limit: a reference line (a budget, the monthly target) · labels: indexes of the columns to label
 */
export function columns({ cols, limit = null, limitLabel = '', labels = [], aria = '', h = 150 }) {
  const W = 340, padL = 34, padR = 6, padT = 16, padB = 20;
  const vals = cols.flatMap((c) => [c.value, c.mark]).filter((v) => v != null);
  const hi = nice(Math.max(0, ...vals, limit ?? 0)), lo = -nice(Math.max(0, ...vals.map((v) => -v)));
  const span = hi - lo || 1, ph = h - padT - padB;
  const y = (v) => padT + (hi - v) / span * ph;
  const band = (W - padL - padR) / cols.length, w = Math.min(24, band * 0.62);
  const ticks = [hi, ...(lo < 0 ? [0, lo] : [0])].filter((t, i, a) => a.indexOf(t) === i);
  const grid = ticks.map((t) => `<line class="ch-grid ${t === 0 ? 'zero' : ''}" x1="${padL}" x2="${W - padR}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/>
    <text class="ch-tick" x="${padL - 6}" y="${(y(t) + 3.5).toFixed(1)}">${compact(t)}</text>`).join('');
  const marks = cols.map((c, i) => {
    const x = padL + band * i + (band - w) / 2, cx = padL + band * i + band / 2;
    const bar = c.value == null ? '' : `<path class="ch-col ${c.cls || 'ch-1'}" d="${colPath(x, w, y(0), y(c.value))}"${c.fill ? ` style="fill:${c.fill}"` : ''}/>`;
    const lab = c.value != null && labels.includes(i)
      ? `<text class="ch-val" x="${cx}" y="${(c.value >= 0 ? y(c.value) - 5 : y(c.value) + 12).toFixed(1)}">${esc(c.short ?? compact(c.value))}</text>` : '';
    return `<g class="ch-band" tabindex="0" role="img" aria-label="${esc(c.tip)}" data-tip="${esc(c.tip)}">
      <rect class="ch-hit" x="${padL + band * i}" y="0" width="${band}" height="${h}"/>${bar}${lab}${c.mark == null ? '' : `<line class="ch-mark" x1="${(x - 3).toFixed(1)}" x2="${(x + w + 3).toFixed(1)}" y1="${y(c.mark).toFixed(1)}" y2="${y(c.mark).toFixed(1)}"/>`}
      <text class="ch-x ${c.now ? 'now' : ''}" x="${cx}" y="${h - 5}">${esc(c.label)}</text></g>`;
  }).join('');
  const lim = limit == null ? '' : `<line class="ch-limit" x1="${padL}" x2="${W - padR}" y1="${y(limit).toFixed(1)}" y2="${y(limit).toFixed(1)}"/>
    ${limitLabel ? `<text class="ch-limit-t" x="${W - padR}" y="${(y(limit) - 4).toFixed(1)}">${esc(limitLabel)}</text>` : ''}`;
  return `<svg class="chart" viewBox="0 0 ${W} ${h}" role="group" aria-label="${esc(aria)}">${grid}${marks}${lim}</svg>`;
}

/** Two series side by side per month (e.g. what came in and what went out). */
export function pairs({ cols, aria = '', h = 160 }) {
  const W = 340, padL = 34, padR = 6, padT = 12, padB = 20;
  const hi = nice(Math.max(1, ...cols.flatMap((c) => [c.a ?? 0, c.b ?? 0])));
  const ph = h - padT - padB, y = (v) => padT + (hi - v) / hi * ph;
  const band = (W - padL - padR) / cols.length, w = Math.min(11, (band - 6) / 2);
  const grid = [hi, hi / 2, 0].map((t) => `<line class="ch-grid ${t === 0 ? 'zero' : ''}" x1="${padL}" x2="${W - padR}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/>
    <text class="ch-tick" x="${padL - 6}" y="${(y(t) + 3.5).toFixed(1)}">${compact(t)}</text>`).join('');
  const marks = cols.map((c, i) => {
    const x0 = padL + band * i + band / 2 - w - 1, cx = padL + band * i + band / 2;
    return `<g class="ch-band" tabindex="0" role="img" aria-label="${esc(c.tip)}" data-tip="${esc(c.tip)}">
      <rect class="ch-hit" x="${padL + band * i}" y="0" width="${band}" height="${h}"/>
      ${c.a == null ? '' : `<path class="ch-col ch-in" d="${colPath(x0, w, y(0), y(c.a))}"/>`}
      ${c.b == null ? '' : `<path class="ch-col ch-out" d="${colPath(x0 + w + 2, w, y(0), y(c.b))}"/>`}
      <text class="ch-x ${c.now ? 'now' : ''}" x="${cx}" y="${h - 5}">${esc(c.label)}</text></g>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${h}" role="group" aria-label="${esc(aria)}">${grid}${marks}</svg>`;
}

/**
 * One whole split into parts (where the month's money goes). parts: [{ label, value, cls }].
 * The share is printed inside a part only when it is wide enough; the legend under it carries every amount.
 */
export function segbar(parts, total, aria = '') {
  const shown = parts.filter((p) => p.value > 0.5);
  return `<div class="segbar" role="img" aria-label="${esc(aria)}">${shown.map((p) => {
    const share = p.value / total * 100;
    return `<span class="seg ${p.cls}" style="flex-grow:${p.value.toFixed(2)}" data-tip="${esc(`${p.label}: ${fmt(p.value)} (${Math.round(share)} %)`)}" tabindex="0">${share >= 13 ? `<b>${Math.round(share)}%</b>` : ''}</span>`;
  }).join('')}</div>`;
}

/** Ranked horizontal bars: rows [{ icon (html), label, value, tip, extra }]; one colour, value at the tip. */
export function ranked(rows) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return `<div class="ranked">${rows.map((r) => `<div class="rk">${r.icon || ''}
    <span class="rk-main"><span class="rk-l">${esc(r.label)}${r.pct != null ? ` <span class="rk-pct">(${r.pct} %)</span>` : ''}${r.extra || ''}</span>
    <span class="rk-bar"><i style="width:${Math.max(1.5, r.value / max * 100).toFixed(1)}%"></i><b class="num">${fmt(r.value)}</b></span></span></div>`).join('')}</div>`;
}

/** The table twin of a chart. rows: arrays of cells (strings already escaped where needed). */
export function table(head, rows) {
  return `<details class="tview"><summary>${t('Ver como tabla')}</summary><table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((c, i) => (c && typeof c === 'object' ? `<td class="num dtone ${c.tone || ''}">${c.v}</td>` : `<td class="${i ? 'num' : ''}">${c}</td>`)).join('')}</tr>`).join('')}</tbody></table></details>`;
}

/**
 * A line through the days of a month. pts: [{ y, tip }] from day 0; marks: [{ i, text }] labels at some points.
 * The zero line is where the month began; the area under the line is tinted.
 */
/** Smooth curve through points without overshooting them (monotone cubic): flat stays flat, a jump stays a rise. */
function tangents(xs, ys) {
  const n = xs.length, d = [], m = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / ((xs[i + 1] - xs[i]) || 1));
  m[0] = d[0] ?? 0; m[n - 1] = d[n - 2] ?? 0;
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], q = a * a + b * b;
    if (q > 9) { const tau = 3 / Math.sqrt(q); m[i] = tau * a * d[i]; m[i + 1] = tau * b * d[i]; }
  }
  return m;
}
/** SVG path of the points a..b (inclusive) of a series, with the tangents of the whole series so pieces join up. */
function curve(xs, ys, m, a, b) {
  let out = `M${xs[a].toFixed(1)} ${ys[a].toFixed(1)}`;
  for (let i = a; i < b; i++) {
    const dx = (xs[i + 1] - xs[i]) / 3;
    out += `C${(xs[i] + dx).toFixed(1)} ${(ys[i] + m[i] * dx).toFixed(1)} ${(xs[i + 1] - dx).toFixed(1)} ${(ys[i + 1] - m[i + 1] * dx).toFixed(1)} ${xs[i + 1].toFixed(1)} ${ys[i + 1].toFixed(1)}`;
  }
  return out;
}

export function line({ pts, marks = [], aria = '', h = 170, xTicks = [], projFrom = null }) {
  const W = 340, padL = 38, padR = 12, padT = 22, padB = 20;
  const ys = pts.map((p) => p.y);
  const hi = nice(Math.max(0, ...ys)), lo = -nice(Math.max(0, ...ys.map((v) => -v)));
  const span = hi - lo || 1, ph = h - padT - padB, n = pts.length - 1;
  const X = (i) => padL + i / n * (W - padL - padR), Y = (v) => padT + (hi - v) / span * ph;
  const px = pts.map((_, i) => X(i)), py = pts.map((p) => Y(p.y)), tg = tangents(px, py);
  const d = curve(px, py, tg, 0, n);
  const area = `${d}L${X(n).toFixed(1)} ${Y(0).toFixed(1)}L${X(0).toFixed(1)} ${Y(0).toFixed(1)}Z`;
  const ticks = [hi, 0, ...(lo < 0 ? [lo] : [])].filter((t, i, a) => a.indexOf(t) === i);
  const grid = ticks.map((t) => `<line class="ch-grid ${t === 0 ? 'zero' : ''}" x1="${padL}" x2="${W - padR}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}"/>
    <text class="ch-tick" x="${padL - 6}" y="${(Y(t) + 3.5).toFixed(1)}">${compact(t)}</text>`).join('');
  // touching or dragging over it shows a guide, a dot and the figure inside the chart (see bindBalance)
  const geo = { w: W, x: px.map((v) => +v.toFixed(1)), y: py.map((v) => +v.toFixed(1)), l: pts.map((p) => p.tip || ''), top: padT, bottom: h - padB };
  const hits = `<rect class="bl-hit" x="0" y="0" width="${W}" height="${h}"/>
    <g class="bl-hover" hidden><line class="bl-guide" y1="${padT}" y2="${h - padB}"/><circle class="bl-dot" r="5"/><g class="bl-label"><rect rx="6"/><text/></g></g>`;
  const placed = [];
  const lab = marks.map(({ i, text }) => {
    const x = clamp(X(i), padL + 24, W - padR - 24), y = Y(pts[i].y);
    // two labels close together: the later one goes under its point
    const below = placed.some((p) => Math.abs(p - x) < 56) || y - 9 < 10;
    placed.push(x);
    return `<circle class="ch-dot" cx="${X(i).toFixed(1)}" cy="${y.toFixed(1)}" r="4"/><text class="ch-val" x="${x.toFixed(1)}" y="${(below ? y + 18 : y - 9).toFixed(1)}">${esc(text)}</text>`;
  }).join('');
  const xs = xTicks.map((tk) => { const i = tk.i ?? tk; return `<text class="ch-x" x="${X(i).toFixed(1)}" y="${h - 5}">${tk.text ?? i}</text>`; }).join('');
  // the days not known yet (projFrom on) are drawn dashed, from the last known point
  const k = projFrom != null && projFrom > 0 && projFrom <= n ? projFrom : null;
  const dSolid = k == null ? d : curve(px, py, tg, 0, k - 1);
  const dProj = k == null ? '' : curve(px, py, tg, k - 1, n);
  return `<svg class="chart bal-chart" viewBox="0 0 ${W} ${h}" role="img" aria-label="${esc(aria)}" data-geo="${esc(JSON.stringify(geo))}">${grid}<path class="ch-area" d="${area}"/><path class="ch-line" d="${dSolid}"/>${dProj ? `<path class="ch-line ch-proj" d="${dProj}"/>` : ''}${lab}${xs}${hits}</svg>`;
}

/**
 * The account balance over time (absolute values, not from zero): a solid line for what is known, dashed for the
 * estimate that follows, a dot on today. pts: [{ date, bal, proj }].
 */
export function balanceLine({ pts, aria = '', h = 170 }) {
  if (pts.length < 2) return '';
  const W = 340, padL = 44, padR = 12, padT = 22, padB = 22, n = pts.length - 1;
  const vs = pts.map((p) => p.bal), mn = Math.min(...vs), mx = Math.max(...vs), pad = (mx - mn) * 0.12 || Math.max(50, Math.abs(mx) * 0.05);
  const lo = mn - pad, hi = mx + pad, ph = h - padT - padB;
  const X = (i) => padL + i / n * (W - padL - padR), Y = (v) => padT + (hi - v) / (hi - lo) * ph;
  const ti = Math.max(0, pts.findIndex((p) => p.proj) - 1), hasProj = pts.some((p) => p.proj), tp = hasProj ? ti : n;
  const px = pts.map((_, i) => X(i)), py = pts.map((p) => Y(p.bal)), tg = tangents(px, py);
  const path = (a, b) => curve(px, py, tg, a, b);
  const area = `${path(0, tp)}L${X(tp).toFixed(1)} ${(padT + ph).toFixed(1)}L${X(0).toFixed(1)} ${(padT + ph).toFixed(1)}Z`;
  const ticks = [mx, (mx + mn) / 2, mn];
  const grid = ticks.map((v) => `<line class="ch-grid" x1="${padL}" x2="${W - padR}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/>
    <text class="ch-tick" x="${padL - 6}" y="${(Y(v) + 3.5).toFixed(1)}">${compact(v)}</text>`).join('');
  const day = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  const xs = [...new Set([0, Math.round(n / 2), n])].map((i) => `<text class="ch-x ${i === 0 ? 'ch-x0' : i === n ? 'ch-xn' : ''}" x="${X(i).toFixed(1)}" y="${h - 5}">${esc(day(pts[i].date))}</text>`).join('');
  // touching or dragging over it shows a guide, a dot and the figure inside the chart (see bindBalance)
  const geo = { w: W, x: px.map((v) => +v.toFixed(1)), y: py.map((v) => +v.toFixed(1)), l: pts.map((p) => `${day(p.date)}${p.proj ? ' · ≈ ' : ' · '}${fmt(p.bal)}`), top: padT, bottom: padT + ph };
  const hits = `<rect class="bl-hit" x="0" y="0" width="${W}" height="${h}"/>
    <g class="bl-hover" hidden><line class="bl-guide" y1="${padT}" y2="${padT + ph}"/><circle class="bl-dot" r="5"/><g class="bl-label"><rect rx="6"/><text/></g></g>`;
  const cx = X(tp), cy = Y(pts[tp].bal), end = pts[n];
  const today = `<line class="ch-todayline" x1="${cx.toFixed(1)}" x2="${cx.toFixed(1)}" y1="${padT}" y2="${padT + ph}"/><circle class="ch-dot" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4"/>
    <text class="ch-val" x="${clamp(cx, padL + 30, W - padR - 30).toFixed(1)}" y="${(cy - 10).toFixed(1)}">${esc(fmt(pts[tp].bal))}</text>`;
  const last = hasProj ? `<text class="ch-val ch-valproj" x="${(W - padR).toFixed(1)}" y="${(Y(end.bal) + (end.bal < pts[tp].bal && Y(end.bal) + 16 <= padT + ph - 2 ? 16 : -8)).toFixed(1)}">≈ ${esc(fmt(end.bal))}</text>` : '';
  return `<svg class="chart bal-chart" viewBox="0 0 ${W} ${h}" role="img" aria-label="${esc(aria)}" data-geo="${esc(JSON.stringify(geo))}">${grid}<path class="ch-area" d="${area}"/><path class="ch-line" d="${path(0, tp)}"/>${hasProj ? `<path class="ch-line ch-proj" d="${path(tp, n)}"/>` : ''}${today}${last}${xs}${hits}</svg>`;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** One listener for every balance chart: the nearest day follows your finger or the mouse. */
export function bindBalance() {
  const NS = 'http://www.w3.org/2000/svg';
  const at = (svg, e) => {
    const g = JSON.parse(svg.dataset.geo), r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * g.w;
    let k = 0; for (let i = 1; i < g.x.length; i++) if (Math.abs(g.x[i] - x) < Math.abs(g.x[k] - x)) k = i;
    const hv = svg.querySelector('.bl-hover'), line = hv.querySelector('.bl-guide'), dot = hv.querySelector('.bl-dot'), lab = hv.querySelector('.bl-label');
    const tx = lab.querySelector('text'), bg = lab.querySelector('rect');
    line.setAttribute('x1', g.x[k]); line.setAttribute('x2', g.x[k]); dot.setAttribute('cx', g.x[k]); dot.setAttribute('cy', g.y[k]);
    const d2 = hv.querySelector('.bl-dot2'); if (d2) { if (g.y2) { d2.setAttribute('cx', g.x[k]); d2.setAttribute('cy', g.y2[k]); d2.removeAttribute('hidden'); } else d2.setAttribute('hidden', ''); }
    tx.textContent = g.l[k]; hv.removeAttribute('hidden');
    const bb = tx.getBBox(), w = bb.width + 14, hgt = bb.height + 8, lx = Math.max(2, Math.min(g.w - w - 2, g.x[k] - w / 2));
    bg.setAttribute('x', lx); bg.setAttribute('y', 2); bg.setAttribute('width', w); bg.setAttribute('height', hgt);
    tx.setAttribute('x', lx + 7); tx.setAttribute('y', 2 + hgt / 2 + 4);
  };
  const hideAll = () => document.querySelectorAll('.bl-hover').forEach((h) => h.setAttribute('hidden', ''));
  document.addEventListener('pointerdown', (e) => { const svg = e.target.closest?.('svg.bal-chart'); if (!svg) return hideAll(); try { svg.setPointerCapture(e.pointerId); } catch { /* no capture */ } at(svg, e); });
  document.addEventListener('pointermove', (e) => { const svg = e.target.closest?.('svg.bal-chart'); if (svg && (e.pointerType === 'mouse' || e.buttons)) at(svg, e); });
  document.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hideAll(); }, true);
  document.addEventListener('scroll', hideAll, { passive: true, capture: true });
}

/**
 * Two cumulative lines over the months of the plan: the plan (reference) and what is saved, dashed from `projFrom` on
 * (the estimate). plan, real: arrays of the same length; labels: one per point (shown for a few).
 */
export function cumLines({ plan, real, projFrom = null, nowIdx = null, labels = [], tips = [], aria = '', h = 170 }) {
  const W = 340, padL = 44, padR = 50, padT = 22, padB = 22, n = plan.length - 1;
  const all = [...plan, ...real, 0], mx = Math.max(...all), mn = Math.min(...all), span = mx - mn || 1, ph = h - padT - padB;
  const X = (i) => padL + i / n * (W - padL - padR), Y = (v) => padT + (mx - v) / span * ph;
  const xs = plan.map((_, i) => X(i)), pyP = plan.map((v) => Y(v)), pyR = real.map((v) => Y(v));
  const tP = tangents(xs, pyP), tR = tangents(xs, pyR), k = projFrom != null && projFrom > 0 && projFrom <= n ? projFrom : null;
  const ticks = [...new Set([mx, mx / 2, 0, mn].map((v) => Math.round(v)))];
  const grid = ticks.map((v) => `<line class="ch-grid ${v === 0 ? 'zero' : ''}" x1="${padL}" x2="${W - padR}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/>
    <text class="ch-tick" x="${padL - 6}" y="${(Y(v) + 3.5).toFixed(1)}">${compact(v)}</text>`).join('');
  const lx = labels.map((l, i) => (l && (i === 1 || i === n || (i - 1) % 3 === 0) ? `<text class="ch-x ${i === 0 ? 'ch-x0' : i === n ? 'ch-xn' : ''}" x="${X(i).toFixed(1)}" y="${h - 5}">${esc(l)}</text>` : '')).join('');
  const now = nowIdx != null && nowIdx >= 0 && nowIdx <= n ? `<circle class="ch-dot cl-dot" cx="${xs[nowIdx].toFixed(1)}" cy="${pyR[nowIdx].toFixed(1)}" r="4"/>` : '';
  const solid = curve(xs, pyR, tR, 0, k == null ? n : k - 1), dash = k == null ? '' : curve(xs, pyR, tR, k - 1, n);
  // the two end figures sit to the right of the lines, pushed apart when they are close
  let yp = pyP[n] + 4, yr = pyR[n] + 4;
  if (Math.abs(yp - yr) < 14) { const mid = (yp + yr) / 2; if (yp <= yr) { yp = mid - 7; yr = mid + 7; } else { yp = mid + 7; yr = mid - 7; } }
  const geo = { w: W, x: xs.map((v) => +v.toFixed(1)), y: pyR.map((v) => +v.toFixed(1)), y2: pyP.map((v) => +v.toFixed(1)), l: plan.map((_, i) => tips[i] || labels[i] || ''), top: padT, bottom: padT + ph };
  const hits = `<rect class="bl-hit" x="0" y="0" width="${W}" height="${h}"/>
    <g class="bl-hover" hidden><line class="bl-guide" y1="${padT}" y2="${padT + ph}"/><circle class="bl-dot2" r="4"/><circle class="bl-dot cl-dot" r="5"/><g class="bl-label"><rect rx="6"/><text/></g></g>`;
  return `<svg class="chart bal-chart" viewBox="0 0 ${W} ${h}" role="img" aria-label="${esc(aria)}" data-geo="${esc(JSON.stringify(geo))}">${grid}
    <path class="ch-plan" d="${curve(xs, pyP, tP, 0, n)}"/><path class="ch-line cl-real" d="${solid}"/>${dash ? `<path class="ch-line cl-real ch-proj" d="${dash}"/>` : ''}${now}
    <text class="ch-val ch-vend" x="${(W - padR + 5).toFixed(1)}" y="${yp.toFixed(1)}" style="fill: var(--muted)">${esc(compact(plan[n]))}</text>
    <text class="ch-val ch-vend" x="${(W - padR + 5).toFixed(1)}" y="${yr.toFixed(1)}">${k != null ? '≈ ' : ''}${esc(compact(real[n]))}</text>${lx}${hits}</svg>`;
}
