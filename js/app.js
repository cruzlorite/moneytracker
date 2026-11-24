// Views and actions. Data lives in Store; every number comes from model.compute().
import { Store } from './store.js';
import { isConfigured, loadGis, signIn, signOut, tokenValid, rememberEmail, sheetUrl, savedHint } from './google.js';
import {
  MES, MES3, DIAS, FREQ, fmt, fmt0, fmtN, fmtSigned, esc, clamp, num, round2, uid, ymAdd, ymLabel, monthName, toISO, toYM, unit, freqText,
  compute, daysTo, monthGrid, parsePlanFile, normCalcs, CALC_MAX, normItem, timesIn, isYM, occurs, ymDiff, daysInMonth, planEdit, planDelete, planAdd, planNext, activeIn,
} from './model.js';
import { animateNumbers, animateBars, burst, pop, coinDrop, floatText, hit, stagger } from './fx.js';
import { sortable } from './sort.js';
import { tco, evenReturn, valueAt, compare, optOf, aheadFrom, CURVES, curveKeep, AGE_UP, AGE_DOWN } from './tco.js';
import { columns, pairs, segbar, ranked, table, line, balanceLine, bindBalance, cumLines, multiLines, tipx, setChartWidth, withChartWidth } from './charts.js';
import { CAT, CATS, GROUPS, STARTERS, BASE, EXTRA_ICONS, SAVE_CAT, guessCat, searchCats, setCustomCats } from './cats.js';
import { pace, closeDue } from './play.js';
import { VERSION } from './version.js';
import { t, tn, lang, locale, LANGS, setLang, cur, curSym, curName, CURRENCIES, setCurrency, readLook, writeLook } from './i18n.js';

const $ = (s, r = document) => r.querySelector(s);
const app = $('#app'), dlg = $('#modal'), toastEl = $('#toast');
// a reload starts at the top: the browser's own scroll restoration lands after the content changes and covers the top
try { history.scrollRestoration = 'manual'; } catch { /* not supported */ }
const notifyOn = (k) => !!lsGet('hucha:n' + k);
let remTimer = 0; // the reminders' pending update (see the end of this file)
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* ignore */ } };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const pct = (a, b) => (b ? clamp(a / b * 100, 0, 100) : 0);

const UI = { tab: ({ cal: 'metas', months: 'metas', mes: 'home' })[lsGet('hucha:tab')] || lsGet('hucha:tab') || 'home', mesYM: null, anaPer: lsGet('hucha:ana2'), pending: false, lastTab: null, undo: [] };
const store = new Store(() => render(), () => renderStatus());

// ---------- icons: 24 px strokes ----------
const P = {
  home: 'M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  year: 'M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM3 9h18M8 2v4M16 2v4',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  plan: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  plus: 'M12 5v14M5 12h14',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  check: 'M20 6L9 17l-5-5',
  checksq: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  x: 'M18 6L6 18M6 6l12 12',
  left: 'M15 18l-6-6 6-6',
  right: 'M9 6l6 6-6 6',
  coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 12h6',
};
const ic = (n, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[n] || ''}"/></svg>`;

// ---------- toast ----------
let tt;
/** A missing or wrong field: say it under the field, mark it, and put the cursor there (a toast hides behind a sheet). */
function invalid(sel, msg) {
  const el = (dlg.open ? dlg : document).querySelector(sel) || document.querySelector(sel);
  if (!el) return toast(msg);
  const box = el.closest('.field') || el.parentElement;
  box.querySelector('.field-err')?.remove();
  const e = Object.assign(document.createElement('span'), { className: 'field-err', textContent: msg, id: (el.id || 'f') + '-err' });
  e.setAttribute('role', 'alert');
  box.appendChild(e);
  el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', e.id);
  el.classList.add('invalid');
  const clear = () => { el.classList.remove('invalid'); el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); e.remove(); };
  el.addEventListener('input', clear, { once: true });
  el.focus();
  el.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  return false;
}
function toast(msg, ms = 2200) {
  toastEl.textContent = msg; toastEl.hidden = false;
  pop(toastEl);
  clearTimeout(tt); tt = setTimeout(() => { toastEl.hidden = true; }, ms);
}

// ---------- chart tooltips: any [data-tip] shows it on hover, keyboard focus or tap ----------
const tipEl = Object.assign(document.createElement('div'), { id: 'tip', hidden: true });
tipEl.setAttribute('role', 'status');
document.body.appendChild(tipEl);
/** The HTML of a structured tip (see tipx in charts.js): a title, a line per series with its legend symbol, and an optional foot. */
function tipHTML(txt) {
  let d; try { d = JSON.parse(txt); } catch { return null; }
  if (!d?.tx) return null;
  const sw = (r) => `<i class="tsw ${r.k || 'solid'}" style="--c:${esc(r.c || 'var(--muted)')}"></i>`;
  return `${d.t ? `<div class="tt">${esc(d.t)}</div>` : ''}${d.r.map((r) => `<div class="tr">${sw(r)}<span>${esc(r.l)}</span><b class="num">${esc(r.v)}</b></div>`).join('')}${d.f ? `<div class="tf">${esc(d.f)}</div>` : ''}`;
}
function placeTip(r) {
  const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  const left = clamp(r.left + r.width / 2 - w / 2, 8, innerWidth - w - 8), top = r.top - h - 8 < 8 ? r.bottom + 8 : r.top - h - 8;
  tipEl.style.left = left + 'px'; tipEl.style.top = top + 'px';
  const at = tipEl.getBoundingClientRect(); // a transformed dialog moves fixed children: correct for it
  if (Math.abs(at.left - left) > 1 || Math.abs(at.top - top) > 1) { tipEl.style.left = 2 * left - at.left + 'px'; tipEl.style.top = 2 * top - at.top + 'px'; }
}
function showTip(t) {
  const rich = t.dataset.info ? infoHTML(t.dataset.info) : '', txt = t.dataset.tip, x = !rich && txt ? tipHTML(txt) : null;
  if (!rich && !txt) return hideTip();
  document.querySelectorAll('.tipon').forEach((q) => q.classList.remove('tipon'));
  const host = t.closest('dialog') || document.body; // an open dialog sits on top of everything else
  if (tipEl.parentNode !== host) host.appendChild(tipEl);
  if (rich || x) tipEl.innerHTML = rich || x; else tipEl.textContent = txt;
  tipEl.classList.toggle('rich', !!rich); tipEl.classList.toggle('tipx', !!x); tipEl.hidden = false; t.classList.add('tipon');
  placeTip(t.getBoundingClientRect());
}
/** A tip at a point of the screen (a chart's scrubbed point). */
function showTipAt(txt, px, py) {
  const el = document.elementFromPoint(px, py), host = el?.closest?.('dialog') || document.body, x = tipHTML(txt);
  if (tipEl.parentNode !== host) host.appendChild(tipEl);
  if (x) tipEl.innerHTML = x; else tipEl.textContent = txt;
  tipEl.classList.remove('rich'); tipEl.classList.toggle('tipx', !!x); tipEl.hidden = false;
  placeTip({ left: px, top: py - 6, width: 0, height: 0, bottom: py + 6 });
}
function hideTip() { tipEl.hidden = true; document.querySelectorAll('.tipon').forEach((x) => x.classList.remove('tipon')); }
document.addEventListener('pointerover', (e) => { if (e.pointerType === 'mouse') { const t = e.target.closest?.('[data-tip],[data-info]'); if (t) showTip(t); } });
document.addEventListener('pointerout', (e) => { if (e.pointerType === 'mouse' && e.target.closest?.('[data-tip],[data-info]') && !e.relatedTarget?.closest?.('[data-tip],[data-info]')) hideTip(); });
// before the tooltip handler runs: was this row's tooltip already open? (then this tap opens its detail)
document.addEventListener('pointerdown', (e) => { UI.ptr = e.pointerType; UI.wasTip = !!e.target.closest?.('.hasdetail')?.classList.contains('tipon'); }, true);
document.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { const t = e.target.closest?.('[data-tip],[data-info]'); t ? showTip(t) : hideTip(); } });
// any field in any sheet: once the keyboard is up, bring it into view (the type search goes to the top of its sheet)
document.addEventListener('focusin', (e) => {
  const el = e.target, sh = el?.closest?.('dialog .sheet');
  if (!sh || !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
  const go = () => {
    if (el.id === 'cat-search') sh.scrollTop = Math.max(0, el.getBoundingClientRect().top - sh.getBoundingClientRect().top + sh.scrollTop - 8);
    else el.scrollIntoView?.({ block: 'center' });
  };
  setTimeout(go, 50); setTimeout(go, 350); // again once the keyboard has finished opening
});
document.addEventListener('scroll', hideTip, { passive: true, capture: true });

bindBalance(showTipAt, hideTip);

// ---------- updates: the installed app keeps old files; say so when a newer version is published ----------
function refreshApp(btn) {
  // fetch every file again, bypassing the browser's cache, then reload
  if (btn) { btn.disabled = true; btn.textContent = t('Actualizando…'); }
  const files = ['./', 'index.html', 'styles.css', 'config.js', ...['app', 'model', 'cats', 'charts', 'fx', 'google', 'store', 'play', 'sort', 'demo', 'i18n', 'icons-extra', 'version'].map((n) => `js/${n}.js`), 'js/i18n/en.js'];
  Promise.all(files.map((f) => fetch(f, { cache: 'reload' }).catch(() => null))).then(() => location.reload());
}
function checkUpdate() {
  if (VERSION === 'dev' || document.getElementById('updbar')) return;
  fetch('js/version.js', { cache: 'no-store' }).then((r) => (r.ok ? r.text() : '')).then((txt) => {
    const v = /VERSION = '([^']+)'/.exec(txt)?.[1];
    if (!v || v === VERSION || document.getElementById('updbar')) return;
    const bar = document.createElement('div');
    bar.id = 'updbar'; bar.setAttribute('role', 'status');
    bar.innerHTML = `<span>${t('Hay una versión nueva')}</span><button type="button" class="btn-dark sm">${t('Actualizar')}</button>`;
    bar.querySelector('button').addEventListener('click', (e) => refreshApp(e.currentTarget));
    document.body.appendChild(bar);
  }).catch(() => { /* offline: nothing to say */ });
}
checkUpdate();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkUpdate(); });

// ---------- theme ----------
function applyTheme(t) {
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  // the system bar takes the app's colour: the one you chose, or the device's (each meta has its own scheme)
  const bg = { light: '#f4f5f7', dark: '#0b0d12' };
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    const scheme = /dark/.test(m.getAttribute('media') || '') ? 'dark' : 'light';
    m.setAttribute('content', bg[t === 'light' || t === 'dark' ? t : scheme]);
  });
}
applyTheme(lsGet('hucha:theme') || readLook().theme || null);
writeLook({ theme: lsGet('hucha:theme') || readLook().theme || '' });

// ---------- frame ----------
function ensureFrame() {
  if ($('#view')) return;
  const tab = (t, l, i) => `<button data-act="tab" data-tab="${t}">${ic(i)}<span>${l}</span></button>`;
  app.innerHTML = `
    <header class="top" id="top" hidden><div class="in">
      <button class="backbtn" id="backbtn" data-act="back" hidden>${ic('left')}<span>${t('Atrás')}</span></button>
    </div></header>
    <div class="syncbar" id="syncbar" role="status" hidden></div>
    <main id="view" class="wrap"></main>
    <nav class="tabs" aria-label="${t('Secciones')}"><div class="in">
      <div class="sidebrand" aria-hidden="true">${ic('coin')}<span>MoneyTracker</span></div>
      ${tab('home', t('Hoy'), 'home')}${tab('metas', t('Año'), 'year')}
      ${tab('ana', t('Análisis'), 'chart')}${tab('plan', t('Plan'), 'plan')}
      <button data-act="tab" data-tab="settings" id="navset">${ic('gear')}<i class="navdot" id="navdot" hidden></i><span>${t('Ajustes')}</span></button>
    </div></nav>
    <button class="plusbtn fab" id="fab" data-act="quick" aria-label="${t('Apuntar un gasto')}" title="${t('Apuntar un gasto')}">${ic('plus')}</button>`;
  // the + rides on the bar's real height (it changes with the phone's gesture area and the browser's own bars)
  const nav = $('nav.tabs'), setH = () => document.documentElement.style.setProperty('--navh', nav.offsetHeight + 'px');
  setH(); new ResizeObserver(setH).observe(nav); addEventListener('resize', setH);
  // charts are drawn for the room they have: when the window changes enough to change it, draw them again
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { const w = chartRoom(); if (setChartWidth(w) !== UI.chartW) render(); }, 200); });
}
/** The width inside a card in the main column (what a chart gets). */
function chartRoom() {
  const v = $('#view'); if (!v) return 0;
  const cs = getComputedStyle(v);
  return v.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 32;
}

// ---------- years: the plan year you are looking at (0 = the one in progress) ----------
/** The goal of the year that starts in `start`: the current one, one saved when that year was closed, or (a year to come) the current one. */
const goalIn = (settings, start) => (settings.years || []).find((y) => y.start === start)?.goal ?? settings.goal;
const goalOfYear = (start) => goalIn(store.data.settings, start);
const yearStartAt = (off) => ymAdd(store.data.settings.start, 12 * off);
/** Everything computed for the plan year that starts in `start` (same plan, that year's goal). */
function computeYearAt(start, data = store.data) {
  return compute({ ...data, settings: { ...data.settings, start, goal: goalIn(data.settings, start) } });
}
const computeYear = (off) => computeYearAt(yearStartAt(off));
/** The year (offset from the one in progress) that holds month `ym`. */
const yearOffOf = (ym) => Math.floor(ymDiff(store.data.settings.start, ym) / 12);
/** The same, for a month: so its figures (its target, its share of the year) are those of its own year. */
const mFor = (ym, data = store.data) => computeYearAt(ymAdd(data.settings.start, 12 * Math.floor(ymDiff(data.settings.start, ym) / 12)), data);
/** How far back and forward you can go: back to the first year with anything in it, forward a few years to plan ahead. */
function yearBounds() {
  const s = store.data.settings, firsts = [s.start, ...(s.years || []).map((y) => y.start), ...Object.keys(store.data.months), ...store.data.spends.map((e) => e.date.slice(0, 7))].filter(isYM).sort();
  return { min: 0, max: 3 }; // never the past; the coming years, yes
}
/** The month the Plan shows its items "as of": this month in the current year, the last of a past year, the first of a year to come. */
const viewYMOf = (m) => ((UI.yearOff || 0) === 0 ? m.curYM : (UI.yearOff || 0) < 0 ? m.season[11] : m.season[0]);
const yearRange = (m) => `${MES3[+m.season[0].slice(5) - 1]} ${m.season[0].slice(2, 4)} – ${MES3[+m.season[11].slice(5) - 1]} ${m.season[11].slice(2, 4)}`;
const yearWord = (off) => (off === 0 ? t('Año en curso') : off === -1 ? t('Año pasado') : off < 0 ? t('Hace {n} años', { n: -off }) : off === 1 ? t('Año que viene') : t('Dentro de {n} años', { n: off }));
/** Go back and forward through the plan years; it is the same everywhere (Año, Análisis, Plan). */
function yearNav(m) {
  const off = UI.yearOff || 0, b = yearBounds();
  if (b.min >= b.max) return ''; // one year only: nothing to choose
  return `<div class="yearnav slim" role="group" aria-label="${t('Año')}">
    <button type="button" class="iconbtn" data-act="yearmove" data-k="-1" ${off <= b.min ? 'disabled' : ''} aria-label="${t('Año anterior')}">${ic('left')}</button>
    <span class="yn-t"><b class="num">${yearRange(m)}</b><span class="fine">${yearWord(off)}</span></span>
    <button type="button" class="iconbtn" data-act="yearmove" data-k="1" ${off >= b.max ? 'disabled' : ''} aria-label="${t('Año siguiente')}">${ic('right')}</button></div>`;
}
function render(force) {
  if (!store.mode) { renderWelcome(); return; }
  setCustomCats(store.data.settings.cats || []);
  ensureFrame();
  const view = $('#view');
  const a = document.activeElement;
  if (!force && a && view.contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) { UI.pending = true; return; }
  UI.pending = false;
  UI.yearOff = clamp(UI.yearOff || 0, yearBounds().min, yearBounds().max);
  const m = ['metas', 'ana', 'plan'].includes(UI.tab) ? computeYear(UI.yearOff) : UI.tab === 'mes' ? mFor(UI.mesYM || compute(store.data).curYM) : compute(store.data);
  UI.chartW = setChartWidth(chartRoom());
  const views = { home, mes, ana: analisis, metas, plan, settings, calc: calcView };
  view.innerHTML = (views[UI.tab] || home)(m);
  if (UI.lastTab !== UI.tab) {
    view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter');
    UI.lastTab = UI.tab; window.scrollTo(0, 0);
  }
  const navTab = UI.tab === 'mes' ? 'metas' : UI.tab === 'calc' ? 'plan' : UI.tab;
  document.querySelectorAll('nav.tabs button[data-tab]').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === navTab ? 'page' : 'false'));
  const sub = UI.tab === 'mes' || UI.tab === 'calc'; // pages opened on top of a tab; the top bar exists just for their back button
  $('#backbtn').hidden = !sub; $('#top').hidden = !sub; view.classList.toggle('nohead', !sub);
  const wide = UI.tab === 'calc' && !!UI.calc; view.classList.toggle('wide', wide); $('#top').classList.toggle('wide', wide); // a decision uses the whole width on a computer
  $('#fab').disabled = !m.items.length; $('#fab').hidden = UI.tab !== 'home'; // the + only lives in Hoy
  hideTip();
  animateNumbers(view); animateBars(view);
  renderStatus();
  afterRender(m);
}
function afterRender(m) {
  syncReminders(); adoptLook();
  // the app icon shows how many amounts are waiting to be confirmed (installed app, where supported)
  const n = m.items.length ? m.pendingIn(m.curYM).length : 0;
  try { n ? navigator.setAppBadge?.(n) : navigator.clearAppBadge?.(); } catch { /* not supported */ }
  // the month close opens by itself once, the first time you open the app after the month ends
  const due = m.items.length && store.mode !== 'demo' ? closeDue(m) : null;
  if (due && UI.tab === 'home' && !dlg.open && lsGet('hucha:closeSeen') !== due) {
    lsSet('hucha:closeSeen', due);
    setTimeout(() => { if (!dlg.open) openClose(due); }, 500);
  }
}

const SAVE_TXT = { idle: 'Guardado', saved: 'Guardado', pending: 'Sin guardar', saving: 'Guardando…', offline: 'Sin conexión', auth: 'Conectar', error: 'Error al guardar' };
let lastStatus = '';
/** The save state, with no room of its own: a dot on the Ajustes tab (nothing when all is well) and a line in Ajustes. */
function renderStatus() {
  const dot = $('#navdot'); if (!dot) return;
  const g = store.mode === 'google', st = store.status;
  const tone = !g ? (store.mode === 'demo' ? 'demo' : '') : st === 'error' ? 'bad' : st === 'offline' || st === 'auth' ? 'warn' : st === 'pending' || st === 'saving' ? 'busy' : '';
  dot.hidden = !tone; dot.className = 'navdot ' + tone;
  const txt = store.mode === 'demo' ? t('Demo') : store.mode === 'local' ? t('En este dispositivo') : t(SAVE_TXT[st] || 'Guardado');
  $('#navset')?.setAttribute('aria-label', `${t('Ajustes')} · ${txt}`);
  const line = $('#savestate'); if (line) { line.textContent = txt; line.className = 'savestate ' + (tone || 'ok'); }
  // when saving isn't working, a slim bar offers the way out (and takes no room otherwise)
  const bar = $('#syncbar');
  if (bar) {
    const need = g && (st === 'auth' || st === 'error' || st === 'offline');
    bar.hidden = !need;
    if (need) bar.innerHTML = st === 'auth' ? `<span>${t('Tus cambios no se están guardando en Google.')}</span><button type="button" data-act="reauth">${t('Volver a conectar')}</button>`
      : st === 'error' ? `<span>${t('Error al guardar')}</span><button type="button" data-act="retrysave">${t('Reintentar')}</button>`
      : `<span>${t('Sin conexión: se guardará al volver')}</span>`;
    bar.className = 'syncbar ' + (st === 'error' ? 'bad' : 'warn');
  }
  // a problem is said once, with words, when it starts
  if (g && st !== lastStatus && st === 'error') toast(`${t('Error al guardar')}: ${store.error}`, 4500);
  lastStatus = st;
}

// ---------- welcome ----------
function renderWelcome() {
  app.innerHTML = `<main class="wrap welcome enter">
    <div class="hero-mark">${ic('coin', 'big-coin')}<h1>${t('MoneyTracker')}</h1></div>
    <p class="lead">${t('Planifica tu año: ingresos, gastos y ahorro. Mira de un vistazo si vas bien.')}</p>
    <div class="card" style="gap:10px">
      ${isConfigured() ? `<button class="primary big" data-act="connect">${t('Conectar con Google')}</button>
        <p class="fine">${t('Tus datos se guardan en una hoja de cálculo de tu Google Drive. La app solo puede ver las hojas que crea ella.')}</p>` :
        `<p class="fine">${t('Para guardar en Google Drive falta configurar')} <code>config.js</code> ${t('(mira el README). Mientras, puedes usarla en este dispositivo.')}</p>`}
      <button class="${isConfigured() ? '' : 'primary big'}" data-act="local">${t('Empezar en este dispositivo')}</button>
      <label class="filebtn">${t('Importar un plan (.json)')}<input type="file" accept="application/json,.json" id="import-welcome" hidden></label>
      <button class="ghost" data-act="demo">${t('Ver la demo')}</button>
    </div>
    <p class="fine center"><a href="privacy.html">${t('Privacidad')}</a></p>
  </main>`;
}

// ---------- shared bits ----------
const bar = (cls, value, key, extra = '') => `<div class="bar ${cls}" role="progressbar" aria-valuenow="${Math.round(value)}" aria-valuemin="0" aria-valuemax="100"><i data-bar="${value.toFixed(1)}" data-key="${key}"></i>${extra}</div>`;
const money = (v, key, cls = '') => `<span class="num ${cls}" data-count="${Math.round(v * 10) / 10}" data-key="${key}">${fmt(v)}</span>`;

/** First steps, ticked off by themselves: the plan, the saving goal and the account balance. Gone when all three are done. */
function setupCard(m, ym) {
  const steps = [
    { done: m.items.length > 0, n: t('Tus ingresos y gastos fijos'), d: t('Nómina, alquiler, recibos… en Plan'), go: 'plan' },
    { done: (store.data.settings.goal || 0) > 0, n: t('Tu objetivo de ahorro'), d: t('Cuánto quieres ahorrar al año, en Plan'), go: 'plan' },
    { done: m.balStart(ym) != null, n: t('El saldo de tu cuenta'), d: t('Una sola vez, en Hoy. Después, al cerrar cada mes'), go: m.items.length ? 'home' : '' },
  ];
  if (steps.every((x) => x.done)) return '';
  const next = steps.findIndex((x) => !x.done);
  return `<section class="card setup" aria-label="${t('Primeros pasos')}"><h2>${t('Primeros pasos')}</h2>
    <ol class="steps">${steps.map((x, i) => `<li class="${x.done ? 'done' : i === next ? 'now' : ''}"><span class="sn" aria-hidden="true">${x.done ? ic('check') : i + 1}</span>
      <span class="st-t"><b>${x.n}</b><span class="fine">${x.d}</span></span>${!x.done && x.go === 'plan' ? `<button type="button" class="btn-sec sm" data-act="tab" data-tab="plan">${t('Ir a Plan')}</button>` : ''}</li>`).join('')}</ol>
    <p class="fine">${t('Cada mes lo cierras con el saldo de tu cuenta y la app calcula cuánto gastaste y cuánto ahorraste.')}</p></section>`;
}
function emptyPlanCard(m) {
  return `${setupCard(m || compute(store.data), (m || compute(store.data)).curYM)}<section class="card"><h2>${t('¿Ya tienes un plan?')}</h2>
    <label class="filebtn">${t('Importar plan')}<input type="file" accept="application/json,.json" id="import-file" hidden></label></section>`;
}

// ---------- page bits ----------
const longDate = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
const shortDate = (iso) => `${+iso.slice(8, 10)} ${MES3[+iso.slice(5, 7) - 1]}`;
const rangeText = (m, ym) => { const r = m.range(ym); return `${shortDate(r.from)} – ${shortDate(r.to)}`; };
const pageHead = (title, sub = '', kicker = '', side = '') => `<div class="phead"><div class="phead-t">${kicker ? `<span class="kicker">${kicker}</span>` : ''}<h1>${title}</h1>${sub ? `<span class="psub">${sub}</span>` : ''}</div>${side}</div>`;
/** Month header: the name with its year in the middle, the dates under it, and arrows to move around the months. */
const monthHead = (title, sub, kicker, act) => `<div class="mhead"><button type="button" class="iconbtn" data-act="${act}" data-k="-1" aria-label="${t('Mes anterior')}">${ic('left')}</button><div class="mhead-t">${kicker ? `<span class="kicker">${kicker}</span>` : ''}<h1>${title}</h1>${sub ? `<span class="psub">${sub}</span>` : ''}</div><button type="button" class="iconbtn" data-act="${act}" data-k="1" aria-label="${t('Mes siguiente')}">${ic('right')}</button></div>`;
/** An ⓘ that opens a longer explanation: tap it on a phone, hover or focus it on a computer. */
// ⓘ: a small card that says, in plain words and with the same marks as the bars, what each thing is and how it's worked out
const info = (key) => `<button type="button" class="info" data-info="${key}" aria-label="${t('Cómo se calcula')}">i</button>`;
const IX = {
  fill: (c) => `<i class="ix-fill" style="background:${c}"></i>`,
  proj: (c) => `<i class="lg-proj" style="--pc:${c}"></i>`,
  mark: '<i class="lg-mark"></i>',
  today: '<i class="lg-today"></i>',
  chip: (c) => `<i class="ix-chip" style="background:${c}"></i>`,
  k: (cls) => `<i class="ix-fill ${cls}"></i>`,
  pill: (cls, word) => `<span class="pill ${cls}">${word}</span>`,
};
const ixRow = (sw, name, text) => `<div class="ixr"><span class="ixs">${sw}</span><p>${name.startsWith('<') ? name : `<b>${name}:</b>`} ${text}</p></div>`;
const scaleRows = () => [
  ixRow(IX.chip(scaleOf(20, 100).c), t('Rojo'), t('menos del 30 %.')),
  ixRow(IX.chip(scaleOf(45, 100).c), t('Naranja'), '30 – 60 %.'),
  ixRow(IX.chip(scaleOf(85, 100).c), t('Amarillo'), '60 – 100 %.'),
  ixRow(IX.chip(scaleOf(100, 100).c), t('Verde'), '100 %.'),
  ixRow(IX.chip(scaleOf(120, 100).c), t('Verde oscuro'), t('110 % o más.'))];
function infoHTML(key) {
  const O = 'var(--out)', S = 'var(--sav)', R = 'var(--spend)', M = 'var(--muted)';
  const card = (title, rows, foot = '') => `<h4>${title}</h4>${rows.join('')}${foot ? `<p class="ixf">${foot}</p>` : ''}`;
  switch (key) {
    case 'mes': return card(t('Gastos este mes'), [
      ixRow(IX.fill(O), t('Gastado'), t('salidas de tu cuenta este mes, sin contar el ahorro.')),
      ixRow(IX.mark, t('Planificado'), t('ingresos del mes − objetivo de ahorro del mes.')),
      ixRow(IX.proj(O), t('Proyección'), t('gasto estimado a fin de mes, a tu ritmo.')),
      ixRow(IX.fill(R), t('Rojo'), t('exceso sobre el gasto planificado.'))]);
    case 'ahorroMes': return card(t('Ahorrado este mes'), [
      ixRow(IX.fill(S), t('Ahorrado'), t('lo que ya has pasado a ahorro e inversión este mes. Es dinero contabilizado, no una estimación.'))]);
    case 'limites': return card(t('Gasto por tipo'), [
      ixRow(IX.fill(O), t('Gastado'), t('en ese tipo, este mes (mensual) o este año (anual).')),
      ixRow(IX.mark, t('Presupuesto'), t('cantidad fijada en el Plan.')),
      ixRow(IX.proj(O), t('Proyección'), t('lo que llevarías a fin de mes a este ritmo. Solo en presupuestos mensuales, y desde el tercer día.')),
      ixRow(IX.fill(R), t('Rojo'), t('exceso sobre el presupuesto.'))], t('Sin presupuestar: tipos sin límite; la barra los compara con el que más has gastado.'));
    case 'ano': return card(t('Este año'), [
      ixRow(IX.fill(S), t('Ahorrado'), t('suma de lo ahorrado cada mes.')),
      ixRow(IX.proj(S), t('Proyección'), t('ahorro estimado a fin de año.')),
      ixRow(IX.mark, t('Planificado'), t('ahorro anual del Plan.'))]);
    case 'meses': return card(t('Mes a mes'), [
      ixRow('', t('Casilla'), t('ahorrado / planificado del mes.')),
      ixRow('', t('Planificado del mes'), t('varía según tu plan; los doce suman el anual.')),
      ...scaleRows()], t('Color: ahorrado frente a planificado.'));
    case 'planReal': return card(t('Plan y realidad'), [
      ixRow(IX.fill(M), t('Hasta hoy'), t('lo que llevas en el año.')),
      ixRow(IX.mark, t('Planificado año'), t('cantidad planificada para todo el año.')),
      ixRow(IX.today, t('Planificado a hoy'), t('lo que deberías llevar hoy según el plan.')),
      ixRow(IX.proj(M), t('Proyección'), t('cantidad estimada a fin de año.'))],
      t('Cada fila tiene su escala.'));
    case 'ahorradoMes': return card(t('Ahorro cada mes'), [
      ixRow(IX.chip(scaleOf(100, 100).c), t('Columna'), t('ahorrado del mes.')),
      ixRow('<i class="lg-tick"></i>', t('Raya'), t('planificado del mes.')),
      ...scaleRows()], t('Color: ahorrado frente a planificado.'));
    case 'plan': return card(t('Objetivo de ahorro'), [
      ixRow(IX.k('k-save'), t('Ahorro'), t('cantidad planificada anual.')),
      ixRow(IX.k('k-fix'), t('Gastos planificados'), t('alquiler, recibos, seguros…')),
      ixRow(IX.k('k-bud'), t('Presupuestos'), t('lo que reservas para cada tipo de gasto.')),
      ixRow(IX.k('k-free'), t('Sin presupuestar'), t('el resto: comida, salidas…')),
      ixRow(IX.k('k-neg'), t('Falta'), t('lo que no cabe.')),
      ixRow('', t('Gasto total planificado'), t('ingresos − ahorro.'))],
      t('Porcentajes: sobre tus ingresos. Lo que no gastes, también es ahorro.'));
    case 'acumulado': return card(t('Ahorro e inversión acumulado'), [
      ixRow(IX.fill('var(--sav)'), t('Ahorrado'), t('suma de lo ahorrado mes a mes.')),
      ixRow(IX.proj('var(--sav)'), t('Estimado'), t('este mes a tu ritmo y los siguientes según lo planificado.')),
      ixRow('<i class="lg-plan"></i>', t('Planificado'), t('suma de lo planificado cada mes.'))],
      t('Por encima de la línea gris vas adelantado; por debajo, atrasado.'));
    case 'saldo': return card(t('Saldo de tu cuenta'), [
      ixRow(IX.fill('var(--s1)'), t('Saldo'), t('lo que había en tu cuenta cada día.')),
      ixRow(IX.proj('var(--s1)'), t('Estimado'), t('desde hoy hasta fin de mes: lo planificado y tu ritmo de gasto desde tu último saldo.'))],
      t('Los días de meses cerrados se reparten a partes iguales entre el saldo inicial y el de cierre.'));
    case 'curvaMes': return card(t('Tu dinero en el mes'), [
      ixRow(IX.fill('var(--s1)'), t('Acumulado del mes'), t('lo que ha entrado menos lo que ha salido desde el primer día del mes. Empieza en 0.')),
      ixRow(IX.proj('var(--s1)'), t('Proyectado'), t('desde hoy hasta fin de mes: lo planificado y tu ritmo de gasto desde tu último saldo.'))],
      t('Cada punto es el acumulado de ese día, no el gasto de ese día.'));
    case 'cierre': return card(t('Cierre del mes'), [
      ixRow('', t('Saldo'), t('lo que hay hoy en tu cuenta.')),
      ixRow(IX.fill(O), t('Gastado'), t('saldo inicial + ingresos − ahorro − saldo final.')),
      ixRow(IX.fill(S), t('Ahorrado'), t('ingresos − gastado.'))],
      t('El saldo final es el inicial del mes siguiente.'));
    default: return '';
  }
}
const vPill = (vd) => (vd ? `<span class="pill ${vd.cls}">${vd.word}</span>` : '');
/**
 * The one bar for anything measured against a plan. It starts at 0 and reaches the largest of the figures, so going
 * over shows as the bar running past the mark. fill: what is; proj: where it ends at this pace (hatched);
 * marks: the plan's references, each named under the bar ({ at, label }). thin: a list row (the row says the figures).
 */
function gauge({ v, marks = [], proj = null, tone, ptone = tone, key, thin = false, tall = false, label = '', scale = 0, cap = null, note = null, names = {}, notip = false }) {
  // touching a part says what it is and its figure: the fill (what is), the hatched part (the projection), the marks (the plan)
  const nm = { fill: t('Actual'), proj: t('Proyección'), plan: t('Planificado'), over: t('Exceso'), ...names };
  const NT = notip; // every bar tells what a part is when touched (only the thick ones also dim the rest); a row that carries its own tip turns these off
  // each part says the figure its own end stands for, so the number always matches the stretch you touched:
  // past a cap the solid orange ends AT the cap (not at what was spent), the red is what went over it
  const tip = (rows) => (NT ? '' : `data-tip="${esc(tipx('', rows))}"`);
  const overCap = cap != null && v > cap, solid = cap != null ? 'var(--out)' : tone, pt = cap != null ? 'var(--out)' : ptone;
  const tipFill = tip([overCap ? { c: solid, k: 'solid', l: t('Dentro del presupuesto'), v: fmt(cap) } : { c: solid, k: 'solid', l: nm.fill, v: fmt(v) }]);
  const tipOver = cap != null ? tip([{ c: 'var(--spend)', k: 'solid', l: nm.over, v: fmt(v - cap) }]) : '';
  // the projected stretches say their own figure (what is still to come in them), and the total as context
  const total = proj != null ? { k: 'line', l: nm.projTotal || t('Total proyectado'), v: `≈ ${fmt(proj)}` } : null;
  const tipProj = proj != null ? tip(cap != null && proj > cap
    ? [{ c: 'var(--spend)', k: 'hatch', l: t('Exceso proyectado'), v: `≈ ${fmt(proj - Math.max(v, cap))}` }, total]
    : [{ c: pt, k: 'hatch', l: nm.proj, v: `+ ≈ ${fmt(proj - v)}` }, total]) : '';
  const tipProjIn = proj != null ? tip(cap != null && proj > cap
    ? [{ c: 'var(--out)', k: 'hatch', l: t('Proyectado hasta el presupuesto'), v: `+ ≈ ${fmt(cap - v)}` }, total]
    : [{ c: pt, k: 'hatch', l: nm.proj, v: `+ ≈ ${fmt(proj - v)}` }, total]) : '';
  const max = Math.max(1, scale, v, proj || 0, ...marks.map((k) => k.at));
  const w = (x) => +clamp(x / max * 100, 0, 100).toFixed(1);
  const lab = marks.filter((k) => k.label).map((k) => { const at = w(k.at); return `<span class="${at > 70 ? 'end' : at < 15 ? 'start' : ''}" style="left:${at}%">${k.label}</span>`; }).join('');
  const seg = (a, b, c, hatch, tp = tipProj) => (b - a > 0.004 ? `<i class="${hatch ? 'g-proj' : 'g-over'}" ${hatch ? tp : tipOver} style="left:${w(a)}%; width:${(w(b) - w(a)).toFixed(1)}%; ${hatch ? `--pc:${c}` : `background:${c}`}"></i>` : '');
  let bars;
  if (cap != null) {
    // spending against a cap: within it, spending's own orange; only what goes past it in red
    const ok = 'var(--out)', over = 'var(--spend)', inV = Math.min(v, cap);
    bars = `<i class="g-fill" ${tipFill} style="background:${ok}; width:${w(Math.max(0, inV))}%"></i>${seg(cap, v, over)}`
      + (proj != null && proj > v ? seg(v, Math.min(proj, cap), ok, true, tipProjIn) + seg(Math.max(v, cap), proj, over, true) : '');
  } else {
    bars = `<i class="g-fill" ${tipFill} style="background:${tone}; width:${w(Math.max(0, v))}%"></i>${proj != null && proj > v ? seg(v, proj, ptone, true) : ''}`;
  }
  // a stretch of the bar named inside it (what would be left, what would go over): only when there's room for the words
  const noteEl = note && w(note.b) - w(note.a) >= 30 ? `<span class="g-note ${note.cls || ''}" style="left:${w(note.a)}%; width:${(w(note.b) - w(note.a)).toFixed(1)}%">${note.text}</span>` : '';
  return `<div class="gauge ${thin ? 'thin' : ''} ${tall ? 'tall' : ''}" role="img" aria-label="${esc(label)}">
    <div class="g-track"><div class="g-bars" data-bar="100" data-reveal data-key="${key}" ${label && !notip ? `data-tip="${esc(label)}"` : ''}>${bars}${noteEl}</div>${marks.map((k) => k.cls === 'today'
      ? `<span class="g-today" style="left:${w(k.at)}%" ${notip ? '' : `data-tip="${esc(tipx('', [{ k: 'dash', l: t('Planificado a hoy'), v: fmt(k.at) }]))}"`}><i></i></span>`
      : `<b class="g-mark" style="left:${w(k.at)}%" ${notip ? '' : `data-tip="${esc(tipx('', [{ k: 'line', l: k.name || nm.plan, v: fmt(k.at) }]))}"`}></b>`).join('')}</div>
    ${thin || !lab ? '' : `<div class="g-labels">${lab}</div>`}</div>`;
}
const closeBanner = (due) => (due ? `<div class="card banner"><button type="button" class="bannerlink" data-act="msel" data-ym="${due}"><i class="bdot"></i><span class="grow">${t('{m} sin cerrar', { m: cap(monthName(due)) })}</span>${ic('right')}</button><button type="button" class="btn-dark" data-act="openclose" data-ym="${due}">${t('Cerrar')}</button></div>` : '');
/** The month's budget: the planned income minus the planned saving (planned amounts, so it holds steady all month). */
const planSpend = (m, ym) => Math.max(0, round2(m.ins.reduce((a, it) => a + (m.occurs(it, ym) ? it.amount : 0), 0) - m.targetOf(ym)));

// ---------- Hoy ----------
function home(m) {
  if (!m.items.length) return emptyPlanCard(m);
  const ym = m.curYM, cm = m.mon(ym), pc = pace(m, ym), iso = m.todayISO;
  const tgt = m.targetOf(ym), ps = projSaved(m, pc, ym), vd = ps == null ? null : verdict(ps, tgt, m.target);
  // everything the plan expected that has already come due and isn't confirmed: one tap to confirm it as planned
  const openAt = m.openAfter(ym);
  const due = closeDue(m), pending = m.plannedIn(ym).filter((p) => (p.state === 'pending' || p.state === 'auto') && !(openAt && p.date <= openAt));
  const planned = m.plannedIn(ym), toCome = planned.filter((p) => p.it.kind === 'in' && p.state === 'future');
  const came = planned.filter((p) => p.it.kind === 'in' && p.state !== 'future').sort((a, b) => b.amount - a.amount)[0];
  const dp = m.cycleDay > 1 ? pc.dim - pc.day + 1 : daysTo(m.payday);
  const dow = cap(new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric' }));
  // the month's spending as planned (what comes in minus the savings target): spent, still to pay, free
  // still to pay: the plan's expected expenses that haven't come yet. What's left of a limit isn't a bill: it's unspent.
  const plan = planSpend(m, ym), spent = m.spentAll(ym, iso);
  const toPay = round2(planned.filter((p) => p.it.kind === 'out' && !p.save && p.state === 'future').reduce((a, p) => a + p.amount, 0));
  const free = round2(plan - spent - toPay), over = free < -0.5;
  const proj = projSpent(m, ym);
  const tone = spendTone(spent, plan), ptone = proj == null ? tone : spendTone(proj, plan);
  // the stretch between where the month ends (at this pace, or as it stands) and the budget, named inside the bar
  const end = proj ?? spent, gapMoney = Math.round(Math.abs(plan - end));
  // a full sentence under the bar: where this month stands against the planned spending
  const hpNote = gapMoney < 1 ? null : end <= plan
    ? { a: end, b: plan, text: proj != null ? t('A este ritmo, el gasto quedará ≈\u00a0{x} por debajo de lo planificado', { x: fmt(gapMoney).replace(/\s/g, '\u00a0') }) : t('Te quedan {x} de gasto planificado', { x: fmt(gapMoney).replace(/\s/g, '\u00a0') }), cls: 'gap' }
    : { a: plan, b: end, text: spent > plan + 0.5 ? t('Gasto planificado superado en {x}', { x: fmt((spent - plan)).replace(/\s/g, '\u00a0') }) : t('A este ritmo, superarás el gasto planificado en ≈\u00a0{x}', { x: fmt(gapMoney).replace(/\s/g, '\u00a0') }), cls: 'over', over: true };
  const w = (v) => (plan > 0 ? clamp(v / plan * 100, 0, 100) : 0).toFixed(1);
  const tasks = [
    ...pending.map((p) => {
      const vary = !!p.it.vary, isIn = p.it.kind === 'in', id = esc(p.it.id);
      return `<div class="trow ${isIn ? 'is-in' : 'is-out'}"><button type="button" class="tbody" data-act="occ" data-id="${id}" data-ym="${ym}"><span class="tico">${catEl(itemCat(p.it) || (isIn ? '' : 'otros'), 'sm')}</span><span class="grow"><b>${esc(p.it.name)}</b><span class="fine">${shortDate(p.date)}</span></span><span class="num ${isIn ? 'c-in' : ''}">${vary ? '≈ ' : ''}${isIn ? '+' : ''}${fmt(p.amount)}</span></button>
      <button type="button" class="okbtn" ${vary ? `data-act="occ"` : `data-act="qok" data-v="${p.amount}"`} data-id="${id}" data-ym="${ym}" aria-label="${t('Confirmar {n}', { n: esc(p.it.name.toLowerCase()) })}"><span class="okt">${vary ? t('Indicar') : t('Confirmar')}</span><svg class="oki" viewBox="0 0 24 24" aria-hidden="true"><path d="${vary ? 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4' : 'M5 12l4 4 10-10'}"/></svg></button></div>`;
    }),
  ];
  const quick = pending.filter((p) => !p.it.vary);
  const trail = trailCard(m); // the account balance lives in its card; without enough days for a chart, it stays in This month
  return `
  ${tasks.length ? `<section class="card list notify${notifyOn('fold') ? ' fold' : ''}${notifyOn('all') ? ' all' : ''}" aria-label="${t('Pendiente')}" role="region"><div class="row between taskhead"><button type="button" class="notify-t notify-tog" data-act="notifyfold" aria-expanded="${notifyOn('fold') ? 'false' : 'true'}" aria-label="${t('Mostrar u ocultar')}"><span class="bellwrap">${ic('checksq')}<b class="badge">${tasks.length}</b></span><span class="label">${t('Por confirmar')}</span><span class="chev" aria-hidden="true">${ic('right')}</span></button></div>${tasks.map((h, k) => (k >= 3 ? h.replace('class="trow', 'class="trow x') : h)).join('')}${tasks.length > 3 ? `<button type="button" class="btn-ghost small center-self" data-act="notifymore" data-more="${t('Ver {n} más', { n: tasks.length - 3 })}" data-less="${t('Ver menos')}">${notifyOn('all') ? t('Ver menos') : t('Ver {n} más', { n: tasks.length - 3 })}</button>` : ''}</section>` : ''}
  ${monthHead(cap(ymLabel(ym)), rangeText(m, ym), `${dow}${dp != null ? ` · ${dp === 0 ? t('hoy cobras') : t('cobras en {n} {d}', { n: dp, d: tn(dp, 'día', 'días') })}` : ''}`, 'homemonth')}
  ${closeBanner(due)}
  ${setupCard(m, ym)}
  ${m.balStart(ym) == null ? `<section class="card startcard" aria-label="${t('Para empezar')}"><h2>${t('Saldo de tu cuenta')}</h2>
    <p class="fine">${t('La cuenta que usas a diario. Es el punto de partida; después solo lo escribes al cerrar cada mes.')}</p>
    <label class="field"><span class="label">${t('Saldo')}</span><input type="text" inputmode="decimal" id="h-start" class="bigin" placeholder="${curSym}" autocomplete="off"></label>
    <label class="field"><span class="label">${t('Al empezar el día')}</span><input type="date" id="h-start-date" value="${toISO(new Date())}" min="${dayBefore(m.range(ym).from)}" max="${toISO(new Date())}"></label>
    <button class="btn-dark" data-act="startbal" data-ym="${ym}">${t('Guardar')}</button></section>` : ''}
  <section class="card hero" id="hp" aria-label="${t('Gastado este mes')}">
    <div class="row between"><h2>${t('Gastos este mes')} ${info('mes')}</h2>${vd ? `<span class="pill ${vd.cls}">${vd.word}</span>` : ''}</div>
    <div class="heroval big-ofp hero-ofp">${ofPlan(spent, plan, t('gastado / planificado'), { tone: spent > plan + 0.5 ? 'var(--spend)' : null })}</div>
    ${gauge({ v: spent, proj, tone, ptone, cap: plan, names: { fill: t('Gastado'), proj: t('Gasto de aquí a fin de mes'), projTotal: t('Total a fin de mes') }, tall: true, key: 'hp-' + ym, marks: [{ at: plan }], label: t('Gastado {a} de {b}', { a: fmt(spent), b: fmt(plan) }) + (proj != null ? '; ' + t('proyección a fin de mes {x}', { x: fmt(proj) }) : '') })}
    <div class="barleg small num">${proj != null ? `<span><i class="lg-proj" style="--pc:${proj > plan + 0.5 ? 'var(--spend)' : 'var(--out)'}"></i>${t('Proyección a fin de mes')} ≈ ${fmt((proj))}</span>` : '<span></span>'}</div>
    ${hpNote ? `<p class="hpsent" style="${toneText(hpNote.over ? ptone : 'var(--ok)')}">${hpNote.text}${hpNote.over ? '' : ' <span aria-hidden="true">🎉</span>'}</p>` : ''}
    ${trail ? '' : balanceBox(m, ym, cm)}
  </section>
  <div class="stats2">
    <section class="card stat"><span class="label"><i class="sdot in"></i>${t('Ingresado')}</span><b class="num">${fmt(m.incomeTo(ym, iso))}</b>
      <span class="fine num">${toCome.length ? t('+{x} el {d}', { x: fmt(toCome.reduce((a, p) => a + p.amount, 0)), d: shortDate(toCome[0].date) }) : came ? `${esc(came.it.name.toLowerCase())} · ${shortDate(came.date)}` : ''}</span></section>
    <section class="card stat"><span class="label"><i class="sdot save"></i>${t('Ahorrado')} ${info('ahorroMes')}</span><b class="num c-save">${fmt(m.savedOf(ym))}</b><span class="fine">${t('registrado este mes')}</span></section>
  </div>
  ${trail}
  ${monthTypes(m, ym)}
  ${monthMoves(m, ym)}`;
}
/** One line of a spending-by-type list: icon and name (and its share) on the left, the amount on the right, a thin bar under it
 *  against the biggest one. The same in Hoy and in Análisis. */
const typeRow = (r, scale, key) => `<div class="vrow${r.cat ? ' hasdetail' : ''}" tabindex="0" data-tip="${esc(tipx(r.label, [{ c: 'var(--out)', k: 'solid', l: t('Gastado'), v: fmt(r.value) }, ...(r.pct != null ? [{ c: 'var(--muted)', k: 'solid', l: t('Del gasto total'), v: `${r.pct} %` }] : [])], r.cat ? t('Toca otra vez para ver el detalle') : ''))}" ${r.cat ? `data-act="catdetail" data-cat="${esc(r.cat)}" role="button" tabindex="0" aria-label="${esc(t('Ver detalle de {n}', { n: r.label }))}"` : ''}><span class="row between"><span class="vname">${r.icon}<span class="vn">${esc(r.label)}${r.cat ? `<span class="dchev" aria-hidden="true">${ic('right')}</span>` : ''}</span>${r.pct != null ? `<span class="rk-pct">(${r.pct} %)</span>` : ''}${r.extra ? `<span class="vx">${r.extra}</span>` : ''}</span><span class="num small"><b>${fmtN(r.value)}</b> <span class="muted">${curSym}</span></span></span>${gauge({ names: { fill: t('Gastado') }, v: r.value, scale, tone: 'var(--out)', thin: true, key, notip: true, label: `${r.label}: ${fmt(r.value)}` })}</div>`;
/** This month by type, budgets and the rest in one card: each budget against its limit, then what you spent on the other types. */
function monthTypes(m, ym) {
  const buds = m.shown().filter((b) => b.budget && activeIn(b, m.curYM)), budCats = new Set(buds.map((b) => b.cat));
  const { rows, tot } = spendByType(m, [ym]);
  const plain = rows.filter(([c]) => !budCats.has(c)), top = plain.slice(0, 5), rest = plain.slice(5).reduce((a, [, v]) => a + v, 0);
  if (!buds.length && tot < 0.5) return '';
  const nm = (c) => (c === DIA ? t('Sin detallar') : catName(c));
  const list = [...top.map(([c, v]) => ({ icon: catEl(c === DIA ? '' : c, 'sm'), label: nm(c), value: v, tip: `${nm(c)}: ${fmt(v)}` })),
    ...(rest > 0.5 ? [{ icon: catEl('', 'sm'), label: t('Otros tipos'), value: rest, tip: `${t('Otros tipos')}: ${fmt(rest)}` }] : [])];
  // the types with no budget look just like the ones that have one: name and amount, then a bar (against the biggest, since there is no limit)
  const top1 = Math.max(1, ...list.map((r) => r.value));
  const plainRows = list.map((r, i) => typeRow(r, top1, `pt-${ym}-${i}`)).join('');
  const budRows = buds.map((b) => {
    const x = budInfo(m, b, ym), pt = x.proj == null ? null : spendTone(x.proj, x.of);
    const tip = `${b.name}: ${fmt(x.spent)} ${t('de')} ${fmt(b.amount)} ${b.freq === 'monthly' ? t('al mes') : t('al año')} · ${x.left < -0.5 ? t('superado en {x}', { x: fmt(-x.left) }) : t('quedan {x}', { x: fmt(x.left) })}`;
    const rowsTip = [{ c: 'var(--out)', k: 'solid', l: t('Gastado'), v: fmt(x.spent) },
      ...(x.proj != null ? [{ c: x.proj > x.of + 0.5 ? 'var(--spend)' : 'var(--out)', k: 'hatch', l: t('Proyección a fin de mes'), v: `≈ ${fmt((x.proj))}` }] : []),
      x.left >= -0.5 ? { c: 'var(--muted)', k: 'solid', l: t('Sin gastar'), v: fmt(Math.max(0, x.left)) } : { c: 'var(--spend)', k: 'solid', l: t('Superado en'), v: fmt(-x.left) },
      { k: 'line', l: t('Presupuesto'), v: `${fmt(b.amount)} ${b.freq === 'monthly' ? t('al mes') : t('al año')}` }];
    return `<div class="vrow" tabindex="0" data-tip="${esc(tipx(b.name, rowsTip))}">
      <span class="row between"><span class="vname">${catEl(b.cat, 'sm')}${esc(b.name)}</span><span class="num small"><b class="${x.spent > x.of + 0.5 ? 'c-spend' : ''}">${fmtN(x.spent)}</b> <span class="muted">/ ${fmt(b.amount)} ${b.freq === 'monthly' ? t('al mes') : t('al año')}</span></span></span>
      ${budBar(x, 'v-' + b.id)}
      ${x.proj != null && x.proj > x.of * SPEND_NEAR ? `<span class="fine num">${t('Proyección a fin de mes ≈')} <b style="${toneText(pt)}">${fmt((x.proj))}</b></span>` : ''}</div>`;
  }).join('');
  return `<section class="card" aria-label="${t('Gasto por tipo')}"><div class="row between"><h2>${t('Gasto por tipo')} ${info('limites')}</h2><span class="fine num">${fmt(tot)}</span></div>
    ${buds.length ? `<span class="label">${t('Presupuestos')}</span><div class="vlist">${budRows}</div>` : ''}
    ${list.length ? `${buds.length ? `<span class="label">${t('Sin presupuestar')}</span>` : ''}<div class="vlist">${plainRows}</div>` : ''}
  </section>`;
}
/** One line per movement, all alike: type icon, name, date (and what it is), amount. */
const moveRow = ({ act, id, ym, icon, title, sub, date, amount, kind, vary, save, pend }) => `<button type="button" class="move" data-act="${act}" data-id="${esc(id)}"${ym ? ` data-ym="${ym}"` : ''}>${icon}<span class="grow"><b>${esc(title)}</b><span class="fine">${shortDate(date)}${sub ? ' · ' + (pend ? `<span class="st-pend">${esc(sub)}</span>` : esc(sub)) : ''}</span></span><span class="num ${save ? 'c-save' : kind === 'in' ? 'c-in' : ''}">${vary ? '≈ ' : ''}${amount ? (kind === 'in' ? '+' : '−') : ''}${fmt(amount)}</span></button>`;
/** Everything that moved this month, newest first: what you logged and what the plan expected that already came. */
function monthMoves(m, ym) {
  const after = m.openAfter(ym), rows = [];
  for (const e of m.allSpends) if (m.monthOf(e.date) === ym && !(after && e.date <= after)) {
    rows.push({ date: e.date, html: moveRow({ act: 'editspend', id: e.id, icon: catEl(e.cat, 'sm'), title: e.note || CAT[e.cat]?.name || t('Gasto'), sub: e.note && CAT[e.cat] ? CAT[e.cat].short : '', date: e.date, amount: Math.abs(e.amount), kind: e.amount < 0 ? 'in' : 'out', save: e.cat === SAVE_CAT }) });
  }
  for (const p of m.plannedIn(ym)) if (p.state !== 'future' && !(after && p.date <= after)) {
    rows.push({ date: p.date, html: moveRow({ act: 'occ', id: p.it.id, ym, icon: catEl(itemCat(p.it) || '', 'sm'), title: p.it.name, sub: ST[p.state][0], date: p.date, amount: p.amount, kind: p.it.kind, vary: p.it.vary && p.state !== 'real', save: !!p.save, pend: p.state === 'pending' }) });
  }
  if (!rows.length) return '';
  rows.sort((a, b) => b.date.localeCompare(a.date));
  const more = rows.length > 10 && !UI.movesAll;
  return `<section class="card" aria-label="${t('Movimientos')}"><div class="row between"><h2>${t('Movimientos')}</h2><span class="fine">${rows.length}</span></div>
    <div class="moves">${(more ? rows.slice(0, 10) : rows).map((r) => r.html).join('')}</div>
    ${more ? `<button type="button" class="ghost small center-self" data-act="movesall">${t('Ver los {n}', { n: rows.length })}</button>` : ''}</section>`;
}
/** Where your account stands: the figure with its date, and the button to update it. */
function balanceBox(m, ym, cm = m.mon(ym)) {
  const bs = m.balStart(ym), has = cm.check ? cm.check.bal : bs;
  return `<div class="row between balrow">${has == null ? '<span></span>' : `<span class="balv"><span class="fine">${cm.check ? t('Saldo en cuenta a {d}', { d: shortDate(cm.check.date) }) : t('Saldo al empezar el mes')}</span><b class="num">${fmt(has)}</b></span>`}<button class="btn-sec sm" data-act="check" data-ym="${ym}">${t('Actualizar saldo')}</button></div>`;
}
/** The account balance over the last 30, 60 or 90 days, and on to the end of the month (an estimate). */
function trailCard(m) {
  const n = [30, 60, 90].includes(UI.trail) ? UI.trail : +lsGet('hucha:trail') || 60, days = [30, 60, 90].includes(n) ? n : 60;
  const pts = m.balanceTrail(days);
  if (pts.length < 2) return '';
  return `<section class="card" aria-label="${t('Saldo de tu cuenta')}" data-trail>
    <div class="row between"><h2>${t('Evolución del saldo')} ${info('saldo')}</h2>
      <div class="seg trail" role="group" aria-label="${t('Periodo')}">${[30, 60, 90].map((d) => `<button data-act="trail" data-v="${d}" aria-pressed="${d === days}">${d} ${t('días')}</button>`).join('')}</div></div>
    ${balanceBox(m, m.curYM)}
    ${balanceLine({ pts, aria: t('Saldo de tu cuenta en los últimos {n} días y estimación hasta fin de mes', { n: days }) })}
    <div class="legend"><span><i class="sw" style="background: var(--s1)"></i>${t('saldo')}</span><span><i class="lg-proj" style="--pc: var(--s1)"></i>${t('estimado')}</span></div>
    ${'' /* the balance you give is the truth: any difference with what was logged is absorbed quietly, never flagged */}
  </section>`;
}
/** What a month still to come is expected to save: what comes in, less what the spending projection says goes out (the plan's target when there is no projection). */
const futureSaved = (m, ym, i, sp, ip) => (sp ? round2((ip ? ip.months[i] : m.incomeOf(ym)) - sp.months[i]) : m.targetOf(ym));
/** Savings running total over the year, as Año draws it: what each month saved, this one at its pace, the rest as planned.
 * The one source for the Año chart and the detail of "Ahorrado" in Análisis, so they are always the same line. */
function savedSeries(m) {
  const pc = m.season.includes(m.curYM) ? pace(m, m.curYM) : null, ps = pc ? projSaved(m, pc, m.curYM) : null, sp = spendProjection(m), ip = incomeProjection(m);
  const planC = [], realC = []; let pa = 0, ra = 0;
  m.season.forEach((ym, i) => {
    pa += m.targetOf(ym);
    ra += i < m.curIdx ? m.savedOf(ym) : i === m.curIdx ? (ps ?? m.savedOf(ym)) : futureSaved(m, ym, i, sp, ip);
    planC.push(round2(pa)); realC.push(round2(ra));
  });
  return { planC, realC };
}
// ---------- Año ----------
function metas(m) {
  if (!m.items.length) return emptyPlanCard(m);
  const off = UI.yearOff || 0, due = off === 0 ? closeDue(m) : null, inSeason = m.season.includes(m.curYM), pc = inSeason ? pace(m, m.curYM) : null;
  const ps = pc ? projSaved(m, pc, m.curYM) : null;
  const proj0 = planVsReal(m).sav.proj;
  // one question: will the year reach its goal? The verdict comes from where the year ends at this pace, like Hoy's month
  const vd = m.goal > 0 && !m.pre ? verdict(proj0, m.goal) : null;
  const proj = proj0, ygap = Math.round(Math.abs(m.goal - proj));
  const yNote = !m.goal || m.pre || ygap < 1 ? null : proj < m.goal ? { a: proj, b: m.goal, text: t(m.over ? '{x} por debajo' : '≈ {x} por debajo', { x: fmt(ygap) }), cls: 'short' } : { a: m.goal, b: proj, text: t(m.over ? '{x} por encima' : '≈ {x} por encima', { x: fmt(ygap) }), cls: 'gap' };
  const yNoteFits = yNote && (yNote.b - yNote.a) / Math.max(m.goal, proj, 1) >= 0.3;
  const big = (ym) => m.outs.filter((it) => !it.budget && it.freq !== 'monthly' && m.occurs(it, ym)).sort((a, b) => b.amount - a.amount)[0];
  const cells = m.season.map((ym) => {
    const mm = MES3[+ym.slice(5) - 1], d = m.mon(ym);
    const tg = m.targetOf(ym), obj = `<small class="num">/ ${shortMoney(tg).replace('+', '')}</small>`;
    if (ym < m.curYM && d.close) return `<button class="mcell" style="${savedScale(m, ym).style}" data-act="msel" data-ym="${ym}" aria-label="${esc(`${cap(ymLabel(ym))}: ${t('ahorrado')} ${fmt(m.savedOf(ym))} · ${t('planificado')} ${fmt(tg)}`)}"><span>${mm}</span><b class="num">${shortMoney(m.savedOf(ym))}</b>${obj}<span class="mbar" style="--w:${tg > 0 ? clamp(m.savedOf(ym) / tg * 100, 0, 100).toFixed(0) : 0}%"></span></button>`;
    if (ym < m.curYM) return `<button class="mcell due" data-act="msel" data-ym="${ym}"><span>${mm}</span><b>${t('por cerrar')}</b>${obj}</button>`;
    if (ym === m.curYM) return `<button class="mcell now" data-act="msel" data-ym="${ym}" aria-label="${esc(`${cap(ymLabel(ym))}: ${t('proyección')} ${ps == null ? '—' : fmt(ps)} · ${t('planificado')} ${fmt(tg)}`)}"><span>${mm} · ${t('hoy')}</span><b class="num muted">${ps == null ? '' : '≈ ' + shortMoney(ps).replace('+', '')}</b>${obj}<i style="width:${pct(pc.day, pc.dim).toFixed(0)}%"></i></button>`;
    const b = big(ym);
    return `<button class="mcell fut" data-act="msel" data-ym="${ym}" aria-label="${esc(`${cap(ymLabel(ym))}: ${t('planificado')} ${fmt(tg)}${b ? ` · ${b.name} ${fmt(b.amount)}` : ''}`)}"><span>${mm}</span><b class="num">${shortMoney(tg).replace('+', '')}</b><small>${t('plan')}</small>${b ? '<u class="mbig" aria-hidden="true"></u>' : ''}</button>`;
  }).join('');
  // saved so far against planned, month by month and added up; the months to come follow the plan (an estimate)
  let cumCard = '';
  if (!m.pre && m.goal > 0) {
    const { planC, realC } = savedSeries(m);
    cumCard = `<section class="card" aria-label="${t('Ahorro e inversión acumulado')}">
      <div class="row between"><h2>${t('Ahorro e inversión acumulado')} ${info('acumulado')}</h2></div>
      ${cumLines({ plan: [0, ...planC], real: [0, ...realC], projFrom: m.over ? null : m.curIdx + 1, nowIdx: m.over ? null : m.curIdx + 1, today: m.over || !pc ? null : { at: m.curIdx + pc.day / pc.dim, v: (realC[m.curIdx - 1] ?? 0) + m.savedOf(m.curYM) }, labels: ['', ...m.season.map((ym) => MES3[+ym.slice(5) - 1])], tips: [tipx(t('Inicio'), [{ c: 'var(--sav)', k: 'solid', l: t('Ahorrado'), v: fmt(0) }]), ...m.season.map((ym, i) => tipx(cap(ymLabel(ym)), [{ c: 'var(--sav)', k: i > m.curIdx ? 'hatch' : 'solid', l: i > m.curIdx ? t('Estimado') : t('Ahorrado'), v: i >= m.curIdx ? '≈ ' + fmt((realC[i])) : fmt(realC[i]) }, { k: 'dash', l: t('Planificado'), v: fmt(planC[i]) }], `${fmtSigned((realC[i] - planC[i]))} ${t('sobre el plan')}`))], aria: t('Ahorro e inversión acumulado frente al planificado, mes a mes') })}
      <div class="legend"><span><i class="sw" style="background: var(--sav)"></i>${t('ahorrado')}</span><span><i class="lg-proj" style="--pc: var(--sav)"></i>${t('estimado')}</span><span><i class="lg-plan"></i>${t('planificado')}</span></div>
      ${table([t('Mes'), t('Ahorrado'), t('Planificado'), t('Diferencia')], m.season.map((ym, i) => [esc(cap(ymLabel(ym))), (i >= m.curIdx ? '≈ ' : '') + fmt(realC[i]), fmt(planC[i]), diffCell(realC[i], planC[i], 'good')]))}
    </section>`;
  }
  // the next planned expenses, soonest first, each item once (its next date): ten to start with, a button for the rest
  const NEXT_SHOW = 10, nexts = [], seen = new Set();
  for (const ym of m.season.filter((y) => y >= m.curYM)) for (const p of m.plannedIn(ym)) {
    if (p.it.kind !== 'out' || p.save || p.it.budget || p.state !== 'future' || seen.has(p.it.id)) continue;
    seen.add(p.it.id); nexts.push({ p, ym });
  }
  nexts.sort((a, b) => a.p.date.localeCompare(b.p.date));
  const last = m.season[11], ended = m.curYM > last;
  return `
  ${yearNav(m)}
  ${closeBanner(due)}
  <section class="card hero" aria-label="${t('Ahorro del año')}">
    <div class="row between"><h2>${off === 0 ? t('Este año') : yearWord(off)} ${info('ano')}</h2>${vPill(vd)}</div>
    <div class="heroval big-ofp hero-ofp">${ofPlan(m.saved, m.goal, t('ahorrado / planificado'), { tone: 'var(--sav)' })}</div>
    <div id="goal-meter">${gauge({ names: { fill: t('Ahorrado'), proj: t('Ahorro de aquí a fin de año'), projTotal: t('Total a fin de año') }, v: m.saved, proj: m.pre || m.over ? null : proj, tone: 'var(--sav)', ptone: 'var(--sav)', tall: true, key: 'goal',
      marks: [{ at: m.goal, label: `${t('planificado')} ${fmt(m.goal)}` }], note: yNote, label: t('Ahorrado {a} de {b}', { a: fmt(m.saved), b: fmt(m.goal) }) + '; ' + t('proyección a fin de año {x}', { x: fmt(proj) }) })}</div>
    <div class="barleg small num">${m.pre || m.over ? '<span></span>' : `<span><i class="lg-proj" style="--pc:var(--sav)"></i>${t('Proyección a fin de año')} ≈ ${fmt((proj))}</span>`}${yNote && !yNoteFits ? `<b style="${toneText(scaleOf(proj, m.goal).c)}">${yNote.text}</b>` : ''}</div>
  </section>
  <section class="card" aria-label="${t('Mes a mes')}">
    <div class="row between"><div><h2>${t('Mes a mes')} ${info('meses')}</h2><span class="fine">${t('ahorrado / planificado de cada mes')}</span></div><span class="swatches" aria-hidden="true"><i class="sv-red"></i><i class="sv-yellow"></i><i class="sv-lite"></i><i class="sv-deep"></i></span></div>
    <div class="mgrid">${cells}</div>
  </section>
  ${cumCard}
  ${nexts.length ? `<section class="card nextlist${lsGet('hucha:nextall') ? ' all' : ''}" aria-label="${t('Próximos gastos planificados')}"><h2>${t('Próximos gastos planificados')}</h2>
    <div class="moves">${nexts.map(({ p, ym }, k) => { const dd = Math.round((new Date(p.date + 'T12:00:00') - new Date(m.todayISO + 'T12:00:00')) / 864e5), when = dd <= 0 ? t('hoy') : dd === 1 ? t('mañana') : t('en {n} días', { n: dd }), yr = round2(m.season.filter((y) => y >= m.curYM).reduce((a, y) => a + (m.occurs(p.it, y) && (y > m.curYM || m.stateOf(p.it, y) === 'future') ? p.it.amount : 0), 0)), cat = itemCat(p.it);
      return `<button type="button" class="move rich${k >= NEXT_SHOW ? ' x' : ''}" data-act="occ" data-id="${esc(p.it.id)}" data-ym="${ym}">${catEl(cat || '', 'sm')}<span class="grow"><b>${esc(p.it.name)}</b><span class="fine">${shortDate(p.date)} · ${when}</span><span class="fine">${cat ? esc(catName(cat)) + ' · ' : ''}${esc(freqText(p.it))}</span>${yr > p.amount + 0.5 ? `<span class="fine num">${t('{x} hasta fin de año', { x: fmt(yr) })}</span>` : ''}</span><span class="amtcol"><span class="num">${p.it.vary ? '≈ ' : ''}−${fmt(p.amount)}</span></span></button>`; }).join('')}</div>
    ${nexts.length > NEXT_SHOW ? `<button type="button" class="movlink" data-act="nextmore" data-more="${t('Ver {n} más', { n: nexts.length - NEXT_SHOW })}" data-less="${t('Ver menos')}">${lsGet('hucha:nextall') ? t('Ver menos') : t('Ver {n} más', { n: nexts.length - NEXT_SHOW })}</button>` : ''}</section>` : ''}
  ${ended ? yearCard(m, off) : ''}`;
}

// ---------- one month ----------
function mes(m) {
  if (!m.items.length) return emptyPlanCard(m);
  const ym = UI.mesYM ||= m.curYM, d = m.mon(ym), cur = ym === m.curYM, past = ym < m.curYM;
  const tgt = m.targetOf(ym), pc = cur ? pace(m, ym) : null, ps = pc ? projSaved(m, pc, ym) : null;
  const inc = past ? m.incomeTo(ym) : cur ? m.incomeTo(ym, m.todayISO) : m.incomeOf(ym);
  const spent = past ? m.spentAll(ym) : cur ? m.spentAll(ym, m.todayISO) : planSpend(m, ym);
  const saved = past ? (d.close ? m.savedOf(ym) : null) : cur ? ps : tgt;
  const vd = saved == null || (!past && !cur) ? null : verdict(saved, tgt, m.target);
  return `
  ${monthHead(cap(ymLabel(ym)), rangeText(m, ym), cur ? t('Este mes') : past ? (d.close ? t('Cerrado') : t('Sin cerrar')) : t('Planificado'), 'calmove')}
  <div class="tiles3">
    <div class="card stat"><span class="label"><i class="sdot in"></i>${past || cur ? t('Ingresado') : t('Ingresos planificados')}</span><b class="num">${fmt(inc)}</b></div>
    <div class="card stat"><span class="label"><i class="sdot out"></i>${past || cur ? t('Gastado') : t('Gasto planificado')}</span>${past || cur ? ofPlan(spent, planSpend(m, ym), t('gastado / planificado'), { tone: spent > planSpend(m, ym) + 0.5 ? 'var(--spend)' : null }) : `<b class="num">${fmt(spent)}</b>`}</div>
    <div class="card stat ${saved == null ? '' : 'svtile'}" ${saved == null ? '' : `style="${scaleOf(saved, tgt, m.target).style}"`}><span class="label">${past || cur ? t('Ahorrado') : t('Objetivo de ahorro')}</span>${saved == null ? '<b class="num">—</b>' : !past && !cur ? `<b class="num">${fmt(tgt)}</b>` : ofPlan(saved, tgt, cur ? t('proyección / planificado') : t('ahorrado / planificado'), { approx: cur, signed: past })}${vd ? vPill(vd) : ''}</div>
  </div>
  ${past && !d.close ? `<button class="primary" data-act="openclose" data-ym="${ym}">${t('Cerrar {m}', { m: monthName(ym) })}</button>` : ''}
  ${m.balStart(ym) != null && (d.bal != null || ym === m.curYM) ? `<section class="card">${moneyChart(m, ym, d.bal != null ? +d.bal : null)}</section>` : ''}
  ${expectedCard(m, ym)}
  ${spentCard(m, ym)}
  ${d.close ? `<button class="ghost small center-self" data-act="closeundo" data-ym="${ym}">${t('Deshacer el cierre de {m}', { m: monthName(ym) })}</button>` : ''}`;
}

/** The account balance as estimated today (the line's point for today), or null while there is no start balance. */
function balanceToday(m) {
  const cv = m.curveNow(m.curYM); if (!cv) return null;
  const p = cv.pts.find((q) => q.day === m.dayOf(m.todayISO, m.curYM));
  return p ? round2(cv.start + p.y) : null;
}
/** Put the balance where it is after `amount` left the account (a negative amount: came back): a new look at it, today. */
function bumpBalance(amount) {
  const m = compute(store.data), bal = balanceToday(m); if (bal == null) return null;
  const nb = round2(bal - amount), ym = m.curYM, chk = { date: m.todayISO, bal: nb };
  store.update('months', (d) => {
    const prev = d.months[ym] || {}, list = [...(prev.checks || (prev.check ? [prev.check] : []))].filter((x) => x.date !== chk.date);
    list.push(chk); list.sort((x, y) => x.date.localeCompare(y.date));
    d.months[ym] = { ...prev, check: list[list.length - 1], checks: list };
  });
  return nb;
}
// ---------- quick add: the "+" button ----------
function openQuick(keep = {}) {
  const m = compute(store.data), today = toISO(new Date());
  const date = keep.date || UI.quickDate || today;
  const save = UI.qcat === SAVE_CAT; // saving or investing is not spending: its own mode, with its own look
  const head = UI.editSpend ? (save ? t('Editar ahorro') : t('Editar gasto')) : save ? t('Apuntar ahorro') : t('Apuntar un gasto');
  dlg.innerHTML = `<div class="sheet quick${UI.kmore ? ' more' : ''}${save ? ' savemode' : ''}" id="quick-sheet">
    <div class="row between"><h2>${head}</h2><button type="button" class="iconbtn" data-act="dclose" aria-label="${t('Cerrar')}">${ic('x')}</button></div>
    ${UI.editSpend ? '' : `    <div class="seg qmode" role="group" aria-label="${t('Qué apuntas')}"><button type="button" data-act="qmode" data-v="spend" aria-pressed="${!save}">${t('Gasto')}</button><button type="button" data-act="qmode" data-v="save" aria-pressed="${save}">${t('Ahorro e inversión')}</button></div>`}
    <label class="amt"><input type="text" inputmode="decimal" id="k-amt" placeholder="0" value="${esc(keep.amt || '')}" autocomplete="off" aria-label="${t('Importe')}"><span>${curSym}</span></label>
    ${save ? `<div class="seg qdir" id="k-dir" role="group" aria-label="${t('Ahorro e inversión')}"><button type="button" data-act="qdir" data-v="in" aria-pressed="${UI.qdir !== 'out'}">${t('Aportar')}</button><button type="button" data-act="qdir" data-v="out" aria-pressed="${UI.qdir === 'out'}">${t('Retirar')}</button></div>
      <p class="cathint">${t('Sale de tu cuenta, pero no es gasto: suma a lo que ahorras.')}</p>`
      : `${catRow(m, true)}
    ${UI.kmore ? catGrid(UI.qcat, 'kpick', true) : ''}`}
    <div class="fields2">
      <label class="field"><span class="label">${t('Nota')}</span><input id="k-note" value="${esc(keep.note || '')}" placeholder="${t('Opcional')}" autocomplete="off"></label>
      <label class="field"><span class="label">${t('Día')}</span><input type="date" id="k-date" value="${date}"></label>
    </div>
    ${!UI.editSpend && m.balStart(m.curYM) != null ? `<label class="updbal" id="k-updrow" ${date === today ? '' : 'hidden'}><input type="checkbox" id="k-upd" ${lsGet('hucha:updbal') !== '0' ? 'checked' : ''}><span>${t('Actualizar saldo')}<span class="fine">${save ? (UI.qdir === 'out' ? t('el saldo sube lo que retiras') : t('el saldo baja lo que apuntas')) : t('el saldo baja lo que apuntas')}</span></span></label>` : ''}
    ${UI.editSpend ? `<button type="button" class="primary big" data-act="kgo">${t('Guardar')}</button>
    <button type="button" class="ghost small danger" data-act="delspend" data-id="${esc(UI.editSpend)}">${save ? t('Borrar') : t('Borrar gasto')}</button>`
      : `<button type="button" class="primary big" data-act="kgo">${save ? t('Apuntar ahorro') : t('Apuntar')}</button>
    ${save ? '' : `<button type="button" class="ghost small" data-act="addonce" data-date="${date}">${t('¿Un ingreso puntual? Añádelo al plan')}</button>`}`}
  </div>`;
  openDialog();
  // no automatic focus: the keyboard opens only when you tap the amount
}
const quickKeep = () => ({ amt: $('#k-amt')?.value, note: $('#k-note')?.value, date: $('#k-date')?.value, stay: true });


// ---------- spending types ----------
const catCls = (c) => `g-${c.group}${c.color ? ' pc-' + c.color : ''}`;
const catEl = (id, cls = '') => {
  const c = CAT[id];
  return c ? `<span class="ct ${catCls(c)} ${cls}" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="${c.d}"/></svg></span>`
    : `<span class="ct none ${cls}" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 11h3v3H6zm5 0h3v3h-3zm5 0h3v3h-3z"/></svg></span>`;
};
const catName = (id) => CAT[id]?.name || t('Sin tipo');
/** An expense's type: the one you chose, or one guessed from its name. */
const itemCat = (it) => it.cat || guessCat(it.name);
/** The short row when logging: your budgets' types, then the ones you use most, then a starter set. */
function quickCats(m) {
  const ids = [], add = (id) => { if (CAT[id] && !ids.includes(id)) ids.push(id); };
  add(UI.qcat);
  // the most used come first (last 90 days), then your budgets, savings and the usual starters
  const since = toISO(new Date(Date.now() - 90 * 864e5)), n = {};
  for (const e of m.allSpends) if (e.cat && e.cat !== SAVE_CAT && e.date >= since) n[e.cat] = (n[e.cat] || 0) + 1;
  Object.entries(n).sort((a, b) => b[1] - a[1]).forEach(([id]) => add(id));
  m.shown().filter((b) => b.budget && activeIn(b, m.curYM)).forEach((b) => add(b.cat));
  STARTERS.forEach(add);
  return ids.slice(0, 8);
}
const catHint = (m, id) => !id ? t('Tipo (opcional).') : id === SAVE_CAT ? t('Ahorro e inversión · sale de tu cuenta, pero no es gasto') : m.budByCat.get(id) ? `${catName(id)} · ${t('cuenta en tu presupuesto')}` : catName(id);
function catRow(m, inSheet) {
  // "Más" comes first, so it is never hidden at the end of the scrolling row
  return `<div class="catrow" role="group" aria-label="Tipo de gasto (opcional)">
    <button type="button" class="catchip" data-act="${inSheet ? 'kmore' : 'catmore'}" aria-expanded="${inSheet ? !!UI.kmore : false}">${catEl('')}<span>${inSheet && UI.kmore ? t('Menos') : t('Más')}</span></button>${quickCats(m).map((id) =>
    `<button type="button" class="catchip ${catCls(CAT[id])}" data-act="qcat" data-cat="${id}" aria-pressed="${UI.qcat === id}" title="${esc(CAT[id].name)}">${catEl(id)}<span>${esc(CAT[id].short)}</span></button>`).join('')}</div>
    <div class="cathint">${esc(catHint(m, UI.qcat))}</div>`;
}
/** Every type, by group. `act` is the action each button fires; `none` adds a "no type" choice. */
const PLUS = '<span class="ct none" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M11 5h2v14h-2zM5 11h14v2H5z"/></svg></span>';
const catChip = (c, act, sel) => `<button type="button" class="catchip ${catCls(c)}" data-act="${act}" data-cat="${c.id}" aria-pressed="${sel === c.id}">${catEl(c.id)}<span>${esc(c.short)}</span></button>`;
function catGrid(sel, act, none) {
  const by = {};
  for (const c of CATS) if (!(act === 'kpick' && c.id === SAVE_CAT)) (by[c.group] ||= []).push(c); // saving is its own mode when logging, not a type to pick
  const chip = (c) => catChip(c, act, sel);
  return `<div class="catgrid" data-act-pick="${act}" data-sel="${esc(sel || '')}">
    <div class="catsearch"><input type="search" id="cat-search" placeholder="${t('Buscar tipo: dentista, netflix, gasolina…')}" aria-label="${t('Buscar tipo')}" autocomplete="off" autocapitalize="off" enterkeyhint="go">
      <div class="catfound" id="cat-found" hidden aria-live="polite"></div></div>
    <div class="catall">${none ? `<div class="grid"><button type="button" class="catchip" data-act="${act}" data-cat="" aria-pressed="${!sel}">${catEl('')}<span>${t('Sin tipo')}</span></button></div>` : ''}
    <div class="stack-sm"><span class="label">${t('Tuyos')}</span><div class="grid">${(by.tuyos || []).map(chip).join('')}
      <button type="button" class="catchip new" data-act="catnew" data-from="${act}">${PLUS}<span>${t('Nuevo tipo')}</span></button></div></div>
    ${Object.entries(GROUPS).filter(([g]) => g !== 'tuyos').map(([g, gname]) => `<div class="stack-sm"><span class="label">${esc(gname)}</span><div class="grid">${by[g].map(chip).join('')}</div></div>`).join('')}</div></div>`;
}
/** The search box of the type picker: show only the types that match, best first; Enter takes the first one. */
function catSearch(input) {
  const box = input.closest('.catgrid'), found = box.querySelector('#cat-found'), all = box.querySelector('.catall');
  const act = box.dataset.actPick, sel = box.dataset.sel, q = input.value.trim();
  if (!q) { found.hidden = true; found.innerHTML = ''; all.hidden = false; return; }
  const ids = searchCats(q).filter((id) => CAT[id]);
  all.hidden = true; found.hidden = false;
  found.innerHTML = ids.length
    ? `<div class="grid">${ids.map((id) => catChip(CAT[id], act, sel)).join('')}</div>`
    : `<p class="fine">${t('No encuentro «{q}».', { q: esc(q) })}</p><div class="grid"><button type="button" class="catchip new" data-act="catnew" data-from="${act}">${PLUS}<span>${t('Nuevo tipo')}</span></button></div>`;
}

// ---------- your own spending types ----------
/** Create or edit a type of your own: a name and any of the icons. `from` says where to go back to. */
function openNewCat(from, id) {
  const c = id ? (store.data.settings.cats || []).find((x) => x.id === id) : null;
  UI.nc = { from, id: c?.id || null, name: c?.name || '', icon: c?.icon || '', color: c?.color || '', keep: from === 'kpick' ? quickKeep() : null };
  renderNewCat();
  openDialog();
}
/** The type as it will look: its icon in its colour. */
const ncPreview = (n) => { const b = [...BASE, ...EXTRA_ICONS].find((c) => c.id === n.icon) || CAT.otros; return `<span class="ct ${n.color ? 'pc-' + n.color : 'g-tuyos'}"><svg viewBox="0 0 24 24"><path d="${b.d}"/></svg></span>`; };
function renderNewCat() {
  const n = UI.nc;
  dlg.classList.add('full'); // the whole height: name, colours and the button stay in view, the icons use what is left
  dlg.innerHTML = `<div class="sheet ${n.color ? 'pc-' + n.color : ''}" id="nc-sheet">
    <div class="row between"><h2>${n.id ? t('Editar tipo') : t('Nuevo tipo')}</h2><button type="button" class="iconbtn" data-act="ncback" aria-label="${t('Volver')}">${ic('x')}</button></div>
    <div class="ncname"><span class="ncprev" id="nc-prev" aria-hidden="true">${ncPreview(n)}</span>
    <label class="field"><span class="label">${t('Nombre')}</span><input id="nc-name" value="${esc(n.name)}" maxlength="24" placeholder="${t('La moto, el pádel, caprichos…')}" autocomplete="off"></label></div>
    <div class="field iconfield"><span class="label">${t('Icono')}</span>
      <div class="icongrid" role="group" aria-label="${t('Icono')}">${[...BASE, ...EXTRA_ICONS].map((c) => `<button type="button" class="iconpick" data-act="ncicon" data-icon="${c.id}" aria-pressed="${n.icon === c.id}" aria-label="${esc(c.name)}" title="${esc(c.name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${c.d}"/></svg></button>`).join('')}</div></div>
    <div class="field"><span class="label">${t('Color')}</span>
      <div class="colorgrid" role="group" aria-label="${t('Color')}"><button type="button" class="colorpick auto" data-act="nccolor" data-color="" aria-pressed="${!n.color}" aria-label="${t('Automático')}">${t('Auto')}</button>${Array.from({ length: 12 }, (_, i) => `<button type="button" class="colorpick pc-p${i + 1}" data-act="nccolor" data-color="p${i + 1}" aria-pressed="${n.color === 'p' + (i + 1)}" aria-label="${t('Color {n}', { n: i + 1 })}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4 10-10"/></svg></button>`).join('')}</div></div>
    <div class="formbtns"><button type="button" class="primary" data-act="ncsave">${n.id ? t('Guardar') : t('Crear')}</button>
      ${n.id ? `<button type="button" class="danger" data-act="ncdel">${t('Borrar')}</button>` : ''}</div>
  </div>`;
}
/** Back to where the new type was asked for, with it chosen (id) or as it was (null). */
function ncReturn(id) {
  const { from, keep } = UI.nc || {};
  UI.nc = null;
  if (from === 'kpick') { if (id) UI.qcat = id; UI.kmore = false; openQuick(keep || {}); }
  else if (from === 'fcat' && FORM) { if (id) { FORM.cat = id; FORM._nocat = false; } FORM._pick = !id; renderForm(); }
  else if (from === 'qpick') { if (id) { UI.qcat = id; dlg.close(); render(true); } else openCatPicker(); }
  else { dlg.close(); render(true); }
}
function saveNewCat() {
  const n = UI.nc, name = (dlg.querySelector('#nc-name')?.value || '').trim();
  if (!name) { invalid('#nc-name', t('Ponle un nombre')); return; }
  const icon = n.icon || guessCat(name) || 'otros', id = n.id || uid('c');
  store.update('settings', (d) => {
    const list = (d.settings.cats || []).filter((c) => c.id !== id);
    const at = (d.settings.cats || []).findIndex((c) => c.id === id);
    list.splice(at < 0 ? list.length : at, 0, { id, name: name.slice(0, 24), icon, ...(n.color ? { color: n.color } : {}) });
    d.settings.cats = list;
  });
  setCustomCats(store.data.settings.cats);
  toast(n.id ? t('Tipo guardado') : `Tipo creado: ${name}`);
  ncReturn(id);
}
function openCatPicker() {
  dlg.innerHTML = `<div class="sheet" id="cat-sheet">
    <div class="row between"><h2>${t('Tipo de gasto')}</h2><button type="button" class="iconbtn" data-act="dclose" aria-label="${t('Cerrar')}">${ic('x')}</button></div>
    ${catGrid(UI.qcat, 'qpick', true)}</div>`;
  openDialog();
}
// ---------- budgets: a limit you use up bit by bit ----------
/** Spending against a budget or a limit: green under 85 %, yellow up to it, orange up to 115 %, red beyond. */
const SPEND_NEAR = 0.85, SPEND_FAR = 1.15;
function spendTone(v, cap) {
  const r = cap > 0 ? v / cap : v > 0.5 ? 9 : 0;
  return r < SPEND_NEAR ? 'var(--ok)' : r <= 1.005 ? 'var(--save-fill)' : r <= SPEND_FAR ? 'color-mix(in srgb, var(--save-fill) 45%, var(--spend))' : 'var(--spend)';
}
const toneText = (c) => `color: color-mix(in srgb, ${c} var(--mixk), var(--ink))`;
/** A limit's spending, and for a monthly one where it ends at this pace (rule of three on the days gone).
 *  Yearly limits get no projection: a trip is paid in one go, and a rule of three would turn it into three trips. */
function budInfo(m, b, ym) {
  const spent = b.freq === 'monthly' ? m.budSpent(b, ym) : m.budSpentY(b);
  let proj = null;
  if (ym === m.curYM && m.season.includes(ym)) {
    const pc = pace(m, ym);
    if (b.freq === 'monthly' && pc.day >= 3 && pc.day < pc.dim) proj = round2(spent / pc.day * pc.dim);
  }
  return { spent, of: b.amount, left: round2(b.amount - spent), r: b.amount ? spent / b.amount : 1, proj, tone: spendTone(spent, b.amount) };
}
const budBar = (x, key) => gauge({ notip: true, names: { fill: t('Gastado'), plan: t('Presupuesto') }, v: x.spent, proj: x.proj, cap: x.of, tone: x.tone, ptone: x.proj == null ? x.tone : spendTone(x.proj, x.of), key, thin: true, marks: [{ at: x.of }], label: t('{a} de {b}', { a: fmt(x.spent), b: fmt(x.of) }) });
function openBudget(id) {
  const m = compute(store.data), ym = m.curYM, b = m.shown(ym).find((i) => i.id === id && i.budget);
  if (!b) return;
  const x = budInfo(m, b, ym), over = x.left < -0.5;
  const mine = (e) => e.cat === b.cat && (b.freq === 'monthly' ? m.monthOf(e.date) === ym : m.season.includes(m.monthOf(e.date)));
  const list = m.allSpends.filter(mine).sort((a, c) => c.date.localeCompare(a.date));
  const today = toISO(new Date());
  dlg.innerHTML = `<div class="sheet" id="bud-sheet" data-id="${esc(id)}">
    <div class="row between"><h2 class="withic">${catEl(b.cat)}${esc(b.name)}</h2><button type="button" class="iconbtn" data-act="dclose" aria-label="${t('Cerrar')}">${ic('x')}</button></div>
    <div class="row between bottom"><span class="bud-big num ${over ? 'c-spend' : ''}">${over ? '−' + fmt(-x.left) : fmt(x.left)}</span><span class="muted num">${over ? t('de más') : t('quedan')} · ${fmt(b.amount)} ${b.freq === 'monthly' ? t('al mes') : t('al año')}</span></div>
    ${budBar(x, 'budsheet-' + id)}
    <div class="chips">${[5, 10, 20, 50].map((v) => `<button data-act="bspend" data-id="${esc(id)}" data-cat="${b.cat}" data-v="${v}" data-date="${today}">+${fmt(v)}</button>`).join('')}</div>
    <div class="inline three"><input type="text" inputmode="decimal" id="b-amt" aria-label="${t('Importe')}" placeholder="${t('Importe')}" autocomplete="off">
      <input type="text" id="b-note" aria-label="${t('Nota')}" placeholder="${t('Nota')}" autocomplete="off">
      <button data-act="bspendc" data-id="${esc(id)}" data-cat="${b.cat}" data-date="${today}">Apuntar</button></div>
    ${list.length ? `<div class="stack-sm"><span class="label">${b.freq === 'monthly' ? t('Este mes') : t('En el año')}</span><div class="spends">${list.map(spendRow).join('')}</div></div>` : ''}
    <p class="fine">${b.freq === 'monthly' ? t('Lo que no gastes acaba siendo ahorro.') : t('Cada gasto cuenta en su mes.')}</p>
    <button type="button" class="ghost small" data-act="edit" data-id="${esc(id)}">${t('Editar en el plan')}</button>
  </div>`;
  openDialog();
  animateBars(dlg);
}


const ST = { future: [t('planificado'), ''], auto: [t('dado por bueno'), 'st-auto'], pending: [t('por confirmar'), 'st-pend'], real: [t('confirmado'), 'st-real'] };
const flowRow = (ym, after = '') => ({ it, date, day, amount, state }) => {
  const inBal = !!after && date <= after; // before the day your start balance refers to: already in it, not added again
  const [txt, cls] = inBal ? [t('ya en tu saldo inicial'), 'st-inbal'] : ST[state], diff = round2(amount - it.amount);
  const row = `<button class="flow ${inBal ? 'inbal' : ''}" data-act="occ" data-id="${esc(it.id)}" data-ym="${ym}">
  <span class="d">${day ? `<b>${day}</b>${MES3[+date.slice(5, 7) - 1]}` : '<b>—</b>' + t('mes')}</span>
  <span class="grow"><b>${esc(it.name)}</b><br><span class="fine"><span class="st ${cls}">${txt}</span>${state === 'real' && diff ? ` <span class="num">(${diff > 0 ? '+' : '−'}${fmt(Math.abs(diff))})</span>` : ''}</span></span>
  <span class="num ${it.kind === 'in' ? 'amt-in' : it.cat === SAVE_CAT && !it.budget ? 'c-save' : 'amt-out'}">${it.vary && state !== 'real' ? '≈ ' : ''}${it.kind === 'in' ? '+' : '−'}${fmt(amount)}</span></button>`;
  // a confirmed one can be un-confirmed right here: it goes back to its planned amount and date
  return state === 'real' ? `<div class="flowrow">${row}<button type="button" class="unconf" data-act="unconfirm" data-id="${esc(it.id)}" data-ym="${ym}" aria-label="${t('Desconfirmar {n}', { n: esc(it.name) })}" title="${t('Desconfirmar')}">${ic('x')}</button></div>` : row;
};

// ---------- Mes ----------
/** What has been done in the year on view, newest first: the incomes and expenses you confirmed and, for budgets, the spends you
 *  logged in types that have one. Each row: { date, ym, signed (its effect on the account), html }. */
function doneRowsOf(m, kind) {
  const rows = [];
  for (const [ym, mo] of Object.entries(store.data.months)) for (const [id, amount] of Object.entries(mo.real || {})) {
    if (!m.season.includes(ym)) continue; // the year you are looking at
    const it = m.itemAt(id, ym) || m.segmentsOf(id)[0];
    if (!it || it.kind !== kind || it.budget) continue;
    const date = m.dateOf(it, ym);
    rows.push({ date, ym: m.monthOf(date), signed: it.kind === 'in' ? amount : -amount, html: doneRow(it, ym, date, amount) });
  }
  if (kind === 'bud') for (const e of m.allSpends) if (m.season.includes(m.monthOf(e.date)) && m.budFor(e.cat, m.monthOf(e.date))) rows.push({ date: e.date, ym: m.monthOf(e.date), signed: -e.amount, html: spendRow(e) });
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}
/** "Media al mes" said with its numbers: the total, the months it covers (this one counted by the days gone) and what the plan allows a month. */
const avgTile = (label, total, elapsed, planYear, nMonths = 12) => {
  const n = elapsed.toFixed(1).replace('.', ','), per = planYear != null ? ` · ${t('plan: {x} al mes', { x: fmt((planYear / nMonths)) })}` : '';
  return `<div class="tile"><span class="label">${label}</span><span class="v num">${fmt((total / Math.max(1, elapsed)))}</span><span class="fine">${t('{x} en {n} meses', { x: fmt((total)), n })}${per}</span></div>`;
};
/** Ingresado, Gastado or Ahorrado over the year in one view: where you stand, the running total against the plan, and what makes it up. */
function openLineDetail(kind) {
  const m = computeYear(UI.yearOff || 0), pv = planVsReal(m), x = { in: pv.ins, out: pv.outs, sav: pv.sav }[kind];
  const n = m.season.length, ci = Math.max(0, m.season.indexOf(m.curYM)), live = !m.over && m.season.includes(m.curYM), today = toISO(new Date());
  const good = kind !== 'out', tone = { in: 'var(--in)', out: 'var(--out)', sav: 'var(--sav)' }[kind];
  const real = m.season.map((ym) => (ym > m.curYM ? null : kind === 'in' ? m.incomeTo(ym, ym === m.curYM ? today : undefined) : kind === 'out' ? (ym === m.curYM ? m.spentAll(ym, today) : m.spentAll(ym)) : m.savedOf(ym)));
  const planM = m.season.map((ym) => (kind === 'in' ? m.incomeOf(ym) : kind === 'out' ? planSpend(m, ym) : m.targetOf(ym)));
  const pc = live ? pace(m, m.curYM) : null, elapsed = live ? ci + (pc ? pc.day / pc.dim : 0) : n, avg = x.real / Math.max(1, elapsed);
  const tile = (label, val, sub, cls = '') => `<div class="tile"><span class="label">${label}</span><span class="v num ${cls}">${val}</span><span class="fine">${sub}</span></div>`;
  const due = x.due ?? null, gap = due != null ? round2(x.real - due) : null, left = round2(x.plan - x.real);
  const endGap = round2(x.proj - x.plan), endGood = good ? endGap >= -0.5 : endGap <= 0.5;
  const word = { in: t('Ingresado'), out: t('Gastado'), sav: t('Ahorrado') }[kind];
  const tiles = [
    tile(word, fmt(x.real), t('de {x} planificados', { x: fmt(x.plan) })),
    due != null ? tile(t('Deberías llevar'), fmt(due), t('hoy, según el plan')) : '',
    gap != null ? (good
      ? tile(gap > 0.5 ? t('Vas por delante') : gap < -0.5 ? t('Vas por detrás') : t('Vas al ritmo'), fmt(Math.abs(gap)), t('respecto a hoy'), gap > 0.5 ? 'c-ok' : gap < -0.5 ? 'c-spend' : '')
      : tile(gap > 0.5 ? t('Has gastado de más') : gap < -0.5 ? t('Vas por debajo') : t('Vas al ritmo'), fmt(Math.abs(gap)), t('respecto a hoy'), gap > 0.5 ? 'c-spend' : gap < -0.5 ? 'c-ok' : '')) : '',
    good
      ? (left > 0.5 ? tile(t('Te falta'), fmt(left), t('para el plan del año')) : tile(t('Superado en'), fmt(-left), t('el plan del año'), 'c-ok'))
      : (left >= -0.5 ? tile(t('Te queda'), fmt(Math.max(0, left)), t('del gasto planificado')) : tile(t('Te has pasado'), fmt(-left), t('del gasto planificado'), 'c-spend')),
    tile(t('A fin de año'), `≈ ${fmt((x.proj))}`, `${fmt(Math.abs((endGap)))} ${endGap > 0 ? t('por encima del plan') : t('por debajo del plan')}`, endGood ? 'c-ok' : 'c-spend'),
    avgTile(kind === 'out' ? t('Gasto medio al mes') : kind === 'in' ? t('Ingreso medio al mes') : t('Ahorro medio al mes'), x.real, elapsed, x.plan, n),
  ].join('');
  const planC = [0], realC = [0]; let pa = 0, ra = 0;
  m.season.forEach((ym, i) => { pa += planM[i] || 0; planC.push(round2(pa)); if (real[i] != null) { ra += real[i]; realC.push(round2(ra)); } else realC.push(null); });
  const sp = kind === 'out' ? spendProjection(m) : kind === 'in' ? incomeProjection(m) : null;
  const nowV = realC[ci + 1]; // what you have to date: the dot. The month-end point after it is the estimate.
  if (sp) { let acc = realC[ci + 1] - (real[ci] ?? 0) + sp.months[ci]; realC[ci + 1] = round2(acc); for (let i = ci + 1; i < n; i++) { acc += sp.months[i]; realC[i + 1] = round2(acc); } } // the dot stays where you are; from there, each month on what it is expected to cost
  else if (kind !== 'sav') { const fr = pc ? pc.day / pc.dim : 0, share = (1 - fr) / Math.max(0.01, (1 - fr) + (n - ci - 1)); for (let i = ci + 1; i <= n; i++) realC[i] = round2(nowV + (x.proj - nowV) * (share + (i - ci - 1) * (1 - share) / Math.max(1, n - ci - 1))); }
  let sav = null;
  if (kind === 'sav') { const q = savedSeries(m); sav = { planC: [0, ...q.planC], realC: [0, ...q.realC] }; } // exactly the line Año draws
  const chart = `<section class="card"><h2>${t('Evolución en el año')}</h2>${cumLines({ plan: sav ? sav.planC : planC, real: sav ? sav.realC : realC.map((v) => v ?? 0), projFrom: live ? ci + 1 : null, nowIdx: live ? ci + 1 : null, today: live && pc ? { at: ci + pc.day / pc.dim, v: sav ? (sav.realC[ci] ?? 0) + m.savedOf(m.curYM) : nowV } : null, labels: ['', ...m.season.map((ym) => MES3[+ym.slice(5) - 1])], tips: ['', ...m.season.map((ym, i) => { const RC = sav ? sav.realC : realC, PC = sav ? sav.planC : planC, est = sav ? i > ci : real[i] == null, near = sav && i === ci; return tipx(cap(ymLabel(ym)), [{ c: tone, k: est ? 'hatch' : 'solid', l: est ? t('Estimado') : word, v: (est || near ? '≈ ' : '') + fmt(est || near ? (RC[i + 1]) : RC[i + 1]) }, { k: 'dash', l: t('Planificado'), v: fmt(PC[i + 1]) }], sav ? `${fmtSigned((RC[i + 1] - PC[i + 1]))} ${t('sobre el plan')}` : ''); })], aria: word })}
    <div class="legend"><span><i class="sw" style="background: ${tone}"></i>${word.toLowerCase()}</span><span><i class="lg-proj" style="--pc: ${tone}"></i>${t('estimado')}</span><span><i class="lg-plan"></i>${t('planificado')}</span></div></section>`;
  // what makes it up
  let listHead = '', body = '';
  if (kind === 'in') {
    listHead = t('Ingresos');
    const rows = [];
    for (const ym of m.season) for (const p of m.plannedIn(ym)) if (p.it.kind === 'in' && p.state !== 'future' && !(m.openAfter(ym) && p.date <= m.openAfter(ym))) rows.push({ date: p.date, ym, html: moveRow({ act: 'occ', id: p.it.id, ym, icon: catEl('', 'sm'), title: p.it.name, sub: ST[p.state][0], date: p.date, amount: p.amount, kind: 'in', vary: p.it.vary && p.state !== 'real' }) });
    rows.sort((a, b) => b.date.localeCompare(a.date));
    body = `<div class="moves">${rows.map((r) => r.html).join('') || `<p class="fine">${t('Aún no hay ingresos.')}</p>`}</div>`;
  } else if (kind === 'out') {
    listHead = t('Gasto por tipo');
    const { rows, tot } = spendByType(m, m.season.filter((ym) => ym <= m.curYM)), top1 = Math.max(1, ...rows.map(([, v]) => v));
    body = `<div class="vlist">${rows.slice(0, 12).map(([c, v], i) => typeRow({ cat: c && c !== DIA ? c : '', icon: catEl(c === DIA ? '' : c, 'sm'), label: c === DIA ? t('Sin detallar') : catName(c), pct: Math.round(v / Math.max(1, tot) * 100), value: v }, top1, `ld-${i}`)).join('') || `<p class="fine">${t('Aún no hay gastos.')}</p>`}</div>`;
  } else {
    listHead = t('Mes a mes');
    // a small table with its headers: month, target, saved, difference
    body = `<div class="stable" role="table"><div class="srow shead" role="row"><span role="columnheader">${t('Mes')}</span><span role="columnheader" class="num">${t('Objetivo')}</span><span role="columnheader" class="num">${t('Ahorrado')}</span><span role="columnheader" class="num">${t('Diferencia')}</span></div>${m.season.map((ym, i) => (real[i] == null ? '' : `<div class="srow" role="row"><b role="cell">${esc(cap(MES3[+ym.slice(5) - 1]))} <span class="fine">${ym.slice(2, 4)}</span></b><span role="cell" class="num">${fmt(planM[i])}</span><span role="cell" class="num c-save">${fmt(real[i])}</span><span role="cell" class="num ${real[i] >= planM[i] ? 'c-ok' : 'c-spend'}">${fmtSigned((real[i] - planM[i]))}</span></div>`)).reverse().join('')}</div>`;
  }
  dlg.classList.add('full');
  dlg.innerHTML = `<div class="sheet donesheet" id="cat-sheet" style="--dt:${tone}"><div class="row between"><h2>${word}</h2><button type="button" class="iconbtn" data-act="dclose" aria-label="${t('Cerrar')}">${ic('x')}</button></div>
    <div class="tiles t2 detiles">${tiles}</div>${chart}<section class="card"><h2>${listHead}</h2>${body}</section></div>`;
  openDialog();
}
/** A type (a budget or not) in one view: where you stand, how the year went, and every movement in it. */
function openCatDetail(c) {
  const m = computeYear(UI.yearOff || 0), pv = planVsReal(m), x = pv.buds.find((l) => l.cat === c) || null;
  const per = m.season.map((ym) => (ym <= m.curYM ? round2(spendByType(m, [ym]).by[c] || 0) : null));
  const spent = round2(per.reduce((a, v) => a + (v || 0), 0)), n = m.season.length, ci = Math.max(0, m.season.indexOf(m.curYM)), live = !m.over && m.season.includes(m.curYM);
  const pc = live ? pace(m, m.curYM) : null, elapsed = live ? ci + (pc ? pc.day / pc.dim : 0) : n;
  const avg = spent / Math.max(1, elapsed);
  const tile = (label, val, sub, cls = '') => `<div class="tile"><span class="label">${label}</span><span class="v num ${cls}">${val}</span><span class="fine">${sub}</span></div>`;
  let tiles = '', chart = '';
  if (x) {
    const due = x.due ?? null, gap = due != null ? round2(x.real - due) : null, left = round2(x.plan - x.real), over = left < -0.5;
    tiles = [
      tile(t('Llevas'), fmt(x.real), t('de {x} al año', { x: fmt(x.plan) })),
      due != null ? tile(t('Deberías llevar'), fmt(due), t('hoy, repartido por igual')) : tile(t('Presupuesto'), fmt(x.plan), t('del año')),
      gap != null ? tile(gap > 0.5 ? t('Te has pasado') : t('Vas por debajo'), fmt(Math.abs(gap)), t('respecto a hoy'), gap > 0.5 ? 'c-spend' : 'c-ok') : '',
      tile(over ? t('Te has pasado') : t('Te queda'), fmt(Math.abs(left)), over ? t('del presupuesto del año') : t('del presupuesto del año'), over ? 'c-spend' : ''),
      tile(t('A fin de año'), `≈ ${fmt((x.proj))}`, x.proj > x.plan + 0.5 ? t('≈ {x} por encima', { x: fmt((x.proj - x.plan)) }) : t('≈ {x} por debajo', { x: fmt((x.plan - x.proj)) }), x.proj > x.plan + 0.5 ? 'c-spend' : 'c-ok'),
      avgTile(t('Gasto medio al mes'), spent, elapsed, x.plan, x.monthly ? n : 12),
    ].join('');
    // the year as two running totals: what you have spent, and what the budget lets you spend, with the rest as it would go
    const planC = [0], realC = [0]; let pa = 0, ra = 0;
    m.season.forEach((ym, i) => { pa += x.amounts[i] || 0; planC.push(round2(pa)); if (per[i] != null) { ra += per[i]; realC.push(round2(ra)); } else realC.push(null); });
    const nowV2 = realC[ci + 1], fr2 = pc ? pc.day / pc.dim : 0, sh2 = (1 - fr2) / Math.max(0.01, (1 - fr2) + (n - ci - 1));
    if (live) for (let i = ci + 1; i <= n; i++) realC[i] = round2(nowV2 + (x.proj - nowV2) * (sh2 + (i - ci - 1) * (1 - sh2) / Math.max(1, n - ci - 1)));
    chart = `<section class="card"><h2>${t('Evolución en el año')}</h2>${cumLines({ plan: planC, real: realC.map((v) => v ?? 0), projFrom: live ? ci + 1 : null, nowIdx: live ? ci + 1 : null, today: live && pc ? { at: ci + fr2, v: nowV2 } : null, labels: ['', ...m.season.map((ym) => MES3[+ym.slice(5) - 1])], tips: ['', ...m.season.map((ym, i) => tipx(cap(ymLabel(ym)), [{ c: 'var(--out)', k: per[i] != null ? 'solid' : 'hatch', l: per[i] != null ? t('Gastado') : t('Estimado'), v: (per[i] != null ? '' : '≈ ') + fmt(per[i] != null ? realC[i + 1] : (realC[i + 1])) }, { k: 'dash', l: t('Presupuesto'), v: fmt(planC[i + 1]) }]))], aria: t('Gastado acumulado frente al presupuesto') })}
      <div class="legend"><span><i class="sw" style="background: var(--out)"></i>${t('gastado')}</span><span><i class="lg-proj" style="--pc: var(--out)"></i>${t('estimado')}</span><span><i class="lg-plan"></i>${t('presupuesto')}</span></div></section>`;
  } else {
    const tot = spendByType(m, m.season.filter((ym) => ym <= m.curYM)).tot, top = per.reduce((b, v, i) => (v != null && v > (per[b] ?? -1) ? i : b), 0);
    tiles = [
      tile(t('Gastado'), fmt(spent), t('en lo que va del año')),
      tile(t('Del gasto total'), `${Math.round(spent / Math.max(1, tot) * 100)} %`, t('de {x}', { x: fmt(tot) })),
      avgTile(t('Gasto medio al mes'), spent, elapsed, null),
      per.some((v) => v) ? tile(t('Mes de más gasto'), cap(MES3[+m.season[top].slice(5) - 1]), fmt(per[top] || 0)) : '',
    ].join('');
    chart = `<section class="card"><h2>${t('Mes a mes')}</h2>${columns({ cols: m.season.map((ym, i) => ({ label: MES3[+ym.slice(5) - 1].slice(0, 1).toUpperCase(), value: per[i], now: ym === m.curYM, fill: 'var(--out)', tip: tipx(cap(ymLabel(ym)), [{ c: 'var(--out)', k: 'solid', l: t('Gastado'), v: per[i] != null ? fmt(per[i]) : t('aún no') }]) })), labels: [], aria: t('Gasto de cada mes') })}</section>`;
  }
  // every movement in the type: what you logged and what the plan expected that already came, by month
  const rows = [];
  for (const e of m.allSpends) if (e.cat === c && m.season.includes(m.monthOf(e.date))) rows.push({ date: e.date, ym: m.monthOf(e.date), signed: -e.amount, html: spendRow(e) });
  for (const ym of m.season) for (const p of m.plannedIn(ym)) if (p.state !== 'future' && p.it.kind === 'out' && !p.it.budget && itemCat(p.it) === c && !(m.openAfter(ym) && p.date <= m.openAfter(ym))) rows.push({ date: p.date, ym, signed: -p.amount, html: doneRow(p.it, ym, p.date, p.amount) });
  rows.sort((a, b) => b.date.localeCompare(a.date));
  let cur = '', body = '';
  for (const r of rows) {
    if (r.ym !== cur) { cur = r.ym; const sum = rows.filter((q) => q.ym === cur).reduce((a, q) => a + q.signed, 0); body += `<div class="mdiv"><span>${esc(cap(ymLabel(cur)))}</span><span class="num">${fmtSigned((sum))}</span></div>`; }
    body += r.html;
  }
  dlg.classList.add('full');
  dlg.innerHTML = `<div class="sheet donesheet" id="cat-sheet" data-cat="${esc(c)}"><div class="row between"><h2 class="withic">${catEl(c)}${esc(catName(c))}</h2><button type="button" class="iconbtn" data-act="dclose" aria-label="${t('Cerrar')}">${ic('x')}</button></div>
    <div class="tiles t2 detiles">${tiles}</div>${chart}
    <section class="card"><div class="row between"><h2>${t('Movimientos')}</h2><span class="fine">${rows.length}</span></div>${rows.length ? `<div class="flows">${body}</div>` : `<p class="fine">${t('Aún no hay movimientos.')}</p>`}</section></div>`;
  openDialog();
}
const DONE_TITLE = { in: 'Ingresos cumplidos', out: 'Gastos cumplidos', bud: 'Gastos de tus presupuestos' };
/** The movements of one section of the Plan, in a sheet: by date, newest first, a divider for each month. */
function openDone(kind) {
  const m = computeYear(UI.yearOff || 0), rows = doneRowsOf(m, kind);
  let cur = '', body = '';
  for (const r of rows) {
    if (r.ym !== cur) {
      cur = r.ym;
      const sum = rows.filter((x) => x.ym === cur).reduce((a, x) => a + x.signed, 0);
      body += `<div class="mdiv"><span>${esc(cap(ymLabel(cur)))}</span><span class="num">${fmtSigned((sum))}</span></div>`;
    }
    body += r.html;
  }
  dlg.classList.add('full');
  dlg.innerHTML = `<div class="sheet donesheet" id="done-sheet" data-kind="${kind}"><div class="row between"><h2>${t(DONE_TITLE[kind])}</h2><button type="button" class="iconbtn" data-act="dclose" aria-label="${t('Cerrar')}">${ic('x')}</button></div>
    ${rows.length ? `<div class="flows">${body}</div>` : `<p class="fine">${t('Nada todavía.')}</p>`}</div>`;
  openDialog();
}
/** A confirmed planned item in the Cumplidos lists: the same compact line as a logged spend (icon, name · date, amount), tap to edit, ✕ to un-confirm. */
const doneRow = (it, ym, date, amount) => {
  const diff = round2(amount - it.amount), save = it.kind === 'out' && it.cat === SAVE_CAT && !it.budget;
  return `<div class="spend editable" role="button" tabindex="0" data-act="occ" data-id="${esc(it.id)}" data-ym="${ym}" aria-label="${esc(it.name)}">${catEl(it.kind === 'in' ? '' : itemCat(it) || '', 'sm')}<span class="grow">${esc(it.name)}<span class="fine"> · <span class="nw">${shortDate(date)}</span>${diff ? ` · <span class="nw">${diff > 0 ? '+' : '−'}${fmt(Math.abs(diff))}</span>` : ''}</span></span><b class="num ${it.kind === 'in' ? 'amt-in' : save ? 'c-save' : 'amt-out'}">${it.kind === 'in' ? '+' : '−'}${fmt(amount)}</b><button type="button" class="iconbtn sm" data-act="unconfirm" data-id="${esc(it.id)}" data-ym="${ym}" aria-label="${t('Desconfirmar {n}', { n: esc(it.name) })}" title="${t('Desconfirmar')}">${ic('x')}</button></div>`;
};
const spendRow = (e) => `<div class="spend editable" role="button" tabindex="0" data-act="editspend" data-id="${esc(e.id)}" aria-label="${t('Editar gasto')}">${catEl(e.cat, 'sm')}<span class="grow">${esc(e.note || CAT[e.cat]?.name || t('Gasto'))}${e.note && CAT[e.cat] ? `<span class="fine"> · ${esc(CAT[e.cat].short)}</span>` : ''}<span class="fine"> · ${+e.date.slice(8)} ${MES3[+e.date.slice(5, 7) - 1]}</span></span><b class="num ${e.cat === SAVE_CAT ? 'c-save' : 'amt-out'}">${e.amount < 0 ? '+' : '−'}${fmt(Math.abs(e.amount))}</b><button class="iconbtn sm" data-act="delspend" data-id="${esc(e.id)}" aria-label="${t('Borrar gasto')}">${ic('x')}</button></div>`;
const stPill = (st) => `<span class="pill ${st === 'clear' ? 'c-ok' : st === 'partial' ? 'c-warn' : 'c-acc'}">${st === 'clear' ? t('Cumplido') : st === 'partial' ? t('Parcial') : t('Sin datos')}</span>`;



/** What the plan expects this month: still to come first, then what already happened. */
function expectedCard(m, ym) {
  const planned = m.plannedIn(ym);
  const next = planned.filter((p) => p.state === 'future'), past = planned.filter((p) => p.state !== 'future');
  const after = m.openAfter(ym), counted = (p) => !(after && p.date <= after);
  const pend = m.pendingIn(ym).filter(counted).length;
  const sum = (arr, k) => arr.filter((p) => p.it.kind === k && counted(p)).reduce((s, p) => s + p.amount, 0);
  // the same compact line as every list of movements: icon, name, date and state, amount (a confirmed one keeps its ✕ and its difference)
  const rowOf = (p) => {
    const diff = p.state === 'real' ? round2(p.amount - p.it.amount) : 0;
    const sub = !counted(p) ? t('ya en tu saldo inicial') : p.state === 'real' && !p.amount ? t('no hubo este mes') : `${ST[p.state][0]}${diff ? ` (${diff > 0 ? '+' : '−'}${fmt(Math.abs(diff))})` : ''}`;
    return moveRow({ act: 'occ', id: p.it.id, ym, icon: catEl(p.it.kind === 'in' ? '' : itemCat(p.it) || '', 'sm'), title: p.it.name, sub, date: p.date, amount: p.amount, kind: p.it.kind, vary: p.it.vary && p.state !== 'real', save: !!p.save, pend: p.state === 'pending' && counted(p) });
  };
  const head = (arr) => { const i = sum(arr, 'in'), o = sum(arr, 'out'); return `<span class="fine num">${i ? ` <span class="c-in">+${fmt(i)}</span> ` : ''}${o ? `−${fmt(o)}` : ''}</span>`; };
  return `<section class="card" aria-label="${t('Planificado este mes')}">
    <div class="row between"><h2>${t('Planificado')}</h2>${pend ? `<span class="pill c-warn">${pend} ${t('por confirmar')}</span>` : ''}</div>
    ${!planned.length ? '<p class="fine">' + t('Nada planificado este mes.') + '</p>' : ''}
    ${next.length ? `<div class="row between"><span class="label">${t('Próximos')}</span>${head(next)}</div><div class="moves">${next.map(rowOf).join('')}</div>` : ''}
    ${past.length ? `<div class="row between"><span class="label">${t('Pasados')}</span>${head(past)}</div><div class="moves">${past.map(rowOf).join('')}</div>` : ''}
    ${planned.length ? '<p class="fine">' + t('Toca uno para poner el importe exacto.') + '</p>' : ''}
  </section>`;
}


function spentCard(m, ym) {
  const sp = m.allSpends.filter((e) => m.monthOf(e.date) === ym).sort((a, b) => b.date.localeCompare(a.date));
  if (!sp.length) return '';
  const tot = sp.reduce((s, e) => s + e.amount, 0);
  return `<section class="card" aria-label="${t('Gastos apuntados')}">
    <div class="row between"><h2>${t('Apuntado')}</h2><span class="num muted">${fmt(tot)}</span></div>
    <div class="spends">${(UI.allSpends === ym ? sp : sp.slice(0, 8)).map(spendRow).join('')}</div>
    ${sp.length > 8 && UI.allSpends !== ym ? `<button class="ghost small" data-act="morespends" data-ym="${ym}">${t('Ver los {n}', { n: sp.length })}</button>` : ''}
  </section>`;
}

/** How a month was closed, in a few words. */
function closeText(m, ym) {
  const a = +m.mon(ym).close.amount || 0;
  return Math.abs(a) < 0.5 ? t('ni sobró ni faltó') : a > 0 ? t('sobraron {x}: ahorro', { x: fmt(a) }) : t('faltaron {x}: de tu ahorro', { x: fmt(-a) });
}

// ---------- the road of the year ----------
/** A month's colour by what you put aside, net: green the month's target, yellow something, red nothing or less than nothing. */
const savedTone = (m, ym) => { const v = m.savedOf(ym); return v >= m.targetOf(ym) - 0.5 ? 'good' : v > 0.5 ? 'some' : 'none'; };
/** Past this share of the month's target, saving counts as well above plan (dark green). */
const OVER = 1.1; // dark green from 110 % of the target
/**
 * A month's colour by what it saved against the month's target:
 * red (30 % or less) → yellow (from 60 %, still below) → light green (the target) → dark green (OVER and up).
 * Returns CSS custom properties: --c the colour, --f how much of it fills the shape.
 */
const savedScale = (m, ym) => scaleOf(m.savedOf(ym), m.targetOf(ym), m.target);
/** How far a saving is from its target, as a ratio (1 = on target). A target at or below zero (an expensive month
 *  that plans to dip into savings) is measured against `base`, the average monthly target. */
const ratioOf = (v, target, base = target) => 1 + (v - target) / (target > 0.5 ? target : Math.max(base, 1));
function scaleOf(v, target, base = target) {
  const met = v >= target - 0.5, r = ratioOf(v, target, base);
  const mix = (a, b, t) => `color-mix(in oklch, ${b} ${Math.round(clamp(t, 0, 1) * 100)}%, ${a})`;
  const c = met ? (r >= OVER ? 'var(--sv-deep)' : mix('var(--sv-lite)', 'var(--sv-deep)', (r - 1) / (OVER - 1)))
    : r <= 0.3 ? 'var(--spend)' : r < 0.6 ? mix('var(--spend)', 'var(--save-fill)', (r - 0.3) / 0.3) : 'var(--save-fill)';
  const f = met ? Math.round(30 + clamp((r - 1) / (OVER - 1), 0, 1) * 26) : 26;
  return { r, c, style: `--c:${c};--f:${f}%` };
}
/** How a month goes against the plan, by what it saves (or, this month, will save at this pace) against the target. */
function verdict(saved, target, base = target) {
  const r = ratioOf(saved, target, base);
  if (saved >= target - 0.5 && r >= OVER) return { word: t('Excelente'), cls: 'c-ok', why: t('ahorrado {a} / planificado {b}', { a: fmt(saved), b: fmt(target) }) };
  if (saved >= target - 0.5) return { word: t('Correcto'), cls: 'c-ok', why: t('ahorrado {a} / planificado {b}', { a: fmt(saved), b: fmt(target) }) };
  if (r >= 0.6) return { word: t('Mejorable'), cls: 'c-warn', why: t('ahorrado {a} / planificado {b}', { a: fmt(saved), b: fmt(target) }) };
  return { word: t('Insuficiente'), cls: 'c-spend', why: t('ahorrado {a} / planificado {b}', { a: fmt(saved), b: fmt(target) }) };
}
/** A figure over its plan, "35 / 40", with a small caption saying what each number is. approx: a projection (≈). */
const amt = (v, signed) => (signed ? (v > 0 ? '+' : v < 0 ? '−' : '') : v < 0 ? '−' : '') + fmtN(Math.abs(v));
const ofPlan = (v, plan, cap, { approx = false, signed = false, cls = '', tone = null } = {}) =>
  `<span class="ofp"><b class="num ${cls}"${tone ? ` style="color: color-mix(in srgb, ${tone} var(--mixk), var(--ink))"` : ''}>${approx ? '≈ ' : ''}${amt(v, signed)}</b><span class="num ofp-d"> / ${fmt(plan)}</span></span><span class="ofp-c">${cap}</span>`;
/** This month's saving at the current pace (null early in the month): the target plus what would be left over. */
/**
 * Where this month's spending ends at this pace: the expected expenses as planned, plus everything else by rule of three
 * on the days gone (from the 3rd day; null before). One projection for everything: Hoy, the year, Análisis.
 */
function projSpent(m, ym) {
  if (ym !== m.curYM) return null;
  const pc = pace(m, ym), after = m.openAfter(ym);
  // a first month counts from the day you started: before it, nothing (it's already in your balance)
  const from = after ? m.dayOf(after, ym) : 0, days = pc.day - from, total = pc.dim - from;
  if (days < 3) return null;
  const planned = m.plannedIn(ym).filter((p) => p.it.kind === 'out' && !p.save && p.date > after);
  const outPlan = planned.reduce((a, p) => a + p.amount, 0);
  const outPaid = planned.filter((p) => p.state !== 'future').reduce((a, p) => a + p.amount, 0);
  return round2(outPlan + Math.max(0, m.spentAll(ym, m.todayISO) - outPaid) / days * total);
}
/**
 * Where the year's income ends, month by month, like the spending projection: what came in as it was; this month, what came
 * in plus what the plan still has to come, and the months to come as the plan has them. An income marked "varía" is
 * carried at the proportion you have been receiving against what was planned (a pay that comes 10 % over keeps coming 10 % over).
 */
function incomeProjection(m) {
  if (m.pre || m.over || !m.season.includes(m.curYM)) return null;
  const cur = m.curYM, ci = m.season.indexOf(cur);
  const ratio = (it) => {
    if (!it.vary) return 1;
    let a = 0, p = 0;
    for (const ym of m.season) { if (ym > cur) break; if (m.occurs(it, ym) && m.stateOf(it, ym) === 'real') { a += m.amountIn(it, ym); p += it.amount; } }
    return p > 0 ? a / p : 1;
  };
  const months = m.season.map((ym, i) => {
    if (i < ci) return m.incomeTo(ym);
    const todo = m.ins.filter((it) => m.occurs(it, ym) && (i > ci || m.stateOf(it, ym) === 'future')).reduce((a, it) => a + it.amount * ratio(it), 0);
    return (i === ci ? m.incomeTo(ym, m.todayISO) : 0) + todo;
  }).map(round2);
  return { months, total: round2(months.reduce((a, v) => a + v, 0)) };
}
/**
 * Where the year's spending ends, month by month: what is done as it was; this month as in Hoy (what the plan expects
 * from it, plus your pace on the rest); the months to come as what the plan already expects in each one (the yearly
 * insurance in its month, the rent in all of them) plus your daily pace on everything else. Null when the year is not under way.
 */
function spendProjection(m) {
  if (m.pre || m.over || !m.season.includes(m.curYM)) return null;
  const cur = m.curYM, ci = m.season.indexOf(cur);
  // your pace on what the plan doesn't name: what you spent beyond the planned expenses that came, per day, so far
  let varSpent = 0, days = 0;
  for (const ym of m.season) {
    if (ym > cur) break;
    const pc = pace(m, ym), after = m.openAfter(ym), from = after ? m.dayOf(after, ym) : 0, d = (ym === cur ? pc.day : pc.dim) - from;
    if (d <= 0) continue;
    const paid = m.plannedIn(ym).filter((p) => p.it.kind === 'out' && !p.save && p.date > after && p.state !== 'future').reduce((a, p) => a + p.amount, 0);
    varSpent += Math.max(0, (ym === cur ? m.spentAll(ym, m.todayISO) : m.spentAll(ym)) - paid); days += d;
  }
  const rate = days >= 7 ? varSpent / days : null; // too little to go on: the plan's own figure
  const months = m.season.map((ym, i) => {
    if (i < ci) return m.spentAll(ym);
    if (i === ci) return projSpent(m, ym) ?? m.spentAll(ym, m.todayISO);
    if (rate == null) return planSpend(m, ym);
    const fixed = m.plannedIn(ym).filter((p) => p.it.kind === 'out' && !p.save).reduce((a, p) => a + p.amount, 0);
    return fixed + rate * m.range(ym).days;
  }).map(round2);
  return { months, total: round2(months.reduce((a, v) => a + v, 0)), rate };
}
/** This month's saving at this pace: its target, plus what the projection leaves of the budget (minus, if it goes over). */
const projSaved = (m, pc, ym) => {
  const p = projSpent(m, ym); if (p == null) return null;
  // what the month saves = what it adds to the account by its end (the estimated balance, from the same projection as the spending) plus what went to savings on the way
  const cv = ym === m.curYM ? m.curveNow(ym) : null;
  return cv ? round2(cv.pts[cv.pts.length - 1].y + cv.saveMoved) : round2(m.targetOf(ym) + planSpend(m, ym) - p);
};
const shortMoney = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + (Math.abs(v) >= 1000 ? (Math.abs(v) / 1000).toLocaleString(locale, { maximumFractionDigits: 1 }) + 'K' : Math.round(Math.abs(v)));

// ---------- Año: the goal, the closes, the year ----------
/** The year in numbers (also what the year close keeps). */
function yearSummary(m) {
  const done = m.season.filter((ym) => ym < m.curYM);
  const withBal = done.filter((ym) => m.spentSrc(ym) === 'bal');
  const spent = round2(withBal.reduce((s, ym) => s + m.spentAll(ym), 0));
  const diffs = withBal.map((ym) => ({ ym, d: m.savedOf(ym) }));
  const best = diffs.reduce((a, x) => (!a || x.d > a.d ? x : a), null), worst = diffs.reduce((a, x) => (!a || x.d < a.d ? x : a), null);
  return { start: m.start, goal: m.goal, saved: m.saved, spent, months: withBal.length, avg: withBal.length ? round2(spent / withBal.length) : 0,
    cleared: m.cleared, closed: m.season.filter((ym) => m.mon(ym).close).length, best, worst };
}
function yearCard(m, off = 0) {
  const y = yearSummary(m), last = m.season[11], ended = m.curYM > last, ready = ended && m.mon(last).close;
  const past = store.data.settings.years || [];
  return `<section class="card" aria-label="${t('Cierre del año')}">
    <div class="row between"><h2>${t('Cierre del año')}</h2>${ready ? '<span class="pill c-ok">' + t('Disponible') + '</span>' : ''}</div>
    <div class="sum">
      <span>${t('Ahorro e inversión')}</span><b class="num c-save">${fmt(y.saved)} <span class="muted">${t('de {x}', { x: fmt(y.goal) })}</span></b>
      <span>${t('Gastado')}</span><span class="num">${y.months ? `${fmt(y.spent)} <span class="muted">(${fmt(y.avg)}${t('/mes')})</span>` : '—'}</span>
      <span>${t('Meses cumplidos')}</span><span class="num">${t('{a} de {b}', { a: y.cleared, b: 12 })}</span>
    </div>
    ${ready && off === 0 ? `<button class="primary" data-act="openyear">${t('Cerrar el año y planificar el siguiente')}</button>`
      : `<p class="fine">${ended ? t('Cierra {m} y podrás cerrar el año.', { m: monthName(last) }) : t('Se abre al terminar {m}: verás el resumen y empezarás el año siguiente con el mismo plan.', { m: ymLabel(last) })}</p>`}
    ${past.length && off === 0 ? `<details class="adjust"><summary>${t('Años anteriores')}</summary><div class="sum">${past.slice().reverse().map((p) =>
      `<span>${esc(ymLabel(p.start))} – ${esc(ymLabel(ymAdd(p.start, 11)))}</span><span class="num">${t('{a} de {b}', { a: fmt(p.saved), b: fmt(p.goal) })}</span>`).join('')}</div></details>` : ''}
  </section>`;
}
function openYear() {
  const m = compute(store.data), y = yearSummary(m), nextStart = ymAdd(m.start, 12);
  const reached = y.goal ? y.saved / y.goal : 0;
  dlg.innerHTML = `<div class="sheet closer" id="year-sheet">
    <div class="row between"><span class="label">${t('Cierre del año')}</span><button type="button" class="iconbtn" data-act="dclose" aria-label="${t('Cerrar')}">${ic('x')}</button></div>
    <div data-step class="cl-title"><h1>${cap(ymLabel(m.start))} – ${ymLabel(m.season[11])}</h1>
      <p class="muted">${reached >= 1 ? t('Objetivo de ahorro cumplido.') : reached >= 0.8 ? t('Cerca del objetivo de ahorro.') : t('Por debajo del objetivo de ahorro.')}</p></div>
    <div data-step class="cl-block">
      <div class="row between bottom"><span class="label">${t('Ahorro e inversión')}</span><span class="big c-save num">${fmt(y.saved)}</span></div>
      ${gauge({ names: { fill: t('Ahorrado') }, v: y.saved, tone: scaleOf(y.saved, y.goal).c, key: 'yr-s' + Date.now(), marks: [{ at: y.goal, label: `${t('planificado')} ${fmt(y.goal)}` }], label: t('Ahorrado {a} de {b}', { a: fmt(y.saved), b: fmt(y.goal) }) })}
      <span class="fine num">${t('de {x}', { x: fmt(y.goal) })}</span>
    </div>
    <div data-step class="sum">
      <span>${t('Gastado')}</span><span class="num">${fmt(y.spent)} · ${fmt(y.avg)}${t('/mes')}</span>
      ${y.best ? `<span>${t('Mejor mes')}</span><span class="num">${cap(monthName(y.best.ym))} · ahorraste ${fmtSigned(y.best.d)}</span>` : ''}
      ${y.worst && y.worst.ym !== y.best?.ym ? `<span>${t('Peor mes')}</span><span class="num">${cap(monthName(y.worst.ym))} · ahorraste ${fmtSigned(y.worst.d)}</span>` : ''}
      <span>${t('Meses cumplidos')}</span><span class="num">${t('{a} de {b}', { a: y.cleared, b: 12 })}</span>
    </div>
    <div data-step class="cl-block">
      <span class="label">${t('El año siguiente')}: ${ymLabel(nextStart)} – ${ymLabel(ymAdd(nextStart, 11))}</span>
      <p class="fine">${t('Se mantiene el mismo plan (ingresos, gastos y presupuestos). Puedes modificarlo en Plan.')}</p>
      <label class="field"><span class="label">${t('Objetivo de ahorro para el año')}</span><input type="text" inputmode="decimal" id="y-goal" value="${esc(m.goal)}" autocomplete="off"></label>
      <button class="primary" data-act="yearnew">${t('Empezar {m}', { m: ymLabel(nextStart) })}</button>
    </div>
  </div>`;
  openDialog();
  dlg.classList.add('full');
  stagger(dlg.querySelector('.closer'));
}


// ---------- Análisis ----------
const DIA = '__dia';
/**
 * The year, plan against reality. For each line: plan (what you planned, as planned), real (what already happened
 * up to today) and proj (how the year ends if the rest goes as planned: what happened, plus the plan for what's left).
 * more: 'good' if going over the plan is good news (income, savings), 'bad' if it isn't (spending).
 */
/** A "difference" cell for the tables: signed, with a colour for whether it went well. `more` says what a higher number means. */
const diffCell = (real, plan, more = 'good') => {
  const d = round2(real - plan);
  if (Math.abs(d) < 0.5) return { v: '0', tone: '' };
  return { v: fmtSigned((d)), tone: (d > 0) === (more === 'good') ? 'ok' : 'bad' };
};
function planVsReal(m) {
  const today = new Date(), todayISO = toISO(today), done = (it, ym) => m.stateOf(it, ym) !== 'future';
  const sumItems = (list, fn) => round2(m.season.reduce((s, ym) => s + list.reduce((a, it) => a + (occurs(it, ym) ? fn(it, ym) : 0), 0), 0));
  const line = (label, plan, real, proj, more, icon = '', word = 'planificado', isSav = false) => ({ label, plan: round2(plan), real: round2(real), proj: round2(proj), more, icon, word, isSav });
  const past = m.season.filter((ym) => ym < m.curYM), fut = m.season.filter((ym) => ym > m.curYM), inSeason = m.season.includes(m.curYM);
  const pc = inSeason ? pace(m, m.curYM, today) : null;
  const ins = line(t('Ingresado'), sumItems(m.ins, (it) => it.amount), sumItems(m.ins, (it, ym) => (done(it, ym) ? m.amountIn(it, ym) : 0)), (incomeProjection(m) || {}).total ?? m.incomeY, 'good');
  // savings: what each month saved, this one at its pace, the rest as planned
  const curSaved = pc ? projSaved(m, pc, m.curYM) ?? Math.max(m.savedOf(m.curYM), m.targetOf(m.curYM)) : 0;
  const sproj = spendProjection(m), iproj = incomeProjection(m);
  const sav = line(t('Ahorrado'), m.goal, m.saved, past.reduce((s, ym) => s + m.savedOf(ym), 0) + curSaved + fut.reduce((s, ym) => s + futureSaved(m, ym, m.season.indexOf(ym), sproj, iproj), 0), 'good', '', 'planificado', true);
  // spending: everything that isn't saved
  const spentReal = past.reduce((s, ym) => s + m.spentAll(ym), 0) + (inSeason ? m.spentAll(m.curYM, todayISO) : 0);
  const outs = line(t('Gastado'), ins.plan - m.goal, spentReal, sproj ? sproj.total : ins.proj - sav.proj, 'bad', '', 'planificado');
  // "hoy" on each line: what the plan expects by today. Dated items count from their day; undated ones, the
  // monthly targets and the limits count by the part of the month gone; past months count whole
  const frac = (ym) => (ym < m.curYM ? 1 : ym > m.curYM ? 0 : pc ? pc.day / pc.dim : 0);
  const byDay = (it, ym) => (it.day ? (m.dateOf(it, ym) <= todayISO ? 1 : 0) : frac(ym));
  const live = !m.pre && !m.over && inSeason;
  const sumDue = (list) => sumItems(list, (it, ym) => it.amount * byDay(it, ym));
  const savDue = round2(m.season.reduce((s, ym) => s + m.targetOf(ym) * frac(ym), 0));
  const fixed = m.outs.filter((it) => !it.budget && !m.isSave(it));
  const fixedDue = sumDue(fixed);
  // the rest of the planned spending (limits and unplanned) goes by the days: month by month what's left once
  // the fixed expenses and the month's target are out of its income
  const restDue = round2(m.season.reduce((s, ym) => {
    const f = frac(ym); if (!f) return s;
    const inc = m.ins.reduce((a, it) => a + (occurs(it, ym) ? it.amount : 0), 0), fx = fixed.reduce((a, it) => a + (occurs(it, ym) ? it.amount : 0), 0);
    return s + (inc - fx - m.targetOf(ym)) * f;
  }, 0));
  if (live) { ins.due = sumDue(m.ins); sav.due = savDue; outs.due = round2(fixedDue + restDue); }
  // each budget once, whatever versions it has had: month by month the amount in force, what was spent against it
  const budIds = [...new Set(m.budgets.map((b) => b.id))];
  const buds = budIds.map((id) => {
    const segs = m.budgets.filter((b) => b.id === id), at = (ym) => segs.find((b) => activeIn(b, ym));
    const last = [...m.season].reverse().map(at).find(Boolean);
    if (!last) return null;
    const monthly = last.freq === 'monthly';
    const spent = monthly ? round2(segs.reduce((s, b) => s + m.season.reduce((a, ym) => a + m.budSpent(b, ym), 0), 0)) : round2(segs.reduce((s, b) => s + m.budSpentY(b), 0));
    const plan = monthly ? m.season.reduce((s, ym) => s + (at(ym)?.amount || 0), 0) : last.amount;
    const proj = monthly ? segs.reduce((s, b) => s + m.season.reduce((a, ym) => a + m.budUse(b, ym), 0), 0) : Math.max(last.amount, spent);
    const x = line(last.name, plan, spent, proj, 'bad', catEl(last.cat, 'sm'), 'planificado');
    x.cat = last.cat; x.id = last.id; x.monthly = monthly; x.amounts = m.season.map((ym) => (at(ym) ? (monthly ? at(ym).amount : last.amount / 12) : 0)); // for the detail view
    // "hoy" by the days gone: a yearly budget spread evenly over the year, like the rest of the spending
    if (live) x.due = round2(m.season.reduce((s, ym) => s + (at(ym) ? (monthly ? at(ym).amount : last.amount / 12) * frac(ym) : 0), 0));
    // a yearly budget has no pace of its own, so it is judged against the even spread: what you have spent plus what the
    // plan still lets you spend from here. Ahead of that spread today means ahead at the end too (and behind, behind).
    if (live && !monthly && x.due != null) x.proj = round2(spent + Math.max(0, plan - x.due));
    return x;
  }).filter(Boolean);
  ins.kind = 'in'; outs.kind = 'out'; sav.kind = 'sav';
  return { ins, outs, buds, sav };
}
/**
 * One line of the year, built like Hoy: what happened so far against its plan (coloured by what's real), the bar with
 * the plan's mark, and the projection below, clearly as a projection. A line can be over at this pace and still within today.
 */
const PLAN_AT = 0.8; // where the plan's mark sits on every row of Plan y realidad (room past it for going over)
function cmpRow(m, x, key) {
  const scale = x.plan / PLAN_AT;
  const spendLine = x.more === 'bad', d = Math.round(x.proj - x.plan), near = Math.abs(d) < Math.max(1, x.plan * 0.02);
  const tone = spendLine ? spendTone(x.real, x.plan) : x.isSav ? 'var(--sav)' : 'var(--in)';
  const ptone = spendLine ? spendTone(x.proj, x.plan) : x.isSav ? 'var(--sav)' : 'var(--in)';
  // the words under the bar say how it goes (red, yellow, green), the bar says what it is
  const wtone = spendLine ? ptone : d < -Math.max(1, x.plan * 0.02) ? spendTone(x.plan * 2 - x.proj, x.plan) : 'var(--ok)';
  // a fact when it already happened; the projection's gap with ≈, like the projection beside it
  const overNow = spendLine && x.real > x.plan + 0.5;
  const fin = m.over, dr = Math.round(x.real - x.plan), nearR = Math.abs(dr) < Math.max(1, x.plan * 0.02); // a finished year: it is what it was
  const what = fin ? (overNow ? t('superado en {x}', { x: fmt(dr) }) : nearR ? t('Cumplido') : t(dr > 0 ? '{x} por encima' : '{x} por debajo', { x: fmt(Math.abs(dr)) }))
    : overNow ? t('superado en {x}', { x: fmt((x.real - x.plan)) })
    : near ? t('≈ planificado')
      : t(d > 0 ? '≈ {x} por encima' : '≈ {x} por debajo', { x: fmt(Math.abs(d)) });
  const tip = fin ? `${x.label}: ${fmt(x.real)} / ${fmt(x.plan)}` : `${x.label}: ${t('hasta hoy {x}', { x: fmt(x.real) })}${x.due != null ? ` (${t('planificado hasta hoy {x}', { x: fmt(x.due) })})` : ''} · ${t('{x} planificados', { x: fmt(x.plan) })} · ${t('proyección a fin de año {x}', { x: fmt(x.proj) })}`;
  const dact = x.cat ? `data-act="catdetail" data-cat="${esc(x.cat)}"` : x.kind ? `data-act="linedetail" data-kind="${x.kind}"` : '';
  const rowTip = dact ? tipx(x.label, [{ c: spendLine ? 'var(--out)' : x.isSav ? 'var(--sav)' : 'var(--in)', k: 'solid', l: fin ? t('Actual') : t('Hasta hoy'), v: fmt(x.real) }, ...(x.due != null ? [{ k: 'dash', l: t('Planificado a hoy'), v: fmt(x.due) }] : []), ...(fin ? [] : [{ c: spendLine ? 'var(--out)' : x.isSav ? 'var(--sav)' : 'var(--in)', k: 'hatch', l: t('Proyección'), v: `≈ ${fmt(x.proj)}` }]), { k: 'line', l: t('Planificado'), v: fmt(x.plan) }], t('Toca otra vez para ver el detalle')) : '';
  return `<div class="cmp${dact ? ' hasdetail' : ''}" ${dact ? `${dact} role="button" tabindex="0" data-tip="${esc(rowTip)}" aria-label="${esc(t('Ver detalle de {n}', { n: x.label }))}"` : ''}>
    <div class="row between"><span class="bn small">${x.icon}<b>${esc(x.label)}</b>${dact ? `<span class="dchev" aria-hidden="true">${ic('right')}</span>` : ''}</span>
      <span class="num small"><b style="${spendLine ? (x.real > x.plan + 0.5 ? toneText('var(--spend)') : '') : toneText(tone)}">${fmtN(x.real)}</b> <span class="muted">/ ${fmt(x.plan)} · ${t('planificado')}</span></span></div>
    ${gauge({ notip: !!dact, names: { fill: fin ? t('Actual') : t('Hasta hoy') }, v: x.real, proj: fin ? null : x.proj, tone, ptone, cap: spendLine ? x.plan : null, key: 'cmp-' + key, thin: true, scale,
      marks: [...(x.due != null ? [{ at: Math.max(0, x.due), cls: 'today' }] : []), { at: x.plan }], label: tip })}
    <div class="barleg small num">${fin ? '<span></span>' : `<span><i class="lg-proj" style="--pc:${spendLine ? (x.proj > x.plan + 0.5 ? 'var(--spend)' : 'var(--out)') : ptone}"></i>${t('Proyección')} ≈ ${fmt((x.proj))}</span>`}<b style="${toneText(wtone)}">${what}</b></div>
  </div>`;
}
function planCard(m) {
  const c = planVsReal(m), rows = [c.ins, c.outs, c.sav, ...c.buds];
  // each line against its own plan (25.000 € of income and 600 € of tobacco can't share a scale): the plan's mark at
  // the same place on every row, and "hoy" at what that line's plan expects by today
  return `<section class="card" aria-label="${t('Plan y realidad')}">
    <div class="row between"><h2>${t('Plan y realidad')} ${info('planReal')}</h2><span class="fine">${MES3[+m.season[0].slice(5) - 1]} ${m.season[0].slice(2, 4)} – ${MES3[+m.season[11].slice(5) - 1]} ${m.season[11].slice(2, 4)}</span></div>
    ${m.over ? `<div class="legend tight"><span><i class="sw" style="background: var(--muted)"></i>${t('Actual')}</span><span><i class="lg-mark"></i>${t('planificado')}</span></div>` : `<div class="legend tight"><span><i class="sw" style="background: var(--muted)"></i>${t('hasta hoy')}</span><span><i class="lg-proj" style="--pc: var(--muted)"></i>${t('proyección')}</span><span class="lg-group">${t('planificado:')}<span><i class="lg-mark"></i>${t('año')}</span><span><i class="lg-today"></i>${t('a hoy')}</span></span></div>`}
    ${[c.ins, c.outs, c.sav].map((x, i) => cmpRow(m, x, 'm' + i)).join('')}
    ${c.buds.length ? `<span class="label">${t('Tus presupuestos')}</span>${c.buds.map((x, i) => cmpRow(m, x, 'b' + i)).join('')}` : ''}
    ${m.over ? table(['', t('Plan'), t('Actual'), t('Dif.')], rows.map((x) => [esc(x.label), fmt(x.plan), fmt(x.real), diffCell(x.real, x.plan, x.more)])) : table(['', t('Plan'), t('Hoy'), t('Proy.'), t('Dif. ≈')], rows.map((x) => [esc(x.label), fmtN((x.plan)), fmtN((x.real)), fmtN((x.proj)), diffCell(x.proj, x.plan, x.more)]))}
  </section>`;
}
const PERIODS = { ano: t('Todo el plan'), '3m': t('3 meses'), mes: t('Este mes') }; // the whole plan first, and the one you land on
/** What was spent in those months, by type (logged spends + the plan's expenses that already came + what the balance says
 * you spent beyond what you logged): { rows: [[type, amount]] biggest first, tot }. */
function spendByType(m, yms) {
  const inPer = (e) => yms.includes(m.monthOf(e.date));
  const sp = m.allSpends.filter((e) => inPer(e) && e.cat !== SAVE_CAT && !(m.openAfter(m.monthOf(e.date)) && e.date <= m.openAfter(m.monthOf(e.date))));
  const by = {};
  for (const e of sp) by[e.cat || ''] = (by[e.cat || ''] || 0) + e.amount;
  // the plan's expected expenses that already came (rent, bills…), by type: so the total is everything spent
  for (const ym of yms) for (const p of m.plannedIn(ym)) {
    if (p.it.kind !== 'out' || p.save || p.state === 'future' || (m.openAfter(ym) && p.date <= m.openAfter(ym))) continue; // before the start balance's day: already in it
    const c = itemCat(p.it) || 'otros';
    by[c] = (by[c] || 0) + p.amount;
  }
  // what your balance says you spent beyond what you logged
  const dia = round2(yms.reduce((s, ym) => s + (m.spentSrc(ym) !== 'log' ? Math.max(0, m.spentOf(ym) - m.loggedRest(ym, m.openAfter(ym))) : 0), 0));
  if (dia > 0.5) by[DIA] = dia;
  const tot = Object.values(by).reduce((s, v) => s + v, 0), n = Math.max(1, yms.length);
  const rows = Object.entries(by).sort((a, b) => b[1] - a[1]);
  return { rows, tot, by };
}
function analisis(m) {
  if (!m.items.length) return emptyPlanCard(m);
  const per = (UI.yearOff || 0) !== 0 ? 'ano' : PERIODS[UI.anaPer] ? UI.anaPer : 'ano'; // another year: the whole year
  // only months of the plan that have begun: before its start there is nothing to count
  const yms = per === 'mes' ? [m.curYM] : per === '3m' ? [ymAdd(m.curYM, -2), ymAdd(m.curYM, -1), m.curYM].filter((ym) => m.season.includes(ym) || ym === m.curYM)
    : m.season.filter((ym) => ym <= m.curYM);
  const { rows, tot } = spendByType(m, yms);
  // the monthly average uses whole months only: this month is still running and would pull it down
  const whole = yms.filter((ym) => ym < m.curYM), avg = whole.length ? spendByType(m, whole).tot / whole.length : null;
  const top = rows.find(([c]) => c && c !== DIA);
  const rkName = (c) => (c === DIA ? t('Sin detallar') : catName(c));
  const shown = rows.slice(0, 8), rest = rows.slice(8).reduce((s, [, v]) => s + v, 0);

  // the plan's months so far
  const sm = m.season.map((ym, i) => ({ ym, i, has: !m.pre && i <= m.curIdx }));
  const spY = spendProjection(m), ipY = incomeProjection(m); // the months to come, as they are expected to go
  const left = sm.map(({ ym, has, i }) => {
    const show = has && (i < m.curIdx || m.savedOf(ym) !== 0), fut = !has && spY && i > m.curIdx, v = show ? m.savedOf(ym) : fut ? futureSaved(m, ym, i, spY, ipY) : null;
    return { label: MES3[+ym.slice(5) - 1].slice(0, 1).toUpperCase(), value: v, proj: fut, now: ym === m.curYM, fill: v == null ? null : scaleOf(v, m.targetOf(ym), m.target).c, mark: m.targetOf(ym),
      tip: tipx(cap(ymLabel(ym)), [{ c: v == null ? 'var(--sav)' : scaleOf(v, m.targetOf(ym), m.target).c, k: fut ? 'hatch' : 'solid', l: fut ? t('Estimado') : t('Ahorrado'), v: v == null ? t('aún no') : (fut ? '≈ ' : '') + fmt(v) }, { k: 'line', l: t('Planificado'), v: fmt(m.targetOf(ym)) }]) };
  });
  const lastI = left.map((c) => c.value != null).lastIndexOf(true);
  const outOfM = (ym) => (ym === m.curYM ? m.spentAll(ym, toISO(new Date())) : m.spentAll(ym));
  const io = sm.map(({ ym, has, i }) => {
    const fut = !has && spY && ipY && i > m.curIdx;
    const inc = fut ? ipY.months[i] : m.incomeTo(ym), out = has ? outOfM(ym) : fut ? spY.months[i] : null;
    return { label: MES3[+ym.slice(5) - 1].slice(0, 1).toUpperCase(), a: inc, b: out, pa: fut, pb: fut, now: ym === m.curYM,
      tip: tipx(cap(ymLabel(ym)), [{ c: 'var(--in)', k: fut ? 'hatch' : 'solid', l: fut ? t('Ingresos estimados') : has ? t('Ingresado') : t('Ingresos planificados'), v: (fut ? '≈ ' : '') + fmt(inc) }, ...(out != null ? [{ c: 'var(--out)', k: fut ? 'hatch' : 'solid', l: fut ? t('Gasto estimado') : t('Gastado'), v: (fut ? '≈ ' : '') + fmt(out) }] : [])]) };
  });

  return `
  ${yearNav(m)}
  ${planCard(m)}
  <div id="ana-per">
  <h2 class="section-h">${t('Tus gastos')}</h2>
  ${(UI.yearOff || 0) !== 0 ? '' : ''}<div class="seg period" ${(UI.yearOff || 0) !== 0 ? 'hidden' : ''} role="group" aria-label="${t('Periodo')}">${Object.entries(PERIODS).map(([k, l]) => `<button data-act="anaper" data-v="${k}" aria-pressed="${per === k}">${l}</button>`).join('')}</div>

  <div class="tiles ${per === 'mes' || avg == null ? 't2' : 't3'}">
    <div class="tile"><span class="label">${t('Gastado')}</span><span class="v num">${compactMoney(tot)}</span><span class="fine">${esc(PERIODS[per].toLowerCase())}</span></div>
    ${per === 'mes' || avg == null ? '' : `<div class="tile"><span class="label">${t('Al mes')}</span><span class="v num">${compactMoney(avg)}</span><span class="fine">${t('media de {n} {m} completos', { n: whole.length, m: tn(whole.length, 'mes', 'meses') })}</span></div>`}
    <div class="tile"><span class="label">${t('Mayor gasto')}</span><span class="v">${top ? catEl(top[0], 'sm') : '—'}</span><span class="fine tl">${top ? `<span>${esc(CAT[top[0]].short)}</span><span class="num">${fmt(top[1])}</span>` : t('sin tipos')}</span></div>
  </div>

  <section class="card" aria-label="${t('Gasto por tipo')}">
    <div class="row between"><h2>${t('Gasto por tipo')}</h2><span class="fine num">${fmt(tot)}</span></div>
    ${rows.length ? `<div class="vlist">${(() => {
      const list = [...shown.map(([c, v]) => ({ cat: c && c !== DIA ? c : '', icon: catEl(c === DIA ? '' : c, 'sm'), label: rkName(c), pct: Math.round(v / (tot || 1) * 100), value: v, extra: m.budByCat.get(c) ? ' <span class="fine c-acc">' + t('presupuesto') + '</span>' : '' })),
        ...(rest ? [{ icon: catEl('', 'sm'), label: t('Otros tipos'), pct: Math.round(rest / (tot || 1) * 100), value: rest }] : [])];
      const top1 = Math.max(1, ...list.map((r) => r.value));
      return list.map((r, i) => typeRow(r, top1, `at-${per}-${i}`)).join('');
    })()}</div>`
      + table([t('Tipo'), t('Importe'), '%'], rows.map(([c, v]) => [esc(rkName(c)), fmt(v), Math.round(v / (tot || 1) * 100) + ' %']))
      : '<p class="fine">' + t('Aún no hay gastos en este periodo. Cierra el mes con tu saldo, o apunta con el + lo que quieras vigilar.') + '</p>'}
  </section>

  </div>
  <h2 class="section-h">${t('Tu año, mes a mes')}</h2>

  <section class="card" aria-label="${t('Ahorro cada mes')}">
    <h2>${t('Ahorro cada mes')} ${info('ahorradoMes')}</h2>
    <div class="legend"><span><span class="swatches" aria-hidden="true"><i class="sv-red"></i><i class="sv-yellow"></i><i class="sv-lite"></i><i class="sv-deep"></i></span>${t('ahorrado (de peor a mejor)')}</span><span><i class="lg-tick"></i>${t('planificado del mes')}</span><span><i class="lg-proj" style="--pc: var(--muted)"></i>${t('estimado')}</span></div>
    ${columns({ cols: left, labels: lastI >= 0 ? [lastI] : [], aria: t('Ahorrado / planificado de cada mes') })}
    ${table([t('Mes'), t('Ahorrado'), t('Planificado'), t('Diferencia')], sm.map(({ ym }, i) => [esc(cap(ymLabel(ym))), left[i].value == null ? '—' : fmt(left[i].value), fmt(m.targetOf(ym)), left[i].value == null ? '—' : diffCell(left[i].value, m.targetOf(ym), 'good')]))}
  </section>

  <section class="card" aria-label="${t('Ingresos y gastos')}">
    <div class="row between"><h2>${t('Ingresos y gastos')}</h2><span class="legend"><span><i class="sw ch-in"></i>${t('ingresado')}</span><span><i class="sw ch-out"></i>${t('gastado')}</span><span><i class="lg-proj" style="--pc: var(--muted)"></i>${t('estimado')}</span></span></div>
    ${pairs({ cols: io, aria: t('Ingresos y gastos de cada mes') })}
    ${table([t('Mes'), t('Ingresado'), t('Gastado'), t('Diferencia')], sm.map(({ ym, has }) => [esc(cap(ymLabel(ym))), fmt(m.incomeTo(ym)), has ? fmt(outOfM(ym)) : '—', has ? diffCell(m.incomeTo(ym), outOfM(ym), 'good') : '—']))}
  </section>`;
}
const compactMoney = (v) => (v < 10000 ? fmt((v)) : fmt(1).replace('1', (v / 1000).toLocaleString(locale, { maximumFractionDigits: 1 }) + 'K'));

// ---------- Plan ----------
// Plan once: the yearly goal, what comes in, what you know will go out, and budgets for what you want to keep an eye on.
function plan(m) {
  const s = store.data.settings;
  const avgIn = m.incomeY / 12, avgOut = m.outY / 12, free = m.restAvg;
  const budM = m.budY / 12, tot = Math.max(avgIn, avgOut + budM + m.target, 1), w = (v) => clamp(v / tot * 100, 0, 100).toFixed(1);
  // the lists show one version per item (the one in force this month, or the next one to start); the sums use them all
  // a one-off belongs to its own year: the plan of another year doesn't list it
  const ofYear = (it) => it.freq !== 'once' || m.season.includes(`${it.year}-${String(it.month).padStart(2, '0')}`);
  const off = UI.yearOff || 0, shown = m.shown(viewYMOf(m)).filter(ofYear), sIns = shown.filter((i) => i.kind === 'in'), sBuds = shown.filter((i) => i.budget);
  const outs = shown.filter((i) => i.kind === 'out' && !i.budget); // in your order: you set it by dragging
  const budY = m.budY;
  const outM = m.outs.filter((i) => !i.budget && !m.isSave(i)).reduce((a, i) => a + i.amount * timesIn(i, m.season), 0) / 12;
  const maxGoal = Math.max(0, Math.floor(m.possible / 100) * 100), share = m.incomeY ? Math.round(m.goal / m.incomeY * 100) : 0;
  // "Cumplidos", newest first, only what belongs to each section: the incomes you confirmed, the expenses you confirmed
  // (recurring or one-off), and, under the limits, the spends you logged in those categories. A confirmed one-off
  // no longer sits in the list above.
  const confirmedIds = new Set(Object.values(store.data.months).flatMap((mo) => Object.keys(mo.real || {})));
  const isDone = (it) => it.freq === 'once' && !it.budget && confirmedIds.has(it.id);
  const doneList = (kind) => doneRowsOf(m, kind);
  const group = (title, sub, all, preset, addLabel, total, kind) => { const list = all.filter((it) => !isDone(it)), done = doneList(kind);
    return `<section class="card">
    <div class="row between"><div><h2>${title}</h2>${sub ? `<div class="fine">${sub}</div>` : ''}</div><div class="hact">${total != null ? `<span class="fine num nowrap">${total}</span>` : ''}<button type="button" class="addmini" data-act="additem" data-preset='${esc(JSON.stringify(preset))}' aria-label="${esc(addLabel)}" title="${esc(addLabel)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5h2v14h-2zM5 11h14v2H5z"/></svg></button></div></div>
    <div class="plist">${list.map((it) => planRow(it, m, list.length > 1)).join('') || `<p class="fine">${t('Nada todavía.')} <button type="button" class="linkbtn" data-act="additem" data-preset='${esc(JSON.stringify(preset))}'>${esc(addLabel)}</button></p>`}</div>
    ${done.length ? `<button type="button" class="movlink" data-act="donelist" data-kind="${kind}">${t('Movimientos')} <b class="num">${done.length}</b>${ic('right')}</button>` : ''}</section>`; };
  return `${yearNav(m)}<section class="card" aria-label="${t('Objetivo de ahorro')}">
    <div class="row between"><h2>${t('Objetivo de ahorro')} ${info('plan')}</h2></div>
    <button type="button" class="goalbtn" ${off === 0 ? 'data-act="goaledit"' : 'disabled'} aria-label="${t('Objetivo de ahorro')}: ${esc(fmt(m.goal))} ${t('al año')}">
      <span class="gb-v num">${fmt(m.goal)}<small> ${t('al año')}</small></span>
      <span class="fine num">≈ ${fmt(round2(m.goal / 12))} ${t('al mes')}${m.incomeY ? ` · ${t('{p} % de tus ingresos', { p: share })}` : ''}</span>
      ${off === 0 ? `<span class="gb-edit" aria-hidden="true">${t('Cambiar')}</span>` : ''}
    </button>
    <span class="label">${t('Reparto de tus ingresos')}</span>
    <div class="stackbar" aria-hidden="true"><i class="k-save" data-bar="${w(m.target)}" data-key="sb-save"></i><i class="k-fix" data-bar="${w(avgOut)}" data-key="sb-out"></i><i class="k-bud" data-bar="${w(budM)}" data-key="sb-bud"></i><i class="${free >= 0 ? 'k-free' : 'k-neg'}" data-bar="${w(Math.abs(free))}" data-key="sb-free"></i></div>
    <div class="legend num">${[['k-save', t('ahorro'), m.target], ['k-fix', t('gastos planificados'), avgOut], ['k-bud', t('presupuestos'), budM], [free >= 0 ? 'k-free' : 'k-neg', free >= 0 ? t('sin presupuestar') : t('falta'), Math.abs(free)]]
      .filter(([, , v]) => v > 0.5).map(([k, l, v]) => `<span><i class="dot ${k}"></i>${l} <b>${avgIn ? Math.round(v / avgIn * 100) : 0} %</b></span>`).join('')}</div>
    <div class="sum">
      <span>${t('Ingresos planificados')}</span><b>${fmt(m.incomeY)}</b>
      <span>${t('Objetivo de ahorro')}</span><span>−${fmt(m.goal)}</span>
      <span class="tot">${t('Gasto total planificado')}</span><span class="tot">${fmt(m.incomeY - m.goal)}</span>
      <span class="sub">${t('Gastos planificados')}</span><span>${fmt(m.outY)}</span>
      ${sBuds.length ? `<span class="sub">${t('Presupuestos')}</span><span>${fmt(budY)}</span>` : ''}
      <span class="sub">${t('Sin presupuestar')}</span><span class="${free < 0 ? 'c-spend' : ''}">${free < 0 ? '−' : ''}${fmt(Math.abs(free * 12))}</span>
    </div>
    ${free < 0 ? `<div class="note c-spend">${t('No cabe: faltan {x} al mes. Como mucho caben {y} al año, sin dejar nada para gastar.', { x: fmt(-free), y: fmt(maxGoal) })}
        <div class="row"><button class="small" data-act="goalfit" data-v="${Math.max(0, Math.floor((m.possible - Math.max(0, m.possible) * 0.4) / 100) * 100)}">${t('Ajustar a una cifra viable')}</button></div></div>`
      : ''}
  </section>
  ${group(t('Ingresos planificados'), '', sIns, { kind: 'in', freq: 'monthly', _sec: 'in' }, t('Añadir ingreso'), fmt(m.incomeY) + t(' al año'), 'in')}
  ${group(t('Gastos planificados'), '', outs, { kind: 'out', freq: 'monthly', _sec: 'out' }, t('Añadir gasto'), outs.length ? fmt(outM) + t('/mes') : null, 'out')}
  ${group(t('Presupuestos'), '', sBuds, { kind: 'out', freq: 'yearly', budget: true, _sec: 'bud' }, t('Añadir presupuesto'), sBuds.length ? fmt(budY / 12) + t('/mes') : null, 'bud')}
  <button type="button" class="card tco-entry" data-act="tcoopen"><span><b>${t('Comparar alternativas')}</b><span class="fine">${(store.data.calcs || []).length ? t((store.data.calcs.length === 1 ? '{n} decisión guardada' : '{n} decisiones guardadas'), { n: store.data.calcs.length }) : t('¿Comprar o alquilar? ¿Nuevo o de segunda mano? Mira con cuánto dinero acabas en cada caso.')}</span></span>${ic('right')}</button>`;
}
// ---------- Decisiones: comparar alternativas (coste de oportunidad) ----------
// Its own page (#calculadora): your saved decisions and templates. A decision (buy a car) has alternatives (renting, new, used,
// public transport) and scenarios (the returns your money could get invested: 3 %, 5 %, 10 %). Every alternative starts with
// the same money; what one doesn't spend is invested, so the answer is the wealth each one leaves you (js/tco.js, compare()).
// On a computer the page leaves the phone column: the alternatives side by side, as a table you fill like a spreadsheet.
const CALC_C = [0, 1, 2, 3, 4, 5].map((i) => `var(--tc${i})`);
const DEF_RETS = [3, 5, 10];
const cr = (id, n, f, fix) => ({ id, n: t(n), f, ...(fix ? { fix: true } : {}) });
/** v: how it keeps its value — ['curve', id] | ['rate', ±%] | ['none']… (see valueAt in tco.js) · fin: [loan, rate %, months] · amounts: { rowId: € } */
const calt = (name, price, v, amounts, fin = null, sellc = 0) => ({ name: t(name), price, vm: v[0], dep: v[0] === 'rate' ? v[1] : 0, ...(v[0] === 'curve' ? { vc: v[1] } : {}), ...(sellc ? { sellc } : {}), loan: fin?.[0] || 0, rate: fin?.[1] || 0, term: fin?.[2] || 0, v: amounts });
const CALC_TPL = () => ({
  car: { cat: 'coche', label: t('Comprar coche'), years: 8, rows: [
    cr('cuota', 'Cuota de renting (con seguro y mantenimiento)', 'm', true), { ...cr('seguro', 'Seguro', 'y'), ag: AGE_DOWN }, cr('comb', 'Combustible', 'm'), { ...cr('mant', 'Mantenimiento y reparaciones', 'y'), ag: AGE_UP },
    cr('imp', 'Impuesto de circulación', 'y'), cr('neum', 'Neumáticos', '4'), cr('abono', 'Abono de transporte', 'm'), cr('taxi', 'Taxi, VTC o alquiler puntual', 'm')], alts: [
    calt('Renting', 0, ['rate', -15], { cuota: 420, comb: 110 }),
    calt('Nuevo', 25000, ['curve', 'carNew'], { seguro: 650, comb: 110, mant: 300, imp: 120, neum: 450 }),
    { ...calt('Seminuevo', 18000, ['curve', 'carNew'], { seguro: 550, comb: 110, mant: 450, imp: 120, neum: 450 }), age: 2 },
    { ...calt('Segunda mano', 9000, ['curve', 'carNew'], { seguro: 400, comb: 125, mant: 800, imp: 100, neum: 400 }), age: 8 },
    calt('Transporte público', 0, ['rate', -15], { abono: 40, taxi: 80 })] },
  home: { cat: 'casa', label: t('Comprar vivienda o alquilar'), years: 20, rows: [
    cr('compra', 'Impuestos y gastos de compra', 'o'), cr('ibi', 'IBI', 'y'), cr('com', 'Comunidad', 'm'), cr('seg', 'Seguro de hogar', 'y'), cr('mant', 'Mantenimiento', 'y'),
    cr('alq', 'Alquiler', 'm'), cr('segi', 'Seguro de inquilino', 'y'), cr('aport', 'Aportación en casa', 'm')], alts: [
    calt('Comprar', 250000, ['rate', 2], { compra: 25000, ibi: 450, com: 70, seg: 300, mant: 1500 }, [200000, 3, 360], 4),
    calt('Alquilar', 0, ['rate', 2], { alq: 1000, segi: 150 }),
    calt('Casa de los padres', 0, ['rate', 2], { aport: 200 })] },
  letting: { cat: 'casa', label: t('Comprar vivienda para alquilar o invertir'), years: 15, rows: [
    { ...cr('alq', 'Alquiler que cobras', 'm'), inc: true }, cr('compra', 'Impuestos y gastos de compra', 'o'), cr('ibi', 'IBI', 'y'), cr('com', 'Comunidad', 'm'),
    cr('seg', 'Seguro de hogar e impago', 'y'), { ...cr('mant', 'Mantenimiento y reparaciones', 'y'), ag: 3 }, cr('vacio', 'Meses vacío y gestión', 'y'), cr('irpf', 'IRPF del alquiler', 'y')], alts: [
    calt('Piso para alquilar', 200000, ['rate', 2], { alq: 900, compra: 22000, ibi: 400, com: 60, seg: 450, mant: 1000, vacio: 700, irpf: 600 }, [150000, 3, 360], 4),
    calt('Invertir el dinero', 0, ['rate', 2], {})] },
  fuel: { cat: 'gasolina', label: t('Gasolina o eléctrico'), years: 8, rows: [
    cr('carg', 'Cargador en casa', 'o'), cr('seg', 'Seguro', 'y'), cr('imp', 'Impuesto de circulación', 'y'), cr('mant', 'Mantenimiento', 'y'), cr('ener', 'Combustible o electricidad', 'm')], alts: [
    calt('Gasolina', 22000, ['curve', 'carNew'], { seg: 500, imp: 120, mant: 450, ener: 120 }),
    calt('Eléctrico', 30000, ['curve', 'carEV'], { carg: 1000, seg: 600, imp: 30, mant: 200, ener: 35 })] },
  phone: { cat: 'tecnologia', label: t('Móvil'), years: 4, rows: [
    cr('funda', 'Funda y protector', 'o'), cr('seg', 'Seguro', 'y'), cr('otro', 'Otro móvil a los 2 años', '2')], alts: [
    calt('iPhone', 1100, ['curve', 'phoneApple'], { funda: 40, seg: 80 }),
    calt('Android de gama alta', 900, ['curve', 'phoneAndroid'], { funda: 40, seg: 70 }),
    calt('Gama media', 400, ['curve', 'phoneBudget'], { funda: 25, otro: 400 })] },
  blank: { cat: '', label: t('En blanco'), years: 5, rows: [], alts: [calt('', 0, ['rate', -10], {}), calt('', 0, ['rate', -10], {})] },
});
const CURVE_L = () => ({ carNew: t('Coche: media del mercado'), carKeep: t('Coche que mantiene su valor (híbridos, modelos muy buscados)'), carPremium: t('Coche premium o de lujo'), carEV: t('Coche eléctrico'),
  phoneApple: t('Móvil iPhone'), phoneAndroid: t('Móvil Android de gama alta'), phoneBudget: t('Móvil económico') });
const CURVE_S = () => ({ carNew: t('Coche medio'), carKeep: t('Mantiene valor'), carPremium: t('Premium'), carEV: t('Eléctrico'), phoneApple: t('iPhone'), phoneAndroid: t('Android alta'), phoneBudget: t('Móvil económico') });
const FREQ_L = () => [['m', t('al mes')], ['y', t('al año')], ...['2', '3', '4', '5', '6', '8', '10'].map((k) => [k, t('cada {n} años', { n: k })]), ['o', t('una vez')]];
const cfreqText = (f) => FREQ_L().find(([k]) => k === f)?.[1] || '';
const altName = (a, i) => (a?.name || '').trim() || t('Alternativa {l}', { l: 'ABCDEF'[i] || i + 1 });
const rowName = (r) => (r.n || '').trim() || t('Sin nombre');
const pctx = (v) => `${String(Math.round(v * 10) / 10).replace('.', lang === 'en' ? '.' : ',')} %`;
const n2 = (v) => String(v ?? '').replace('.', lang === 'en' ? '.' : ',');
const calcWide = () => matchMedia('(min-width: 960px)').matches;
const calcSaved = (id) => (store.data.calcs || []).some((x) => x.id === id);
/** Save the decision you are looking at. Only when you press «Guardar»: trying numbers out never saves anything. */
function calcSave() {
  const c = UI.calc; if (!c) return;
  c.at = toISO(new Date()); const copy = JSON.parse(JSON.stringify(c));
  store.update('calcs', (d) => { const l = d.calcs || []; const i = l.findIndex((x) => x.id === c.id); d.calcs = i < 0 ? [...l, copy] : l.map((x, k) => (k === i ? copy : x)); }, true);
  UI.calcDirty = false;
}
/** Leaving a decision with changes not saved: ask first. */
const calcLeave = () => (UI.calc && UI.calcDirty ? askConfirm({ title: t('¿Salir sin guardar?'), text: t('Los cambios de esta decisión se perderán.'), yes: t('Salir sin guardar') }) : Promise.resolve(true));
/** The save button and the line under the name: what is saved and what isn't. */
function calcActs(c) {
  const saved = calcSaved(c.id), dirty = !saved || UI.calcDirty;
  return `${dirty ? `<button type="button" class="primary sm" data-act="calcsave">${t('Guardar')}</button>` : ''}${saved ? `<button type="button" class="iconbtn" data-act="calcdel" aria-label="${t('Borrar decisión')}">${ic('x')}</button>` : ''}`;
}
const calcStateText = (c) => (!calcSaved(c.id) ? t('Sin guardar.') : UI.calcDirty ? t('Cambios sin guardar.') : t('Guardado.'));
function calcTouched() {
  UI.calcDirty = true;
  const a = $('#calc-acts'); if (a) a.innerHTML = calcActs(UI.calc);
  const st = $('#calc-state'); if (st) st.textContent = calcStateText(UI.calc);
}
function calcView() { return UI.calc ? calcEdit(UI.calc) : calcList(); }
function calcList() {
  const list = normCalcs(store.data.calcs || []).sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  const item = (c) => {
    const s = compare(c).scen[c.sel];
    let line = esc(t('Sin alternativas'));
    if (s && c.alts.length) {
      const b = s.best;
      line = `<i class="tcc-sw" style="background:${CALC_C[b]}"></i><span class="calc-it-n">${esc(altName(c.alts[b], b))}</span><span class="nw">${esc(t('{x} de patrimonio', { x: sgn0(s.dpn[b]) }))}</span>`;
    }
    return `<button type="button" class="card calc-item" data-act="calcopen" data-id="${esc(c.id)}"><span class="calc-it-t"><b>${esc(c.name || t('Sin nombre'))}</b><span class="fine">${line}</span></span>${ic('right')}</button>`;
  };
  return `<div class="calc-intro"><h1>${t('Comparar alternativas')}</h1><p class="fine">${t('¿Comprar o alquilar? ¿Nuevo o de segunda mano? Mira cuánto dinero tendrías al final con cada alternativa, invirtiendo lo que no gastas.')}</p></div>
    ${list.length ? `<h2 class="calc-sec">${t('Tus decisiones')}</h2><div class="calc-list">${list.map(item).join('')}</div>` : ''}
    <h2 class="calc-sec">${t('Nueva decisión')}</h2>
    <div class="calc-tpls">${Object.entries(CALC_TPL()).map(([k, v]) => `<button type="button" class="calc-tpl" data-act="calcnew" data-k="${k}">${catEl(v.cat || '')}<span class="calc-tpl-t"><b>${esc(v.label)}</b><span class="fine">${v.alts.some((a) => a.name) ? esc(v.alts.map((a) => a.name).join(' · ')) : t('Empieza de cero')}</span></span>${ic('right')}</button>`).join('')}</div>`;
}
function calcEdit(c) {
  return `<div class="calc-top"><textarea class="calc-name" rows="1" data-cn placeholder="${t('¿Qué quieres decidir?')}" aria-label="${t('Nombre de la decisión')}" autocomplete="off" maxlength="80">${esc(c.name)}</textarea>
      <span class="calc-acts" id="calc-acts">${calcActs(c)}</span></div>
    <p class="fine calc-state" id="calc-state">${calcStateText(c)}</p>
    ${calcAss(c)}
    <section class="card calc-alts"><div class="calc-alts-h"><h2>${t('Alternativas')}</h2><p class="fine">${t('Deja en blanco lo que no aplique. Cada gasto o ingreso puede subir con la inflación, tener precio fijo o, además, subir o bajar con la edad.')}</p></div>
      ${calcWide() ? calcTable(c) : calcAltForm(c)}</section>
    <div id="calc-res">${calcResult(c)}</div>
    ${calcHow()}`;
}
/** Years, inflation and the scenarios: the returns to try. */
function calcAss(c) {
  const g = (k, label, suffix, mode) => `<label class="field tco-f"><span class="label">${label}</span><span class="tco-in"><input type="text" inputmode="${mode}" data-cg="${k}" value="${esc(n2(c[k]))}" autocomplete="off">${suffix ? `<span>${suffix}</span>` : ''}</span></label>`;
  const rets = c.rets.map((r, i) => `<span class="calc-ret${i === c.sel ? ' on' : ''}" data-ri="${i}"><input type="text" inputmode="decimal" data-cr="${i}" value="${esc(n2(r))}" aria-label="${t('Rentabilidad del escenario {n}', { n: i + 1 })}" autocomplete="off"><span>%</span>${c.rets.length > 1 ? `<button type="button" class="calc-ret-x" data-act="calcrmret" data-i="${i}" aria-label="${t('Quitar escenario')}">${ic('x')}</button>` : ''}</span>`).join('');
  return `<section class="card calc-ass"><h2>${t('Supuestos')}</h2>
    <div class="calc-ass-g">${g('years', t('Años'), t('años'), 'numeric')}${g('infl', t('Inflación'), '%', 'decimal')}
      <div class="field calc-rets"><span class="label">${t('Escenarios: lo que rinde tu dinero al año')}</span><div class="calc-retl">${rets}${c.rets.length < CALC_MAX.rets ? `<button type="button" class="calc-ret-add" data-act="calcaddret">+ ${t('Escenario')}</button>` : ''}</div></div></div>
    <p class="fine">${t('Todas parten del mismo dinero, invertido: lo que pide la más cara al empezar. Pon rentabilidades netas de comisiones e impuestos.')}</p></section>`;
}
const payOf = (a) => { const o = optOf(a, []); return o.fin ? tco(o, { years: 1, infl: 0, ret: 0 }).pay : 0; };
/** What the value cell says: how it changes and what it is worth at the end. */
function valSummary(a, c) {
  if (!(+a.price > 0)) return '—';
  const end = valueAt(a, c.years, c.years), how = a.vm === 'none' ? t('No se revende') : a.vm === 'curve' ? (CURVE_S()[a.vc] || t('Curva típica')) + (+a.age > 0 ? ' · ' + t('{n} años', { n: a.age }) : '') : a.vm === 'end' ? t('Precio de venta') : a.vm === 'linear' ? t('Sin valor a los {n} años', { n: a.life || c.years }) : (+a.dep >= 0 ? t('+{p} al año', { p: pctx(+a.dep) }) : t('−{p} al año', { p: pctx(-a.dep) }));
  return `<span class="cg-v1">${esc(how)}</span><span class="cg-v2">${a.vm === 'none' ? '' : esc(t('{x} al final', { x: fmt0(end) }))}</span>`;
}
/** On a computer: the alternatives side by side. Rows are what they are compared on, columns the alternatives. */
function calcTable(c) {
  const N = c.alts.length, span = N + 1 + (N < CALC_MAX.alts ? 1 : 0);
  const inp = (i, attrs, v, suffix, label, mode = 'decimal') => `<td><span class="cg-in"><input type="text" inputmode="${mode}" ${attrs} value="${v ? esc(n2(v)) : ''}" placeholder="—" autocomplete="off" aria-label="${esc(label)} · ${esc(altName(c.alts[i], i))}"><span>${suffix}</span></span></td>`;
  const row = (label, sub, cells, cls = '') => `<tr class="${cls}"><th scope="row"><span class="cg-l">${label}</span>${sub ? `<span class="cg-s">${sub}</span>` : ''}</th>${cells}${N < CALC_MAX.alts ? '<td class="cg-pad"></td>' : ''}</tr>`;
  const each = (f) => c.alts.map((a, i) => f(a, i)).join('');
  const head = `<tr><th class="cg-corner" scope="col"><span class="sr">${t('Concepto')}</span></th>${each((a, i) => `<th scope="col" style="--tc:${CALC_C[i]}"><div class="cg-h"><i class="tcc-sw"></i><textarea class="cg-name" rows="1" data-ca="${i}" data-k="name" placeholder="${esc(altName({}, i))}" aria-label="${t('Nombre de la alternativa')}" autocomplete="off" maxlength="60">${esc(a.name)}</textarea>
      ${N > 1 ? `<button type="button" class="iconbtn sm" data-act="calcrmalt" data-i="${i}" aria-label="${esc(t('Quitar {x}', { x: altName(a, i) }))}" title="${t('Quitar')}">${ic('x')}</button>` : ''}</div>
      ${N < CALC_MAX.alts ? `<button type="button" class="cg-dup" data-act="calcdupalt" data-i="${i}">${t('Duplicar')}</button>` : ''}</th>`)}${N < CALC_MAX.alts ? `<th class="cg-add" scope="col"><button type="button" class="btn-sec sm" data-act="calcaddalt">+ ${t('Alternativa')}</button></th>` : ''}</tr>`;
  const sec = (label) => `<tr class="cg-sec"><th colspan="${span}" scope="colgroup">${label}</th></tr>`;
  const body = [
    sec(t('Compra')),
    row(t('Precio'), t('vacío si no compras nada'), each((a, i) => inp(i, `data-ca="${i}" data-k="price"`, a.price, curSym, t('Precio')))),
    row(t('Financiado'), t('importe del préstamo'), each((a, i) => inp(i, `data-ca="${i}" data-k="loan"`, a.loan, curSym, t('Financiado')))),
    row(t('Interés'), t('TIN anual'), each((a, i) => inp(i, `data-ca="${i}" data-k="rate"`, a.rate, '%', t('Interés')))),
    row(t('Plazo'), '', each((a, i) => inp(i, `data-ca="${i}" data-k="term"`, a.term, t('meses'), t('Plazo'), 'numeric'))),
    row(t('Cuota del préstamo'), '', each((a, i) => `<td class="cg-ro num" id="cg-pay-${i}">${payOf(a) ? fmt(payOf(a)) : '—'}</td>`), 'cg-calc'),
    row(t('Valor con los años'), t('lo que recuperas al venderlo'), each((a, i) => `<td><button type="button" class="cg-val" data-act="calcval" data-i="${i}" id="cg-val-${i}" ${+a.price > 0 ? '' : 'disabled'}>${valSummary(a, c)}</button></td>`)),
    sec(t('Gastos e ingresos')),
    ...c.rows.map((r, j) => `<tr class="${r.inc ? 'cg-inc' : ''}"><th scope="row"><div class="cg-rh"><div class="cg-rt"><textarea class="cg-rn" rows="1" data-rn="${j}" placeholder="${t('Concepto')}" aria-label="${t('Concepto')}" autocomplete="off" maxlength="60">${esc(r.n)}</textarea>
        <button type="button" class="iconbtn sm" data-act="calcrmrow" data-j="${j}" aria-label="${esc(t('Quitar {x}', { x: rowName(r) }))}">${ic('x')}</button></div>
        <span class="cg-rm">${rowType(r, j)}<select data-rf="${j}" aria-label="${t('Cada cuánto')}">${FREQ_L().map(([v, l]) => `<option value="${v}" ${r.f === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        ${rowKind(r, j)}</span></div></th>
      ${each((a, i) => inp(i, `data-ca="${i}" data-rv="${esc(r.id)}"`, a.v?.[r.id], curSym, rowName(r)))}${N < CALC_MAX.alts ? '<td class="cg-pad"></td>' : ''}</tr>`),
    c.rows.length < CALC_MAX.rows ? `<tr class="cg-addr"><th scope="row"><button type="button" class="linkbtn" data-act="calcaddrow">+ ${t('Añadir gasto o ingreso')}</button></th><td colspan="${span - 1}"></td></tr>` : '',
  ].join('');
  return `<div class="cg-wrap"><table class="cg">${head ? `<thead>${head}</thead>` : ''}<tbody>${body}</tbody><tfoot id="cg-foot">${calcFoot(c)}</tfoot></table></div>`;
}
/** The amounts in euros of each year, or (UI.calcReal) in today's euros: divided by the inflation of the years in between. */
const calcEur = (c) => { const i = (+c.infl || 0) / 100; return (v, y) => (UI.calcReal ? v / (1 + i) ** y : v); };
/** Under the table, as you type: what each one costs you in the scenario you are looking at. */
function calcFoot(c, k = compare(c)) {
  const s = k.scen[c.sel]; if (!s) return '';
  const N = c.alts.length, many = N > 1, g = calcGain(c, k, s);
  return `<tr><th scope="row"><span class="cg-l">${t('Ganancia o pérdida de patrimonio')}</span><span class="cg-s">${t('en {n} años', { n: k.H })} · ${UI.calcReal ? t('al {r} · en euros de hoy', { r: pctx(s.ret) }) : t('al {r} · en euros de cada año', { r: pctx(s.ret) })}</span></th>${g.map((v, i) => `<td class="num${many && i === s.best ? ' best' : ''}"><b class="${gainCls(v)}">${sgn0(v)}</b>${many && i === s.best ? `<span class="cm-b">${t('la mejor')}</span>` : ''}</td>`).join('')}${N < CALC_MAX.alts ? '<td class="cg-pad"></td>' : ''}</tr>`;
}
/**
 * Gain or loss of net worth of each alternative after year y (default: the end), from 0. In today's euros the final net worth
 * is divided by the inflation since now and the starting money taken off: you can gain euros and still lose buying power.
 */
function calcGain(c, k, s, y = k.H) {
  const i = (+c.infl || 0) / 100, real = !!UI.calcReal;
  return s.pn.map((p) => (real ? p[y] / (1 + i) ** y : p[y]) - k.K);
}
const gainCls = (v) => (v > 0.5 ? 'c-ok' : v < -0.5 ? 'c-spend' : '');
/** A change, with its sign: +10.054 € / −27.705 €. */
const sgn0 = (v) => (v > 0.5 ? '+' : v < -0.5 ? '−' : '') + fmt0(Math.abs(v));
/** On a phone: one alternative at a time, chosen with tabs; the same fields. */
function calcAltForm(c) {
  const i = Math.max(0, Math.min(UI.calcAlt || 0, c.alts.length - 1)), a = c.alts[i];
  const tabs = `<div class="calc-tabs" role="tablist" aria-label="${t('Alternativas')}">${c.alts.map((x, k) => `<button type="button" role="tab" aria-selected="${k === i}" data-act="calcalt" data-i="${k}" style="--tc:${CALC_C[k]}"><i class="tcc-sw"></i><span id="calc-tab-${k}">${esc(altName(x, k))}</span></button>`).join('')}${c.alts.length < CALC_MAX.alts ? `<button type="button" class="calc-tab-add" data-act="calcaddalt" aria-label="${t('Añadir alternativa')}">${ic('plus')}</button>` : ''}</div>`;
  if (!a) return tabs;
  const f = (k, label, suffix, mode = 'decimal') => `<label class="field tco-f"><span class="label">${label}</span><span class="tco-in"><input type="text" inputmode="${mode}" data-ca="${i}" data-k="${k}" value="${a[k] ? esc(n2(a[k])) : ''}" placeholder="—" autocomplete="off"><span>${suffix}</span></span></label>`;
  return `${tabs}<div class="calc-alt" style="--tc:${CALC_C[i]}">
    <div class="calc-alt-h"><i class="tcc-sw"></i><input type="text" class="calc-oname" data-ca="${i}" data-k="name" value="${esc(a.name)}" placeholder="${esc(altName({}, i))}" aria-label="${t('Nombre de la alternativa')}" autocomplete="off" maxlength="60"></div>
    <div class="calc-sub"><h3>${t('Compra')}</h3>
      <div class="fields2">${f('price', t('Precio'), curSym)}<span class="fine calc-pricehint">${t('Vacío si no compras nada (alquiler, renting, transporte…).')}</span></div>
      <div class="calc-g3">${f('loan', t('Financiado'), curSym)}${f('rate', t('Interés'), '%')}${f('term', t('Plazo'), t('meses'), 'numeric')}</div>
      <p class="fine" id="cg-pay-${i}">${payOf(a) ? t('Cuota del préstamo: {x}', { x: fmt(payOf(a)) }) : ''}</p></div>
    <div class="calc-sub"><h3>${t('Valor con los años')}</h3><button type="button" class="cg-val" data-act="calcval" data-i="${i}" id="cg-val-${i}" ${+a.price > 0 ? '' : 'disabled'}>${valSummary(a, c)}</button></div>
    <div class="calc-sub"><h3>${t('Gastos e ingresos')}</h3>
      ${c.rows.length ? c.rows.map((r) => `<label class="ca-row${r.inc ? ' cg-inc' : ''}"><span class="ca-n"><span>${esc(rowName(r))}</span><span class="fine">${r.inc ? t('ingreso') + ' · ' : ''}${esc(cfreqText(r.f))}${r.fix ? ' · ' + t('precio fijo') : r.ag ? ' · ' + t(r.ag > 0 ? 'sube un {p} al año con la edad' : 'baja un {p} al año con la edad', { p: pctx(Math.abs(r.ag)) }) : ''}</span></span><span class="tco-in"><input type="text" inputmode="decimal" data-ca="${i}" data-rv="${esc(r.id)}" value="${a.v?.[r.id] ? esc(n2(a.v[r.id])) : ''}" placeholder="—" autocomplete="off"><span>${curSym}</span></span></label>`).join('') : `<p class="fine">${t('Aún no hay gastos.')}</p>`}
      <button type="button" class="linkbtn" data-act="calcrows">${t('Añadir o cambiar gastos e ingresos')}</button></div>
    <div class="calc-opt-f">${c.alts.length < CALC_MAX.alts ? `<button type="button" class="linkbtn" data-act="calcdupalt" data-i="${i}">${t('Duplicar')}</button>` : ''}${c.alts.length > 1 ? `<button type="button" class="linkbtn c-spend" data-act="calcrmalt" data-i="${i}">${t('Quitar alternativa')}</button>` : ''}</div>
  </div>`;
}
/** A concept is a cost (it goes out) or an income (it comes in: the rent a flat brings). */
const rowType = (r, j) => `<select class="cg-rt" data-rt="${j}" aria-label="${t('Gasto o ingreso')}"><option value="out" ${r.inc ? '' : 'selected'}>${t('gasto')}</option><option value="in" ${r.inc ? 'selected' : ''}>${t('ingreso')}</option></select>`;
/** How a cost goes up over the years: with inflation, not at all (a fixed price) or with age too (maintenance, repairs). */
const ROW_KINDS = () => [['infl', t('sube con la inflación')], ['fix', t('precio fijo')], ['up', t('sube con la edad')], ['down', t('baja con la edad')]];
const rowKindOf = (r) => (r.fix ? 'fix' : r.ag > 0 ? 'up' : r.ag < 0 ? 'down' : 'infl');
/** How a cost changes over the years, and (up or down with age) by how much a year on top of inflation. */
const rowKind = (r, j) => `<span class="cg-kind" ${r.f === 'o' ? 'hidden' : ''}><select class="cg-rk" data-rk="${j}" aria-label="${t('Cómo cambia con los años')}">${ROW_KINDS().map(([v, l]) => `<option value="${v}" ${rowKindOf(r) === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    ${r.ag ? `<span class="cg-ag" title="${t('Además de la inflación, cada año de edad')}"><input type="text" inputmode="decimal" data-rag="${j}" value="${esc(n2(Math.abs(r.ag)))}" aria-label="${t('% al año')}" autocomplete="off"><span>${t('%/año')}</span></span>` : ''}</span>`;
/** The concepts, on a phone: shared by every alternative, so they are edited apart. */
function openCalcRows() {
  dlg.innerHTML = `<div class="sheet" id="cr-sheet"><div class="row between"><h2>${t('Gastos e ingresos')}</h2><button type="button" class="iconbtn" data-act="dclose" aria-label="${t('Cerrar')}">${ic('x')}</button></div>
    <p class="fine">${t('Son los mismos para todas las alternativas; el importe de cada una se pone en su pestaña.')}</p><div id="cr-body">${calcRowsBody(UI.calc)}</div>
    <button type="button" class="primary big" data-act="dclose">${t('Listo')}</button></div>`;
  openDialog();
}
function calcRowsBody(c) {
  return `${c.rows.map((r, j) => `<div class="cr-row${r.inc ? ' cg-inc' : ''}"><input type="text" data-rn="${j}" value="${esc(r.n)}" placeholder="${t('Concepto')}" aria-label="${t('Concepto')}" autocomplete="off" maxlength="60">
    ${rowType(r, j)}<select data-rf="${j}" aria-label="${t('Cada cuánto')}">${FREQ_L().map(([v, l]) => `<option value="${v}" ${r.f === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    ${rowKind(r, j)}
    <button type="button" class="iconbtn sm" data-act="calcrmrow" data-j="${j}" aria-label="${esc(t('Quitar {x}', { x: rowName(r) }))}">${ic('x')}</button></div>`).join('')}
    ${c.rows.length < CALC_MAX.rows ? `<button type="button" class="linkbtn" data-act="calcaddrow">+ ${t('Añadir gasto o ingreso')}</button>` : ''}`;
}
/** How one alternative keeps its value: its own small sheet (a mode, its figure, what selling costs, and the line). */
function openCalcVal(i) {
  const a = UI.calc.alts[i]; if (!a) return;
  UI.calcValI = i;
  dlg.innerHTML = `<div class="sheet" id="cv-sheet" style="--tc:${CALC_C[i]}"><div class="row between"><h2>${t('Valor con los años')} · ${esc(altName(a, i))}</h2><button type="button" class="iconbtn" data-act="dclose" aria-label="${t('Cerrar')}">${ic('x')}</button></div>
    <div id="cv-body">${calcValBody(UI.calc, a)}</div><button type="button" class="primary big" data-act="dclose">${t('Listo')}</button></div>`;
  openDialog();
}
const vmode = (o) => (o.vm === 'rate' ? (+o.dep > 0 ? 'up' : 'down') : o.vm || 'down');
function calcValBody(c, a) {
  const vm = vmode(a);
  const f = (k, label, suffix, v, mode = 'decimal') => `<label class="field tco-f"><span class="label">${label}</span><span class="tco-in"><input type="text" inputmode="${mode}" data-cv="${k}" value="${esc(n2(v ?? ''))}" autocomplete="off"><span>${suffix}</span></span></label>`;
  const param = {
    curve: `<label class="field"><span class="label">${t('Curva')}</span><select data-cv="vc">${Object.entries(CURVE_L()).map(([k, l]) => `<option value="${k}" ${a.vc === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      ${f('age', t('Edad al comprarlo'), t('años'), a.age || 0, 'numeric')}`,
    down: f('dep', t('Pierde cada año'), '%', Math.abs(+a.dep || 0)), up: f('dep', t('Gana cada año'), '%', Math.abs(+a.dep || 0)),
    end: f('ve', t('Lo venderás por'), curSym, a.ve), linear: f('life', t('Sin valor a los'), t('años'), a.life, 'numeric'), none: '',
  }[vm];
  const MODES = [['curve', t('Curva típica')], ['down', t('Pierde un % al año')], ['up', t('Se revaloriza')], ['end', t('Sé por cuánto lo venderé')], ['linear', t('Pierde lo mismo cada año')], ['none', t('No se revende')]];
  return `<label class="field"><span class="label">${t('Cómo cambia su valor')}</span><select data-cv="mode">${MODES.map(([k, l]) => `<option value="${k}" ${vm === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    ${vm === 'none' ? '' : vm === 'curve' ? `<div class="cv-curve">${param}</div>${f('sellc', t('Gastos al venderlo'), '%', a.sellc || 0)}` : `<div class="fields2">${param}${f('sellc', t('Gastos al venderlo'), '%', a.sellc || 0)}</div>`}
    <div id="cv-spark">${vm === 'none' ? '' : vm === 'curve' ? calcLife(a, c) : calcSpark(a, c)}</div>
    ${vm === 'curve' ? `<p class="fine">${t('Medias aproximadas de datos publicados (iSeeCars, Kelley Blue Book, Experian, Mapfre, Ganvam, BankMyCell). Cada modelo es distinto: si sabes su precio de reventa, usa «Sé por cuánto lo venderé».')}</p>` : ''}`;
}
/**
 * A curve, over the thing's whole life: what it was worth new, the stretch you own it (from its age when you buy it), and
 * what it keeps losing after. A big drop at the start and less later, so buying it a few years old skips the worst part.
 */
function calcLife(a, c) {
  const cv = CURVES[a.vc] || CURVES.carNew, A = Math.max(0, Math.round(+a.age || 0)), H = c.years, P = +a.price || 0, end = Math.max(A + H + 2, 8);
  const keepAt = (age) => curveKeep(cv, 0, age), Pnew = P / keepAt(A), val = (age) => Pnew * keepAt(age);
  const W = Math.max(260, Math.round(Math.min(560, innerWidth) - (innerWidth >= 960 ? 48 : 32))), h = 130, pl = 8, pr = 8, pt = 22, pb = 22, /* drawn at the sheet's width: letters keep their size */ X = (age) => pl + age / end * (W - pl - pr), Y = (v) => pt + (1 - v / Pnew) * (h - pt - pb);
  const pts = (from, to) => Array.from({ length: to - from + 1 }, (_, j) => `${X(from + j).toFixed(1)},${Y(val(from + j)).toFixed(1)}`).join(' ');
  const lost = P - val(A + H), pct = P ? Math.round(lost / P * 100) : 0;
  const yr = (age) => cv[Math.min(age, cv.length - 1)];
  const ticks = [...new Set([0, A, A + H, end])].map((age) => `<text class="lf-x${age === end ? ' lf-xe' : ''}" x="${X(age).toFixed(1)}" y="${h - 6}">${age === end ? esc(t('{n} años', { n: age })) : age}</text>`).join('');
  return `<div class="calc-life"><svg viewBox="0 0 ${W} ${h}" role="img" aria-label="${esc(t('Valor a lo largo de su vida'))}">
      <line class="lf-base" x1="${pl}" x2="${W - pr}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}"/>
      <polyline class="lf-all" points="${pts(0, end)}"/><polyline class="lf-own" points="${pts(A, A + H)}"/>
      <circle class="lf-dot" cx="${X(A).toFixed(1)}" cy="${Y(val(A)).toFixed(1)}" r="4"/><circle class="lf-dot" cx="${X(A + H).toFixed(1)}" cy="${Y(val(A + H)).toFixed(1)}" r="4"/>
      ${[[A, t('compra')], [A + H, t('venta')]].map(([age, l]) => { const x = X(age), anchor = x < 40 ? 'start' : x > W - 40 ? 'end' : 'middle'; return `<text class="lf-l" text-anchor="${anchor}" x="${(anchor === 'start' ? x - 4 : anchor === 'end' ? x + 4 : x).toFixed(1)}" y="${(Y(val(age)) - 9).toFixed(1)}">${esc(l)}</text>`; }).join('')}${ticks}</svg>
    <span class="fine">${A ? t('Nuevo valía unos {n}; con {a} años lo compras por {p}.', { n: `<b>${fmt0(Pnew)}</b>`, a: A, p: `<b>${fmt0(P)}</b>` }) + ' ' : ''}${t('En tus {h} años pierde {x} ({p} %): un {a} % el primer año y un {b} % el último.', { h: H, x: `<b>${fmt0(lost)}</b>`, p: pct, a: yr(A), b: yr(A + H - 1) })}</span></div>`;
}
/** How its value goes over the years: a small line from the price to what it is worth at the end. */
function calcSpark(o, c) {
  const H = c.years, P = +o.price || 0, vs = Array.from({ length: H + 1 }, (_, k) => valueAt(o, k, H));
  const hi = Math.max(P, ...vs) || 1, lo0 = Math.min(P, ...vs), lo = lo0 > hi * 0.5 ? lo0 - (hi - lo0) * 0.25 : 0, W = 300, h = 54, X = (k) => 4 + k / H * (W - 8), Y = (v) => 6 + (1 - (v - lo) / (hi - lo || 1)) * (h - 12);
  const end = vs[H], ch = P ? Math.round((end / P - 1) * 100) : 0;
  return `<div class="calc-spark"><svg viewBox="0 0 ${W} ${h}" preserveAspectRatio="none" aria-hidden="true"><line x1="4" x2="${W - 4}" y1="${Y(P).toFixed(1)}" y2="${Y(P).toFixed(1)}" class="sp-ref"/><polyline points="${vs.map((v, k) => `${X(k).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}" class="sp-line"/></svg>
    <span class="fine">${t('Al final vale {x}', { x: `<b>${fmt(end)}</b>` })} <span class="${ch > 0 ? 'c-ok' : ''}">(${ch > 0 ? '+' : ch < 0 ? '−' : ''}${Math.abs(ch)} %)</span></span></div>`;
}
/**
 * The answer, as an accountant would give it: the gain or loss of net worth each alternative brings, from 0. They all start
 * with the same money (what the dearest one needs on day one) invested; buying is a swap and paying the loan's capital is
 * saving, so neither changes it; everything paid comes out of it and stops earning; depreciation takes it down, appreciation up.
 * In today's euros (UI.calcReal) an alternative can gain euros and still lose buying power.
 */
function calcResult(c, k = compare(c)) {
  if (!c.alts.length || !k.scen.length) return '';
  const names = c.alts.map(altName), H = k.H, sel = Math.min(c.sel, k.scen.length - 1), s = k.scen[sel], many = names.length > 1;
  const infl = (+c.infl || 0) / 100, real = !!UI.calcReal, K = k.K;
  const unit = `<div class="calc-unit"><span class="label">${t('Importes en euros de')}</span><div class="seg" role="group" aria-label="${t('Importes en euros de')}"><button type="button" data-act="calcreal" data-v="0" aria-pressed="${!real}">${t('cada año')}</button><button type="button" data-act="calcreal" data-v="1" aria-pressed="${real}">${t('hoy')}</button></div>
    <span class="fine">${real ? t('Descontada la inflación ({p} al año): lo que se podría comprar hoy con ese dinero.', { p: pctx(+c.infl || 0) }) : t('Los euros de cada momento, sin descontar la inflación.')}</span></div>`;
  const gains = k.scen.map((x) => calcGain(c, k, x)), g = gains[sel];
  const matrix = `<div class="cm-wrap"><table class="cm"><thead><tr><th scope="col"><span class="sr">${t('Alternativa')}</span></th>${k.scen.map((x, j) => `<th scope="col"><button type="button" class="cm-s" data-act="calcsel" data-i="${j}" aria-pressed="${j === sel}">${t('al {r}', { r: pctx(x.ret) })}</button></th>`).join('')}</tr></thead>
    <tbody>${names.map((nm, i) => `<tr><th scope="row"><span class="cm-n"><i class="tcc-sw" style="background:${CALC_C[i]}"></i><span>${esc(nm)}</span></span></th>${k.scen.map((x, j) => { const best = many && x.best === i, v = gains[j][i];
      return `<td class="num${j === sel ? ' on' : ''}${best ? ' best' : ''}"><b class="${gainCls(v)}">${sgn0(v)}</b>${best ? `<span class="cm-b">${t('la mejor')}</span>` : ''}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
  // the verdict, in the scenario you chose, and what would change it
  const order = g.map((_, i) => i).sort((x, y) => g[y] - g[x]), b = order[0], sec = order[1];
  const gl = (v) => (v >= 0 ? t('ganas {x} de patrimonio', { x: fmt0(v) }) : t('pierdes {x} de patrimonio', { x: fmt0(-v) }));
  let verdict;
  if (!many) verdict = t('Al {r}, en {n} años {g}.', { r: pctx(s.ret), n: H, g: gl(g[b]) });
  else if (g[b] - g[sec] < 1) verdict = t('Al {r}, {a} y {b} te dejan igual.', { r: pctx(s.ret), a: names[b], b: names[sec] });
  else verdict = t('Al {r}, la mejor es {a}: en {n} años {g}. Con {b} tendrías {y} menos.', { r: pctx(s.ret), a: names[b], n: H, g: gl(g[b]), b: names[sec], y: fmt0(g[b] - g[sec]) });
  const notes = [];
  if (many) {
    const byRet = k.scen.map((x, j) => j).sort((x, y) => k.scen[x].ret - k.scen[y].ret), lo = k.scen[byRet[0]].best, hi = k.scen[byRet[byRet.length - 1]].best;
    if (lo !== hi) { const e = evenReturn(k.os[lo], k.os[hi], c); notes.push(e != null ? t('La rentabilidad decide: por debajo de un {e} gana {a}; por encima, {b}.', { e: pctx(e), a: names[lo], b: names[hi] }) : t('La mejor cambia según la rentabilidad.')); }
    else if (k.scen.length > 1) notes.push(t('{a} es la mejor en todos los escenarios.', { a: names[lo] }));
    if (lo === hi) { const e = evenReturn(k.os[b], k.os[sec], c); if (e != null) notes.push(e > s.ret ? t('Solo si tu dinero rindiera más de un {e} al año saldría mejor {b}.', { e: pctx(e), b: names[sec] }) : t('Si tu dinero rindiera menos de un {e} al año, saldría mejor {b}.', { e: pctx(e), b: names[sec] })); }
    const y = aheadFrom(s.pn[b], s.pn[sec]);
    if (y > 1) notes.push(t('{a} solo sale mejor si lo mantienes al menos {k} años: si lo dejas antes, gana {b}.', { a: names[b], k: y, b: names[sec] }));
  }
  // gains in euros, losses in buying power: the return doesn't beat inflation
  names.forEach((nm, i) => { if (s.dpn[i] > 0.5 && s.pnFin[i] / (1 + infl) ** H < K - 0.5) notes.push(t('{a} gana patrimonio en euros, pero lo pierde en euros de hoy: lo que gana no cubre la inflación.', { a: nm })); });
  const how = `<p class="fine calc-base">${t('Todas parten de {k} invertidos (lo que pide la más cara al empezar). Comprar no cambia tu patrimonio (cambias dinero por un bien), ni pagar el capital del préstamo (es ahorro). Lo bajan los gastos, los intereses, los impuestos y lo que pierde el bien; lo suben su revalorización y lo que rinde el dinero que no gastas.', { k: fmt0(K) })}</p>`;
  // the years in between: the gain or loss if you stopped (and sold) that year
  const lab = (y) => (y === 0 ? t('Al empezar') : cap(t('año {n}', { n: y })));
  const lines = s.pn.map((w) => w.map((v, y) => (real ? v / (1 + infl) ** y : v) - K)), series = lines.map((w, i) => ({ vals: w, c: CALC_C[i] }));
  const chart = withChartWidth(calcChartRoom(), () => multiLines({ series, labels: lines[0].map((_, y) => String(y)),
    tips: lines[0].map((_, y) => tipx(lab(y), names.map((_, i) => i).sort((x, z) => lines[z][y] - lines[x][y]).map((i) => ({ c: CALC_C[i], k: 'solid', l: names[i], v: sgn0(lines[i][y]) })), real ? t('ganancia o pérdida si lo dejaras entonces, en euros de hoy') : t('ganancia o pérdida si lo dejaras entonces'))),
    aria: t('Ganancia o pérdida de patrimonio de cada alternativa, año a año') }));
  const legend = `<div class="calc-leg">${names.map((nm, i) => `<span><i class="tcc-sw" style="background:${CALC_C[i]}"></i>${esc(nm)}</span>`).join('')}</div>`;
  // the accounts of each alternative, in the chosen scenario: where the gain or loss comes from
  const rs = k.base, br = (label, f) => [label, ...rs.map((r, i) => f(r, i))];
  const brk = table([t('Concepto'), ...names], [
    br(t('Lo que rinde o deja de rendir tu dinero'), (r, i) => sgn0(s.dpn[i] - (r.value - r.price) + r.running + r.once + r.interest + r.sellCost - r.income)),
    ...(rs.some((r) => r.income > 0.5) ? [br(t('Ingresos'), (r) => sgn0(r.income))] : []),
    br(t('Revalorización o depreciación'), (r) => sgn0(r.value - r.price)),
    br(t('Gastos de uso'), (r) => sgn0(-r.running)),
    br(t('Pagos únicos (impuestos, matrícula…)'), (r) => sgn0(-r.once)),
    br(t('Intereses del préstamo'), (r) => sgn0(-r.interest)),
    br(t('Gastos de venta'), (r) => sgn0(-r.sellCost)),
    br(t('Ganancia o pérdida'), (r, i) => `<b>${sgn0(s.dpn[i])}</b>`),
    br(t('En euros de hoy'), (r, i) => sgn0(s.pnFin[i] / (1 + infl) ** H - K)),
    br(t('Coste equivalente al mes'), (r, i) => fmt0(tco(k.os[i], c, s.ret).month))]).replace(t('Ver como tabla'), t('Cuentas de cada alternativa al {r}', { r: pctx(s.ret) }));
  return `${unit}<div class="calc-res-g"><section class="card calc-res"><h2>${t('Ganancia o pérdida de patrimonio en {n} años', { n: H })}</h2>${matrix}
      <p class="calc-verdict">${esc(verdict)}</p>${notes.length ? `<ul class="calc-notes">${notes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${how}${brk}</section>
    <section class="card calc-chart"><h2>${t('Año a año, al {r}', { r: pctx(s.ret) })}</h2>
      <p class="fine">${t('Lo que ganarías o perderías con cada alternativa si la dejaras ese año (vendiendo y saldando el préstamo). Todas empiezan en 0, salvo los impuestos y gastos de compra, que se pierden el primer día.')}</p>${legend}${chart}
      ${table([t('Año'), ...names], lines[0].map((_, y) => [y === 0 ? t('Al empezar') : String(y), ...lines.map((w) => sgn0(w[y]))]))}</section></div>`;
}
/** The chart's room: half the page beside the matrix on a computer, the card's width on a phone. */
function calcChartRoom() {
  const v = $('#view'); if (!v) return 0;
  const inner = chartRoom();
  return calcWide() ? (inner + 32 - 16) / 2 - 32 : inner;
}
function calcHow() {
  return `<details class="card calc-how"><summary>${t('Cómo se calcula')}</summary>
    <ol>
      <li>${t('Tu patrimonio es lo que tienes menos lo que debes. Lo que se mide es cuánto gana o pierde con cada alternativa, empezando en 0.')}</li>
      <li>${t('Comprar algo no cambia tu patrimonio: cambias dinero por un bien. Pedir un préstamo tampoco (tienes más dinero y una deuda igual), ni pagar su capital (es ahorro: baja la deuda tanto como el dinero).')}</li>
      <li>${t('Lo bajan los gastos de uso, los intereses, los impuestos y gastos de compra y venta, y lo que pierde el bien con los años. Los gastos suben cada año con la inflación, salvo los de precio fijo; los que cambian con la edad suben (mantenimiento, reparaciones: un {u} % más al año) o bajan (seguro: un {d} % menos) además de la inflación. Lo suben su revalorización y lo que rinde el dinero que no gastas.', { u: AGE_UP, d: -AGE_DOWN })}</li>
      <li>${t('Todas parten del mismo dinero, invertido a la rentabilidad del escenario: lo que pide la más cara al empezar. Cada euro que pagas sale de ahí y deja de rendir: es el coste de oportunidad. Tus ingresos no se cuentan, porque serían los mismos eligieras lo que eligieras.')}</li>
      <li>${t('En euros de hoy, cada año se divide por la inflación acumulada: un patrimonio puede crecer en euros y perder poder de compra.')}</li>
      <li>${t('Una vivienda o un coche también te dan techo o transporte, que de otro modo pagarías: por eso se comparan alternativas que cubren lo mismo (comprar o alquilar, coche o transporte público).')}</li>
    </ol>
    <p class="fine">${t('No incluye impuestos sobre la ganancia al vender ni deducciones, cambios de tipo en préstamos variables, averías imprevistas ni los altibajos de las inversiones. Tampoco lo que no es dinero: comodidad, tiempo o libertad. Es una estimación para decidir, no una oferta.')}</p></details>`;
}
/** After typing: redraw the answer and the figures beside the fields (the fields stay as they are, with the cursor in them). */
function calcChanged() {
  const c = UI.calc; if (!c) return;
  const k = compare(c);
  const box = $('#calc-res'); if (box) box.innerHTML = calcResult(c, k);
  const ft = $('#cg-foot'); if (ft) ft.innerHTML = calcFoot(c, k);
  c.alts.forEach((a, i) => {
    const v = $('#cg-val-' + i); if (v) { v.innerHTML = valSummary(a, c); v.disabled = !(+a.price > 0); }
    const p = $('#cg-pay-' + i); if (p) { const pay = payOf(a); p.textContent = p.tagName === 'TD' ? (pay ? fmt(pay) : '—') : pay ? t('Cuota del préstamo: {x}', { x: fmt(pay) }) : ''; }
    const tb = $('#calc-tab-' + i); if (tb) tb.textContent = altName(a, i);
  });
  document.querySelectorAll('.calc-ret').forEach((el) => el.classList.toggle('on', +el.dataset.ri === c.sel));
  calcTouched();
}
/** Draw the page again and put the cursor back where it was (or on `focus`, a selector). */
function calcRedraw(focus) {
  const a = document.activeElement, keys = ['data-ca', 'data-k', 'data-rv', 'data-rn', 'data-cr', 'data-cg'];
  const sel = focus || (a && a !== document.body ? keys.filter((k) => a.hasAttribute?.(k)).map((k) => `[${k}="${CSS.escape(a.getAttribute(k))}"]`).join('') : '');
  render(true);
  if (sel) { const el = $('#view').querySelector(sel); if (el) { el.focus(); if (el.select && focus) el.select(); } }
}
/** With a sheet open over it (the concepts on a phone): redraw the page behind it, without touching the sheet. */
function calcRedrawKeepDialog() { if (UI.tab === 'calc' && UI.calc) { const y = scrollY; $('#view').innerHTML = calcView(); scrollTo(0, y); } }
function calcOpen(c) {
  UI.calcDirty = false; UI.calcAlt = 0;
  UI.calc = normCalcs([JSON.parse(JSON.stringify(c))])[0]; // saved by an older version: same shape as now
  history.pushState({ tab: 'calc', depth: (history.state?.depth || 0) + 1, calc: c.id }, '', '#' + ROUTES.calc);
  render(true); window.scrollTo(0, 0);
}
const GRIP = '<svg viewBox="0 0 9 15" aria-hidden="true"><path d="M0 0h3v3H0zM6 0h3v3H6zM0 6h3v3H0zM6 6h3v3H6zM0 12h3v3H0zM6 12h3v3H6z"/></svg>';
function planRow(it, m, movable) {
  let real = '';
  // what the history says about this item: it starts later, it ends, or a change is already planned
  const ref = viewYMOf(m), nx = planNext(m.items, it.id, ref);
  const when = [
    it.from && it.from > ref ? `<span class="c-sav">${t('empieza en {m}', { m: ymLabel(it.from) })}</span>` : '',
    it.to && it.to >= ref ? `<span class="c-warn">${t('hasta {m}', { m: ymLabel(it.to) })}</span>` : '',
    nx && nx !== it ? `<span class="c-sav">${t('desde {m}: {x}', { m: ymLabel(nx.from), x: fmt(nx.amount) })}</span>` : '',
  ].join('');
  if (it.real != null) {
    real = `<span>${t('últimos 12 meses')}: ${fmt(it.real)}${unit(it)}</span>`;
    if (it.kind === 'out' && it.real - it.amount > it.real * 0.05) real += `<span class="c-warn">${t('planificas {x} menos', { x: fmt(it.real - it.amount) })}</span>`;
  }
  return `<div class="pitem" data-id="${esc(it.id)}">${movable ? `<button type="button" class="grip" aria-label="Mover ${esc(it.name)} (flechas arriba y abajo)" title="${t('Arrastra para ordenar')}">${GRIP}</button>` : ''}<button class="prow" data-act="edit" data-id="${esc(it.id)}">
    <span class="n">${it.kind === 'out' && CAT[itemCat(it)] ? catEl(itemCat(it), 'sm') : ''}${esc(it.name)}</span><span class="a ${it.kind === 'in' ? 'c-in' : ''}">${it.vary ? '≈ ' : ''}${it.kind === 'in' ? '+' : ''}${fmt(it.amount)}<small>${unit(it)}</small></span>
    <span class="sub"><span>${it.budget ? (it.freq === 'monthly' ? t('al mes') : t('al año')) : esc(freqText(it))}</span>${m.isSave(it) ? '<span class="c-sav">' + t('ahorro · no es gasto') + '</span>' : ''}${when}${real}</span>
  </button></div>`;
}
/** A Plan list was reordered: put its items in that order, in the slots they already held among all items. */
function reorder(ids) {
  store.update('items', (d) => {
    const want = new Set(ids), groups = new Map();
    d.items.forEach((it) => { if (want.has(it.id)) groups.set(it.id, [...(groups.get(it.id) || []), it]); });
    const slots = d.items.map((it, i) => (want.has(it.id) ? i : -1)).filter((i) => i >= 0);
    ids.flatMap((id) => groups.get(id) || []).forEach((it, k) => { d.items[slots[k]] = it; });
  }, true); // the rows are already where you dropped them: no redraw
}

/** The change log as readable lines, newest first: what changed, from which month. */
function planHistory() {
  const log = [...(store.data.log || [])].sort((a, b) => b.at.localeCompare(a.at));
  if (!log.length) return '';
  const LAB = { name: t('Nombre'), amount: t('Importe'), day: t('Día'), freq: t('Cuándo'), month: t('Mes'), year: t('Año'), vary: t('varía'), cat: t('Tipo'), note: t('Nota') };
  const val = (k, v) => (k === 'amount' ? fmt(v) : k === 'freq' ? FREQ[v] || v : k === 'month' ? MES[v - 1] || v : k === 'cat' ? catName(v) : v === true ? t('sí') : v);
  const line = (e) => {
    const span = e.from ? ` · ${t('desde {m}', { m: ymLabel(e.from) })}${e.to ? ' ' + t('hasta {m}', { m: ymLabel(e.to) }) : ''}` : '';
    if (e.action === 'add') return `${t('Añadido')}${span}: ${fmt(e.after.amount || 0)}`;
    if (e.action === 'delete') return `${t('Terminado')}${span}`;
    const ch = Object.keys({ ...e.before, ...e.after }).filter((k) => LAB[k] && e.before[k] !== e.after[k]);
    return `${t('Cambio')}${span}: ${ch.map((k) => `${LAB[k]} ${e.before[k] != null ? val(k, e.before[k]) : '—'} → ${e.after[k] != null ? val(k, e.after[k]) : '—'}`).join(' · ') || t('sin cambios')}`;
  };
  return `<section class="card"><details class="tview"><summary>${t('Historial del plan')} (${log.length})</summary>
    <div class="hist">${log.map((e) => `<div class="hrow"><span class="fine num">${esc(new Date(e.at).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }))}</span><span><b>${esc(e.name)}</b><br><span class="fine">${esc(line(e))}</span></span></div>`).join('')}</div></details></section>`;
}

// ---------- Ajustes ----------
function settings() {
  const mode = store.mode;
  const theme = lsGet('hucha:theme') || 'auto';
  const sm = compute(store.data), smo = sm.mon(sm.curYM);
  // the balance this month started from, while it was typed by hand: here to change it
  const startCard = smo.open != null ? `<section class="card"><h2>${t('Saldo de inicio')}</h2>
    <button type="button" class="goalbtn" data-act="startedit"><span class="gb-v num">${fmt(smo.open)}</span>
      <span class="fine">${smo.openDate ? t('Saldo del {d}', { d: shortDate(smo.openDate) }) : t('Saldo al empezar el mes')}</span><span class="gb-edit" aria-hidden="true">${t('Cambiar')}</span></button></section>` : '';
  const st = store.data.settings.start, cd = compute(store.data).cycleDay;
  const calendar = `<section class="card"><h2>${t('Calendario')}</h2>
    <label class="field inline-field"><span class="label">${t('El año empieza en')}</span><span class="startsel"><select id="p-start-m" aria-label="${t('Mes')}">${MES.map((n, i) => `<option value="${String(i + 1).padStart(2, '0')}" ${+st.slice(5) === i + 1 ? 'selected' : ''}>${cap(n)}</option>`).join('')}</select>
      <select id="p-start-y" aria-label="${t('Año')}">${Array.from({ length: 9 }, (_, k) => +st.slice(0, 4) - 4 + k).map((y) => `<option value="${y}" ${y === +st.slice(0, 4) ? 'selected' : ''}>${y}</option>`).join('')}</select></span></label>
    <label class="field inline-field"><span class="label">${t('Tu mes empieza el día')}</span><input type="text" inputmode="numeric" id="p-cycle" value="${cd}" style="max-width: 80px"></label>
  </section>`;
  return `${startCard}${calendar}${remindersCard()}<section class="card"><h2>${t('Dónde se guarda')}</h2>
    <p class="savestate ok" id="savestate" aria-live="polite"></p>
    ${mode === 'google' ? `<p>${t('En la hoja')} <b>${t('MoneyTracker')}</b> ${t('de tu Google Drive')}${savedHint() ? ` (${esc(savedHint())})` : ''}. ${t('Este dispositivo guarda una copia para abrir rápido y funcionar sin conexión.')}</p>
      <div class="row wrap-row"><a class="btn" href="${sheetUrl(store.sheetId)}" target="_blank" rel="noopener">${t('Abrir la hoja')}</a>
      ${tokenValid() ? '<button data-act="refresh">' + t('Recargar desde la hoja') + '</button>' : '<button class="primary" data-act="reauth">' + t('Volver a conectar') + '</button>'}
      <button class="ghost" data-act="signout">${t('Desconectar')}</button></div>`
      : mode === 'local' ? `<p>${t('Solo en este dispositivo. Si borras los datos del navegador, se pierden.')}</p>
      ${isConfigured() ? '<button class="primary" data-act="connect">' + t('Conectar con Google Drive') + '</button><p class="fine">' + t('Se creará la hoja «MoneyTracker» con lo que tienes aquí.') + '</p>' : '<p class="fine">' + t('Para guardar en Google Drive, configura') + ' <code>config.js</code> ' + t('(mira el README).') + '</p>'}`
        : '<p>' + t('Estás viendo la demo. Nada de lo que cambies se guarda.') + '</p><button class="primary" data-act="leave">' + t('Salir de la demo') + '</button>'}
  </section>
  ${mode ? `<section class="card"><h2>${t('Tus tipos de gasto')}</h2>
    <div class="grid typegrid">${(store.data.settings.cats || []).map((c) => `<button type="button" class="catchip g-tuyos" data-act="catedit" data-id="${esc(c.id)}">${catEl(c.id)}<span>${esc(c.name)}</span></button>`).join('')}
      <button type="button" class="catchip new" data-act="catnew" data-from="manage">${PLUS}<span>${t('Nuevo tipo')}</span></button></div>
  </section>` : ''}
  ${planHistory()}
  <section class="card"><h2>${t('Tu plan en un archivo')}</h2>
    <p class="fine">${t('Guarda una copia o pásala a otro dispositivo. Importar sustituye todo lo que hay ahora.')}</p>
    <div class="row wrap-row"><button data-act="export">${t('Exportar (.json)')}</button>
    <label class="filebtn">${t('Importar (.json)')}<input type="file" accept="application/json,.json" id="import-file" hidden></label></div>
  </section>
  <section class="card"><h2>${t('Idioma')}</h2>
    <div class="seg" role="group" aria-label="${t('Idioma')}">${Object.entries(LANGS).map(([k, l]) => `<button data-act="lang" data-v="${k}" aria-pressed="${lang === k}" lang="${k}">${l}</button>`).join('')}</div>
  </section>
  <section class="card"><h2>${t('Moneda')}</h2>
    <select id="p-cur" aria-label="${t('Moneda')}">${CURRENCIES.map((c) => `<option value="${c}" ${c === cur ? 'selected' : ''}>${c} · ${new Intl.NumberFormat(locale, { style: 'currency', currency: c, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find((p) => p.type === 'currency')?.value} · ${esc(curName(c))}</option>`).join('')}</select>
  </section>
  <section class="card"><h2>${t('Tema')}</h2>
    <div class="seg" role="group" aria-label="${t('Tema')}">${[['auto', t('Automático')], ['light', t('Claro')], ['dark', t('Oscuro')]].map(([k, l]) => `<button data-act="theme" data-v="${k}" aria-pressed="${theme === k}">${l}</button>`).join('')}</div>
  </section>
  ${mode !== 'demo' ? `<section class="card"><h2>${t('Borrar de este dispositivo')}</h2>
    <p class="fine">${mode === 'google' ? t('Quita la copia local y cierra la sesión. Tu hoja sigue en Drive.') : t('Borra tu plan de este dispositivo. No se puede deshacer: exporta antes si lo quieres guardar.')}</p>
    <button class="danger" data-act="wipe">${UI.wipe ? t('Pulsa otra vez para confirmar') : t('Borrar datos de este dispositivo')}</button></section>` : ''}
  <p class="fine center"><a href="privacy.html">${t('Privacidad')}</a> ${t('· MoneyTracker')} · ${t('Versión')} ${esc(VERSION)}</p>
  <p class="center"><button type="button" class="ghost small" data-act="refreshapp">${t('Actualizar la app')}</button></p>`;
}

// ---------- item form (dialog) ----------
let FORM = null, CONFIRM = false;
function openItem(it, preset = {}) {
  const cm = compute(store.data).curYM;
  FORM = it ? { ...it, _edit: true, _from: it.from && it.from > cm ? it.from : cm, _to: it.to && it.to >= cm ? it.to : '' } : { kind: 'out', freq: 'monthly', amount: '', ...preset, _from: cm, _to: '' };
  if (FORM.kind === 'out' && !FORM.cat && FORM.name) FORM.cat = guessCat(FORM.name);
  CONFIRM = false;
  renderForm();
  openDialog();
}
const SEC_FREQ = {
  in: FREQ,
  out: { monthly: t('Cada mes'), quarterly: t('Cada 3 meses'), yearly: t('Una vez al año'), once: t('Una sola vez') },
  bud: { yearly: t('Al año'), monthly: t('Al mes') },
};
const secOf = (f) => f._sec || (f.kind === 'in' ? 'in' : f.budget ? 'bud' : 'out');
/** From which month a change applies (and until which): by default, this month on; what came before is not touched. */
function applyBlock(f) {
  const m = compute(store.data);
  const months = []; for (let k = -3; k <= 36; k++) { const ym = ymAdd(m.curYM, k); if (k < 0 && m.mon(ym).close) continue; months.push(ym); }
  const from = f._from || m.curYM, to = f._to || '';
  if (!months.includes(from)) months.unshift(from);
  const opt = (ym, sel) => `<option value="${ym}" ${ym === sel ? 'selected' : ''}>${cap(ymLabel(ym))}</option>`;
  const sum = `${from === m.curYM ? t('Desde este mes') : t('Desde {m}', { m: ymLabel(from) })}${to ? ' · ' + t('hasta {m}', { m: ymLabel(to) }) : ' · ' + t('en adelante')}`;
  return `<details class="applyto" ${f._applyOpen ? 'open' : ''}><summary><span>${t('Aplicar')}:</span> <b>${sum}</b></summary>
    <div class="fields2"><label class="field"><span class="label">${t('Desde')}</span><select id="f-from">${months.map((ym) => opt(ym, from)).join('')}</select></label>
    <label class="field"><span class="label">${t('Hasta')}</span><select id="f-to"><option value="">${t('Siempre')}</option>${months.filter((ym) => ym >= from).map((ym) => opt(ym, to)).join('')}</select></label></div>
    <p class="fine">${f._edit ? t('Lo anterior no cambia: queda como estaba, con su historial.') : t('Antes de ese mes no cuenta.')}</p></details>`;
}
function renderForm() {
  const f = FORM, sec = secOf(f);
  f.kind = sec === 'in' ? 'in' : 'out';
  if (sec === 'bud') { f.budget = true; if (f.freq !== 'monthly') f.freq = 'yearly'; } else delete f.budget;
  const freqs = { ...SEC_FREQ[sec], ...(sec === 'out' && f.freq === 'once' ? { once: t('Una sola vez') } : {}) };
  if (!freqs[f.freq]) f.freq = Object.keys(freqs)[0];
  const bud = sec === 'bud';
  const monthSel = (allowNone) => `<select id="f-month">${allowNone ? `<option value="0" ${!f.month ? 'selected' : ''}>Sin fecha fija</option>` : ''}${MES.map((n, i) => `<option value="${i + 1}" ${+f.month === i + 1 ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
  dlg.innerHTML = `<form method="dialog" class="sheet" id="item-form">
    <div class="row between"><h2>${f._edit ? (sec === 'in' ? t('Editar ingreso') : bud ? t('Editar presupuesto') : t('Editar gasto')) : (sec === 'in' ? t('Nuevo ingreso') : bud ? t('Nuevo presupuesto') : t('Nuevo gasto'))}</h2><button type="button" class="iconbtn" data-act="fclose" aria-label="${t('Cerrar')}">${ic('x')}</button></div>
    ${f._copy ? `<p class="fine">${t('Copia de «{n}». Cambia lo que haga falta y pulsa Añadir.', { n: esc(f._copy) })}</p>` : ''}
    <div class="fields2">
      <label class="field"><span class="label">${t('Nombre')}</span><input id="f-name" value="${esc(f.name)}" placeholder="${sec === 'in' ? t('Nómina') : bud ? t('Viajes') : t('Alquiler')}" autocomplete="off"></label>
      <label class="field"><span class="label">${t('Importe')} ${curSym}</span><input type="text" inputmode="decimal" id="f-amount" value="${esc(f.amount)}" placeholder="0" autocomplete="off"></label>
    </div>
    ${bud ? `<div class="seg" role="group" aria-label="${t('Periodo')}">${Object.entries(freqs).map(([k, v]) => `<button type="button" data-act="ffreq" data-v="${k}" aria-pressed="${f.freq === k}">${v}</button>`).join('')}</div>`
      : `<label class="field"><span class="label">${t('Cuándo')}</span><select id="f-freq">${Object.entries(freqs).map(([k, v]) => `<option value="${k}" ${f.freq === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`}
    ${f.kind === 'out' ? `<div class="field"><span class="label">${t('Tipo')}${bud ? '' : ` (${t('opcional')})`}</span>
      <button type="button" class="catpick ${CAT[f.cat] ? 'g-' + CAT[f.cat].group : ''}" data-act="fcatopen" aria-expanded="${!!f._pick}">${catEl(f.cat, 'sm')}${esc(catName(f.cat))}<span class="chev">${f._pick ? '▴' : '▾'}</span></button></div>
      ${f._pick ? catGrid(f.cat, 'fcat', !bud) : ''}` : ''}
    ${bud ? '' : f.freq === 'monthly' ? `<label class="field"><span class="label">${t('Día del mes (opcional)')}</span><input type="text" inputmode="numeric" id="f-day" value="${f.day ? esc(f.day) : ''}" placeholder="—"></label>`
      : `<div class="fields3">
        <label class="field"><span class="label">${f.freq === 'quarterly' ? t('Primer mes') : t('Mes')}</span>${monthSel(false)}</label>
        <label class="field"><span class="label">${t('Día')}</span><input type="text" inputmode="numeric" id="f-day" value="${f.day ? esc(f.day) : ''}" placeholder="—"></label>
        ${f.freq === 'once' ? `<label class="field"><span class="label">${t('Año')}</span><input type="text" inputmode="numeric" id="f-year" value="${esc(f.year || new Date().getFullYear())}"></label>` : ''}
      </div>`}
    ${bud ? '' : `<label class="check-row"><input type="checkbox" id="f-vary" ${f.vary ? 'checked' : ''}><span>${t('El importe varía')}<br><span class="fine">${t('Te pediré el importe exacto cada vez. Si no, cuenta el importe planificado y solo lo corriges si cambia.')}</span></span></label>`}
    <label class="field"><span class="label">${t('Nota')}</span><input id="f-note" value="${esc(f.note)}" placeholder="${t('Opcional')}" autocomplete="off"></label>
    ${applyBlock(f)}
    <div class="formbtns">
      <button type="button" class="primary" data-act="fsave">${f._edit ? t('Guardar') : t('Añadir')}</button>
      ${f._edit ? `<button type="button" data-act="fdup">${t('Duplicar')}</button>` : ''}
      ${f._edit ? `<button type="button" class="danger" data-act="fdel">${t('Terminar')}</button>` : ''}
    </div>
  </form>`;
}
function readForm() {
  const g = (id) => dlg.querySelector('#' + id), f = FORM;
  if (g('f-name')) f.name = g('f-name').value;
  if (g('f-amount')) f.amount = g('f-amount').value;
  if (g('f-freq')) f.freq = g('f-freq').value;
  if (g('f-month')) f.month = +g('f-month').value;
  if (g('f-year')) f.year = g('f-year').value;
  f.day = g('f-day') ? g('f-day').value : f.day;
  if (g('f-vary')) f.vary = g('f-vary').checked;
  if (g('f-note')) f.note = g('f-note').value;
  if (g('f-from')) { f._from = g('f-from').value; f._to = g('f-to').value; if (f._to && f._to < f._from) f._to = ''; f._applyOpen = g('f-from').closest('details').open; }
}
function saveForm() {
  readForm();
  const f = FORM;
  if (!String(f.name || '').trim()) return invalid('#f-name', t('Ponle un nombre'));
  const amount = num(f.amount);
  if (amount == null || amount < 0) return invalid('#f-amount', t('Escribe un importe'));
  if (f.freq === 'once' && !(+f.year > 2000)) return invalid('#f-year', t('Escribe el año'));
  if (f.kind === 'out' && !f.cat && !f._nocat) f.cat = guessCat(f.name);
  if (f.budget && f.kind === 'out') {
    const c = f.cat || 'otros', other = store.data.items.find((i) => i.budget && i.cat === c && i.id !== f.id && activeIn(i, f._from || compute(store.data).curYM));
    if (other) return toast(t('Ya tienes un presupuesto de {c}: «{n}»', { c: catName(c), n: other.name }), 3500);
  }
  const m = compute(store.data), F = f._from || m.curYM, T = f._to || '';
  const old = f._edit ? (m.itemAt(f.id, F) || m.segmentsOf(f.id)[0]) : null;
  const it = normItem({ ...f, amount, id: f.id || uid(f.kind) });
  store.update(['items', 'log'], (d) => {
    d.items = f._edit ? planEdit(d.items, it.id, it, F, T) : planAdd(d.items, it, F);
    d.log = [...(d.log || []), logEntry(f._edit ? 'edit' : 'add', it, old, F, T)];
  });
  dlg.close();
  toast(old ? t('Guardado') : t('Añadido'));
}
const PLAN_FIELDS = ['name', 'amount', 'freq', 'month', 'year', 'day', 'vary', 'cat', 'note', 'budget'];
const planFields = (it) => (it ? Object.fromEntries(PLAN_FIELDS.filter((k) => it[k] != null && it[k] !== false && it[k] !== '').map((k) => [k, it[k]])) : {});
/** One line of the change log: what it was, what it became, from which month. */
const logEntry = (action, it, before, F, T) => ({ at: new Date().toISOString(), id: it.id, name: it.name, action, from: F || '', to: T || '', before: planFields(before), after: action === 'delete' ? {} : planFields(it) });


// ---------- one occurrence: the exact amount for a month ----------
function openOcc(id, ym) {
  const m = compute(store.data), it = m.itemAt(id, ym) || m.segmentsOf(id)[0];
  if (!it) return;
  const r = m.realOf(it, ym);
  const day = it.day ? t(' · día ') + Math.min(it.day, daysInMonth(ym)) : '';
  dlg.innerHTML = `<div class="sheet" id="occ-form">
    <div class="row between"><h2>${esc(it.name)}</h2><button type="button" class="iconbtn" data-act="dclose" aria-label="${t('Cerrar')}">${ic('x')}</button></div>
    <p class="fine num">${cap(ymLabel(ym))}${day} · ${t('planificado')} ${fmt(it.amount)}</p>
    <div class="fields2"><label class="field"><span class="label">${t('Importe de este mes')} ${curSym}</span>
      <input type="text" inputmode="decimal" id="o-real" value="${esc(r ?? it.amount)}" autocomplete="off"></label>
      <label class="field"><span class="label">${t('Fecha')}</span><input type="date" id="o-date" value="${m.dateOf(it, ym)}" min="${m.range(ym).from}" max="${m.range(ym).to}"></label></div>
    <p class="fine">${it.vary ? t('Este importe varía: hasta que lo confirmes, cuenta el importe planificado.') : t('Si no lo tocas, cuenta el importe planificado.')} ${t('Pon 0 si este mes no ha habido.')}</p>
    <div class="formbtns">
      <button type="button" class="primary" data-act="oconfirm" data-id="${esc(id)}" data-ym="${ym}">Confirmar</button>
      ${r != null ? `<button type="button" data-act="oclear" data-id="${esc(id)}" data-ym="${ym}">${t('Desconfirmar')}</button>` : ''}
      <button type="button" class="ghost" data-act="edit" data-id="${esc(id)}">${t('Editar en el plan')}</button>
    </div></div>`;
  openDialog();
}
/** The day before an ISO date. */
const dayBefore = (iso) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - 1); return toISO(d); };
/** The date the plan puts an item on in a month (ignoring a date you moved it to). */
const plannedDate = (it, ym) => compute({ ...store.data, months: { ...store.data.months, [ym]: { ...(store.data.months[ym] || {}), dates: undefined } } }).dateOf(it, ym);
function setReal(id, ym, v, date) {
  const it = store.data.items.find((i) => i.id === id);
  const key = 'real';
  store.update('months', (d) => {
    const mo = d.months[ym] = { ...(d.months[ym] || {}) };
    const o = { ...(mo[key] || {}) };
    if (v == null) delete o[id]; else o[id] = v;
    if (Object.keys(o).length) mo[key] = o; else delete mo[key];
    // the day it really happened, when it isn't the planned one (cleared with the amount)
    const dt = { ...(mo.dates || {}) };
    if (v == null || !date) delete dt[id]; else dt[id] = date;
    if (Object.keys(dt).length) mo.dates = dt; else delete mo.dates;
  });
}

// ---------- the balance: the figure everything else comes from ----------
/** compute() as if the month had these figures (for previews while you type). */
const withMonth = (ym, patch) => mFor(ym, { ...store.data, months: { ...store.data.months, [ym]: { ...(store.data.months[ym] || {}), ...patch } } });
// the month's start balance: asked when there is none, and editable while it was typed by hand (the balance just before payday)
const openField = (m, ym, id) => m.balStart(ym) != null && m.mon(ym).open == null ? '' : `<div class="fields2"><label class="field"><span class="label">${t('Saldo de tu cuenta')} · ${t('inicio')}</span>
  <input type="text" inputmode="decimal" id="${id}" value="${esc(m.mon(ym).open ?? '')}" placeholder="${t('Solo esta vez')}" autocomplete="off"></label>
  <label class="field"><span class="label">${t('Al empezar el día')}</span><input type="date" id="${id}-date" value="${esc(m.mon(ym).openDate || m.range(ym).from)}" min="${dayBefore(m.range(ym).from)}" max="${toISO(new Date())}"></label></div>`;
/** One line of the money summary: label, signed amount. */
const sumLine = (l, v, cls = '') => `<span>${l}</span><span class="num ${cls}">${v > 0 ? '+' : v < 0 ? '−' : ''}${fmt(Math.abs(v))}</span>`;

/** The month close: one question (your balance) and what to do with what's left. */
function openClose(ym) {
  const m = mFor(ym), d = m.mon(ym);
  dlg.innerHTML = `<div class="sheet closer" id="close-sheet" data-ym="${ym}">
    <div class="row between"><span class="label">${t('Cierre de mes')} ${info('cierre')}</span><button type="button" class="iconbtn" data-act="dclose" aria-label="${t('Cerrar')}">${ic('x')}</button></div>
    <div data-step class="cl-title row between"><h1>${cap(monthName(ym))}</h1><span id="cl-vd"></span></div>
    <div data-step class="stack-sm">
      <label class="field"><span class="label">${t('Saldo de tu cuenta el {d}', { d: shortDate(m.range(ym).to) })}</span>
        <input type="text" inputmode="decimal" id="cl-bal" class="bigin" value="${esc(d.bal ?? '')}" placeholder="${curSym}" autocomplete="off">
</label>
    </div>
    ${(() => {
      // what the plan expected this month and you haven't confirmed: it closes as done, with its amount, unless you say it didn't happen
      const pend = m.pendingIn(ym);
      if (!pend.length) return '';
      return `<div data-step class="stack-sm clpend"><span class="label">${t('Sin confirmar')}</span><p class="fine">${t('Se cierran como hechos, con su importe. Desmarca lo que no ocurrió o corrige el importe.')}</p>
        ${pend.map((p) => `<div class="clp"><label class="clp-l"><input type="checkbox" class="clp-on" data-id="${esc(p.it.id)}" checked><span><b>${esc(p.it.name)}</b><span class="fine">${shortDate(p.date)} · ${p.it.kind === 'in' ? t('ingreso') : t('gasto')}</span></span></label><label class="clp-a"><input type="text" inputmode="decimal" class="clp-amt" data-id="${esc(p.it.id)}" value="${esc(String(p.amount).replace('.', ','))}" aria-label="${esc(t('Importe de {n}', { n: p.it.name }))}"><span>${curSym}</span></label></div>`).join('')}</div>`;
    })()}
    ${toISO(new Date()) > m.range(ym).to ? `<p class="fine">${t('Cierra con el saldo que tenías ese último día, no con el de hoy: míralo en los movimientos de tu banco. Si ya ha entrado algo del mes siguiente, no lo cuentes.')}</p>` : ''}
    <div id="cl-calc" aria-live="polite"></div>
  </div>`;
  openDialog();
  dlg.classList.add('full');
  stagger(dlg.querySelector('.closer'));
  closeCalc();
}
function closePatch() {
  const bal = num(dlg.querySelector('#cl-bal')?.value), op = dlg.querySelector('#cl-open');
  const patch = { bal: bal ?? undefined };
  if (op) { patch.open = num(op.value) ?? undefined; const d = dlg.querySelector('#cl-open-date')?.value; if (patch.open != null && d) patch.openDate = d; }
  const rows = [...dlg.querySelectorAll('.clp-on')];
  if (rows.length) {
    const ym = dlg.querySelector('#close-sheet')?.dataset.ym, real = { ...(store.data.months[ym]?.real || {}) };
    for (const c of rows) { const amt = num(dlg.querySelector(`.clp-amt[data-id="${CSS.escape(c.dataset.id)}"]`)?.value); real[c.dataset.id] = c.checked ? (amt ?? 0) : 0; }
    patch.real = real;
  }
  return { bal, patch };
}
function closeCalc() {
  const box = dlg.querySelector('#cl-calc'), ym = dlg.querySelector('#close-sheet')?.dataset.ym;
  if (!box || !ym) return;
  const { bal, patch } = closePatch(), m = withMonth(ym, patch), r = bal == null ? null : m.fromBalance(ym, bal);
  const vdBox = dlg.querySelector('#cl-vd');
  if (!r) { box.innerHTML = bal == null ? '' : '<p class="fine">' + t('Falta el saldo al empezar el mes.') + '</p>'; if (vdBox) vdBox.innerHTML = ''; return; }
  const tgt = m.targetOf(ym), savedM = round2(r.saved + r.left), spentAll = round2(r.out + r.cash), vd = verdict(savedM, tgt, m.target);
  const sc = savedScale(withMonth(ym, { ...patch, close: { amount: r.left } }), ym);
  if (vdBox) vdBox.innerHTML = `<span class="pill ${vd.cls}">${vd.word}</span>`;
  box.innerHTML = `
    <div class="tiles cl-tiles">
      <div class="tile"><span class="label">${t('Ingresado')}</span><span class="v num">${fmt(r.inc)}</span></div>
      <div class="tile"><span class="label">${t('Gastado')}</span>${ofPlan(spentAll, planSpend(m, ym), t('gastado / planificado'), { tone: spentAll > planSpend(m, ym) + 0.5 ? 'var(--spend)' : null })}</div>
      <div class="tile svtile" style="${sc.style}"><span class="label">${t('Ahorrado')}</span>${ofPlan(savedM, tgt, t('ahorrado / planificado'), { signed: true })}</div>
    </div>
    ${(() => {
      const after = m.openAfter(ym), logged = m.allSpends.filter((e) => m.monthOf(e.date) === ym && e.cat !== SAVE_CAT && !(after && e.date <= after)).reduce((s, e) => s + e.amount, 0), x = round2(logged - r.cash);
      if (x < 1) return '';
      const pend = dlg.querySelectorAll('.clp-on').length;
      return `<p class="note c-warn">${t('Tu saldo es {x} más alto de lo que explica lo apuntado.', { x: fmt(x) })} ${pend ? t('¿Alguno de los de arriba no ocurrió o costó menos? Desmárcalo o corrige su importe.') : t('Puede ser un ingreso que no apuntaste.')}</p>`;
    })()}
    <p class="cl-line">${r.save > 0.5 ? t('Pasaste {x} al ahorro.', { x: `<b>${fmt(r.save)}</b>` }) + ' ' : ''}${savedM >= -0.5 ? t('Aportas {x} a tu ahorro.', { x: `<b class="c-ok">${fmt(savedM)}</b>` }) : t('Consumes {x} de tu ahorro.', { x: `<b class="c-spend">${fmt(-savedM)}</b>` })}</p>
    ${inSheet(() => moneyChart(m, ym, bal))}
    <button class="primary" data-act="closeset" data-ym="${ym}">${t('Cerrar {m}', { m: monthName(ym) })}</button>`;
}
/** The month's money as a line: 0 on day 1, up when the pay comes in, down as it goes. */
/** Charts inside a dialog are drawn for the dialog's width, not the page's. */
const inSheet = (fn) => withChartWidth(Math.min(560, innerWidth) - (innerWidth >= 960 ? 48 : 32) - 32, fn);
function moneyChart(m, ym, bal) {
  const live = bal == null, cv = live ? m.curveNow(ym) : m.curveOf(ym, bal);
  if (!cv) return '';
  const first = cv.pts[0].day, dim = cv.pts[cv.pts.length - 1].day, name = monthName(ym), last = cv.pts.length - 1;
  const projFrom = live && cv.fromDay <= dim ? cv.fromDay - first : null;
  const evText = (e) => `${e.label} ${fmtSigned(e.amount)}`;
  const pts = cv.pts.map((p) => {
    const proj = live && p.day >= cv.fromDay;
    return { y: p.y, tip: p.day
      ? tipx(`${t('Día')} ${p.day}`, [{ c: 'var(--s1)', k: proj ? 'hatch' : 'solid', l: proj ? t('Proyectado') : t('Acumulado del mes'), v: `${proj ? '≈ ' : ''}${fmtSigned(p.y)}` }])
      : tipx(t('Empieza el mes'), [{ c: 'var(--s1)', k: 'solid', l: t('Acumulado del mes'), v: fmt(0) }]) };
  });
  const inDay = cv.pts.reduce((b, p, ix) => { const v = p.events.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0); return v > b.v ? { i: ix, v } : b; }, { i: -1, v: 0 });
  const marks = [...(inDay.i > 0 && inDay.i !== last ? [{ i: inDay.i, text: `+${fmt(inDay.v)}` }] : []), { i: last, text: (projFrom != null ? '≈ ' : '') + fmtSigned(cv.pts[last].y) }];
  const rows = cv.pts.filter((p) => (p.events.length && !(live && p.day >= cv.fromDay)) || p.day === dim).map((p) => [String(p.day), esc(p.events.map(evText).join(', ') || '—'), (live && p.day >= cv.fromDay ? '≈ ' : '') + fmtSigned(p.y)]);
  return `<div class="cl-block">
    <div><span class="label">${t('Tu dinero en {m}', { m: name })} ${info('curvaMes')}</span>${live ? `<div class="fine">${t('estimado según tu último saldo')}</div>` : ''}</div>
    ${line({ pts, marks, projFrom, xTicks: [1, 10, 20, dim].filter((d) => d >= first).map((d) => ({ i: d - first, text: d })), aria: t('Tu dinero a lo largo de {m}: empieza en 0 y termina en {x}', { m: name, x: fmtSigned(cv.pts[last].y) }) })}
    ${table([t('Día'), t('Movimientos'), t('Acumulado')], rows)}
  </div>`;
}

/** A look at the balance mid-month: how you're doing without logging every spend. */
// the yearly saving, written either per year or per month (the plan keeps it per year)
function openGoal() {
  const g = store.data.settings.goal || 0;
  UI.goalPer = UI.goalPer === 'm' ? 'm' : 'y';
  dlg.innerHTML = `<div class="sheet" id="goal-sheet">
    <div class="row between"><h2>${t('Objetivo de ahorro')}</h2><button type="button" class="iconbtn" data-act="dclose" aria-label="${t('Cerrar')}">${ic('x')}</button></div>
    <div class="seg" role="group" aria-label="${t('Escribirlo')}"><button data-act="goalper" data-v="y" aria-pressed="${UI.goalPer === 'y'}">${t('Al año')}</button><button data-act="goalper" data-v="m" aria-pressed="${UI.goalPer === 'm'}">${t('Al mes')}</button></div>
    <label class="field"><span class="label" id="g-lab">${UI.goalPer === 'y' ? t('Al año') : t('Al mes, de media')}</span>
      <input type="text" inputmode="decimal" id="g-val" class="bigin" value="${esc(UI.goalPer === 'y' ? g : round2(g / 12))}" autocomplete="off"></label>
    <div id="g-calc" aria-live="polite"></div>
    <div class="formbtns"><button class="primary" data-act="goalset">${t('Guardar')}</button></div>
  </div>`;
  openDialog();
  goalCalc();
  setTimeout(() => dlg.querySelector('#g-val')?.select(), 80);
}
function goalYear() {
  const v = num(dlg.querySelector('#g-val')?.value);
  return v == null || v < 0 ? null : round2(UI.goalPer === 'm' ? v * 12 : v);
}
function goalCalc() {
  const box = dlg.querySelector('#g-calc'); if (!box) return;
  const g = goalYear(), m = compute(store.data);
  if (g == null) { box.innerHTML = ''; return; }
  const max = Math.max(0, Math.floor(m.possible / 100) * 100);
  box.innerHTML = `<div class="sum">
      <span>${t('Al año')}</span><b class="num">${fmt(g)}</b>
      <span>${t('Al mes, de media')}</span><span class="num">${fmt(round2(g / 12))}</span>
      ${m.incomeY ? `<span>${t('De tus ingresos')}</span><span class="num">${Math.round(g / m.incomeY * 100)} %</span>` : ''}
    </div>${m.incomeY && g > m.possible ? `<p class="small c-spend">${t('No cabe en tu plan: como mucho {x} al año.', { x: fmt(max) })}</p>` : ''}`;
}

function openCheck(ym) {
  const m = mFor(ym), c = m.mon(ym).check;
  dlg.innerHTML = `<div class="sheet" id="check-sheet" data-ym="${ym}">
    <div class="row between"><h2>${t('Saldo de hoy')}</h2><button type="button" class="iconbtn" data-act="dclose" aria-label="${t('Cerrar')}">${ic('x')}</button></div>
    <label class="field"><span class="label">${t('Saldo hoy')}</span><input type="text" inputmode="decimal" id="ck-bal" class="bigin" value="" placeholder="${c ? t('El último: ') + fmt(c.bal) : t('Saldo según tu banco')}" autocomplete="off">
</label>
    <div id="ck-calc" aria-live="polite"></div>
    <div class="formbtns"><button class="primary" data-act="checkset" data-ym="${ym}">${t('Guardar')}</button></div>
    ${(m.mon(ym).checks || []).length ? `<div class="stack-sm"><span class="label">${t('Actualizaciones de saldo')}</span><div class="moves">${[...m.mon(ym).checks].reverse().map((x) => `<div class="move"><span class="grow"><b class="num">${fmt(x.bal)}</b><span class="fine">${shortDate(x.date)}</span></span><button type="button" class="iconbtn sm" data-act="checkdel" data-ym="${ym}" data-date="${x.date}" aria-label="${t('Borrar actualización del {d}', { d: shortDate(x.date) })}">${ic('x')}</button></div>`).join('')}</div></div>` : ''}`;
  openDialog();
  checkCalc();
}
function checkPatch() {
  const bal = num(dlg.querySelector('#ck-bal')?.value), op = dlg.querySelector('#ck-open');
  const patch = { check: bal == null ? undefined : { date: toISO(new Date()), bal } };
  if (op) { patch.open = num(op.value) ?? undefined; const d = dlg.querySelector('#ck-open-date')?.value; if (patch.open != null && d) patch.openDate = d; }
  return { bal, patch };
}
function checkCalc() {
  const box = dlg.querySelector('#ck-calc'), ym = dlg.querySelector('#check-sheet')?.dataset.ym;
  if (!box || !ym) return;
  const { bal, patch } = checkPatch();
  if (bal == null) { box.innerHTML = ''; return; }
  const m = withMonth(ym, patch);
  if (m.spentSrc(ym) !== 'check') { box.innerHTML = '<p class="fine">' + t('Falta el saldo al empezar el mes.') + '</p>'; return; }
  const pc = pace(m, ym, new Date());
  const tgt = m.targetOf(ym), ps = projSaved(m, pc, ym), vd = ps == null ? null : verdict(ps, tgt, m.target), iso = toISO(new Date());
  box.innerHTML = `<div class="sum">
      <span>${t('Ingresado')}</span><b class="num">${fmt(m.incomeTo(ym, iso))}</b>
      <span>${t('Gastado')} <span class="muted">${t('/ planificado')}</span></span><span class="num"><b class="${m.spentAll(ym, iso) > planSpend(m, ym) + 0.5 ? 'c-spend' : ''}">${fmtN(m.spentAll(ym, iso))}</b> / ${fmt(planSpend(m, ym))}</span>
      ${ps == null ? '' : `<span>${t('Ahorrado')} <span class="muted">${t('proyección / planificado')}</span></span><span class="num"><b>≈ ${fmtN(ps)}</b> / ${fmt(tgt)}</span>`}
    </div>
    ${vd ? `<div class="cl-verdict"><span class="pill ${vd.cls}">${vd.word}</span></div>` : ''}`;
}


function setClose(ym, close) {
  store.update('months', (d) => {
    const mo = d.months[ym] = { ...(d.months[ym] || {}) };
    if (close) mo.close = close; else delete mo.close;
  });
}

// ---------- celebrations ----------
function celebrate(fn, from) {
  const savedB = compute(store.data).saved;
  fn();
  const after = compute(store.data), r = from?.getBoundingClientRect?.();
  if (after.goal && savedB < after.goal && after.saved >= after.goal) {
    burst(...(r && r.width ? [r.left + r.width / 2, r.top + r.height / 2] : []), { count: 120 });
    toast(t('Objetivo de ahorro del año cumplido'), 3500); return true;
  }
  return false;
}

// ---------- actions ----------
function setMonth(ym, patch) {
  store.update('months', (d) => { d.months[ym] = { ...(d.months[ym] || {}), ...patch }; });
}
function addSpend(date, amount, note, from, cat) {
  const e = { id: uid('g'), date, amount: round2(amount), note: note || '', ...(cat ? { cat } : {}) };
  const bud = cat && compute(store.data).budByCat.get(cat);
  UI.qcat = null;
  const done = celebrate(() => store.update('spends', (d) => { d.spends.push(e); }), from);
  UI.undo.push(e.id); UI.undo = UI.undo.slice(-20);
  if (!done) toast(`${amount < 0 ? t('Retirado') : t('Apuntado')} ${fmt(Math.abs(amount))}${cat ? ' · ' + CAT[cat].short : ''}${bud ? ` (${t('presupuesto')})` : cat === SAVE_CAT ? ` (${t('no es gasto')})` : ''}`);
}

async function connect() {
  // signIn() opens Google's popup synchronously inside this click
  const p = signIn();
  try { await p; } catch (e) { toast(e.message, 4000); return; }
  rememberEmail();
  try {
    const r = await store.connectGoogle();
    if (r.created) toast(t('Hoja «MoneyTracker» creada en tu Drive'));
    if (r.choose) openChoose(r.local);
  } catch (e) { toast(e.message, 4000); renderStatus(); }
}
function openChoose(local) {
  dlg.innerHTML = `<div class="sheet"><h2>${t('Ya tienes una hoja en Drive')}</h2>
    <p>${t('Este dispositivo también tiene un plan. ¿Con cuál te quedas? El otro se descarta.')}</p>
    <div class="formbtns col"><button class="primary" data-act="keepremote">${t('La hoja de Drive')}</button><button data-act="keeplocal">${t('El de este dispositivo')}</button></div></div>`;
  UI.chooseLocal = local;
  openDialog();
}

async function importFile(file) {
  try {
    const data = parsePlanFile(JSON.parse(await file.text()));
    if (!store.mode) { store.startLocal(data); toast(t('Plan importado')); return; }
    dlg.innerHTML = `<div class="sheet"><h2>${t('¿Importar este plan?')}</h2>
      <p>${t('{n} ingresos y gastos, objetivo de ahorro de {x} al año desde {m}.', { n: data.items.length, x: fmt(data.settings.goal), m: ymLabel(data.settings.start) })} ${store.mode === 'google' ? t('Sustituye todo lo que hay ahora, también en tu hoja de Drive.') : t('Sustituye todo lo que hay ahora.')}</p>
      <div class="formbtns"><button class="primary" data-act="doimport">${t('Importar')}</button><button class="ghost" data-act="dclose">${t('Cancelar')}</button></div></div>`;
    UI.importData = data;
    openDialog();
  } catch (e) { toast(e.message || t('No se pudo leer el archivo'), 4000); }
}
function exportFile() {
  const blob = new Blob([JSON.stringify({ app: 'hucha', version: 1, exported: new Date().toISOString(), ...store.data }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `moneytracker-${toISO(new Date())}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

sortable(document, '.plist', reorder);
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  onAct(b);
});
/** What deletes or undoes asks first, in a dialog above whatever is open. */
const ASK = {
  delspend: (b) => {
    const e = store.data.spends.find((x) => x.id === b.dataset.id);
    return { title: t('¿Borrar este gasto?'), yes: t('Borrar'), rows: e ? [[t('Tipo'), e.cat ? catName(e.cat) : t('Sin tipo')], ...(e.note ? [[t('Nota'), e.note]] : []), [t('Importe'), fmtSigned(-e.amount)], [t('Día'), longDate(e.date)]] : [] };
  },
  checkdel: (b) => {
    const x = (store.data.months[b.dataset.ym]?.checks || []).find((c) => c.date === b.dataset.date);
    return { title: t('¿Borrar esta actualización de saldo?'), yes: t('Borrar'), rows: x ? [[t('Saldo'), fmt(x.bal)], [t('Día'), longDate(x.date)], [t('Mes'), cap(ymLabel(b.dataset.ym))]] : [] };
  },
  oclear: (b) => ASK.unconfirm(b),
  unconfirm: (b) => {
    const m = compute(store.data), it = m.itemAt(b.dataset.id, b.dataset.ym) || m.segmentsOf(b.dataset.id)[0], real = store.data.months[b.dataset.ym]?.real?.[b.dataset.id];
    return { title: t('¿Desconfirmar?'), text: t('Vuelve al importe y a la fecha planificados.'), yes: t('Desconfirmar'), rows: it ? [[t('Nombre'), it.name], [t('Confirmado'), fmt(real ?? it.amount)], [t('Planificado'), fmt(it.amount)], [t('Día'), longDate(m.dateOf(it, b.dataset.ym))]] : [] };
  },
  closeundo: (b) => {
    const mo = store.data.months[b.dataset.ym] || {};
    return { title: t('¿Deshacer el cierre de {m}?', { m: monthName(b.dataset.ym) }), text: t('El mes vuelve a quedar sin cerrar.'), yes: t('Deshacer el cierre'), rows: [...(mo.bal != null ? [[t('Saldo del cierre'), fmt(mo.bal)]] : []), ...(mo.close ? [[mo.close.amount >= 0 ? t('Sobró') : t('Faltó'), fmt(Math.abs(mo.close.amount))]] : [])] };
  },
  signout: () => ({ title: t('¿Desconectar de Google?'), text: t('Tus datos siguen en tu hoja de Drive. Esta copia del dispositivo se borra.'), yes: t('Desconectar'), rows: [] }),
  fdel: () => {
    readForm();
    const f = FORM || {};
    return { title: t('¿Terminar esta partida?'), text: t('Desde este mes ya no cuenta; los meses anteriores conservan lo que tenían.'), yes: t('Terminar'), rows: [[t('Nombre'), f.name || t('Sin nombre')], [t('Importe'), fmt(num(f.amount) || 0)], [t('Cuándo'), freqText({ freq: f.freq, month: +f.month, day: +f.day, year: +f.year, kind: f.kind })]] };
  },
  ncdel: () => {
    const id = UI.nc?.id, n = store.data.spends.filter((x) => x.cat === id).length + store.data.items.filter((x) => x.cat === id).length;
    return { title: t('¿Borrar este tipo?'), text: t('Los gastos de este tipo se quedan sin tipo.'), yes: t('Borrar'), rows: [[t('Nombre'), CAT[id]?.name || UI.nc?.name || ''], [t('Usado en'), `${n} ${tn(n, 'gasto o partida', 'gastos o partidas')}`]] };
  },
  leave: () => ({ title: t('¿Salir de la demo?'), text: t('Lo que hayas probado no se guarda.'), yes: t('Salir'), rows: [] }),
};
const confirmDlg = document.createElement('dialog');
confirmDlg.id = 'confirm'; confirmDlg.setAttribute('aria-label', 'Confirmación');
document.body.appendChild(confirmDlg);
function askConfirm({ title, text = '', yes, rows = [] }) {
  return new Promise((done) => {
    confirmDlg.innerHTML = `<div class="sheet confirmbox"><h2>${esc(title)}</h2>${rows.length ? `<dl class="cdet">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''}${text ? `<p>${esc(text)}</p>` : ''}
      <div class="formbtns"><button type="button" class="ghost" data-c="no">${t('Cancelar')}</button><button type="button" class="danger" data-c="yes">${esc(yes)}</button></div></div>`;
    const end = (v) => { confirmDlg.close(); done(v); };
    confirmDlg.onclick = (e) => { const c = e.target.closest('[data-c]')?.dataset.c; if (c) end(c === 'yes'); else if (e.target === confirmDlg) end(false); };
    confirmDlg.oncancel = (e) => { e.preventDefault(); end(false); };
    confirmDlg.showModal();
    confirmDlg.querySelector('[data-c="no"]').focus();
  });
}
function onAct(b, sure = false) {
  const act = b.dataset.act, ym = b.dataset.ym;
  const val = (id) => document.getElementById(id)?.value;
  if (ASK[act] && !sure) { askConfirm(ASK[act](b)).then((ok) => { if (ok) onAct(b, true); }); return; }
  switch (act) {
    case 'tab': go(b.dataset.tab); break;
    case 'back': goBack(); break;
    case 'connect': connect(); break;
    case 'retrysave': store.sync(); break;
    case 'remindon': enableReminders(); break;
    case 'remindoff': disableReminders(); break;
    case 'remindkind': { const k = b.dataset.k, on2 = !remindKind(k); lsSet('hucha:remind:' + k, on2 ? '' : '0'); b.setAttribute('aria-pressed', String(on2)); syncReminders(); break; }
    case 'remindtest': swPost({ type: 'test', title: t('MoneyTracker'), body: t('Así te avisaré.') }); break;
    case 'reauth': case 'sync':
      if (act === 'sync' && store.status === 'error') { toast(store.error, 4000); store.sync(); break; }
      if (act === 'sync' && store.status !== 'auth') break;
      signIn().then(() => { rememberEmail(); store.sync().then(() => store.refresh()); render(true); }).catch((err) => toast(err.message, 4000));
      break;
    case 'local': store.startLocal(); history.replaceState({ tab: 'plan', depth: 0 }, '', '#plan'); setTab('plan'); break;
    case 'demo': store.startDemo(); history.replaceState({ tab: 'home', depth: 0 }, '', '#hoy'); setTab('home'); break;
    case 'leave': store.reset(); break;
    case 'refresh': store.refresh().then(() => toast(t('Recargado'))); break;
    case 'signout': signOut(); store.reset(); break;
    case 'wipe': if (!UI.wipe) { UI.wipe = true; render(true); break; } UI.wipe = false; if (store.mode === 'google') signOut(); store.reset(); break;
    case 'export': exportFile(); break;
    case 'lang': rememberLook({ lang: b.dataset.v }).then(() => setLang(b.dataset.v)); break;
    case 'theme': lsSet('hucha:theme', b.dataset.v === 'auto' ? null : b.dataset.v); writeLook({ theme: b.dataset.v === 'auto' ? '' : b.dataset.v }); applyTheme(b.dataset.v); rememberLook({ theme: b.dataset.v }); render(true); break;

    case 'openclose': openClose(ym); break;
    case 'startbal': {
      // the balance on the day you start: this month counts from today, what came before is already in it
      const v = num(val('h-start'));
      if (v == null) { invalid('#h-start', t('Escribe tu saldo')); return; }
      const d = val('h-start-date') || toISO(new Date()), lo = dayBefore(compute(store.data).range(ym).from), hi = toISO(new Date());
      if (d < lo || d > hi) { invalid('#h-start-date', t('Una fecha de este mes, hasta hoy')); return; }
      setMonth(ym, { open: v, openDate: d });
      toast(t('Saldo guardado: el mes cuenta desde hoy'));
      break;
    }
    case 'closeset': {
      const { bal, patch } = closePatch();
      if (bal == null) { invalid('#cl-bal', t('Escribe tu saldo')); return; }
      const r = withMonth(ym, patch).fromBalance(ym, bal);
      if (!r) return invalid('#cl-open', t('Falta el saldo al empezar el mes'));
      const amount = round2(r.left), close = { amount };
      dlg.close();
      const done = celebrate(() => store.update('months', (d) => {
        const mo = d.months[ym] = { ...(d.months[ym] || {}), bal, close };
        if (patch.real) mo.real = patch.real; // the unconfirmed ones, now confirmed (or 0: it didn't happen)
        if (patch.open != null) mo.open = patch.open;
        if (patch.openDate) mo.openDate = patch.openDate;
        // the balance a month closes with is where the next one starts: a start typed by hand before gives way
        const nx = d.months[ymAdd(ym, 1)];
        if (nx && nx.open != null) delete nx.open;
      }), null);
      if (!done) { burst(); toast(`${cap(monthName(ym))} cerrado`, 2600); }
      if (amount > 0) coinDrop({ left: innerWidth / 2 - 20, top: innerHeight - 160, width: 40, height: 40 }, $('#goal-meter'));
      break;
    }
    case 'check': openCheck(ym); break;
    case 'openyear': openYear(); break;
    case 'yearnew': {
      const g = num(val('y-goal'));
      if (g == null || g < 0) return invalid('#y-goal', t('Escribe tu objetivo de ahorro'));
      const m = compute(store.data), y = yearSummary(m);
      const { best, worst, ...keep } = y;
      dlg.close();
      store.update('settings', (d) => {
        d.settings = { ...d.settings, start: ymAdd(m.start, 12), goal: g, years: [...(d.settings.years || []), keep] };
      });
      burst(undefined, undefined, { count: 120 });
      toast(t('Nuevo año desde {m}', { m: ymLabel(ymAdd(m.start, 12)) }), 3000);
      break;
    }
    case 'checkset': {
      const { bal, patch } = checkPatch();
      if (bal == null) { invalid('#ck-bal', t('Escribe tu saldo')); return; }
      dlg.close();
      store.update('months', (d) => {
        const prev = d.months[ym] || {}, list = [...(prev.checks || (prev.check ? [prev.check] : []))].filter((x) => x.date !== patch.check.date);
        list.push(patch.check); list.sort((a, b2) => a.date.localeCompare(b2.date));
        const mo = d.months[ym] = { ...prev, check: list[list.length - 1], checks: list };
        if (patch.open != null) mo.open = patch.open;
        if (patch.openDate) mo.openDate = patch.openDate;
      });
      toast(t('Saldo guardado'));
      break;
    }
    case 'checkdel': {
      store.update('months', (d) => {
        const mo = d.months[ym] = { ...(d.months[ym] || {}) }, list = (mo.checks || (mo.check ? [mo.check] : [])).filter((x) => x.date !== b.dataset.date);
        if (list.length) { mo.checks = list; mo.check = list[list.length - 1]; } else { delete mo.checks; delete mo.check; }
      });
      toast(t('Actualización borrada')); openCheck(ym); break;
    }
    case 'closeundo': setClose(ym, null); toast(t('Cierre deshecho')); break;
    case 'qcat': {
      UI.qcat = UI.qcat === b.dataset.cat ? null : b.dataset.cat;
      document.querySelectorAll('.catrow [data-act="qcat"]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.cat === UI.qcat)));
      const dir = $('#k-dir'); if (dir) dir.hidden = UI.qcat !== SAVE_CAT;
      const hint = catHint(compute(store.data), UI.qcat);
      document.querySelectorAll('.cathint').forEach((h) => { h.textContent = hint; });
      break;
    }
    case 'qmode': { const k = quickKeep(); UI.qcat = b.dataset.v === 'save' ? SAVE_CAT : null; UI.kmore = false; openQuick(k); break; }
    case 'qdir': UI.qdir = b.dataset.v; document.querySelectorAll('#k-dir [data-act="qdir"]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.v === UI.qdir))); break;
    case 'catmore': openCatPicker(); break;
    case 'catnew': if (b.dataset.from === 'fcat') readForm(); openNewCat(b.dataset.from); break;
    case 'catedit': openNewCat('manage', b.dataset.id); break;
    case 'ncback': ncReturn(null); break;
    case 'ncicon': {
      UI.nc.icon = UI.nc.icon === b.dataset.icon ? '' : b.dataset.icon;
      dlg.querySelectorAll('.iconpick').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.icon === UI.nc.icon)));
      $('#nc-prev').innerHTML = ncPreview(UI.nc); break;
    }
    case 'nccolor': {
      UI.nc.color = b.dataset.color;
      dlg.querySelectorAll('.colorpick').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.color === UI.nc.color)));
      const sh = $('#nc-sheet'); if (sh) { sh.className = sh.className.replace(/\bpc-p\d+\b/g, '').trim() + (UI.nc.color ? ' pc-' + UI.nc.color : ''); }
      $('#nc-prev').innerHTML = ncPreview(UI.nc); break;
    }
    case 'ncsave': saveNewCat(); break;
    case 'ncdel': {
      const id = UI.nc.id;
      store.update('settings', (d) => { d.settings.cats = (d.settings.cats || []).filter((c) => c.id !== id); if (!d.settings.cats.length) delete d.settings.cats; });
      setCustomCats(store.data.settings.cats || []);
      if (UI.qcat === id) UI.qcat = null;
      UI.nc = null; dlg.close(); toast(t('Tipo borrado')); render(true);
      break;
    }
    case 'quick': UI.quickDate = b.dataset.date || null; UI.kmore = false; UI.qdir = 'in'; openQuick(); break;
    case 'kmore': { const k = quickKeep(); UI.kmore = !UI.kmore; openQuick(k); break; }
    case 'kpick': { const k = quickKeep(); UI.qcat = b.dataset.cat || null; UI.kmore = false; openQuick(k); break; }
    case 'kgo': {
      const v = num(val('k-amt')), date = val('k-date') || toISO(new Date());
      if (!v || v <= 0) { invalid('#k-amt', t('Escribe un importe')); return; }
      const sgn = UI.qcat === SAVE_CAT && UI.qdir === 'out' ? -1 : 1; // taking money out of savings: only there a negative amount makes sense
      if (UI.editSpend) {
        const id = UI.editSpend, cat = UI.qcat || undefined;
        dlg.close(); UI.qcat = null;
        store.update('spends', (d) => { const e = d.spends.find((x) => x.id === id); if (e) { e.amount = round2(v * sgn); e.date = date; e.note = (val('k-note') || '').trim(); if (cat) e.cat = cat; else delete e.cat; } });
        toast(t('Gasto guardado'));
        break;
      }
      const upd = $('#k-upd'), want = !!upd && upd.checked && !$('#k-updrow')?.hidden && date === toISO(new Date());
      if (upd) lsSet('hucha:updbal', upd.checked ? '' : '0');
      const nb = want ? bumpBalance(v * sgn) : null; // the balance as it is after this leaves the account
      dlg.close();
      addSpend(date, v * sgn, (val('k-note') || '').trim(), null, UI.qcat);
      if (nb != null) setTimeout(() => toast(`${t('Saldo en cuenta')}: ${fmt(nb)}`, 2600), 300);
      break;
    }
    case 'trail': {
      // only this card is redrawn: the rest of Hoy (and its entrance animations) stays as it is
      UI.trail = +b.dataset.v; lsSet('hucha:trail', UI.trail);
      const card = b.closest('[data-trail]'), tmp = document.createElement('div');
      tmp.innerHTML = trailCard(compute(store.data));
      if (card && tmp.firstElementChild) card.replaceWith(tmp.firstElementChild); else render(true);
      break;
    }
    case 'anaper': {
      UI.anaPer = b.dataset.v; lsSet('hucha:ana2', UI.anaPer);
      const box = $('#ana-per');
      if (!box) { render(true); break; }
      // only the part that depends on the period is drawn again: the rest of the page stays as it is
      const doc = new DOMParser().parseFromString(analisis(computeYear(UI.yearOff)), 'text/html'), nb = doc.getElementById('ana-per');
      if (!nb) { render(true); break; }
      box.innerHTML = nb.innerHTML;
      break;
    }
    case 'morespends': UI.allSpends = ym; render(true); break;
    case 'qpick': UI.qcat = b.dataset.cat || null; dlg.close(); render(true); break;
    case 'fcatopen': readForm(); FORM._pick = !FORM._pick; renderForm(); break;
    case 'fcat': readForm(); FORM.cat = b.dataset.cat || null; FORM._nocat = !b.dataset.cat; FORM._pick = false; renderForm(); break;
    case 'bud': {
      // the same "Apuntar un gasto" sheet, with this budget's type already chosen
      const bd = compute(store.data).shown(compute(store.data).curYM).find((i) => i.id === b.dataset.id && i.budget);
      if (!bd) { openBudget(b.dataset.id); break; }
      UI.qcat = bd.cat || null; UI.kmore = false; UI.quickDate = null; openQuick();
      break;
    }
    case 'bspend': case 'bspendc': {
      const v = act === 'bspend' ? +b.dataset.v : num(val('b-amt'));
      if (!v || v <= 0) return invalid('#b-amt', t('Escribe un importe'));
      addSpend(b.dataset.date, v, act === 'bspend' ? '' : (val('b-note') || '').trim(), b, b.dataset.cat);
      openBudget(b.dataset.id); break;
    }
    case 'undo': {
      const id = UI.undo.pop();
      if (!id) break;
      store.update('spends', (d) => { d.spends = d.spends.filter((x) => x.id !== id); });
      toast(t('Deshecho')); break;
    }
    case 'editspend': {
      const e = store.data.spends.find((x) => x.id === b.dataset.id);
      if (!e) break;
      UI.editSpend = e.id; UI.qcat = e.cat || null; UI.kmore = false; UI.quickDate = e.date; UI.qdir = e.amount < 0 ? 'out' : 'in';
      openQuick({ amt: String(Math.abs(e.amount)).replace('.', ','), note: e.note || '', date: e.date });
      break;
    }
    case 'delspend': {
      if (dlg.open && UI.editSpend) dlg.close();
      store.update('spends', (d) => { d.spends = d.spends.filter((x) => x.id !== b.dataset.id); }); toast(t('Gasto borrado'));
      const sheet = $('#bud-sheet'); if (sheet) openBudget(sheet.dataset.id);
      break;
    }
    case 'msel': UI.mesFromHome = false; UI.mesYM = ym; go('mes'); break;
    case 'homemonth': UI.mesFromHome = true; UI.mesYM = ymAdd(compute(store.data).curYM, +b.dataset.k); go('mes'); break;
    case 'calmove': {
      UI.mesYM = ymAdd(UI.mesYM, +b.dataset.k);
      if (UI.mesFromHome && UI.mesYM === compute(store.data).curYM) { UI.mesFromHome = false; goBack(); break; } // back to this month: Hoy
      render(true); break;
    }
    case 'occ': openOcc(b.dataset.id, ym); break;
    case 'unconfirm': { const kind = $('#done-sheet')?.dataset.kind; setReal(b.dataset.id, ym, null); toast(t('Desconfirmado: vuelve a lo planificado')); if (kind) openDone(kind); break; }
    case 'donelist': openDone(b.dataset.kind); break;
    case 'tcoopen': UI.calc = null; go('calc'); break;
    case 'calcopen': { const c = (store.data.calcs || []).find((x) => x.id === b.dataset.id); if (c) calcOpen(c); break; }
    case 'calcnew': { const tp = CALC_TPL()[b.dataset.k] || CALC_TPL().blank; calcOpen({ id: uid('calc'), name: b.dataset.k === 'blank' ? '' : tp.label, at: '', years: tp.years, infl: 2.5, rets: DEF_RETS, sel: 1, rows: tp.rows, alts: tp.alts }); break; }
    case 'calcsave': calcSave(); calcTouched(); UI.calcDirty = false; { const a = $('#calc-acts'); if (a) a.innerHTML = calcActs(UI.calc); const st = $('#calc-state'); if (st) st.textContent = calcStateText(UI.calc); } toast(t('Decisión guardada')); break;
    case 'calcdel': { const c = UI.calc; askConfirm({ title: t('¿Borrar esta decisión?'), yes: t('Borrar'), rows: [[c.name || t('Sin nombre'), c.alts.map(altName).join(' · ')]] }).then((ok) => {
      if (!ok) return; UI.calcDirty = false;
      store.update('calcs', (d) => { d.calcs = (d.calcs || []).filter((x) => x.id !== c.id); }, true); UI.calc = null; toast(t('Decisión borrada')); goBack(); }); break; }
    case 'calcaddalt': { const c = UI.calc; if (c.alts.length >= CALC_MAX.alts) break; c.alts.push({ name: '', price: 0, vm: 'rate', dep: -10, loan: 0, rate: 0, term: 0, v: {} }); UI.calcAlt = c.alts.length - 1; UI.calcDirty = true; calcRedraw(`[data-ca="${c.alts.length - 1}"][data-k="name"]`); calcTouched(); break; }
    case 'calcdupalt': { const c = UI.calc, i = +b.dataset.i; if (c.alts.length >= CALC_MAX.alts) break; c.alts.splice(i + 1, 0, { ...JSON.parse(JSON.stringify(c.alts[i])), name: `${altName(c.alts[i], i)} (2)` }); UI.calcAlt = i + 1; calcRedraw(`[data-ca="${i + 1}"][data-k="name"]`); calcTouched(); break; }
    case 'calcrmalt': { const c = UI.calc, i = +b.dataset.i; askConfirm({ title: t('¿Quitar esta alternativa?'), yes: t('Quitar'), rows: [[altName(c.alts[i], i), '']] }).then((ok) => { if (!ok) return; c.alts.splice(i, 1); UI.calcAlt = Math.max(0, Math.min(UI.calcAlt || 0, c.alts.length - 1)); calcRedraw(); calcTouched(); }); break; }
    case 'calcalt': UI.calcAlt = +b.dataset.i; calcRedraw(); break;
    case 'calcaddrow': { const c = UI.calc; if (c.rows.length >= CALC_MAX.rows) break; let n = c.rows.length + 1; while (c.rows.some((r) => r.id === 'r' + n)) n++; c.rows.push({ id: 'r' + n, n: '', f: 'm' }); calcTouched();
      if (dlg.open && $('#cr-body')) { $('#cr-body').innerHTML = calcRowsBody(c); dlg.querySelector(`[data-rn="${c.rows.length - 1}"]`)?.focus(); calcRedrawKeepDialog(); } else calcRedraw(`[data-rn="${c.rows.length - 1}"]`); break; }
    case 'calcrmrow': { const c = UI.calc, j = +b.dataset.j, r = c.rows[j]; if (!r) break;
      const drop = () => { c.rows.splice(j, 1); for (const a of c.alts) delete a.v?.[r.id]; calcTouched(); if (dlg.open && $('#cr-body')) { $('#cr-body').innerHTML = calcRowsBody(c); calcRedrawKeepDialog(); } else { calcRedraw(); } calcChanged(); };
      if (c.alts.some((a) => +a.v?.[r.id] > 0)) askConfirm({ title: t('¿Quitar este gasto?'), text: t('Se quita de todas las alternativas.'), yes: t('Quitar'), rows: [[rowName(r), '']] }).then((ok) => { if (ok) drop(); }); else drop(); break; }
    case 'calcaddret': { const c = UI.calc; if (c.rets.length >= CALC_MAX.rets) break; c.rets.push(Math.min(30, Math.max(...c.rets) + 2)); calcRedraw(`[data-cr="${c.rets.length - 1}"]`); calcChanged(); break; }
    case 'calcrmret': { const c = UI.calc, i = +b.dataset.i; if (c.rets.length < 2) break; c.rets.splice(i, 1); if (c.sel >= i && c.sel > 0) c.sel--; calcRedraw(); calcChanged(); break; }
    case 'calcsel': UI.calc.sel = +b.dataset.i; calcChanged(); break;
    case 'calcreal': { UI.calcReal = b.dataset.v === '1'; const k = compare(UI.calc), box = $('#calc-res'); if (box) box.innerHTML = calcResult(UI.calc, k); const ft = $('#cg-foot'); if (ft) ft.innerHTML = calcFoot(UI.calc, k); break; }
    case 'calcval': openCalcVal(+b.dataset.i); break;
    case 'calcrows': openCalcRows(); break;
    case 'gopending': lsSet('hucha:nfold', ''); render(true); window.scrollTo({ top: 0, behavior: 'smooth' }); break;
    case 'nextmore': { const box = b.closest('.nextlist'), on = box.classList.toggle('all'); lsSet('hucha:nextall', on ? '1' : ''); b.textContent = on ? b.dataset.less : b.dataset.more; break; }
    case 'catdetail': case 'linedetail': {
      if (UI.ptr && UI.ptr !== 'mouse' && !UI.wasTip && b.dataset.tip) break; // first tap: its tooltip (shown on pointerdown); the next one opens the detail
      hideTip();
      inSheet(() => (act === 'catdetail' ? openCatDetail(b.dataset.cat) : openLineDetail(b.dataset.kind)));
      break;
    }
    case 'movesall': UI.movesAll = true; render(true); break;
    case 'yearmove': UI.yearOff = (UI.yearOff || 0) + +b.dataset.k; render(true); break;
    case 'notifyfold': case 'notifymore': {
      // only the card changes (no redraw of the page), and the choice is kept for the next time
      const box = b.closest('.notify'), key = b.dataset.act === 'notifyfold' ? 'fold' : 'all';
      if (!box) break;
      const on = box.classList.toggle(key);
      lsSet('hucha:n' + key, on ? '1' : '');
      if (key === 'fold') b.setAttribute('aria-expanded', on ? 'false' : 'true');
      else b.textContent = on ? b.dataset.less : b.dataset.more;
      break;
    }
    case 'qok': { const v = +b.dataset.v; setReal(b.dataset.id, ym, v); toast(t('Confirmado')); break; }
    case 'qokall': {
      const mm = compute(store.data), at = mm.openAfter(ym);
      const list = mm.plannedIn(ym).filter((p) => (p.state === 'pending' || p.state === 'auto') && !p.it.vary && !(at && p.date <= at));
      store.update('months', (d) => { const mo = d.months[ym] = { ...(d.months[ym] || {}) }; const o = { ...(mo.real || {}) }; list.forEach((p) => { o[p.it.id] = p.amount; }); mo.real = o; });
      toast(t('{n} confirmados', { n: list.length })); break;
    }
    case 'oconfirm': {
      const v = num(val('o-real'));
      if (v == null || v < 0) return invalid('#o-real', t('Escribe un importe'));
      const od = val('o-date'), mm = compute(store.data), it = mm.itemAt(b.dataset.id, ym);
      if (od && (od < mm.range(ym).from || od > mm.range(ym).to)) return invalid('#o-date', t('Una fecha de este mes'));
      dlg.close();
      if (!celebrate(() => setReal(b.dataset.id, ym, v, od && od !== plannedDate(it, ym) ? od : ''), null)) toast(`Confirmado: ${fmt(v)}`);
      break;
    }
    case 'oclear': setReal(b.dataset.id, ym, null); dlg.close(); toast(t('Cuenta el importe planificado')); break;
    case 'edit': { const it = compute(store.data).shown().find((i) => i.id === b.dataset.id); if (it) openItem(it); break; }
    case 'additem': openItem(null, JSON.parse(b.dataset.preset || '{}')); break;
    case 'addonce': { const d = b.dataset.date; openItem(null, { kind: 'in', _sec: 'in', freq: 'once', month: +d.slice(5, 7), year: +d.slice(0, 4), day: +d.slice(8) }); break; }
    case 'ffreq': readForm(); FORM.freq = b.dataset.v; renderForm(); break;
    case 'goalfit': { const v = +b.dataset.v; store.update('settings', (d) => { d.settings.goal = v; }); toast(t('Objetivo de ahorro: {x} al año', { x: fmt(v) })); render(true); break; }
    case 'fclose': case 'dclose': dlg.close(); break;
    case 'refreshapp': refreshApp(b); break;
    case 'goaledit': openGoal(); break;
    case 'startedit': openCheck(compute(store.data).curYM); break;
    case 'goalper': {
      const g = goalYear(); UI.goalPer = b.dataset.v === 'm' ? 'm' : 'y';
      dlg.querySelectorAll('[data-act=goalper]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.v === UI.goalPer)));
      dlg.querySelector('#g-lab').textContent = UI.goalPer === 'y' ? t('Al año') : t('Al mes, de media');
      if (g != null) dlg.querySelector('#g-val').value = String(UI.goalPer === 'y' ? g : round2(g / 12)).replace('.', ',');
      goalCalc(); break;
    }
    case 'goalset': {
      const g = goalYear(); if (g == null) { invalid('#g-val', t('Escribe una cifra válida')); break; }
      store.update('settings', (d) => { d.settings.goal = g; }); dlg.close(); toast(t('Objetivo de ahorro: {x} al año', { x: fmt(g) })); render(true); break;
    }
    case 'fsave': saveForm(); break;
    case 'fdup': { readForm(); const { id, real, _edit, ...rest } = FORM; FORM = { ...rest, _copy: rest.name || t('sin nombre') }; CONFIRM = false; renderForm(); break; }
    case 'fdel': {
      readForm();
      const id = FORM.id, mm = compute(store.data), F = FORM._from || mm.curYM, before = mm.itemAt(id, F) || mm.segmentsOf(id)[0];
      store.update(['items', 'log'], (d) => { d.items = planDelete(d.items, id, F); d.log = [...(d.log || []), logEntry('delete', before, before, F, '')]; });
      dlg.close(); toast(t('Terminado')); break;
    }
    case 'keepremote': dlg.close(); toast(t('Usando la hoja de Drive')); break;
    case 'keeplocal': store.replaceAll(UI.chooseLocal); dlg.close(); toast(t('Subiendo el plan de este dispositivo')); break;
    case 'doimport': store.replaceAll(UI.importData); dlg.close(); toast(t('Plan importado')); break;
  }
}

document.addEventListener('change', (e) => {
  if (UI.calc && e.target.dataset?.rf != null) { const r = UI.calc.rows[+e.target.dataset.rf]; if (r) { r.f = e.target.value; if (r.f === 'o') { delete r.fix; delete r.ag; } const fx = e.target.parentElement?.querySelector('.cg-kind'); if (fx) fx.hidden = r.f === 'o'; calcChanged(); if (!calcWide()) calcRedrawKeepDialog(); } }
  if (UI.calc && e.target.dataset?.rt != null) { const r = UI.calc.rows[+e.target.dataset.rt]; if (r) { if (e.target.value === 'in') r.inc = true; else delete r.inc; e.target.closest('tr, .cr-row')?.classList.toggle('cg-inc', !!r.inc); calcChanged(); if (!calcWide()) calcRedrawKeepDialog(); } }
  if (UI.calc && e.target.dataset?.rk != null) { const j = +e.target.dataset.rk, r = UI.calc.rows[j]; if (r) {
    delete r.fix; delete r.ag; const v = e.target.value;
    if (v === 'fix') r.fix = true; else if (v === 'up') r.ag = AGE_UP; else if (v === 'down') r.ag = AGE_DOWN;
    const box = e.target.closest('.cg-kind'); if (box) box.outerHTML = rowKind(r, j); // shows or hides the % beside it
    calcChanged(); if (!calcWide()) calcRedrawKeepDialog(); } }
  if (UI.calc && e.target.dataset?.cv != null && e.target.tagName === 'SELECT') { const c = UI.calc, a = c.alts[UI.calcValI]; if (a) {
    if (e.target.dataset.cv === 'vc') a.vc = e.target.value;
    else {
      const was = valueAt(a, c.years, c.years), m = e.target.value; // the new mode starts where the old one ended, when it makes sense
      if (m === 'up') { a.vm = 'rate'; a.dep = 2; } else if (m === 'down') { a.vm = 'rate'; a.dep = -15; } else a.vm = m;
      if (m === 'curve' && !a.vc) a.vc = 'carNew';
      if (m === 'end') a.ve = Math.round(was);
      if (m === 'linear' && !a.life) a.life = c.years;
      const body = $('#cv-body'); if (body) body.innerHTML = calcValBody(c, a);
    }
    const sp = $('#cv-spark'); if (sp && a.vm !== 'none') sp.innerHTML = a.vm === 'curve' ? calcLife(a, c) : calcSpark(a, c);
    calcChanged(); } }
  if (e.target?.classList?.contains('clp-on')) { const amt = dlg.querySelector(`.clp-amt[data-id="${CSS.escape(e.target.dataset.id)}"]`); if (amt) amt.disabled = !e.target.checked; closeCalc(); }
  if (e.target?.id === 'k-date') { const r = $('#k-updrow'); if (r) r.hidden = e.target.value !== toISO(new Date()); }
  const el = e.target;
  if (el.id === 'f-freq') {
    readForm();
    if (FORM.freq !== 'monthly' && !FORM.month) FORM.month = new Date().getMonth() + 1;
    renderForm();
  } else if (el.id === 'p-cur') { rememberLook({ cur: el.value }).then(() => setCurrency(el.value));
  } else if (el.id === 'p-cycle') {
    const v = Math.round(num(el.value) ?? 0);
    if (v < 1 || v > 28) { toast(t('Un día del 1 al 28')); return; }
    store.update('settings', (d) => { d.settings.cycleDay = v; }); toast(v === 1 ? t('Meses del 1 al último día') : t('Tu mes va del {a} al {b}', { a: v, b: v - 1 })); render(true);
  } else if (el.id === 'p-start-m' || el.id === 'p-start-y') {
    const v = `${document.querySelector('#p-start-y').value}-${document.querySelector('#p-start-m').value}`;
    if (!isYM(v)) return;
    store.update('settings', (d) => { d.settings.start = v; }); toast(t('Primer mes guardado')); render(true);
  } else if ((el.id === 'import-file' || el.id === 'import-welcome') && el.files?.[0]) {
    importFile(el.files[0]); el.value = '';
  }
});
// Enter in a quick input = press its button
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
  if (e.target.id === 'cat-search') { e.preventDefault(); e.target.closest('.catgrid')?.querySelector('#cat-found .catchip')?.click(); return; } // Enter takes the best match
  const map = { 'h-start': 'startbal', 'nc-name': 'ncsave', 'ck-bal': 'checkset', 'ck-open': 'checkset', 'o-real': 'oconfirm', 'b-amt': 'bspendc', 'b-note': 'bspendc', 'k-amt': 'kgo', 'k-note': 'kgo' };
  const act = map[e.target.id] || (e.target.closest('#item-form') ? 'fsave' : null);
  if (!act) return;
  e.preventDefault();
  const scope = e.target.closest('.card, .sheet') || document;
  scope.querySelector(`[data-act="${act}"]`)?.click();
});
// the close and the look at the balance work out the month as you type
document.addEventListener('input', (e) => {
  if (UI.calc && e.target.dataset?.cn != null) { UI.calc.name = e.target.value; calcChanged(); }
  if (UI.calc && e.target.dataset?.cg != null) { const k = e.target.dataset.cg, v = num(e.target.value);
    UI.calc[k] = k === 'years' ? Math.min(50, Math.max(1, Math.round(v || 1))) : Math.min(30, Math.max(-5, v ?? 0));
    calcChanged(); }
  if (UI.calc && e.target.dataset?.cr != null) { const i = +e.target.dataset.cr, v = num(e.target.value); if (v != null) { UI.calc.rets[i] = Math.min(30, Math.max(-10, v)); UI.calc.sel = i; calcChanged(); } }
  if (UI.calc && e.target.dataset?.ca != null && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) { const a = UI.calc.alts[+e.target.dataset.ca], k = e.target.dataset.k, rv = e.target.dataset.rv; if (a) {
    const v = Math.max(0, num(e.target.value) ?? 0);
    if (rv != null) { a.v = a.v || {}; if (v) a.v[rv] = v; else delete a.v[rv]; }
    else if (k === 'name') a.name = e.target.value;
    else if (k === 'term') a.term = Math.min(600, Math.round(v));
    else if (k === 'rate') a.rate = Math.min(50, v);
    else if (k) a[k] = v;
    calcChanged(); } }
  if (UI.calc && e.target.dataset?.rag != null) { const r = UI.calc.rows[+e.target.dataset.rag], v = num(e.target.value); if (r && r.ag && v != null) { r.ag = Math.sign(r.ag) * Math.min(50, Math.abs(v)) || r.ag; calcChanged(); if (!calcWide()) calcRedrawKeepDialog(); } }
  if (UI.calc && e.target.dataset?.rn != null) { const r = UI.calc.rows[+e.target.dataset.rn]; if (r) { r.n = e.target.value; calcChanged(); if (!calcWide()) calcRedrawKeepDialog(); } }
  if (UI.calc && e.target.dataset?.cv != null && e.target.tagName === 'INPUT') { const c = UI.calc, a = c.alts[UI.calcValI], k = e.target.dataset.cv; if (a) {
    const v = Math.max(0, num(e.target.value) ?? 0);
    // up or down is what the mode says, not the sign of the figure (while you retype it, it is 0 for a moment)
    if (k === 'dep') { const up = dlg.querySelector('[data-cv="mode"]')?.value === 'up'; a.dep = (up ? 1 : -1) * Math.min(up ? 50 : 100, v); }
    else if (k === 'sellc') a.sellc = Math.min(100, v);
    else if (k === 'life') a.life = Math.min(50, Math.round(v));
    else if (k === 'age') { if (v > 0) a.age = Math.min(30, Math.round(v)); else delete a.age; }
    else a[k] = v;
    const sp = $('#cv-spark'); if (sp) sp.innerHTML = a.vm === 'curve' ? calcLife(a, c) : calcSpark(a, c);
    calcChanged(); } }
  const id = e.target.id;
  if (id === 'cat-search') catSearch(e.target); else if (id === 'cl-bal' || id === 'cl-open' || e.target.classList?.contains('clp-amt')) closeCalc(); else if (id === 'ck-bal' || id === 'ck-open') checkCalc(); else if (id === 'g-val') goalCalc();
});
document.addEventListener('focusout', () => setTimeout(() => {
  if (!UI.pending) return;
  const a = document.activeElement;
  if (!(a && $('#view')?.contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))) render();
}, 0));
dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
dlg.addEventListener('close', () => {
  FORM = null; CONFIRM = false; dlg.classList.remove('full'); UI.editSpend = null;
  if (history.state?.dialog && !NAV.popping) history.back(); // closed with a button: drop its history entry
});


// iOS pinch zoom off (app feel); inputs stay at 16px so iOS doesn't zoom on focus
document.addEventListener('gesturestart', (e) => e.preventDefault());

// ---------- navigation ----------
// Each screen has its own address (#hoy, #ajustes…) so the phone's back gesture works:
// back from a tab returns to Hoy, back from Ajustes returns where you were, back closes an open sheet.
const ROUTES = { home: 'hoy', mes: 'mes', ana: 'analisis', metas: 'ano', plan: 'plan', settings: 'ajustes', calc: 'calculadora' };
const OLD_ROUTES = { resumen: 'home', calendario: 'mes', meses: 'metas', metas: 'metas' }; // links saved before the redesigns
const NAV = { popping: false, then: null };
const tabFromHash = () => Object.keys(ROUTES).find((k) => location.hash === '#' + ROUTES[k]) || OLD_ROUTES[location.hash.slice(1)];
function setTab(tab) {
  UI.tab = tab; UI.wipe = false;
  if (tab !== 'settings' && tab !== 'mes' && tab !== 'calc') lsSet('hucha:tab', tab);
  if (tab !== 'calc') { UI.calc = null; UI.calcDirty = false; }
  render(true);
}
function go(tab) {
  if (!ROUTES[tab]) return;
  if (tab === UI.tab) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  if (UI.tab === 'calc' && UI.calcDirty) { calcLeave().then((ok) => { if (ok) { UI.calcDirty = false; go(tab); } }); return; }
  const depth = history.state?.depth || 0;
  const subTab = (t) => t === 'mes' || t === 'calc'; // a page opened on top of a tab: back returns to it
  if (subTab(UI.tab) && !subTab(tab) && depth > 0) { NAV.then = tab; history.back(); return; } // leave it first, then go
  if (tab === 'home' && depth > 0) { history.go(-depth); return; } // Hoy is the root
  if (subTab(tab) || UI.tab === 'home') history.pushState({ tab, depth: depth + 1 }, '', '#' + ROUTES[tab]);
  else history.replaceState({ tab, depth }, '', '#' + ROUTES[tab]); // tab to tab: no pile of entries
  UI.yearOff = 0; // a tab always opens on the current year: the year you looked at before is not carried over
  setTab(tab);
}
function goBack() {
  if ((history.state?.depth || 0) > 0) history.back();
  else go('home');
}
function openDialog() {
  if (dlg.open) return;
  dlg.showModal();
  history.pushState({ ...(history.state || {}), dialog: true }, '');
}
window.addEventListener('popstate', (e) => {
  if (dlg.open) { NAV.popping = true; dlg.close(); NAV.popping = false; }
  const tab = e.state?.tab || tabFromHash() || 'home';
  // back (button or gesture) from a comparison with unsaved changes: stay, and ask
  if (UI.calc && UI.calcDirty && !(tab === 'calc' && e.state?.calc === UI.calc.id)) {
    const then = NAV.then; NAV.then = null;
    history.pushState({ tab: 'calc', depth: (e.state?.depth || 0) + 1, calc: UI.calc.id }, '', '#' + ROUTES.calc);
    calcLeave().then((ok) => { if (ok) { UI.calcDirty = false; NAV.then = then; history.back(); } });
    return;
  }
  if (tab === 'calc') { const id = e.state?.calc; UI.calc = !id ? null : UI.calc?.id === id ? UI.calc : (normCalcs([JSON.parse(JSON.stringify((store.data.calcs || []).find((x) => x.id === id) || {}))])[0] || null); }
  if (tab !== UI.tab) setTab(tab); else if (tab === 'calc') render(true);
  if (NAV.then) { const t = NAV.then; NAV.then = null; go(t); }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches?.('.calc-name, .cg-name, .cg-rn')) { e.preventDefault(); e.target.blur(); }
  // in the table, Enter goes down a row in the same column, as in a spreadsheet (Tab goes across)
  if (e.key === 'Enter' && e.target.closest?.('table.cg td')) {
    e.preventDefault();
    const td = e.target.closest('td'), col = [...td.parentElement.children].indexOf(td);
    let tr = td.parentElement.nextElementSibling;
    while (tr) { const el = tr.children[col]?.querySelector('input:not([disabled]), button.cg-val:not([disabled])'); if (el) { el.focus(); el.select?.(); return; } tr = tr.nextElementSibling; }
    e.target.blur();
  }
});
matchMedia('(min-width: 960px)').addEventListener('change', () => { if (UI.tab === 'calc' && UI.calc && !dlg.open) render(true); });
// ---------- start ----------
if (isConfigured()) loadGis().catch(() => {});
UI.tab = tabFromHash() || (UI.tab === 'settings' ? 'home' : UI.tab);
if (!ROUTES[UI.tab]) UI.tab = 'home';
history.replaceState({ tab: UI.tab, depth: 0 }, '', '#' + ROUTES[UI.tab]);
render(true);
window.__huchaReady = true; // index.html stops watching for a failed start
if (store.mode === 'google') {
  if (tokenValid()) store.sync().then(() => store.refresh());
  else store.setStatus('auth');
}

// The on-screen keyboard covers the bottom of the page: the open sheet lifts above it and shrinks to what is left,
// and the type search jumps to the top of the sheet so its results are in view.
if (window.visualViewport) {
  // --vvh is the height you can really see (the keyboard takes its part): sheets are sized from it, and lifted above the keyboard
  const fit = () => {
    const vv = window.visualViewport, kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    const root = document.documentElement.style, d = document.querySelector('dialog[open]');
    root.setProperty('--vvh', Math.round(vv.height * 0.96) + 'px');
    document.querySelectorAll('dialog').forEach((x) => { x.style.marginBottom = ''; x.style.maxHeight = ''; x.querySelector('.sheet')?.style.removeProperty('max-height'); });
    if (!d || kb < 80) return;
    d.style.marginBottom = kb + 'px'; d.style.maxHeight = Math.round(vv.height * 0.96) + 'px';
    d.querySelector('.sheet')?.style.setProperty('max-height', Math.round(vv.height * 0.96) + 'px');
  };
  window.visualViewport.addEventListener('resize', fit);
  window.visualViewport.addEventListener('scroll', fit);
  fit();
}
document.addEventListener('focusin', (e) => {
  if (e.target?.id !== 'cat-search') return;
  const go = () => { const sh = e.target.closest('.sheet'); if (sh) sh.scrollTop = Math.max(0, e.target.getBoundingClientRect().top - sh.getBoundingClientRect().top + sh.scrollTop - 8); };
  go(); setTimeout(go, 300); // again once the keyboard has finished opening
});

// ---------- the look you chose (language, currency) survives the browser forgetting ----------
// They live on the device, and browsers can clear a device's storage after a long time unused. So they are also kept with
// the data (the sheet): when the device has none of its own, it takes them from there.
try { navigator.storage?.persist?.(); } catch { /* not supported */ } // ask the browser not to clear this app's storage
async function rememberLook(patch) {
  if (!store.mode || store.mode === 'demo') return;
  store.update('settings', (d) => { Object.assign(d.settings, patch); });
  try { await store.sync(); } catch { /* it is sent later */ }
}
function adoptLook() {
  const s = store.data?.settings;
  if (!store.mode || store.mode === 'demo' || !s) return;
  const lsLang = lsGet('hucha:lang'), lsCur = lsGet('hucha:cur');
  let changed = false;
  // the theme needs no reload: if the device has none of its own and the sheet has one, apply it
  if (s.theme && s.theme !== 'auto' && !lsGet('hucha:theme')) { lsSet('hucha:theme', s.theme); applyTheme(s.theme); }
  if (s.lang && LANGS[s.lang] && !lsLang && s.lang !== lang) { lsSet('hucha:lang', s.lang); changed = true; }
  if (s.cur && CURRENCIES.includes(s.cur) && !lsCur && s.cur !== cur) { lsSet('hucha:cur', s.cur); changed = true; }
  let once = null; try { once = sessionStorage.getItem('hucha:adopted'); } catch { /* blocked */ }
  if (changed && !once) { try { sessionStorage.setItem('hucha:adopted', '1'); location.reload(); return; } catch { /* no reload without a guard */ } }
  // an existing device with its choices and a sheet without them: save them there
  if ((!s.lang || !s.cur || !s.theme) && !changed) store.update('settings', (d) => { d.settings.lang ||= lang; d.settings.cur ||= cur; d.settings.theme ||= lsGet('hucha:theme') || 'auto'; });
}
// ---------- service worker and reminders ----------
// The service worker makes the app installable with its own icon and open offline. Reminders are dated notes the page
// leaves in it; when the browser wakes it up (periodic sync, installed Chrome on Android) the due ones become system notifications.
function remindersOn() { return !!lsGet('hucha:remind'); }
/** Which kinds of reminder you want: the close of the month, incomes, expenses (each on unless you turned it off). */
const remindKind = (k) => lsGet('hucha:remind:' + k) !== '0';
function REM_SUPPORT() { return 'serviceWorker' in navigator && 'Notification' in window; }
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('./sw.js').catch(() => { /* no worker: it works the same, just not offline */ });
function swPost(msg) { return REM_SUPPORT() ? navigator.serviceWorker.ready.then((r) => (r.active || navigator.serviceWorker.controller)?.postMessage(msg)).catch(() => {}) : Promise.resolve(); }
/** What is worth a notification, with its date: closing the month that just ended, and what is due in the next days. */
function remindersList(m) {
  if (!m.items.length || store.mode === 'demo') return [];
  const out = [], at9 = (iso) => `${iso}T09:00:00`, today = toISO(new Date());
  // the closes of this month and the two after it: if you don't open the app for weeks, the notes are already there
  const due = closeDue(m);
  const closes = !remindKind('close') ? [] : due ? [due, m.curYM, ymAdd(m.curYM, 1)] : [m.curYM, ymAdd(m.curYM, 1), ymAdd(m.curYM, 2)];
  for (const ym of closes) {
    if (ym <= m.curYM && m.balStart(ym) == null) continue; // nothing to close from
    if (m.mon(ym).close) continue;
    const late = ym < m.curYM, day = late ? today : (() => { const d = new Date(m.range(ym).to + 'T12:00:00'); d.setDate(d.getDate() + 1); return toISO(d); })();
    out.push({ key: `close-${ym}`, at: at9(day), title: t('Cierre de {m}', { m: monthName(ym) }), body: t('Ya puedes cerrar el mes: apunta tu saldo del último día.'), url: './#hoy' });
  }
  // what asks to be confirmed or is awaited, in the next 45 days
  const lim = (() => { const d = new Date(); d.setDate(d.getDate() + 45); return toISO(d); })();
  for (const ym of [m.curYM, ymAdd(m.curYM, 1), ymAdd(m.curYM, 2)]) {
    for (const p of m.plannedIn(ym)) {
      if (p.date < today || p.date > lim || p.state === 'real') continue;
      const isIn = p.it.kind === 'in', isSave = !!p.save;
      if (isIn ? !remindKind('in') : !remindKind('out')) continue;
      const key = `item-${p.it.id}-${p.date}`;
      if (isIn) out.push({ key, at: at9(p.date), title: t('Hoy toca: {n}', { n: p.it.name }), body: t('¿Ha llegado? Confírmalo en la app.'), url: './#hoy' });
      else if (p.it.vary) out.push({ key, at: at9(p.date), title: t('Confirma {n}', { n: p.it.name }), body: t('Pon el importe de este mes.'), url: './#hoy' });
      else out.push({ key, at: at9(p.date), title: isSave ? t('Hoy toca pasar al ahorro: {n}', { n: p.it.name }) : t('Hoy se paga: {n}', { n: p.it.name }), body: isSave ? t('Traspaso planificado.') : t('Gasto planificado. Si cambia el importe, confírmalo en la app.'), url: './#hoy' });
    }
  }
  return out;
}
function syncReminders() {
  if (!REM_SUPPORT() || !remindersOn() || Notification.permission !== 'granted') return;
  clearTimeout(remTimer);
  remTimer = setTimeout(() => swPost({ type: 'reminders', list: remindersList(compute(store.data)) }), 400);
}
async function enableReminders() {
  if (!REM_SUPPORT()) { toast(t('Tu navegador no admite avisos')); return; }
  const p = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (p !== 'granted') { toast(t('Sin permiso: actívalo en los ajustes del navegador')); render(true); return; }
  lsSet('hucha:remind', '1');
  try { const reg = await navigator.serviceWorker.ready; await reg.periodicSync?.register('moneytracker-reminders', { minInterval: 12 * 3600 * 1000 }); } catch { /* not available: they are shown when you open the app */ }
  syncReminders(); toast(t('Avisos activados')); render(true);
}
async function disableReminders() {
  lsSet('hucha:remind', '');
  try { const reg = await navigator.serviceWorker.ready; await reg.periodicSync?.unregister('moneytracker-reminders'); } catch { /* nothing to remove */ }
  swPost({ type: 'reminders', list: [] }); toast(t('Avisos desactivados')); render(true);
}
function remindersCard() {
  const perm = REM_SUPPORT() ? Notification.permission : 'unsupported', on = remindersOn() && perm === 'granted';
  return `<section class="card"><h2>${t('Avisos')}</h2>
    <p class="fine">${perm === 'unsupported' ? t('Tu navegador no admite avisos. Instala la app desde el menú del navegador.') : perm === 'denied' ? t('Los avisos están bloqueados: actívalos en los ajustes del navegador para este sitio.')
      : t('Te avisa de «Cierre de {m}» y de lo que toca confirmar. En Android, con la app instalada, el móvil decide cuándo mirar: puede tardar unas horas.', { m: monthName(compute(store.data).curYM) })}</p>
    ${on ? `<div class="kindpills" role="group" aria-label="${t('Qué avisar')}">${[['close', t('Cierre del mes')], ['in', t('Ingresos')], ['out', t('Gastos planificados')]].map(([k, l]) => `<button type="button" class="kindpill" data-act="remindkind" data-k="${k}" aria-pressed="${remindKind(k)}">${l}</button>`).join('')}</div>` : ''}
    ${perm === 'unsupported' || perm === 'denied' ? '' : `<div class="row wrap-row">${on ? `<button data-act="remindoff">${t('Desactivar avisos')}</button><button class="ghost" data-act="remindtest">${t('Enviar un aviso de prueba')}</button>` : `<button class="primary" data-act="remindon">${t('Activar avisos')}</button>`}</div>`}
  </section>`;
}
