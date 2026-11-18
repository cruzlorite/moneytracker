// Motion: numbers that count, bars that fill, a burst of pixels when a month is completed.
// Everything is skipped when the system asks for reduced motion.
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const lastNum = new Map();
const lastBar = new Map();
import { fmt } from './model.js';
import { locale } from './i18n.js';
const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, useGrouping: 'always' });

/** [data-count="123" data-key="x"]: counts from the last value shown for that key. */
export function animateNumbers(root) {
  root.querySelectorAll('[data-count]').forEach((el) => {
    const key = el.dataset.key || el.dataset.count;
    const to = +el.dataset.count, from = lastNum.has(key) ? lastNum.get(key) : (el.dataset.from != null ? +el.dataset.from : 0);
    lastNum.set(key, to);
    const suffix = el.dataset.suffix;
    const show = (v) => { el.textContent = suffix != null ? nf.format(Math.round(v * 10) / 10) + suffix : fmt(v); };
    if (reduced() || from === to) return show(to);
    const t0 = performance.now(), dur = Math.min(900, 300 + Math.abs(to - from) / 8);
    show(from);
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      show(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/** [data-bar="57.3" data-key="x"]: fills from the last width shown for that key. */
const done = new WeakSet();
export function animateBars(root) {
  root.querySelectorAll('[data-bar]').forEach((el) => {
    // a bar inside a section still waiting for its entrance is animated when it comes in, once
    if (el.closest('[data-step]:not(.in)') || done.has(el)) return;
    done.add(el);
    const key = el.dataset.key, to = +el.dataset.bar;
    // a gauge sweeps in from the left every time it's drawn; other bars grow from the last width shown
    const from = el.hasAttribute('data-reveal') ? 0 : key && lastBar.has(key) ? lastBar.get(key) : 0;
    if (key) lastBar.set(key, to);
    // a gauge's pieces (solid, hatched, over) are revealed together, left to right, by clipping their box
    if (el.hasAttribute('data-reveal')) {
      if (!reduced() && el.animate) el.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }], { duration: 1100, easing: 'cubic-bezier(.45, 0, .2, 1)' });
      return;
    }
    const set = el.hasAttribute('data-reveal')
      ? (x) => { el.style.clipPath = `inset(0 ${(100 - x).toFixed(2)}% 0 0)`; }
      : (x) => { el.style.width = x + '%'; };
    if (reduced()) { set(to); if (el.hasAttribute('data-reveal')) el.style.clipPath = ''; return; }
    el.style.transition = 'none';
    set(Math.min(from, to));
    el.getBoundingClientRect();
    el.style.transition = '';
    requestAnimationFrame(() => { set(to); });
  });
}

/** Square pixels bursting from a point (or the centre). Colours come from the theme tokens. */
export function burst(x, y, { count = 70 } = {}) {
  if (reduced()) return;
  const cs = getComputedStyle(document.documentElement);
  const colors = ['--save-fill', '--accent', '--pot', '--ok', '--spend'].map((v) => cs.getPropertyValue(v).trim()).filter(Boolean);
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  c.className = 'fx-canvas';
  document.body.appendChild(c);
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  x ??= innerWidth / 2; y ??= innerHeight / 2.5;
  const ps = Array.from({ length: count }, () => {
    const a = Math.random() * Math.PI * 2, v = 3 + Math.random() * 7;
    return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4, s: 4 + Math.round(Math.random() * 4) * 2, c: colors[(Math.random() * colors.length) | 0], life: 1 };
  });
  const t0 = performance.now();
  const frame = (t) => {
    g.clearRect(0, 0, innerWidth, innerHeight);
    let alive = false;
    for (const p of ps) {
      p.vy += 0.35; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.life = 1 - (t - t0) / 1400;
      if (p.life <= 0 || p.y > innerHeight + 20) continue;
      alive = true;
      g.globalAlpha = Math.max(0, p.life);
      g.fillStyle = p.c;
      g.fillRect(Math.round(p.x / 2) * 2, Math.round(p.y / 2) * 2, p.s, p.s);
    }
    if (alive) requestAnimationFrame(frame); else c.remove();
  };
  requestAnimationFrame(frame);
}

/** Small "pop" on an element (a tick, a chip). */
export function pop(el) {
  if (!el || reduced()) return;
  el.classList.remove('pop'); el.getBoundingClientRect(); el.classList.add('pop');
}

const COIN = '<svg viewBox="0 0 8 8" shape-rendering="crispEdges"><path fill="var(--save-fill)" d="M2 0h4v1h1v1h1v4h-1v1h-1v1h-4v-1h-1v-1h-1v-4h1v-1h1z"/><path fill="rgba(0,0,0,.25)" d="M3 2h2v1h-2zM2 3h1v2h-1zM5 3h1v2h-1zM3 5h2v1h-2z"/></svg>';
/** Pixel coins flying in an arc from a rectangle (where you tapped) into an element (the goal meter, a fund). */
export function coinDrop(fromRect, toEl, { coins = 5 } = {}) {
  if (!fromRect || !toEl || reduced()) { pop(toEl); return; }
  const to = toEl.getBoundingClientRect();
  const x0 = fromRect.left + fromRect.width / 2, y0 = fromRect.top + fromRect.height / 2;
  const x1 = to.left + to.width * (0.3 + Math.random() * 0.4), y1 = to.top + to.height / 2;
  for (let i = 0; i < coins; i++) {
    const c = document.createElement('div');
    c.className = 'fx-coin'; c.innerHTML = COIN;
    document.body.appendChild(c);
    const dx = x1 - x0 + (Math.random() - 0.5) * 30, dy = y1 - y0, lift = -80 - Math.random() * 60;
    const a = c.animate([
      { transform: `translate(${x0}px, ${y0}px) scale(.6)`, opacity: 0 },
      { transform: `translate(${x0 + dx * 0.45}px, ${y0 + dy * 0.2 + lift}px) scale(1.15) rotate(${180 + i * 40}deg)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${x0 + dx}px, ${y0 + dy}px) scale(.7) rotate(${360 + i * 40}deg)`, opacity: 1 },
    ], { duration: 650 + i * 70, delay: i * 60, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'both' });
    a.onfinish = () => { c.remove(); if (i === coins - 1) { pop(toEl); toEl.classList.remove('glow'); void toEl.offsetWidth; toEl.classList.add('glow'); } };
  }
}

/** Text that rises and fades from an element ("−20 €"). */
export function floatText(el, text, cls = '') {
  if (!el || reduced()) return;
  const r = el.getBoundingClientRect();
  const t = document.createElement('div');
  t.className = 'fx-float ' + cls; t.textContent = text;
  t.style.left = r.left + r.width * (0.2 + Math.random() * 0.6) + 'px'; t.style.top = r.top - 6 + 'px';
  document.body.appendChild(t);
  t.animate([{ transform: 'translate(-50%, 0)', opacity: 0 }, { transform: 'translate(-50%, -14px)', opacity: 1, offset: 0.2 }, { transform: 'translate(-50%, -46px)', opacity: 0 }],
    { duration: 1100, easing: 'ease-out' }).onfinish = () => t.remove();
}

/** A shake and a red flash: the month's money takes a hit. */
export function hit(el) {
  if (!el || reduced()) return;
  el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
}

/** Reveal children one after another ([data-step]), for the month close. */
export function stagger(root, gap = 380) {
  const items = [...root.querySelectorAll('[data-step]')];
  if (reduced()) { items.forEach((x) => x.classList.add('in')); animateNumbers(root); return; }
  items.forEach((x, i) => setTimeout(() => { x.classList.add('in'); animateNumbers(x); animateBars(x); }, 150 + i * gap));
}
