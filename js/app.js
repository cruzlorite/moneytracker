// Views and actions. Data lives in Store; every number comes from model.compute().
import { Store } from './store.js';
import { isConfigured, loadGis, signIn, signOut, tokenValid, rememberEmail, sheetUrl, savedHint } from './google.js';
import {
  MES, MES3, DIAS, FREQ, fmt, fmtN, fmtSigned, esc, clamp, num, round2, uid, ymAdd, ymLabel, monthName, toISO, toYM, unit, freqText,
  compute, daysTo, monthGrid, parsePlanFile, normItem, timesIn, isYM, occurs, ymDiff, daysInMonth,
} from './model.js';
import { animateNumbers, animateBars, burst, pop, coinDrop, floatText, hit, stagger } from './fx.js';
import { sortable } from './sort.js';
import { columns, pairs, segbar, ranked, table, line, balanceLine, bindBalance } from './charts.js';
import { CAT, CATS, GROUPS, STARTERS, BASE, EXTRA_ICONS, SAVE_CAT, guessCat, setCustomCats } from './cats.js';
import { pace, closeDue } from './play.js';
import { t, tn, lang, locale, LANGS, setLang, cur, curSym, curName, CURRENCIES, setCurrency } from './i18n.js';

const $ = (s, r = document) => r.querySelector(s);
const app = $('#app'), dlg = $('#modal'), toastEl = $('#toast');
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* ignore */ } };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const pct = (a, b) => (b ? clamp(a / b * 100, 0, 100) : 0);

const UI = { tab: ({ cal: 'metas', months: 'metas', mes: 'home' })[lsGet('hucha:tab')] || lsGet('hucha:tab') || 'home', mesYM: null, anaPer: lsGet('hucha:ana'), pending: false, lastTab: null, undo: [] };
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
function showTip(t) {
  const rich = t.dataset.info ? infoHTML(t.dataset.info) : '', txt = t.dataset.tip;
  if (!rich && !txt) return hideTip();
  document.querySelectorAll('.tipon').forEach((x) => x.classList.remove('tipon'));
  const host = t.closest('dialog') || document.body; // an open dialog sits on top of everything else
  if (tipEl.parentNode !== host) host.appendChild(tipEl);
  if (rich) tipEl.innerHTML = rich; else tipEl.textContent = txt;
  tipEl.classList.toggle('rich', !!rich); tipEl.hidden = false; t.classList.add('tipon');
  const r = t.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  const left = clamp(r.left + r.width / 2 - w / 2, 8, innerWidth - w - 8), top = r.top - h - 8 < 60 ? r.bottom + 8 : r.top - h - 8;
  tipEl.style.left = left + 'px'; tipEl.style.top = top + 'px';
  const at = tipEl.getBoundingClientRect(); // a transformed dialog moves fixed children: correct for it
  if (Math.abs(at.left - left) > 1 || Math.abs(at.top - top) > 1) { tipEl.style.left = 2 * left - at.left + 'px'; tipEl.style.top = 2 * top - at.top + 'px'; }
}
function hideTip() { tipEl.hidden = true; document.querySelectorAll('.tipon').forEach((x) => x.classList.remove('tipon')); }
document.addEventListener('pointerover', (e) => { if (e.pointerType === 'mouse') { const t = e.target.closest?.('[data-tip],[data-info]'); if (t) showTip(t); } });
document.addEventListener('pointerout', (e) => { if (e.pointerType === 'mouse' && e.target.closest?.('[data-tip],[data-info]') && !e.relatedTarget?.closest?.('[data-tip],[data-info]')) hideTip(); });
document.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { const t = e.target.closest?.('[data-tip],[data-info]'); t ? showTip(t) : hideTip(); } });
document.addEventListener('focusin', (e) => { const t = e.target.closest?.('[data-tip],[data-info]'); if (t && t.matches(':focus-visible')) showTip(t); });
document.addEventListener('scroll', hideTip, { passive: true, capture: true });

bindBalance();

// ---------- theme ----------
function applyTheme(t) { if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }
applyTheme(lsGet('hucha:theme'));

// ---------- frame ----------
function ensureFrame() {
  if ($('#view')) return;
  const tab = (t, l, i) => `<button data-act="tab" data-tab="${t}">${ic(i)}<span>${l}</span></button>`;
  app.innerHTML = `
    <header class="top"><div class="in">
      <button class="backbtn" id="backbtn" data-act="back" hidden>${ic('left')}<span>${t('Atrás')}</span></button>
      <span class="grow"></span>
      <button class="sync" id="sync" data-act="sync"></button>
      <button class="iconbtn" id="gear" data-act="tab" data-tab="settings" aria-label="${t('Ajustes')}">${ic('gear')}</button>
    </div></header>
    <main id="view" class="wrap"></main>
    <nav class="tabs" aria-label="${t('Secciones')}"><div class="in">
      ${tab('home', t('Hoy'), 'home')}${tab('metas', t('Año'), 'year')}
      <div class="navplus"><button class="plusbtn" id="fab" data-act="quick" aria-label="${t('Apuntar un gasto')}">${ic('plus')}</button></div>
      ${tab('ana', t('Análisis'), 'chart')}${tab('plan', t('Plan'), 'plan')}
    </div></nav>`;
}

function render(force) {
  if (!store.mode) { renderWelcome(); return; }
  setCustomCats(store.data.settings.cats || []);
  ensureFrame();
  const view = $('#view');
  const a = document.activeElement;
  if (!force && a && view.contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) { UI.pending = true; return; }
  UI.pending = false;
  const m = compute(store.data);
  const views = { home, mes, ana: analisis, metas, plan, settings };
  view.innerHTML = (views[UI.tab] || home)(m);
  if (UI.lastTab !== UI.tab) {
    view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter');
    UI.lastTab = UI.tab; window.scrollTo(0, 0);
  }
  const navTab = UI.tab === 'mes' ? 'metas' : UI.tab;
  document.querySelectorAll('nav.tabs button[data-tab]').forEach((b) => b.setAttribute('aria-current', b.dataset.tab === navTab ? 'page' : 'false'));
  const sub = UI.tab === 'settings' || UI.tab === 'mes';
  $('#backbtn').hidden = !sub; $('#gear').hidden = UI.tab === 'settings';
  $('#fab').disabled = !m.items.length;
  hideTip();
  animateNumbers(view); animateBars(view);
  renderStatus();
  afterRender(m);
}
function afterRender(m) {
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

function renderStatus() {
  const el = $('#sync'); if (!el) return;
  const s = store.mode === 'demo' ? ['demo', 'Demo'] : store.mode === 'local' ? ['local', t('En este dispositivo')] : ({
    idle: ['ok', t('Guardado')], saved: ['ok', t('Guardado')], pending: ['busy', t('Sin guardar')], saving: ['busy', 'Guardando…'],
    offline: ['warn', t('Sin conexión')], auth: ['warn', t('Conectar')], error: ['bad', t('Error al guardar')],
  })[store.status] || ['ok', ''];
  el.className = 'sync ' + s[0]; el.textContent = s[1];
  el.title = store.status === 'error' ? store.error : store.status === 'offline' ? t('Se guardará en tu hoja al volver la conexión') : '';
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
    { done: (store.data.settings.goal || 0) > 0, n: t('Tu ahorro planificado'), d: t('Cuánto quieres ahorrar al año, en Plan'), go: 'plan' },
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
const shortDate = (iso) => `${+iso.slice(8, 10)} ${MES3[+iso.slice(5, 7) - 1]}`;
const rangeText = (m, ym) => { const r = m.range(ym); return `${shortDate(r.from)} – ${shortDate(r.to)}`; };
const pageHead = (title, sub = '', kicker = '', side = '') => `<div class="phead"><div class="phead-t">${kicker ? `<span class="kicker">${kicker}</span>` : ''}<h1>${title}</h1>${sub ? `<span class="psub">${sub}</span>` : ''}</div>${side}</div>`;
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
  ixRow(IX.chip(scaleOf(130, 100).c), t('Verde oscuro'), t('120 % o más.'))];
function infoHTML(key) {
  const O = 'var(--out)', S = 'var(--sav)', R = 'var(--spend)', M = 'var(--muted)';
  const card = (title, rows, foot = '') => `<h4>${title}</h4>${rows.join('')}${foot ? `<p class="ixf">${foot}</p>` : ''}`;
  switch (key) {
    case 'mes': return card(t('Este mes'), [
      ixRow(IX.fill(O), t('Gastado'), t('salidas de tu cuenta este mes, sin contar el ahorro.')),
      ixRow(IX.mark, t('Planificado'), t('ingresos del mes − ahorro planificado del mes.')),
      ixRow(IX.proj(O), t('Proyección'), t('gasto estimado a fin de mes, a tu ritmo.')),
      ixRow(IX.fill(R), t('Rojo'), t('exceso sobre el gasto planificado.'))]);
    case 'ahorroMes': return card(t('Ahorrado este mes'), [
      ixRow(IX.proj(S), t('Proyección'), t('ahorro planificado del mes + lo que sobre del gasto planificado.'))]);
    case 'limites': return card(t('Tus límites'), [
      ixRow(IX.fill(O), t('Gastado'), t('en ese tipo, este mes (mensual) o este año (anual).')),
      ixRow(IX.mark, t('Límite'), t('tope fijado en el Plan.')),
      ixRow(IX.fill(R), t('Rojo'), t('exceso sobre el límite.'))]);
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
    case 'ahorradoMes': return card(t('Ahorrado cada mes'), [
      ixRow(IX.chip(scaleOf(100, 100).c), t('Columna'), t('ahorrado del mes.')),
      ixRow('<i class="lg-tick"></i>', t('Raya'), t('planificado del mes.')),
      ...scaleRows()], t('Color: ahorrado frente a planificado.'));
    case 'plan': return card(t('Ahorro e inversión planificados'), [
      ixRow(IX.k('k-save'), t('Ahorro'), t('cantidad planificada anual.')),
      ixRow(IX.k('k-fix'), t('Gastos planificados'), t('alquiler, recibos, seguros…')),
      ixRow(IX.k('k-bud'), t('Límites de gasto'), t('topes de lo que vigilas.')),
      ixRow(IX.k('k-free'), t('Sin planificar'), t('el resto: comida, salidas…')),
      ixRow(IX.k('k-neg'), t('Falta'), t('lo que no cabe.')),
      ixRow('', t('Gasto total planificado'), t('ingresos − ahorro.'))],
      t('Porcentajes: sobre tus ingresos. Lo que no gastes, también es ahorro.'));
    case 'saldo': return card(t('Saldo de tu cuenta'), [
      ixRow(IX.fill('var(--s1)'), t('Saldo'), t('lo que había en tu cuenta cada día.')),
      ixRow(IX.proj('var(--s1)'), t('Estimado'), t('desde hoy hasta fin de mes: lo planificado y tu ritmo de gasto desde tu último saldo.'))],
      t('Los días de meses cerrados se reparten a partes iguales entre el saldo inicial y el de cierre.'));
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
function gauge({ v, marks = [], proj = null, tone, ptone = tone, key, thin = false, tall = false, label = '', scale = 0, cap = null, note = null }) {
  const max = Math.max(1, scale, v, proj || 0, ...marks.map((k) => k.at));
  const w = (x) => +clamp(x / max * 100, 0, 100).toFixed(1);
  const lab = marks.filter((k) => k.label).map((k) => { const at = w(k.at); return `<span class="${at > 70 ? 'end' : at < 15 ? 'start' : ''}" style="left:${at}%">${k.label}</span>`; }).join('');
  const seg = (a, b, c, hatch) => (b - a > 0.004 ? `<i class="${hatch ? 'g-proj' : 'g-over'}" style="left:${w(a)}%; width:${(w(b) - w(a)).toFixed(1)}%; ${hatch ? `--pc:${c}` : `background:${c}`}"></i>` : '');
  let bars;
  if (cap != null) {
    // spending against a cap: within it, spending's own orange; only what goes past it in red
    const ok = 'var(--out)', over = 'var(--spend)', inV = Math.min(v, cap);
    bars = `<i class="g-fill" style="background:${ok}; width:${w(Math.max(0, inV))}%"></i>${seg(cap, v, over)}`
      + (proj != null && proj > v ? seg(v, Math.min(proj, cap), ok, true) + seg(Math.max(v, cap), proj, over, true) : '');
  } else {
    bars = `<i class="g-fill" style="background:${tone}; width:${w(Math.max(0, v))}%"></i>${proj != null && proj > v ? seg(v, proj, ptone, true) : ''}`;
  }
  // a stretch of the bar named inside it (what would be left, what would go over): only when there's room for the words
  const noteEl = note && w(note.b) - w(note.a) >= 30 ? `<span class="g-note ${note.cls || ''}" style="left:${w(note.a)}%; width:${(w(note.b) - w(note.a)).toFixed(1)}%">${note.text}</span>` : '';
  return `<div class="gauge ${thin ? 'thin' : ''} ${tall ? 'tall' : ''}" role="img" aria-label="${esc(label)}">
    <div class="g-track"><div class="g-bars" data-bar="100" data-reveal data-key="${key}">${bars}${noteEl}</div>${marks.map((k) => k.cls === 'today'
      ? `<span class="g-today" style="left:${w(k.at)}%" aria-hidden="true"><i></i></span>`
      : `<b class="g-mark" style="left:${w(k.at)}%"></b>`).join('')}</div>
    ${thin || !lab ? '' : `<div class="g-labels">${lab}</div>`}</div>`;
}
const closeBanner = (due) => (due ? `<button class="card banner" data-act="openclose" data-ym="${due}"><i class="bdot"></i><span class="grow">${t('{m} sin cerrar', { m: cap(monthName(due)) })}</span><span class="btn-dark">${t('Cerrar')}</span></button>` : '');
/** The month's budget: the planned income minus the planned saving (planned amounts, so it holds steady all month). */
const planSpend = (m, ym) => Math.max(0, round2(m.ins.reduce((a, it) => a + (m.occurs(it, ym) ? it.amount : 0), 0) - m.targetOf(ym)));

// ---------- Hoy ----------
function home(m) {
  if (!m.items.length) return emptyPlanCard(m);
  const ym = m.curYM, cm = m.mon(ym), pc = pace(m, ym), iso = m.todayISO;
  const tgt = m.targetOf(ym), ps = projSaved(m, pc, ym), vd = ps == null ? null : verdict(ps, tgt, m.target);
  const due = closeDue(m), pending = m.pendingIn(ym);
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
  const hpNote = gapMoney < 1 ? null : end <= plan
    ? { a: end, b: plan, text: proj != null ? t('≈ {x} por debajo', { x: fmt(gapMoney) }) : t('sin gastar {x}', { x: fmt(gapMoney) }), cls: 'gap' }
    : { a: plan, b: end, text: spent > plan + 0.5 ? t('superado en {x}', { x: fmt(Math.round(spent - plan)) }) : t('≈ {x} por encima', { x: fmt(gapMoney) }), cls: 'over', over: true };
  const hpNoteFits = hpNote && (hpNote.b - hpNote.a) / Math.max(plan, end, spent, 1) >= 0.3;
  const w = (v) => (plan > 0 ? clamp(v / plan * 100, 0, 100) : 0).toFixed(1);
  const tasks = [
    ...pending.map((p) => `<button class="trow" data-act="occ" data-id="${esc(p.it.id)}" data-ym="${ym}"><span class="ring"></span><span class="grow">${t('Confirmar {n}', { n: esc(p.it.name.toLowerCase()) })}</span><span class="muted num">${fmt(p.it.amount)}</span>${ic('right')}</button>`),
  ];
  return `
  ${pageHead(cap(monthName(ym)), rangeText(m, ym), `${dow}${dp != null ? ` · ${dp === 0 ? t('hoy cobras') : t('cobras en {n} {d}', { n: dp, d: tn(dp, 'día', 'días') })}` : ''}`)}
  ${closeBanner(due)}
  ${tasks.length ? `<section class="card list" aria-label="${t('Pendiente')}">${tasks.join('')}</section>` : ''}
  ${setupCard(m, ym)}
  ${m.balStart(ym) == null ? `<section class="card startcard" aria-label="${t('Para empezar')}"><h2>${t('Saldo de tu cuenta')}</h2>
    <p class="fine">${t('La cuenta que usas a diario. Es el punto de partida; después solo lo escribes al cerrar cada mes.')}</p>
    <label class="field"><span class="label">${t('Saldo')}</span><input type="text" inputmode="decimal" id="h-start" class="bigin" placeholder="${curSym}" autocomplete="off"></label>
    <label class="field"><span class="label">${t('El día')}</span><input type="date" id="h-start-date" value="${toISO(new Date())}" min="${m.range(ym).from}" max="${toISO(new Date())}"></label>
    <button class="btn-dark" data-act="startbal" data-ym="${ym}">${t('Guardar')}</button></section>` : ''}
  <section class="card hero" id="hp" aria-label="${t('Gastado este mes')}">
    <div class="row between"><h2>${t('Este mes')} ${info('mes')}</h2>${vd ? `<span class="pill ${vd.cls}">${vd.word}</span>` : ''}</div>
    <div class="heroval big-ofp hero-ofp">${ofPlan(spent, plan, t('gastado / planificado'), { tone: spent > plan + 0.5 ? 'var(--spend)' : null })}</div>
    ${gauge({ v: spent, proj, tone, ptone, cap: plan, tall: true, key: 'hp-' + ym, marks: [{ at: plan }], note: hpNote, label: t('Gastado {a} de {b}', { a: fmt(spent), b: fmt(plan) }) + (proj != null ? '; ' + t('proyección a fin de mes {x}', { x: fmt(proj) }) : '') })}
    <div class="barleg small num">${proj != null ? `<span><i class="lg-proj" style="--pc:${proj > plan + 0.5 ? 'var(--spend)' : 'var(--out)'}"></i>${t('Proyección a fin de mes')} ≈ ${fmt(Math.round(proj))}</span>` : '<span></span>'}${hpNote && !hpNoteFits ? `<b style="${toneText(hpNote.over ? ptone : 'var(--ok)')}">${hpNote.text}</b>` : ''}</div>
    <div class="row between balrow">${(() => {
      const bs = m.balStart(ym), has = cm.check ? cm.check.bal : bs;
      return has == null ? '<span></span>' : `<span class="balv"><span class="fine">${cm.check ? t('Saldo del {d}', { d: shortDate(cm.check.date) }) : t('Saldo al empezar el mes')}</span><b class="num">${fmt(has)}</b></span>`;
    })()}<button class="btn-sec sm" data-act="check" data-ym="${ym}">${t('Actualizar saldo')}</button></div>
  </section>
  <div class="stats2">
    <section class="card stat"><span class="label"><i class="sdot in"></i>${t('Ingresado')}</span><b class="num">${fmt(m.incomeTo(ym, iso))}</b>
      <span class="fine num">${toCome.length ? t('+{x} el {d}', { x: fmt(toCome.reduce((a, p) => a + p.amount, 0)), d: shortDate(toCome[0].date) }) : came ? `${esc(came.it.name.toLowerCase())} · ${shortDate(came.date)}` : ''}</span></section>
    <section class="card stat"><span class="label"><i class="sdot save"></i>${t('Ahorrado')} ${info('ahorroMes')}</span>${ps == null ? `<b class="num">—</b><span class="ofp-c">${t('planificado')} ${fmt(tgt)}</span>` : ofPlan(ps, tgt, t('proyección / planificado'), { approx: true, signed: ps < 0, tone: ps < 0 ? 'var(--spend)' : 'var(--sav)' })}</section>
  </div>
  ${watchCard(m, ym)}
  ${trailCard(m)}`;
}
/** The account balance over the last 30, 60 or 90 days, and on to the end of the month (an estimate). */
function trailCard(m) {
  const n = [30, 60, 90].includes(UI.trail) ? UI.trail : +lsGet('hucha:trail') || 60, days = [30, 60, 90].includes(n) ? n : 60;
  const pts = m.balanceTrail(days);
  if (pts.length < 2) return '';
  return `<section class="card" aria-label="${t('Saldo de tu cuenta')}">
    <div class="row between"><h2>${t('Saldo')} ${info('saldo')}</h2>
      <div class="seg trail" role="group" aria-label="${t('Periodo')}">${[30, 60, 90].map((d) => `<button data-act="trail" data-v="${d}" aria-pressed="${d === days}">${d} ${t('días')}</button>`).join('')}</div></div>
    ${balanceLine({ pts, aria: t('Saldo de tu cuenta en los últimos {n} días y estimación hasta fin de mes', { n: days }) })}
    <div class="legend"><span><i class="sw" style="background: var(--s1)"></i>${t('saldo')}</span><span><i class="lg-proj" style="--pc: var(--s1)"></i>${t('estimado')}</span></div>
  </section>`;
}
/** The budgets, compact: what you've spent of each. Tap one to log against it. */
function watchCard(m, ym) {
  if (!m.budgets.length) return '';
  return `<section class="card" aria-label="${t('Tus límites')}"><h2>${t('Tus límites')} ${info('limites')}</h2><div class="vlist">${m.budgets.map((b) => {
    const x = budInfo(m, b, ym), pt = x.proj == null ? null : spendTone(x.proj, x.of);
    return `<button class="vrow" data-act="bud" data-id="${esc(b.id)}">
      <span class="row between"><span class="vname">${catEl(b.cat, 'sm')}${esc(b.name)}</span><span class="num small"><b class="${x.spent > x.of + 0.5 ? 'c-spend' : ''}">${fmtN(x.spent)}</b> <span class="muted">/ ${fmt(b.amount)} ${b.freq === 'monthly' ? t('al mes') : t('al año')}</span></span></span>
      ${budBar(x, 'v-' + b.id)}
      ${x.proj != null && x.proj > x.of * SPEND_NEAR ? `<span class="fine num">${t('Proyección a fin de mes ≈')} <b style="${toneText(pt)}">${fmt(Math.round(x.proj))}</b></span>` : ''}</button>`;
  }).join('')}</div></section>`;
}

// ---------- Año ----------
function metas(m) {
  if (!m.items.length) return emptyPlanCard(m);
  const due = closeDue(m), inSeason = m.season.includes(m.curYM), pc = inSeason ? pace(m, m.curYM) : null;
  const ps = pc ? projSaved(m, pc, m.curYM) : null;
  const proj0 = planVsReal(m).sav.proj;
  // one question: will the year reach its goal? The verdict comes from where the year ends at this pace, like Hoy's month
  const vd = m.goal > 0 && !m.pre ? verdict(proj0, m.goal) : null;
  const proj = proj0, ygap = Math.round(Math.abs(m.goal - proj));
  const yNote = !m.goal || m.pre || ygap < 1 ? null : proj < m.goal ? { a: proj, b: m.goal, text: t('≈ {x} por debajo', { x: fmt(ygap) }), cls: 'short' } : { a: m.goal, b: proj, text: t('≈ {x} por encima', { x: fmt(ygap) }), cls: 'gap' };
  const yNoteFits = yNote && (yNote.b - yNote.a) / Math.max(m.goal, proj, 1) >= 0.3;
  const big = (ym) => m.outs.filter((it) => !it.budget && it.freq !== 'monthly' && m.occurs(it, ym)).sort((a, b) => b.amount - a.amount)[0];
  const cells = m.season.map((ym) => {
    const mm = MES3[+ym.slice(5) - 1], d = m.mon(ym);
    const tg = m.targetOf(ym), obj = `<small class="num">/ ${shortMoney(tg).replace('+', '')}</small>`;
    if (ym < m.curYM && d.close) return `<button class="mcell" style="${savedScale(m, ym).style}" data-act="msel" data-ym="${ym}" aria-label="${esc(`${cap(ymLabel(ym))}: ${t('ahorrado')} ${fmt(m.savedOf(ym))} · ${t('planificado')} ${fmt(tg)}`)}"><span>${mm}</span><b class="num">${shortMoney(m.savedOf(ym))}</b>${obj}</button>`;
    if (ym < m.curYM) return `<button class="mcell due" data-act="msel" data-ym="${ym}"><span>${mm}</span><b>${t('por cerrar')}</b>${obj}</button>`;
    if (ym === m.curYM) return `<button class="mcell now" data-act="msel" data-ym="${ym}" aria-label="${esc(`${cap(ymLabel(ym))}: ${t('proyección')} ${ps == null ? '—' : fmt(ps)} · ${t('planificado')} ${fmt(tg)}`)}"><span>${mm} · ${t('hoy')}</span><b class="num muted">${ps == null ? '' : '≈ ' + shortMoney(ps).replace('+', '')}</b>${obj}<i style="width:${pct(pc.day, pc.dim).toFixed(0)}%"></i></button>`;
    const b = big(ym);
    return `<button class="mcell fut" data-act="msel" data-ym="${ym}" aria-label="${esc(`${cap(ymLabel(ym))}: ${t('planificado')} ${fmt(tg)}${b ? ` · ${b.name} ${fmt(b.amount)}` : ''}`)}"><span>${mm}</span><b class="num">${shortMoney(tg).replace('+', '')}</b><small>${b ? esc(b.name.length > 13 ? b.name.slice(0, 12) + '…' : b.name) : t('planificado')}</small></button>`;
  }).join('');
  const nexts = m.outs.filter((i) => i.freq !== 'monthly' && !i.budget).map((i) => ({ i, k: m.season.findIndex((s, ix) => ix >= m.curIdx && m.occurs(i, s)) }))
    .filter((x) => x.k >= 0).sort((a, b) => a.k - b.k).slice(0, 4);
  const last = m.season[11], ended = m.curYM > last;
  return `
  ${pageHead(t('Tu año'), `${MES3[+m.season[0].slice(5) - 1]} ${m.season[0].slice(0, 4)} – ${MES3[+last.slice(5) - 1]} ${last.slice(0, 4)}`, t('Ahorro e inversión'))}
  ${closeBanner(due)}
  <section class="card hero" aria-label="${t('Ahorro del año')}">
    <div class="row between"><h2>${t('Este año')} ${info('ano')}</h2>${vPill(vd)}</div>
    <div class="heroval big-ofp hero-ofp">${ofPlan(m.saved, m.goal, t('ahorrado / planificado'), { tone: 'var(--sav)' })}</div>
    <div id="goal-meter">${gauge({ v: m.saved, proj: m.pre || m.over ? null : proj, tone: 'var(--sav)', ptone: 'var(--sav)', tall: true, key: 'goal',
      marks: [{ at: m.goal, label: `${t('planificado')} ${fmt(m.goal)}` }], note: yNote, label: t('Ahorrado {a} de {b}', { a: fmt(m.saved), b: fmt(m.goal) }) + '; ' + t('proyección a fin de año {x}', { x: fmt(proj) }) })}</div>
    <div class="barleg small num">${m.pre || m.over ? '<span></span>' : `<span><i class="lg-proj" style="--pc:var(--sav)"></i>${t('Proyección a fin de año')} ≈ ${fmt(Math.round(proj))}</span>`}${yNote && !yNoteFits ? `<b style="${toneText(scaleOf(proj, m.goal).c)}">${yNote.text}</b>` : ''}</div>
  </section>
  <section class="card" aria-label="${t('Mes a mes')}">
    <div class="row between"><div><h2>${t('Mes a mes')} ${info('meses')}</h2><span class="fine">${t('ahorrado / planificado de cada mes')}</span></div><span class="swatches" aria-hidden="true"><i class="sv-red"></i><i class="sv-yellow"></i><i class="sv-lite"></i><i class="sv-deep"></i></span></div>
    <div class="mgrid">${cells}</div>
  </section>
  ${nexts.length ? `<section class="card list" aria-label="${t('Meses con más gasto')}">${nexts.map(({ i, k }) => `<div class="trow"><span class="mm">${MES3[+m.season[k].slice(5) - 1]}</span><span class="grow">${esc(i.name)}</span><b class="num">${fmt(i.amount)}</b></div>`).join('')}</section>` : ''}
  ${ended ? yearCard(m) : ''}`;
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
  const nav = `<span class="mnav"><button class="iconbtn" data-act="calmove" data-k="-1" aria-label="${t('Mes anterior')}">${ic('left')}</button><button class="iconbtn" data-act="calmove" data-k="1" aria-label="${t('Mes siguiente')}">${ic('right')}</button></span>`;
  return `
  ${pageHead(cap(ymLabel(ym)), rangeText(m, ym), cur ? t('Este mes') : past ? (d.close ? t('Cerrado') : t('Sin cerrar')) : t('Planificado'), nav)}
  <div class="tiles3">
    <div class="card stat"><span class="label"><i class="sdot in"></i>${past || cur ? t('Ingresado') : t('Ingresos planificados')}</span><b class="num">${fmt(inc)}</b></div>
    <div class="card stat"><span class="label"><i class="sdot out"></i>${past || cur ? t('Gastado') : t('Gasto planificado')}</span>${past || cur ? ofPlan(spent, planSpend(m, ym), t('gastado / planificado'), { tone: spent > planSpend(m, ym) + 0.5 ? 'var(--spend)' : null }) : `<b class="num">${fmt(spent)}</b>`}</div>
    <div class="card stat ${saved == null ? '' : 'svtile'}" ${saved == null ? '' : `style="${scaleOf(saved, tgt, m.target).style}"`}><span class="label">${past || cur ? t('Ahorrado') : t('Ahorro planificado')}</span>${saved == null ? '<b class="num">—</b>' : !past && !cur ? `<b class="num">${fmt(tgt)}</b>` : ofPlan(saved, tgt, cur ? t('proyección / planificado') : t('ahorrado / planificado'), { approx: cur, signed: past })}${vd ? vPill(vd) : ''}</div>
  </div>
  ${past && !d.close ? `<button class="primary" data-act="openclose" data-ym="${ym}">${t('Cerrar {m}', { m: monthName(ym) })}</button>` : ''}
  ${m.balStart(ym) != null && (d.bal != null || ym === m.curYM) ? `<section class="card">${moneyChart(m, ym, d.bal != null ? +d.bal : null)}</section>` : ''}
  ${expectedCard(m, ym)}
  ${spentCard(m, ym)}
  ${d.close ? `<button class="ghost small center-self" data-act="closeundo" data-ym="${ym}">${t('Deshacer el cierre de {m}', { m: monthName(ym) })}</button>` : ''}`;
}

// ---------- quick add: the "+" button ----------
function openQuick(keep = {}) {
  const m = compute(store.data), today = toISO(new Date());
  const date = keep.date || UI.quickDate || today;
  dlg.innerHTML = `<div class="sheet quick" id="quick-sheet">
    <div class="row between"><h2>${t('Apuntar un gasto')}</h2><button type="button" class="iconbtn" data-act="dclose" aria-label="${t('Cerrar')}">${ic('x')}</button></div>
    <label class="amt"><input type="text" inputmode="decimal" id="k-amt" placeholder="0" value="${esc(keep.amt || '')}" autocomplete="off" aria-label="${t('Importe')}"><span>${curSym}</span></label>
    ${catRow(m, true)}
    ${UI.kmore ? catGrid(UI.qcat, 'kpick', true) : ''}
    <div class="fields2">
      <label class="field"><span class="label">${t('Nota')}</span><input id="k-note" value="${esc(keep.note || '')}" placeholder="${t('Opcional')}" autocomplete="off"></label>
      <label class="field"><span class="label">${t('Día')}</span><input type="date" id="k-date" value="${date}"></label>
    </div>
    <button type="button" class="primary big" data-act="kgo">${t('Apuntar')}</button>
    <button type="button" class="ghost small" data-act="addonce" data-date="${date}">${t('¿Un ingreso puntual? Añádelo al plan')}</button>
  </div>`;
  openDialog();
  if (!keep.stay) setTimeout(() => $('#k-amt')?.focus(), 60);
}
const quickKeep = () => ({ amt: $('#k-amt')?.value, note: $('#k-note')?.value, date: $('#k-date')?.value, stay: true });


// ---------- spending types ----------
const catEl = (id, cls = '') => {
  const c = CAT[id];
  return c ? `<span class="ct g-${c.group} ${cls}" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="${c.d}"/></svg></span>`
    : `<span class="ct none ${cls}" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 11h3v3H6zm5 0h3v3h-3zm5 0h3v3h-3z"/></svg></span>`;
};
const catName = (id) => CAT[id]?.name || t('Sin tipo');
/** An expense's type: the one you chose, or one guessed from its name. */
const itemCat = (it) => it.cat || guessCat(it.name);
/** The short row when logging: your budgets' types, then the ones you use most, then a starter set. */
function quickCats(m) {
  const ids = [], add = (id) => { if (CAT[id] && !ids.includes(id)) ids.push(id); };
  add(UI.qcat);
  m.budgets.forEach((b) => add(b.cat));
  add(SAVE_CAT);
  const since = toISO(new Date(Date.now() - 90 * 864e5)), n = {};
  for (const e of m.allSpends) if (e.cat && e.date >= since) n[e.cat] = (n[e.cat] || 0) + 1;
  Object.entries(n).sort((a, b) => b[1] - a[1]).forEach(([id]) => add(id));
  STARTERS.forEach(add);
  return ids.slice(0, 8);
}
const catHint = (m, id) => !id ? t('Tipo (opcional).') : id === SAVE_CAT ? t('Ahorro e inversión · sale de tu cuenta, pero no es gasto') : m.budByCat.get(id) ? `${catName(id)} · ${t('cuenta en tu límite')}` : catName(id);
function catRow(m, inSheet) {
  return `<div class="catrow" role="group" aria-label="Tipo de gasto (opcional)">${quickCats(m).map((id) =>
    `<button type="button" class="catchip g-${CAT[id].group}" data-act="qcat" data-cat="${id}" aria-pressed="${UI.qcat === id}" title="${esc(CAT[id].name)}">${catEl(id)}<span>${esc(CAT[id].short)}</span></button>`).join('')}
    <button type="button" class="catchip" data-act="${inSheet ? 'kmore' : 'catmore'}" aria-expanded="${inSheet ? !!UI.kmore : false}">${catEl('')}<span>${inSheet && UI.kmore ? t('Menos') : t('Más')}</span></button></div>
    <div class="cathint">${esc(catHint(m, UI.qcat))}</div>`;
}
/** Every type, by group. `act` is the action each button fires; `none` adds a "no type" choice. */
const PLUS = '<span class="ct none" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M11 5h2v14h-2zM5 11h14v2H5z"/></svg></span>';
function catGrid(sel, act, none) {
  const by = {};
  for (const c of CATS) (by[c.group] ||= []).push(c);
  const chip = (c) => `<button type="button" class="catchip g-${c.group}" data-act="${act}" data-cat="${c.id}" aria-pressed="${sel === c.id}">${catEl(c.id)}<span>${esc(c.short)}</span></button>`;
  return `<div class="catgrid">${none ? `<div class="grid"><button type="button" class="catchip" data-act="${act}" data-cat="" aria-pressed="${!sel}">${catEl('')}<span>${t('Sin tipo')}</span></button></div>` : ''}
    <div class="stack-sm"><span class="label">${t('Tuyos')}</span><div class="grid">${(by.tuyos || []).map(chip).join('')}
      <button type="button" class="catchip new" data-act="catnew" data-from="${act}">${PLUS}<span>${t('Nuevo tipo')}</span></button></div></div>
    ${Object.entries(GROUPS).filter(([g]) => g !== 'tuyos').map(([g, gname]) => `<div class="stack-sm"><span class="label">${esc(gname)}</span><div class="grid">${by[g].map(chip).join('')}</div></div>`).join('')}</div>`;
}

// ---------- your own spending types ----------
/** Create or edit a type of your own: a name and any of the icons. `from` says where to go back to. */
function openNewCat(from, id) {
  const c = id ? (store.data.settings.cats || []).find((x) => x.id === id) : null;
  UI.nc = { from, id: c?.id || null, name: c?.name || '', icon: c?.icon || '', keep: from === 'kpick' ? quickKeep() : null };
  renderNewCat();
  openDialog();
  setTimeout(() => dlg.querySelector('#nc-name')?.focus(), 60);
}
function renderNewCat() {
  const n = UI.nc;
  dlg.innerHTML = `<div class="sheet" id="nc-sheet">
    <div class="row between"><h2>${n.id ? t('Editar tipo') : t('Nuevo tipo')}</h2><button type="button" class="iconbtn" data-act="ncback" aria-label="${t('Volver')}">${ic('x')}</button></div>
    <label class="field"><span class="label">${t('Nombre')}</span><input id="nc-name" value="${esc(n.name)}" maxlength="24" placeholder="${t('La moto, el pádel, caprichos…')}" autocomplete="off"></label>
    <div class="field"><span class="label">${t('Icono')}</span>
      <div class="icongrid" role="group" aria-label="${t('Icono')}">${[...BASE, ...EXTRA_ICONS].map((c) => `<button type="button" class="iconpick" data-act="ncicon" data-icon="${c.id}" aria-pressed="${n.icon === c.id}" aria-label="${esc(c.name)}" title="${esc(c.name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${c.d}"/></svg></button>`).join('')}</div></div>
    <div class="formbtns"><button type="button" class="primary" data-act="ncsave">${n.id ? t('Guardar') : t('Crear')}</button>
      ${n.id ? `<button type="button" class="danger" data-act="ncdel">${n.confirm ? t('Confirmar borrado') : t('Borrar')}</button>` : ''}</div>
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
    list.splice(at < 0 ? list.length : at, 0, { id, name: name.slice(0, 24), icon });
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
const budBar = (x, key) => gauge({ v: x.spent, proj: x.proj, cap: x.of, tone: x.tone, ptone: x.proj == null ? x.tone : spendTone(x.proj, x.of), key, thin: true, marks: [{ at: x.of }], label: t('{a} de {b}', { a: fmt(x.spent), b: fmt(x.of) }) });
function openBudget(id) {
  const b = store.data.items.find((i) => i.id === id && i.budget);
  if (!b) return;
  const m = compute(store.data), ym = m.curYM, x = budInfo(m, b, ym), over = x.left < -0.5;
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
const flowRow = (ym) => ({ it, date, day, amount, state }) => {
  const [txt, cls] = ST[state], diff = round2(amount - it.amount);
  return `<button class="flow" data-act="occ" data-id="${esc(it.id)}" data-ym="${ym}">
  <span class="d">${day ? `<b>${day}</b>${MES3[+date.slice(5, 7) - 1]}` : '<b>—</b>' + t('mes')}</span>
  <span class="grow"><b>${esc(it.name)}</b><br><span class="fine"><span class="st ${cls}">${txt}</span>${state === 'real' && diff ? ` <span class="num">(${diff > 0 ? '+' : '−'}${fmt(Math.abs(diff))})</span>` : ''}</span></span>
  <span class="num ${it.kind === 'in' ? 'amt-in' : 'amt-out'}">${it.kind === 'in' ? '+' : '−'}${fmt(amount)}</span></button>`;
};

// ---------- Mes ----------
const spendRow = (e) => `<div class="spend">${catEl(e.cat, 'sm')}<span class="grow">${esc(e.note || CAT[e.cat]?.name || t('Gasto'))}${e.note && CAT[e.cat] ? `<span class="fine"> · ${esc(CAT[e.cat].short)}</span>` : ''}<span class="fine"> · ${+e.date.slice(8)} ${MES3[+e.date.slice(5, 7) - 1]}</span></span><b class="num c-spend">−${fmt(e.amount)}</b><button class="iconbtn sm" data-act="delspend" data-id="${esc(e.id)}" aria-label="${t('Borrar gasto')}">${ic('x')}</button></div>`;
const stPill = (st) => `<span class="pill ${st === 'clear' ? 'c-ok' : st === 'partial' ? 'c-warn' : 'c-acc'}">${st === 'clear' ? t('Cumplido') : st === 'partial' ? t('Parcial') : t('Sin datos')}</span>`;



/** What the plan expects this month: still to come first, then what already happened. */
function expectedCard(m, ym) {
  const planned = m.plannedIn(ym);
  const next = planned.filter((p) => p.state === 'future'), past = planned.filter((p) => p.state !== 'future');
  const pend = m.pendingIn(ym).length;
  const sum = (arr, k) => arr.filter((p) => p.it.kind === k).reduce((s, p) => s + p.amount, 0);
  const head = (arr) => { const i = sum(arr, 'in'), o = sum(arr, 'out'); return `<span class="fine num">${i ? ` <span class="c-in">+${fmt(i)}</span> ` : ''}${o ? `−${fmt(o)}` : ''}</span>`; };
  return `<section class="card" aria-label="${t('Planificado este mes')}">
    <div class="row between"><h2>${t('Planificado')}</h2>${pend ? `<span class="pill c-warn">${pend} ${t('por confirmar')}</span>` : ''}</div>
    ${!planned.length ? '<p class="fine">' + t('Nada planificado este mes.') + '</p>' : ''}
    ${next.length ? `<div class="row between"><span class="label">${t('Próximos')}</span>${head(next)}</div><div class="flows">${next.map(flowRow(ym)).join('')}</div>` : ''}
    ${past.length ? `<div class="row between"><span class="label">${t('Pasados')}</span>${head(past)}</div><div class="flows">${past.map(flowRow(ym)).join('')}</div>` : ''}
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
const OVER = 1.2;
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
  const pc = pace(m, ym), after = m.mon(ym).openDate || '';
  // a first month counts from the day you started: before it, nothing (it's already in your balance)
  const from = after ? m.dayOf(after, ym) : 0, days = pc.day - from, total = pc.dim - from;
  if (days < 3) return null;
  const planned = m.plannedIn(ym).filter((p) => p.it.kind === 'out' && !p.save && p.date > after);
  const outPlan = planned.reduce((a, p) => a + p.amount, 0);
  const outPaid = planned.filter((p) => p.state !== 'future').reduce((a, p) => a + p.amount, 0);
  return round2(outPlan + Math.max(0, m.spentAll(ym, m.todayISO) - outPaid) / days * total);
}
/** This month's saving at this pace: its target, plus what the projection leaves of the budget (minus, if it goes over). */
const projSaved = (m, pc, ym) => { const p = projSpent(m, ym); return p == null ? null : round2(m.targetOf(ym) + planSpend(m, ym) - p); };
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
function yearCard(m) {
  const y = yearSummary(m), last = m.season[11], ended = m.curYM > last, ready = ended && m.mon(last).close;
  const past = store.data.settings.years || [];
  return `<section class="card" aria-label="${t('Cierre del año')}">
    <div class="row between"><h2>${t('Cierre del año')}</h2>${ready ? '<span class="pill c-ok">' + t('Disponible') + '</span>' : ''}</div>
    <div class="sum">
      <span>${t('Ahorro e inversión')}</span><b class="num c-save">${fmt(y.saved)} <span class="muted">${t('de {x}', { x: fmt(y.goal) })}</span></b>
      <span>${t('Gastado')}</span><span class="num">${y.months ? `${fmt(y.spent)} <span class="muted">(${fmt(y.avg)}${t('/mes')})</span>` : '—'}</span>
      <span>${t('Meses cumplidos')}</span><span class="num">${t('{a} de {b}', { a: y.cleared, b: 12 })}</span>
    </div>
    ${ready ? `<button class="primary" data-act="openyear">${t('Cerrar el año y planificar el siguiente')}</button>`
      : `<p class="fine">${ended ? `Cierra ${monthName(last)} y podrás cerrar el año.` : `Se abre al terminar ${ymLabel(last)}: verás el resumen y empezarás el año siguiente con el mismo plan.`}</p>`}
    ${past.length ? `<details class="adjust"><summary>${t('Años anteriores')}</summary><div class="sum">${past.slice().reverse().map((p) =>
      `<span>${esc(ymLabel(p.start))} – ${esc(ymLabel(ymAdd(p.start, 11)))}</span><span class="num">${t('{a} de {b}', { a: fmt(p.saved), b: fmt(p.goal) })}</span>`).join('')}</div></details>` : ''}
  </section>`;
}
function openYear() {
  const m = compute(store.data), y = yearSummary(m), nextStart = ymAdd(m.start, 12);
  const reached = y.goal ? y.saved / y.goal : 0;
  dlg.innerHTML = `<div class="sheet closer" id="year-sheet">
    <div class="row between"><span class="label">${t('Cierre del año')}</span><button type="button" class="iconbtn" data-act="dclose" aria-label="${t('Cerrar')}">${ic('x')}</button></div>
    <div data-step class="cl-title"><h1>${cap(ymLabel(m.start))} – ${ymLabel(m.season[11])}</h1>
      <p class="muted">${reached >= 1 ? t('Ahorro planificado cumplido.') : reached >= 0.8 ? t('Cerca del ahorro planificado.') : t('Por debajo del ahorro planificado.')}</p></div>
    <div data-step class="cl-block">
      <div class="row between bottom"><span class="label">${t('Ahorro e inversión')}</span><span class="big c-save num">${fmt(y.saved)}</span></div>
      ${gauge({ v: y.saved, tone: scaleOf(y.saved, y.goal).c, key: 'yr-s' + Date.now(), marks: [{ at: y.goal, label: `${t('planificado')} ${fmt(y.goal)}` }], label: t('Ahorrado {a} de {b}', { a: fmt(y.saved), b: fmt(y.goal) }) })}
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
      <p class="fine">${t('Se mantiene el mismo plan (ingresos, gastos y límites). Puedes modificarlo en Plan.')}</p>
      <label class="field"><span class="label">${t('Ahorro planificado para el año')}</span><input type="text" inputmode="decimal" id="y-goal" value="${esc(m.goal)}" autocomplete="off"></label>
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
function planVsReal(m) {
  const today = new Date(), todayISO = toISO(today), done = (it, ym) => m.stateOf(it, ym) !== 'future';
  const sumItems = (list, fn) => round2(m.season.reduce((s, ym) => s + list.reduce((a, it) => a + (occurs(it, ym) ? fn(it, ym) : 0), 0), 0));
  const line = (label, plan, real, proj, more, icon = '', word = 'planificado', isSav = false) => ({ label, plan: round2(plan), real: round2(real), proj: round2(proj), more, icon, word, isSav });
  const past = m.season.filter((ym) => ym < m.curYM), fut = m.season.filter((ym) => ym > m.curYM), inSeason = m.season.includes(m.curYM);
  const pc = inSeason ? pace(m, m.curYM, today) : null;
  const ins = line(t('Ingresado'), sumItems(m.ins, (it) => it.amount), sumItems(m.ins, (it, ym) => (done(it, ym) ? m.amountIn(it, ym) : 0)), m.incomeY, 'good');
  // savings: what each month saved, this one at its pace, the rest as planned
  const curSaved = pc ? projSaved(m, pc, m.curYM) ?? Math.max(m.savedOf(m.curYM), m.targetOf(m.curYM)) : 0;
  const sav = line(t('Ahorrado'), m.goal, m.saved, past.reduce((s, ym) => s + m.savedOf(ym), 0) + curSaved + fut.reduce((s, ym) => s + m.targetOf(ym), 0), 'good', '', 'planificado', true);
  // spending: everything that isn't saved
  const spentReal = past.reduce((s, ym) => s + m.spentAll(ym), 0) + (inSeason ? m.spentAll(m.curYM, todayISO) : 0);
  const outs = line(t('Gastado'), ins.plan - m.goal, spentReal, ins.proj - sav.proj, 'bad', '', 'planificado');
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
  const buds = m.budgets.map((b) => {
    const spent = b.freq === 'monthly' ? round2(m.season.reduce((s, ym) => s + m.budSpent(b, ym), 0)) : m.budSpentY(b);
    const plan = b.freq === 'monthly' ? b.amount * 12 : b.amount;
    const proj = b.freq === 'monthly' ? m.season.reduce((s, ym) => s + m.budUse(b, ym), 0) : Math.max(b.amount, spent);
    const x = line(b.name, plan, spent, proj, 'bad', catEl(b.cat, 'sm'), 'planificado');
    // "hoy" by the days gone: a yearly limit spread evenly over the year, like the rest of the spending
    if (live) x.due = round2(m.season.reduce((s, ym) => s + (b.freq === 'monthly' ? b.amount : b.amount / 12) * frac(ym), 0));
    return x;
  });
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
  const what = overNow ? t('superado en {x}', { x: fmt(Math.round(x.real - x.plan)) })
    : near ? t('≈ planificado')
      : t(d > 0 ? '≈ {x} por encima' : '≈ {x} por debajo', { x: fmt(Math.abs(d)) });
  const tip = `${x.label}: ${t('hasta hoy {x}', { x: fmt(x.real) })}${x.due != null ? ` (${t('planificado hasta hoy {x}', { x: fmt(x.due) })})` : ''} · ${t('{x} planificados', { x: fmt(x.plan) })} · ${t('proyección a fin de año {x}', { x: fmt(x.proj) })}`;
  return `<div class="cmp">
    <div class="row between"><span class="bn small">${x.icon}<b>${esc(x.label)}</b></span>
      <span class="num small"><b style="${spendLine ? (x.real > x.plan + 0.5 ? toneText('var(--spend)') : '') : toneText(tone)}">${fmtN(x.real)}</b> <span class="muted">/ ${fmt(x.plan)} · ${t('planificado')}</span></span></div>
    ${gauge({ v: x.real, proj: x.proj, tone, ptone, cap: spendLine ? x.plan : null, key: 'cmp-' + key, thin: true, scale,
      marks: [...(x.due != null ? [{ at: Math.max(0, x.due), cls: 'today' }] : []), { at: x.plan }], label: tip })}
    <div class="barleg small num"><span><i class="lg-proj" style="--pc:${spendLine ? (x.proj > x.plan + 0.5 ? 'var(--spend)' : 'var(--out)') : ptone}"></i>${t('Proyección')} ≈ ${fmt(Math.round(x.proj))}</span><b style="${toneText(wtone)}">${what}</b></div>
  </div>`;
}
function planCard(m) {
  const c = planVsReal(m), rows = [c.ins, c.outs, c.sav, ...c.buds];
  // each line against its own plan (25.000 € of income and 600 € of tobacco can't share a scale): the plan's mark at
  // the same place on every row, and "hoy" at what that line's plan expects by today
  return `<section class="card" aria-label="${t('Plan y realidad')}">
    <div class="row between"><h2>${t('Plan y realidad')} ${info('planReal')}</h2><span class="fine">${MES3[+m.season[0].slice(5) - 1]} ${m.season[0].slice(2, 4)} – ${MES3[+m.season[11].slice(5) - 1]} ${m.season[11].slice(2, 4)}</span></div>
    <div class="legend tight"><span><i class="sw" style="background: var(--muted)"></i>${t('hasta hoy')}</span><span><i class="lg-proj" style="--pc: var(--muted)"></i>${t('proyección')}</span><span class="lg-group">${t('planificado:')}<span><i class="lg-mark"></i>${t('año')}</span><span><i class="lg-today"></i>${t('a hoy')}</span></span></div>
    ${[c.ins, c.outs, c.sav].map((x, i) => cmpRow(m, x, 'm' + i)).join('')}
    ${c.buds.length ? `<span class="label">${t('Tus límites')}</span>${c.buds.map((x, i) => cmpRow(m, x, 'b' + i)).join('')}` : ''}
    ${table(['', t('Planificado'), t('Hasta hoy'), t('Proyección')], rows.map((x) => [esc(x.label), fmt(x.plan), fmt(x.real), fmt(x.proj)]))}
  </section>`;
}
const PERIODS = { mes: t('Este mes'), '3m': t('3 meses'), ano: t('Todo el plan') };
function analisis(m) {
  if (!m.items.length) return emptyPlanCard(m);
  const per = PERIODS[UI.anaPer] ? UI.anaPer : 'mes';
  const yms = per === 'mes' ? [m.curYM] : per === '3m' ? [ymAdd(m.curYM, -2), ymAdd(m.curYM, -1), m.curYM]
    : m.season.filter((ym) => ym <= m.curYM);
  const inPer = (e) => yms.includes(m.monthOf(e.date));
  const sp = m.allSpends.filter((e) => inPer(e) && e.cat !== SAVE_CAT);
  const by = {};
  for (const e of sp) by[e.cat || ''] = (by[e.cat || ''] || 0) + e.amount;
  // the plan's expected expenses that already came (rent, bills…), by type: so the total is everything spent
  for (const ym of yms) for (const p of m.plannedIn(ym)) {
    if (p.it.kind !== 'out' || p.save || p.state === 'future') continue;
    const c = itemCat(p.it) || 'otros';
    by[c] = (by[c] || 0) + p.amount;
  }
  // what your balance says you spent beyond what you logged
  const dia = round2(yms.reduce((s, ym) => s + (m.spentSrc(ym) !== 'log' ? Math.max(0, m.spentOf(ym) - m.loggedRest(ym)) : 0), 0));
  if (dia > 0.5) by[DIA] = dia;
  const tot = Object.values(by).reduce((s, v) => s + v, 0), n = Math.max(1, yms.length);
  const rows = Object.entries(by).sort((a, b) => b[1] - a[1]);
  const top = rows.find(([c]) => c && c !== DIA);
  const rkName = (c) => (c === DIA ? t('Sin detallar') : catName(c));
  const shown = rows.slice(0, 8), rest = rows.slice(8).reduce((s, [, v]) => s + v, 0);

  // the plan's months so far
  const sm = m.season.map((ym, i) => ({ ym, i, has: !m.pre && i <= m.curIdx }));
  const left = sm.map(({ ym, has, i }) => {
    const show = has && (i < m.curIdx || m.savedOf(ym) !== 0), v = show ? m.savedOf(ym) : null;
    return { label: MES3[+ym.slice(5) - 1].slice(0, 1).toUpperCase(), value: v, now: ym === m.curYM, fill: v == null ? null : scaleOf(v, m.targetOf(ym), m.target).c, mark: m.targetOf(ym),
      tip: `${cap(ymLabel(ym))}: ${v == null ? t('aún no') : t('ahorrado') + ' ' + fmt(v)} · ${t('planificado')} ${fmt(m.targetOf(ym))}` };
  });
  const nowLine = (html) => (m.pre || m.over ? '' : `<p class="nowline num"><span class="muted">${cap(monthName(m.curYM))}:</span> ${html}</p>`);
  const lastI = left.map((c) => c.value != null).lastIndexOf(true);
  const outOfM = (ym) => (ym === m.curYM ? m.spentAll(ym, toISO(new Date())) : m.spentAll(ym));
  const io = sm.map(({ ym, has }) => ({ label: MES3[+ym.slice(5) - 1].slice(0, 1).toUpperCase(), a: m.incomeOf(ym), b: has ? outOfM(ym) : null, now: ym === m.curYM,
    tip: `${cap(ymLabel(ym))}: ${t('ingresado')} ${fmt(m.incomeOf(ym))}${has ? ` · ${t('gastado')} ${fmt(outOfM(ym))}` : ` (${t('planificado')})`}` }));

  return `
  ${planCard(m)}
  <h2 class="section-h">${t('Tus gastos')}</h2>
  <div class="seg period" role="group" aria-label="${t('Periodo')}">${Object.entries(PERIODS).map(([k, l]) => `<button data-act="anaper" data-v="${k}" aria-pressed="${per === k}">${l}</button>`).join('')}</div>

  <div class="tiles">
    <div class="tile"><span class="label">${t('Gastado')}</span><span class="v num">${compactMoney(tot)}</span><span class="fine">${esc(PERIODS[per].toLowerCase())}</span></div>
    ${per === 'mes' ? '' : `<div class="tile"><span class="label">${t('Al mes')}</span><span class="v num">${compactMoney(tot / n)}</span><span class="fine">${t('de media')}</span></div>`}
    <div class="tile"><span class="label">${t('Mayor gasto')}</span><span class="v">${top ? catEl(top[0], 'sm') : '—'}</span><span class="fine">${top ? esc(CAT[top[0]].short) + ' · ' + fmt(top[1]) : t('sin tipos')}</span></div>
  </div>

  <section class="card" aria-label="${t('Gasto por tipo')}">
    <div class="row between"><h2>${t('Gasto por tipo')}</h2><span class="fine num">${fmt(tot)}</span></div>
    ${rows.length ? ranked([...shown.map(([c, v]) => ({ icon: catEl(c === DIA ? '' : c, 'sm'), label: rkName(c), value: v, extra: m.budByCat.get(c) ? ' <span class="fine c-acc">' + t('límite') + '</span>' : '',
      tip: `${rkName(c)}: ${fmt(v)} (${Math.round(v / (tot || 1) * 100)} %)` })), ...(rest ? [{ icon: catEl(''), label: t('Otros tipos'), value: rest, tip: `Otros tipos: ${fmt(rest)}` }] : [])])
      + table([t('Tipo'), t('Importe'), '%'], rows.map(([c, v]) => [esc(rkName(c)), fmt(v), Math.round(v / (tot || 1) * 100) + ' %']))
      : '<p class="fine">' + t('Aún no hay gastos en este periodo. Cierra el mes con tu saldo, o apunta con el + lo que quieras vigilar.') + '</p>'}
  </section>

  <h2 class="section-h">${t('Tu año, mes a mes')}</h2>

  <section class="card" aria-label="${t('Ahorrado cada mes')}">
    <h2>${t('Ahorrado cada mes')} ${info('ahorradoMes')}</h2>
    <div class="legend"><span><span class="swatches" aria-hidden="true"><i class="sv-red"></i><i class="sv-yellow"></i><i class="sv-lite"></i><i class="sv-deep"></i></span>${t('ahorrado (de peor a mejor)')}</span><span><i class="lg-tick"></i>${t('planificado del mes')}</span></div>
    ${columns({ cols: left, labels: lastI >= 0 ? [lastI] : [], aria: t('Ahorrado / planificado de cada mes') })}
    ${nowLine(`${t('ahorrado')} <b>${fmt(m.savedOf(m.curYM))}</b> · ${t('planificado')} <b>${fmt(m.targetOf(m.curYM))}</b>`)}
    ${table([t('Mes'), t('Ahorrado'), t('Planificado')], sm.map(({ ym }, i) => [esc(cap(ymLabel(ym))), left[i].value == null ? '—' : fmt(left[i].value), fmt(m.targetOf(ym))]))}
  </section>

  <section class="card" aria-label="${t('Ingresado y gastado')}">
    <div class="row between"><h2>${t('Ingresado y gastado')}</h2><span class="legend"><span><i class="sw ch-in"></i>${t('ingresado')}</span><span><i class="sw ch-out"></i>${t('gastado')}</span></span></div>
    ${pairs({ cols: io, aria: t('Ingresos y gastos de cada mes') })}
    ${nowLine(`${t('ingresado')} <b>${fmt(m.incomeOf(m.curYM))}</b> · ${t('gastado')} <b>${fmt(outOfM(m.curYM))}</b>`)}
    ${table([t('Mes'), t('Ingresado'), t('Gastado')], sm.map(({ ym, has }) => [esc(cap(ymLabel(ym))), fmt(m.incomeOf(ym)), has ? fmt(outOfM(ym)) : '—']))}
  </section>`;
}
const compactMoney = (v) => (v < 10000 ? fmt(v) : fmt(1).replace('1', (v / 1000).toLocaleString(locale, { maximumFractionDigits: 1 }) + 'K'));

// ---------- Plan ----------
// Plan once: the yearly goal, what comes in, what you know will go out, and budgets for what you want to keep an eye on.
function plan(m) {
  const s = store.data.settings;
  const avgIn = m.incomeY / 12, avgOut = m.outY / 12, free = m.restAvg;
  const budM = m.budY / 12, tot = Math.max(avgIn, avgOut + budM + m.target, 1), w = (v) => clamp(v / tot * 100, 0, 100).toFixed(1);
  const outs = m.outs.filter((i) => !i.budget).sort((a, b) => (a.freq === 'monthly' ? 0 : 1) - (b.freq === 'monthly' ? 0 : 1));
  const budY = m.budY;
  const outM = outs.filter((i) => !m.isSave(i)).reduce((a, i) => a + i.amount * timesIn(i, m.season), 0) / 12;
  const maxGoal = Math.max(0, Math.floor(m.possible / 100) * 100), share = m.incomeY ? Math.round(m.goal / m.incomeY * 100) : 0;
  // one-off items whose day has passed are done: they leave the list and wait, folded, under "Cumplidos"
  const todayISO = toISO(new Date());
  const isDone = (it) => it.freq === 'once' && !it.budget && it.year && m.dateOf(it, `${it.year}-${String(it.month || 1).padStart(2, '0')}`) <= todayISO;
  const group = (title, sub, all, preset, addLabel, total) => { const list = all.filter((it) => !isDone(it)), done = all.filter(isDone);
    return `<section class="card">
    <div class="row between"><div><h2>${title}</h2>${sub ? `<div class="fine">${sub}</div>` : ''}</div>${total != null ? `<span class="fine num nowrap">${total}</span>` : ''}</div>
    <div class="plist">${list.map((it) => planRow(it, m, list.length > 1)).join('') || '<p class="fine">' + t('Nada todavía.') + '</p>'}</div>
    <button data-act="additem" data-preset='${esc(JSON.stringify(preset))}'>+ ${addLabel}</button>
    ${done.length ? `<details class="tview donelist"><summary>${t('Cumplidos')} (${done.length})</summary><div class="plist">${done.map((it) => planRow(it, m, false)).join('')}</div></details>` : ''}</section>`; };
  return `<section class="card" aria-label="${t('Ahorro e inversión planificados')}">
    <div class="row between"><h2>${t('Ahorro e inversión planificados')} ${info('plan')}</h2></div>
    <button type="button" class="goalbtn" data-act="goaledit" aria-label="Cambiar el ahorro planificado: ${esc(fmt(s.goal))} al año">
      <span class="gb-v num">${fmt(s.goal)}<small> ${t('al año')}</small></span>
      <span class="fine num">≈ ${fmt(round2(s.goal / 12))} ${t('al mes')}${m.incomeY ? ` · ${t('{p} % de tus ingresos', { p: share })}` : ''}</span>
      <span class="gb-edit" aria-hidden="true">${t('Cambiar')}</span>
    </button>
    <span class="label">${t('Reparto de tus ingresos')}</span>
    <div class="stackbar" aria-hidden="true"><i class="k-save" data-bar="${w(m.target)}" data-key="sb-save"></i><i class="k-fix" data-bar="${w(avgOut)}" data-key="sb-out"></i><i class="k-bud" data-bar="${w(budM)}" data-key="sb-bud"></i><i class="${free >= 0 ? 'k-free' : 'k-neg'}" data-bar="${w(Math.abs(free))}" data-key="sb-free"></i></div>
    <div class="legend num">${[['k-save', t('ahorro'), m.target], ['k-fix', t('gastos planificados'), avgOut], ['k-bud', t('límites de gasto'), budM], [free >= 0 ? 'k-free' : 'k-neg', free >= 0 ? t('sin planificar') : t('falta'), Math.abs(free)]]
      .filter(([, , v]) => v > 0.5).map(([k, l, v]) => `<span><i class="dot ${k}"></i>${l} <b>${avgIn ? Math.round(v / avgIn * 100) : 0} %</b></span>`).join('')}</div>
    <div class="sum">
      <span>${t('Ingresos planificados')}</span><b>${fmt(m.incomeY)}</b>
      <span>${t('Ahorro planificado')}</span><span>−${fmt(m.goal)}</span>
      <span class="tot">${t('Gasto total planificado')}</span><span class="tot">${fmt(m.incomeY - m.goal)}</span>
      <span class="sub">${t('Gastos planificados')}</span><span>${fmt(m.outY)}</span>
      ${m.budgets.length ? `<span class="sub">${t('Límites de gasto')}</span><span>${fmt(budY)}</span>` : ''}
      <span class="sub">${t('Sin planificar')}</span><span class="${free < 0 ? 'c-spend' : ''}">${free < 0 ? '−' : ''}${fmt(Math.abs(free * 12))}</span>
    </div>
    ${free < 0 ? `<div class="note c-spend">${t('No cabe: faltan {x} al mes. Como mucho caben {y} al año, sin dejar nada para gastar.', { x: fmt(-free), y: fmt(maxGoal) })}
        <div class="row"><button class="small" data-act="goalfit" data-v="${Math.max(0, Math.floor((m.possible - Math.max(0, m.possible) * 0.4) / 100) * 100)}">${t('Ajustar a una cifra viable')}</button></div></div>`
      : ''}
    <label class="field inline-field"><span class="label">${t('El año empieza en')}</span><input type="month" id="p-start" value="${esc(m.start)}"></label>
    <label class="field inline-field"><span class="label">${t('Tu mes empieza el día')}</span><input type="text" inputmode="numeric" id="p-cycle" value="${m.cycleDay}" style="max-width: 80px"></label>
  </section>
  ${group(t('Ingresos planificados'), '', m.ins, { kind: 'in', freq: 'monthly', _sec: 'in' }, t('Añadir ingreso'), fmt(m.incomeY) + t(' al año'))}
  ${group(t('Gastos planificados'), '', outs, { kind: 'out', freq: 'monthly', _sec: 'out' }, t('Añadir gasto'), outs.length ? fmt(outM) + t('/mes') : null)}
  ${group(t('Límites de gasto'), '', m.budgets, { kind: 'out', freq: 'yearly', budget: true, _sec: 'bud' }, t('Añadir límite'), m.budgets.length ? fmt(budY / 12) + t('/mes') : null)}`;
}
const GRIP = '<svg viewBox="0 0 9 15" aria-hidden="true"><path d="M0 0h3v3H0zM6 0h3v3H6zM0 6h3v3H0zM6 6h3v3H6zM0 12h3v3H0zM6 12h3v3H6z"/></svg>';
function planRow(it, m, movable) {
  let real = '';
  if (it.real != null) {
    real = `<span>${t('últimos 12 meses')}: ${fmt(it.real)}${unit(it)}</span>`;
    if (it.kind === 'out' && it.real - it.amount > it.real * 0.05) real += `<span class="c-warn">${t('planificas {x} menos', { x: fmt(it.real - it.amount) })}</span>`;
  }
  return `<div class="pitem" data-id="${esc(it.id)}">${movable ? `<button type="button" class="grip" aria-label="Mover ${esc(it.name)} (flechas arriba y abajo)" title="${t('Arrastra para ordenar')}">${GRIP}</button>` : ''}<button class="prow" data-act="edit" data-id="${esc(it.id)}">
    <span class="n">${it.kind === 'out' && CAT[itemCat(it)] ? catEl(itemCat(it), 'sm') : ''}${esc(it.name)}</span><span class="a ${it.kind === 'in' ? 'c-in' : ''}">${it.kind === 'in' ? '+' : ''}${fmt(it.amount)}<small>${unit(it)}</small></span>
    <span class="sub"><span>${it.budget ? (it.freq === 'monthly' ? t('al mes') : t('al año')) : esc(freqText(it))}</span>${m.isSave(it) ? '<span class="c-sav">' + t('ahorro · no es gasto') + '</span>' : ''}${it.vary ? '<span class="c-warn">' + t('varía') + '</span>' : ''}${real}</span>
  </button></div>`;
}
/** A Plan list was reordered: put its items in that order, in the slots they already held among all items. */
function reorder(ids) {
  store.update('items', (d) => {
    const want = new Set(ids), byId = new Map(d.items.map((it) => [it.id, it]));
    d.items.map((it, i) => (want.has(it.id) ? i : -1)).filter((i) => i >= 0).forEach((slot, k) => { d.items[slot] = byId.get(ids[k]); });
  });
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
  return `${startCard}<section class="card"><h2>${t('Dónde se guarda')}</h2>
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
  <p class="fine center"><a href="privacy.html">${t('Privacidad')}</a> ${t('· MoneyTracker')}</p>`;
}

// ---------- item form (dialog) ----------
let FORM = null, CONFIRM = false;
function openItem(it, preset = {}) {
  FORM = it ? { ...it, _edit: true } : { kind: 'out', freq: 'monthly', amount: '', ...preset };
  if (FORM.kind === 'out' && !FORM.cat && FORM.name) FORM.cat = guessCat(FORM.name);
  CONFIRM = false;
  renderForm();
  openDialog();
}
const SEC_FREQ = {
  in: FREQ,
  out: { monthly: t('Cada mes'), quarterly: t('Cada 3 meses'), yearly: t('Una vez al año') },
  bud: { yearly: t('Al año'), monthly: t('Al mes') },
};
const secOf = (f) => f._sec || (f.kind === 'in' ? 'in' : f.budget ? 'bud' : 'out');
function renderForm() {
  const f = FORM, sec = secOf(f);
  f.kind = sec === 'in' ? 'in' : 'out';
  if (sec === 'bud') { f.budget = true; if (f.freq !== 'monthly') f.freq = 'yearly'; } else delete f.budget;
  const freqs = { ...SEC_FREQ[sec], ...(sec === 'out' && f.freq === 'once' ? { once: t('Una sola vez') } : {}) };
  if (!freqs[f.freq]) f.freq = Object.keys(freqs)[0];
  const bud = sec === 'bud';
  const monthSel = (allowNone) => `<select id="f-month">${allowNone ? `<option value="0" ${!f.month ? 'selected' : ''}>Sin fecha fija</option>` : ''}${MES.map((n, i) => `<option value="${i + 1}" ${+f.month === i + 1 ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
  dlg.innerHTML = `<form method="dialog" class="sheet" id="item-form">
    <div class="row between"><h2>${f._edit ? (sec === 'in' ? t('Editar ingreso') : bud ? t('Editar límite') : t('Editar gasto')) : (sec === 'in' ? t('Nuevo ingreso') : bud ? t('Nuevo límite') : t('Nuevo gasto'))}</h2><button type="button" class="iconbtn" data-act="fclose" aria-label="${t('Cerrar')}">${ic('x')}</button></div>
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
    <div class="formbtns">
      <button type="button" class="primary" data-act="fsave">${f._edit ? t('Guardar') : t('Añadir')}</button>
      ${f._edit ? `<button type="button" data-act="fdup">${t('Duplicar')}</button>` : ''}
      ${f._edit ? `<button type="button" class="danger" data-act="fdel">${CONFIRM ? t('Confirmar borrado') : t('Borrar')}</button>` : ''}
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
    const c = f.cat || 'otros', other = store.data.items.find((i) => i.budget && i.cat === c && i.id !== f.id);
    if (other) return toast(t('Ya tienes un límite de {c}: «{n}»', { c: catName(c), n: other.name }), 3500);
  }
  const old = f._edit ? store.data.items.find((i) => i.id === f.id) : null;
  const it = normItem({ ...f, amount, id: f.id || uid(f.kind), real: old?.real });
  store.update('items', (d) => {
    if (old) d.items = d.items.map((x) => (x.id === it.id ? it : x)); else d.items.push(it);
  });
  dlg.close();
  toast(old ? t('Guardado') : t('Añadido'));
}

// ---------- one occurrence: the exact amount for a month ----------
function openOcc(id, ym) {
  const it = store.data.items.find((i) => i.id === id);
  if (!it) return;
  const m = compute(store.data), r = m.realOf(it, ym);
  const day = it.day ? t(' · día ') + Math.min(it.day, daysInMonth(ym)) : '';
  dlg.innerHTML = `<div class="sheet" id="occ-form">
    <div class="row between"><h2>${esc(it.name)}</h2><button type="button" class="iconbtn" data-act="dclose" aria-label="${t('Cerrar')}">${ic('x')}</button></div>
    <p class="fine num">${cap(ymLabel(ym))}${day} · ${t('planificado')} ${fmt(it.amount)}</p>
    <label class="field"><span class="label">${t('Importe de este mes')} ${curSym}</span>
      <input type="text" inputmode="decimal" id="o-real" value="${esc(r ?? it.amount)}" autocomplete="off"></label>
    <p class="fine">${it.vary ? t('Este importe varía: hasta que lo confirmes, cuenta el importe planificado.') : t('Si no lo tocas, cuenta el importe planificado.')} ${t('Pon 0 si este mes no ha habido.')}</p>
    <div class="formbtns">
      <button type="button" class="primary" data-act="oconfirm" data-id="${esc(id)}" data-ym="${ym}">Confirmar</button>
      ${r != null ? `<button type="button" data-act="oclear" data-id="${esc(id)}" data-ym="${ym}">${t('Volver al importe planificado')}</button>` : ''}
      <button type="button" class="ghost" data-act="edit" data-id="${esc(id)}">${t('Editar en el plan')}</button>
    </div></div>`;
  openDialog();
  const inp = dlg.querySelector('#o-real'); inp.focus(); inp.select();
}
function setReal(id, ym, v) {
  const it = store.data.items.find((i) => i.id === id);
  const key = 'real';
  store.update('months', (d) => {
    const mo = d.months[ym] = { ...(d.months[ym] || {}) };
    const o = { ...(mo[key] || {}) };
    if (v == null) delete o[id]; else o[id] = v;
    if (Object.keys(o).length) mo[key] = o; else delete mo[key];
  });
}

// ---------- the balance: the figure everything else comes from ----------
/** compute() as if the month had these figures (for previews while you type). */
const withMonth = (ym, patch) => compute({ ...store.data, months: { ...store.data.months, [ym]: { ...(store.data.months[ym] || {}), ...patch } } });
// the month's start balance: asked when there is none, and editable while it was typed by hand (the balance just before payday)
const openField = (m, ym, id) => m.balStart(ym) != null && m.mon(ym).open == null ? '' : `<div class="fields2"><label class="field"><span class="label">${t('Saldo de tu cuenta')} · ${t('inicio')}</span>
  <input type="text" inputmode="decimal" id="${id}" value="${esc(m.mon(ym).open ?? '')}" placeholder="${t('Solo esta vez')}" autocomplete="off"></label>
  <label class="field"><span class="label">${t('El día')}</span><input type="date" id="${id}-date" value="${esc(m.mon(ym).openDate || m.range(ym).from)}" min="${m.range(ym).from}" max="${toISO(new Date())}"></label></div>`;
/** One line of the money summary: label, signed amount. */
const sumLine = (l, v, cls = '') => `<span>${l}</span><span class="num ${cls}">${v > 0 ? '+' : v < 0 ? '−' : ''}${fmt(Math.abs(v))}</span>`;

/** The month close: one question (your balance) and what to do with what's left. */
function openClose(ym) {
  const m = compute(store.data), d = m.mon(ym);
  dlg.innerHTML = `<div class="sheet closer" id="close-sheet" data-ym="${ym}">
    <div class="row between"><span class="label">${t('Cierre de mes')} ${info('cierre')}</span><button type="button" class="iconbtn" data-act="dclose" aria-label="${t('Cerrar')}">${ic('x')}</button></div>
    <div data-step class="cl-title row between"><h1>${cap(monthName(ym))}</h1><span id="cl-vd"></span></div>
    <div data-step class="stack-sm">
      ${openField(m, ym, 'cl-open')}
      <label class="field"><span class="label">${t('Saldo de tu cuenta')}</span>
        <input type="text" inputmode="decimal" id="cl-bal" class="bigin" value="${esc(d.bal ?? '')}" placeholder="${curSym}" autocomplete="off">
</label>
    </div>
    <div id="cl-calc" aria-live="polite"></div>
  </div>`;
  openDialog();
  dlg.classList.add('full');
  stagger(dlg.querySelector('.closer'));
  closeCalc();
  if (d.bal == null) setTimeout(() => (dlg.querySelector('#cl-open') || dlg.querySelector('#cl-bal'))?.focus(), 80);
}
function closePatch() {
  const bal = num(dlg.querySelector('#cl-bal')?.value), op = dlg.querySelector('#cl-open');
  const patch = { bal: bal ?? undefined };
  if (op) { patch.open = num(op.value) ?? undefined; const d = dlg.querySelector('#cl-open-date')?.value; if (patch.open != null && d) patch.openDate = d; }
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
    <p class="cl-line">${r.save > 0.5 ? t('Pasaste {x} al ahorro.', { x: `<b>${fmt(r.save)}</b>` }) + ' ' : ''}${savedM >= -0.5 ? t('Aportas {x} a tu ahorro.', { x: `<b class="c-ok">${fmt(savedM)}</b>` }) : t('Consumes {x} de tu ahorro.', { x: `<b class="c-spend">${fmt(-savedM)}</b>` })}</p>
    ${moneyChart(m, ym, bal)}
    <button class="primary" data-act="closeset" data-ym="${ym}">${t('Cerrar {m}', { m: monthName(ym) })}</button>`;
}
/** The month's money as a line: 0 on day 1, up when the pay comes in, down as it goes. */
function moneyChart(m, ym, bal) {
  const live = bal == null, cv = live ? m.curveNow(ym) : m.curveOf(ym, bal);
  if (!cv) return '';
  const first = cv.pts[0].day, dim = cv.pts[cv.pts.length - 1].day, name = monthName(ym), last = cv.pts.length - 1;
  const projFrom = live && cv.fromDay <= dim ? cv.fromDay - first : null;
  const evText = (e) => `${e.label} ${fmtSigned(e.amount)}`;
  const pts = cv.pts.map((p) => ({ y: p.y, tip: p.day ? `${t('Día')} ${p.day}: ${live && p.day >= cv.fromDay ? '≈ ' : ''}${fmtSigned(p.y)}${p.events.length ? ' · ' + p.events.slice().sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, 2).map(evText).join(', ') : ''}` : `${t('Empieza el mes')}: ${fmt(0)}` }));
  const inDay = cv.pts.reduce((b, p, ix) => { const v = p.events.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0); return v > b.v ? { i: ix, v } : b; }, { i: -1, v: 0 });
  const marks = [...(inDay.i > 0 && inDay.i !== last ? [{ i: inDay.i, text: `+${fmt(inDay.v)}` }] : []), { i: last, text: (projFrom != null ? '≈ ' : '') + fmtSigned(cv.pts[last].y) }];
  const rows = cv.pts.filter((p) => (p.events.length && !(live && p.day >= cv.fromDay)) || p.day === dim).map((p) => [String(p.day), esc(p.events.map(evText).join(', ') || '—'), (live && p.day >= cv.fromDay ? '≈ ' : '') + fmtSigned(p.y)]);
  return `<div class="cl-block">
    <div><span class="label">${t('Tu dinero en {m}', { m: name })}</span>${live ? `<div class="fine">${t('estimado según tu último saldo')}</div>` : ''}</div>
    ${line({ pts, marks, projFrom, xTicks: [1, 10, 20, dim].filter((d) => d >= first).map((d) => ({ i: d - first, text: d })), aria: t('Tu dinero a lo largo de {m}: empieza en 0 y termina en {x}', { m: name, x: fmtSigned(cv.pts[dim].y) }) })}
    ${table([t('Día'), t('Movimientos'), t('Acumulado')], rows)}
  </div>`;
}

/** A look at the balance mid-month: how you're doing without logging every spend. */
// the yearly saving, written either per year or per month (the plan keeps it per year)
function openGoal() {
  const g = store.data.settings.goal || 0;
  UI.goalPer = UI.goalPer === 'm' ? 'm' : 'y';
  dlg.innerHTML = `<div class="sheet" id="goal-sheet">
    <div class="row between"><h2>${t('Ahorro e inversión planificados')}</h2><button type="button" class="iconbtn" data-act="dclose" aria-label="${t('Cerrar')}">${ic('x')}</button></div>
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
  const m = compute(store.data), c = m.mon(ym).check;
  dlg.innerHTML = `<div class="sheet" id="check-sheet" data-ym="${ym}">
    <div class="row between"><h2>${t('Saldo de hoy')}</h2><button type="button" class="iconbtn" data-act="dclose" aria-label="${t('Cerrar')}">${ic('x')}</button></div>
    ${openField(m, ym, 'ck-open')}
    <label class="field"><span class="label">${t('Saldo hoy')}</span><input type="text" inputmode="decimal" id="ck-bal" class="bigin" value="" placeholder="${c ? t('El último: ') + fmt(c.bal) : t('Saldo según tu banco')}" autocomplete="off">
</label>
    <div id="ck-calc" aria-live="polite"></div>
    <div class="formbtns"><button class="primary" data-act="checkset" data-ym="${ym}">${t('Guardar')}</button>${c ? `<button class="ghost" data-act="checkclear" data-ym="${ym}">${t('Olvidar el del {d}', { d: +c.date.slice(8) })}</button>` : ''}</div>
  </div>`;
  openDialog();
  checkCalc();
  setTimeout(() => (dlg.querySelector('#ck-open') || dlg.querySelector('#ck-bal'))?.focus(), 80);
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
    toast(t('Ahorro planificado del año cumplido'), 3500); return true;
  }
  return false;
}

// ---------- actions ----------
function setMonth(ym, patch) {
  store.update('months', (d) => { d.months[ym] = { ...(d.months[ym] || {}), ...patch }; });
}
function addSpend(date, amount, note, from, cat) {
  const e = { id: uid('g'), date, amount: round2(amount), note: note || '', ...(cat ? { cat } : {}) };
  const bud = cat && store.data.items.find((i) => i.budget && i.cat === cat);
  UI.qcat = null;
  const done = celebrate(() => store.update('spends', (d) => { d.spends.push(e); }), from);
  UI.undo.push(e.id); UI.undo = UI.undo.slice(-20);
  if (!done) toast(`${t('Apuntado')} ${fmt(amount)}${cat ? ' · ' + CAT[cat].short : ''}${bud ? ` (${t('límite')})` : cat === SAVE_CAT ? ` (${t('no es gasto')})` : ''}`);
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
      <p>${t('{n} ingresos y gastos, ahorro planificado de {x} al año desde {m}.', { n: data.items.length, x: fmt(data.settings.goal), m: ymLabel(data.settings.start) })} ${store.mode === 'google' ? t('Sustituye todo lo que hay ahora, también en tu hoja de Drive.') : t('Sustituye todo lo que hay ahora.')}</p>
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
  const act = b.dataset.act, ym = b.dataset.ym;
  const val = (id) => document.getElementById(id)?.value;
  switch (act) {
    case 'tab': go(b.dataset.tab); break;
    case 'back': goBack(); break;
    case 'connect': connect(); break;
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
    case 'lang': setLang(b.dataset.v); break;
    case 'theme': lsSet('hucha:theme', b.dataset.v === 'auto' ? null : b.dataset.v); applyTheme(b.dataset.v); render(true); break;

    case 'openclose': openClose(ym); break;
    case 'startbal': {
      // the balance on the day you start: this month counts from today, what came before is already in it
      const v = num(val('h-start'));
      if (v == null) { invalid('#h-start', t('Escribe tu saldo')); return; }
      const d = val('h-start-date') || toISO(new Date()), lo = compute(store.data).range(ym).from, hi = toISO(new Date());
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
      if (g == null || g < 0) return invalid('#y-goal', t('Escribe el ahorro planificado'));
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
        const mo = d.months[ym] = { ...(d.months[ym] || {}), check: patch.check };
        if (patch.open != null) mo.open = patch.open;
        if (patch.openDate) mo.openDate = patch.openDate;
      });
      toast(t('Saldo guardado'));
      break;
    }
    case 'checkclear': store.update('months', (d) => { const mo = d.months[ym] = { ...(d.months[ym] || {}) }; delete mo.check; }); dlg.close(); toast(t('Olvidado')); break;
    case 'closeundo': setClose(ym, null); toast(t('Cierre deshecho')); break;
    case 'qcat': {
      UI.qcat = UI.qcat === b.dataset.cat ? null : b.dataset.cat;
      document.querySelectorAll('.catrow [data-act="qcat"]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.cat === UI.qcat)));
      const hint = catHint(compute(store.data), UI.qcat);
      document.querySelectorAll('.cathint').forEach((h) => { h.textContent = hint; });
      break;
    }
    case 'catmore': openCatPicker(); break;
    case 'catnew': if (b.dataset.from === 'fcat') readForm(); openNewCat(b.dataset.from); break;
    case 'catedit': openNewCat('manage', b.dataset.id); break;
    case 'ncback': ncReturn(null); break;
    case 'ncicon': {
      UI.nc.icon = UI.nc.icon === b.dataset.icon ? '' : b.dataset.icon;
      dlg.querySelectorAll('.iconpick').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.icon === UI.nc.icon)));
      break;
    }
    case 'ncsave': saveNewCat(); break;
    case 'ncdel': {
      if (!UI.nc.confirm) { UI.nc.confirm = true; UI.nc.name = val('nc-name') || UI.nc.name; renderNewCat(); break; }
      const id = UI.nc.id;
      store.update('settings', (d) => { d.settings.cats = (d.settings.cats || []).filter((c) => c.id !== id); if (!d.settings.cats.length) delete d.settings.cats; });
      setCustomCats(store.data.settings.cats || []);
      if (UI.qcat === id) UI.qcat = null;
      UI.nc = null; dlg.close(); toast(t('Tipo borrado')); render(true);
      break;
    }
    case 'quick': UI.quickDate = b.dataset.date || null; UI.kmore = false; openQuick(); break;
    case 'kmore': { const k = quickKeep(); UI.kmore = !UI.kmore; openQuick(k); break; }
    case 'kpick': { const k = quickKeep(); UI.qcat = b.dataset.cat || null; UI.kmore = false; openQuick(k); break; }
    case 'kgo': {
      const v = num(val('k-amt')), date = val('k-date') || toISO(new Date());
      if (!v || v <= 0) { invalid('#k-amt', t('Escribe un importe')); return; }
      dlg.close();
      addSpend(date, v, (val('k-note') || '').trim(), null, UI.qcat);
      break;
    }
    case 'trail': UI.trail = +b.dataset.v; lsSet('hucha:trail', UI.trail); render(true); break;
    case 'anaper': UI.anaPer = b.dataset.v; lsSet('hucha:ana', UI.anaPer); render(true); break;
    case 'morespends': UI.allSpends = ym; render(true); break;
    case 'qpick': UI.qcat = b.dataset.cat || null; dlg.close(); render(true); break;
    case 'fcatopen': readForm(); FORM._pick = !FORM._pick; renderForm(); break;
    case 'fcat': readForm(); FORM.cat = b.dataset.cat || null; FORM._nocat = !b.dataset.cat; FORM._pick = false; renderForm(); break;
    case 'bud': openBudget(b.dataset.id); break;
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
    case 'delspend': {
      store.update('spends', (d) => { d.spends = d.spends.filter((x) => x.id !== b.dataset.id); }); toast(t('Gasto borrado'));
      const sheet = $('#bud-sheet'); if (sheet) openBudget(sheet.dataset.id);
      break;
    }
    case 'msel': UI.mesYM = ym; go('mes'); break;
    case 'calmove': UI.mesYM = ymAdd(UI.mesYM, +b.dataset.k); render(true); break;
    case 'occ': openOcc(b.dataset.id, ym); break;
    case 'oconfirm': {
      const v = num(val('o-real'));
      if (v == null || v < 0) return invalid('#o-real', t('Escribe un importe'));
      dlg.close();
      if (!celebrate(() => setReal(b.dataset.id, ym, v), null)) toast(`Confirmado: ${fmt(v)}`);
      break;
    }
    case 'oclear': setReal(b.dataset.id, ym, null); dlg.close(); toast(t('Cuenta el importe planificado')); break;
    case 'edit': { const it = store.data.items.find((i) => i.id === b.dataset.id); if (it) openItem(it); break; }
    case 'additem': openItem(null, JSON.parse(b.dataset.preset || '{}')); break;
    case 'addonce': { const d = b.dataset.date; openItem(null, { kind: 'in', _sec: 'in', freq: 'once', month: +d.slice(5, 7), year: +d.slice(0, 4), day: +d.slice(8) }); break; }
    case 'ffreq': readForm(); FORM.freq = b.dataset.v; renderForm(); break;
    case 'goalfit': { const v = +b.dataset.v; store.update('settings', (d) => { d.settings.goal = v; }); toast(t('Ahorro planificado: {x} al año', { x: fmt(v) })); render(true); break; }
    case 'fclose': case 'dclose': dlg.close(); break;
    case 'goaledit': openGoal(); break;
    case 'startedit': openCheck(compute(store.data).curYM); break;
    case 'goalper': {
      const g = goalYear(); UI.goalPer = b.dataset.v === 'm' ? 'm' : 'y';
      dlg.querySelectorAll('[data-act=goalper]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.v === UI.goalPer)));
      dlg.querySelector('#g-lab').textContent = UI.goalPer === 'y' ? t('Al año') : t('Al mes, de media');
      if (g != null) dlg.querySelector('#g-val').value = String(UI.goalPer === 'y' ? g : round2(g / 12)).replace('.', ',');
      goalCalc(); dlg.querySelector('#g-val').focus(); break;
    }
    case 'goalset': {
      const g = goalYear(); if (g == null) { invalid('#g-val', t('Escribe una cifra válida')); break; }
      store.update('settings', (d) => { d.settings.goal = g; }); dlg.close(); toast(t('Ahorro planificado: {x} al año', { x: fmt(g) })); render(true); break;
    }
    case 'fsave': saveForm(); break;
    case 'fdup': { readForm(); const { id, real, _edit, ...rest } = FORM; FORM = { ...rest, _copy: rest.name || t('sin nombre') }; CONFIRM = false; renderForm(); dlg.querySelector('#f-amount')?.focus(); break; }
    case 'fdel': {
      if (!CONFIRM) { CONFIRM = true; readForm(); renderForm(); break; }
      const id = FORM.id;
      store.update('items', (d) => { d.items = d.items.filter((i) => i.id !== id); });
      dlg.close(); toast(t('Borrado')); break;
    }
    case 'keepremote': dlg.close(); toast(t('Usando la hoja de Drive')); break;
    case 'keeplocal': store.replaceAll(UI.chooseLocal); dlg.close(); toast(t('Subiendo el plan de este dispositivo')); break;
    case 'doimport': store.replaceAll(UI.importData); dlg.close(); toast(t('Plan importado')); break;
  }
});

document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.id === 'f-freq') {
    readForm();
    if (FORM.freq !== 'monthly' && !FORM.month) FORM.month = new Date().getMonth() + 1;
    renderForm();
  } else if (el.id === 'p-cur') { setCurrency(el.value);
  } else if (el.id === 'p-cycle') {
    const v = Math.round(num(el.value) ?? 0);
    if (v < 1 || v > 28) { toast(t('Un día del 1 al 28')); return; }
    store.update('settings', (d) => { d.settings.cycleDay = v; }); toast(v === 1 ? t('Meses del 1 al último día') : t('Tu mes va del {a} al {b}', { a: v, b: v - 1 })); render(true);
  } else if (el.id === 'p-start') {
    if (!isYM(el.value)) return;
    store.update('settings', (d) => { d.settings.start = el.value; }); toast(t('Primer mes guardado')); render(true);
  } else if ((el.id === 'import-file' || el.id === 'import-welcome') && el.files?.[0]) {
    importFile(el.files[0]); el.value = '';
  }
});
// Enter in a quick input = press its button
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
  const map = { 'h-start': 'startbal', 'nc-name': 'ncsave', 'ck-bal': 'checkset', 'ck-open': 'checkset', 'o-real': 'oconfirm', 'b-amt': 'bspendc', 'b-note': 'bspendc', 'k-amt': 'kgo', 'k-note': 'kgo' };
  const act = map[e.target.id] || (e.target.closest('#item-form') ? 'fsave' : null);
  if (!act) return;
  e.preventDefault();
  const scope = e.target.closest('.card, .sheet') || document;
  scope.querySelector(`[data-act="${act}"]`)?.click();
});
// the close and the look at the balance work out the month as you type
document.addEventListener('input', (e) => {
  const id = e.target.id;
  if (id === 'cl-bal' || id === 'cl-open') closeCalc(); else if (id === 'ck-bal' || id === 'ck-open') checkCalc(); else if (id === 'g-val') goalCalc();
});
document.addEventListener('focusout', () => setTimeout(() => {
  if (!UI.pending) return;
  const a = document.activeElement;
  if (!(a && $('#view')?.contains(a) && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))) render();
}, 0));
dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
dlg.addEventListener('close', () => {
  FORM = null; CONFIRM = false; dlg.classList.remove('full');
  if (history.state?.dialog && !NAV.popping) history.back(); // closed with a button: drop its history entry
});


// iOS pinch zoom off (app feel); inputs stay at 16px so iOS doesn't zoom on focus
document.addEventListener('gesturestart', (e) => e.preventDefault());

// ---------- navigation ----------
// Each screen has its own address (#hoy, #ajustes…) so the phone's back gesture works:
// back from a tab returns to Hoy, back from Ajustes returns where you were, back closes an open sheet.
const ROUTES = { home: 'hoy', mes: 'mes', ana: 'analisis', metas: 'ano', plan: 'plan', settings: 'ajustes' };
const OLD_ROUTES = { resumen: 'home', calendario: 'mes', meses: 'metas', metas: 'metas' }; // links saved before the redesigns
const NAV = { popping: false, then: null };
const tabFromHash = () => Object.keys(ROUTES).find((k) => location.hash === '#' + ROUTES[k]) || OLD_ROUTES[location.hash.slice(1)];
function setTab(tab) {
  UI.tab = tab; UI.wipe = false;
  if (tab !== 'settings' && tab !== 'mes') lsSet('hucha:tab', tab);
  render(true);
}
function go(tab) {
  if (!ROUTES[tab]) return;
  if (tab === UI.tab) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  const depth = history.state?.depth || 0;
  const subTab = (t) => t === 'settings' || t === 'mes'; // pages opened on top of a tab: back returns to it
  if (subTab(UI.tab) && !subTab(tab) && depth > 0) { NAV.then = tab; history.back(); return; } // leave it first, then go
  if (tab === 'home' && depth > 0) { history.go(-depth); return; } // Hoy is the root
  if (subTab(tab) || UI.tab === 'home') history.pushState({ tab, depth: depth + 1 }, '', '#' + ROUTES[tab]);
  else history.replaceState({ tab, depth }, '', '#' + ROUTES[tab]); // tab to tab: no pile of entries
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
  if (tab !== UI.tab) setTab(tab);
  if (NAV.then) { const t = NAV.then; NAV.then = null; go(t); }
});

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
