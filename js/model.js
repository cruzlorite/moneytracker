// Pure calculations: no DOM, no storage. Everything the views show comes from compute().
import { CAT, guessCat, isCustomCat, SAVE_CAT } from './cats.js';
import { t, lang, locale } from './i18n.js';

// month and day names in the chosen language
const monthsIn = (month) => Array.from({ length: 12 }, (_, i) => new Date(2024, i, 15).toLocaleDateString(locale, { month }).replace('.', ''));
export const MES = lang === 'es' ? monthsIn('long').map((s) => s.toLowerCase()) : monthsIn('long');
export const MES3 = lang === 'es' ? ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] : monthsIn('short').map((s) => s.slice(0, 3));
export const DIAS = lang === 'es' ? ['L', 'M', 'X', 'J', 'V', 'S', 'D'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
export const FREQ = { monthly: t('Cada mes'), quarterly: t('Cada 3 meses'), yearly: t('Una vez al año'), once: t('Una sola vez') };

// ---------- small helpers ----------
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const round2 = (n) => Math.round(n * 100) / 100;
export function num(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v ?? '').trim().replace(/\s/g, '');
  if (!s) return null;
  // es: "1.234,5" and "1234.5" both work; en: "1,234.5" (commas group thousands)
  const n = lang === 'en' ? parseFloat(s.replace(/,/g, ''))
    : parseFloat(/,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(',', '.'));
  return Number.isFinite(n) ? round2(n) : null;
}
// Amounts with one decimal when there is one (1.680,6 €; 1.900 €), thousands always grouped so figures line up
const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, useGrouping: 'always' });
/** The number alone (1.680,6 / 1,680.6), for "980 / 1.660 €" where the unit goes once. */
export const fmtN = (n) => nf.format(Math.round((+n || 0) * 10) / 10);
/** Money: "1.680,6 €" in Spanish, "€1,680.6" in English. */
export const fmt = (n) => { const v = Math.round((+n || 0) * 10) / 10; return lang === 'en' ? (v < 0 ? '-' : '') + '€' + nf.format(Math.abs(v)) : nf.format(v) + ' €'; };
export const fmtSigned = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n));
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = (p = 'x') => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ---------- dates (local time, ISO strings) ----------
export const pad = (n) => String(n).padStart(2, '0');
export const toYM = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
export const toISO = (d) => `${toYM(d)}-${pad(d.getDate())}`;
export const isYM = (s) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(s || ''));
export const isISO = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
export function ymAdd(ym, k) {
  let [y, m] = ym.split('-').map(Number);
  m += k; y += Math.floor((m - 1) / 12); m = ((m - 1) % 12 + 12) % 12 + 1;
  return `${y}-${pad(m)}`;
}
export function ymDiff(a, b) { // b − a, in months
  const [ay, am] = a.split('-').map(Number), [by, bm] = b.split('-').map(Number);
  return (by - ay) * 12 + (bm - am);
}
export const daysInMonth = (ym) => new Date(+ym.slice(0, 4), +ym.slice(5), 0).getDate();
export const ymLabel = (ym) => `${MES[+ym.slice(5) - 1]} ${ym.slice(0, 4)}`;
export const monthName = (ym) => MES[+ym.slice(5) - 1];
/** The day an item lands on in a given month (31 → 30 in April, 28/29 in February). */
export const dayIn = (day, ym) => clamp(Math.round(+day), 1, daysInMonth(ym));
const isoDays = (iso) => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8)) / 864e5);
const isoAdd = (iso, n) => { const d = new Date((isoDays(iso) + n) * 864e5); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };

// ---------- your month: from payday to payday ----------
// A month can start on any day D (1–28): with D = 26, "noviembre" runs from 26 October to 25 November.
// It's named after the month it ends in. D = 1 is the calendar month.
/** The day your month starts: as set, or the day of your main monthly income when it comes late in the month. */
export function cycleDayOf(settings = {}, items = []) {
  const set = Math.round(num(settings.cycleDay) ?? 0);
  if (set >= 1 && set <= 28) return set;
  const pay = items.filter((i) => i.kind === 'in' && i.freq === 'monthly' && i.day).sort((a, b) => b.amount - a.amount)[0];
  return pay && pay.day >= 15 ? Math.min(28, pay.day) : 1;
}
/** First and last day (ISO) of month `ym`, and how many days it has. */
export function cycleRange(ym, D = 1) {
  if (D <= 1) return { from: `${ym}-01`, to: `${ym}-${pad(daysInMonth(ym))}`, days: daysInMonth(ym) };
  const from = `${ymAdd(ym, -1)}-${pad(D)}`, to = `${ym}-${pad(D - 1)}`;
  return { from, to, days: isoDays(to) - isoDays(from) + 1 };
}
/** The month a date (ISO) belongs to. */
export const cycleOf = (iso, D = 1) => (D > 1 && +iso.slice(8, 10) >= D ? ymAdd(iso.slice(0, 7), 1) : iso.slice(0, 7));
/** Day number (1…) of a date inside month `ym`. */
export const dayOfCycle = (iso, ym, D = 1) => isoDays(iso) - isoDays(cycleRange(ym, D).from) + 1;
/** The date (ISO) of day n (1…) of month `ym`. */
export const cycleDate = (ym, n, D = 1) => isoAdd(cycleRange(ym, D).from, n - 1);

// ---------- items ----------
// One shape for incomes and expenses:
// { id, kind:'in'|'out', name, amount, freq:'monthly'|'quarterly'|'yearly'|'once',
//   month (1-12; 0 = no fixed month: yearly budgets only), year (once), day (1-31, optional),
//   vary (amount changes: ask to confirm it each time),
//   budget (a spending limit you use up bit by bit, logging each spend against it: monthly, or yearly),
//   cat (expenses: the spending type, see cats.js; a budget always has one: spends of that type count against it), note, real }
// Anything not in the plan (food, going out, odds and ends) is the "día a día": what's left each month.
// Every expense lands in its own month: a month with the yearly insurance is an expensive month, and that's fine.
export function normItem(r) {
  const kind = r.kind === 'in' ? 'in' : 'out';
  const freq = FREQ[r.freq] ? r.freq : 'monthly';
  const it = { id: String(r.id || uid(kind)), kind, name: String(r.name || '').trim() || 'Sin nombre', amount: Math.max(0, num(r.amount) ?? 0), freq };
  if (freq !== 'monthly') {
    const m = Math.round(num(r.month) ?? 0);
    it.month = clamp(m, kind === 'out' && freq === 'yearly' ? 0 : 1, 12);
  }
  if (freq === 'once') it.year = Math.round(num(r.year) ?? new Date().getFullYear());
  const day = num(r.day);
  if (day) it.day = clamp(Math.round(day), 1, 31);
  if (truthy(r.vary)) it.vary = true;
  // a yearly expense with no date (older plans: "sin fecha fija") is really a yearly budget
  const undated = kind === 'out' && freq === 'yearly' && !it.month;
  if (kind === 'out' && (freq === 'monthly' || freq === 'yearly') && (truthy(r.budget) || undated)) {
    // a budget has no date and no amount to confirm: what counts is what you log against it,
    // in the month you spend it
    it.budget = true; delete it.vary; delete it.day;
    if (freq === 'yearly') it.month = 0;
  }
  if (kind === 'out') {
    const c = CAT[r.cat] || isCustomCat(r.cat) ? r.cat : it.budget ? guessCat(it.name) || 'otros' : guessCat(it.name);
    if (c) it.cat = c;
  }
  if (r.note) it.note = String(r.note);
  const real = num(r.real);
  if (real != null) it.real = real;
  return it;
}
const truthy = (v) => v === true || /^(true|1|s[ií]|yes|x)$/i.test(String(v ?? '').trim());

export function occurs(it, ym) {
  const mm = +ym.slice(5), yy = +ym.slice(0, 4);
  switch (it.freq) {
    case 'monthly': return true;
    case 'quarterly': return ((mm - (it.month || 1)) % 3 + 3) % 3 === 0;
    case 'yearly': return it.month === mm;
    case 'once': return it.month === mm && it.year === yy;
  }
  return false;
}
export const unit = (it) => ({ monthly: t('/mes'), quarterly: t('/trim.'), yearly: t('/año'), once: '' }[it.freq]);
export function freqText(it) {
  const day = it.day ? ' · ' + t('día {d}', { d: it.day }) : '';
  if (it.freq === 'monthly') return t('cada mes') + day;
  if (it.freq === 'quarterly') return t('cada 3 meses desde {m}', { m: MES[(it.month || 1) - 1] }) + day;
  if (it.freq === 'yearly') return it.month ? t('cada {m}', { m: MES[it.month - 1] }) + day : t('una vez al año, sin fecha fija');
  return it.day ? t('solo el {d} de {m} {y}', { d: it.day, m: MES[(it.month || 1) - 1], y: it.year }) : t('solo {m} {y}', { m: MES[(it.month || 1) - 1], y: it.year });
}
/** How many times the item falls inside the 12 months of the plan. */
export function timesIn(it, season) {
  if (it.freq === 'yearly' && !it.month) return 1;
  return season.filter((ym) => occurs(it, ym)).length;
}

// ---------- the whole picture ----------
/**
 * data: { settings:{goal,start,years,cats}, items:[], months:{ym:{saved,bal,open,check,potSpent,real,close}}, spends:[{id,date,amount,note,cat}] }
 * A spend's `cat` is its type; if you have a budget of that type it counts against the budget, otherwise against Resto de vida.
 *
 * The money of the month is read from the balance of the day-to-day account, not from logging every spend:
 *   saved: moved to savings and investment this month · bal: the account's balance when the month ended (entered
 *   at the close) · open: the balance when it began (only when the previous month has no balance; with openDate,
 *   the balance on the day you started using the app, and what came before doesn't count) · check: {date, bal},
 *   a look at the balance mid-month · close: {amount}, what was left over (or missing) when it closed.
 * What was spent outside the plan = balance at the start + what came in − plan expenses − saved − balance now.
 * What's left over when a month closes counts as saved; what's missing comes off savings. Nothing carries to the next month.
 * today: Date
 */
export function compute(data, today = new Date()) {
  const items = data.items || [];
  const D = cycleDayOf(data.settings, items);
  const monthOf = (iso) => cycleOf(iso, D);
  const range = (ym) => cycleRange(ym, D);
  const curYM = monthOf(toISO(today));
  const goal = Math.max(0, num(data.settings?.goal) ?? 0);
  const start = isYM(data.settings?.start) ? data.settings.start : curYM;
  const season = Array.from({ length: 12 }, (_, i) => ymAdd(start, i));

  /** The date (ISO) an item falls on in month `ym`, or null if it doesn't. No day: the month's last day. */
  const dateIn = (it, ym) => {
    if (!it.day || D <= 1) return occurs(it, ym) ? (it.day ? `${ym}-${pad(dayIn(it.day, ym))}` : range(ym).to) : null;
    const r = range(ym);
    for (const c of [ymAdd(ym, -1), ym]) {
      if (!occurs(it, c)) continue;
      const d = `${c}-${pad(dayIn(it.day, c))}`;
      if (d >= r.from && d <= r.to) return d;
    }
    return null;
  };
  const occ = (it, ym) => dateIn(it, ym) != null;
  const ins = items.filter((i) => i.kind === 'in');
  const outs = items.filter((i) => i.kind === 'out');
  const budgets = outs.filter((i) => i.budget);
  const mbud = budgets.filter((i) => i.freq === 'monthly');
  const ybud = budgets.filter((i) => i.freq === 'yearly');
  /** Money moved to savings or investments (type «Ahorro e inversión»): it leaves the account but it isn't spending. */
  const isSave = (it) => it.kind === 'out' && !it.budget && it.cat === SAVE_CAT;
  const direct = outs.filter((i) => !i.budget && !isSave(i)); // expected expenses, each in its month
  const saveItems = outs.filter(isSave); // planned moves to savings (a standing order, say)
  const mon = (ym) => (data.months || {})[ym] || {};
  const todayISO = toISO(today);

  // budgets by type (one budget per type: the first one wins)
  const budByCat = new Map();
  for (const b of budgets) if (!budByCat.has(b.cat)) budByCat.set(b.cat, b);
  // allSpends: every one (older ones may point at a budget's id: read them as its type);
  // spends: the ones against Resto de vida
  const idCat = new Map(budgets.map((b) => [b.id, b.cat]));
  const allSpends = (data.spends || []).map((e) => (idCat.has(e.cat) ? { ...e, cat: idCat.get(e.cat) } : e));
  const spends = allSpends.filter((e) => !budByCat.has(e.cat) && e.cat !== SAVE_CAT);
  /** What you logged against a budget in a month. */
  const budSpent = (b, ym) => budByCat.get(b.cat) !== b ? 0
    : round2(allSpends.reduce((s, e) => s + (e.cat === b.cat && monthOf(e.date) === ym ? e.amount : 0), 0));
  /** A month's spending by type, largest first ('' = no type). */
  const byCat = (ym) => {
    const t = {};
    for (const e of allSpends) if (monthOf(e.date) === ym && e.cat !== SAVE_CAT) t[e.cat || ''] = round2((t[e.cat || ''] || 0) + e.amount);
    return Object.entries(t).map(([cat, amount]) => ({ cat, amount, budget: budByCat.get(cat) || null })).sort((a, b) => b.amount - a.amount);
  };
  /** What a monthly budget takes from its month: the whole budget while the month runs (more if you went over);
   *  once the month is over, only what you spent: the rest goes back to the month's leftover. */
  const budUse = (b, ym) => { const sp = budSpent(b, ym); return ym < curYM ? sp : Math.max(b.amount, sp); };

  /** Exact amount entered for that month, if any (older plans kept some under potSpent). */
  const realOf = (it, ym) => {
    if (it.budget) return null;
    const v = (mon(ym).real || {})[it.id] ?? (mon(ym).potSpent || {})[it.id];
    return v == null ? null : +v;
  };
  /** The date an item falls on in a month; without a day, the last day of the month. */
  const dateOf = (it, ym) => dateIn(it, ym) || range(ym).to;
  /** future: not due yet · auto: due, taken as planned · pending: due, variable, not confirmed · real: exact amount entered */
  const stateOf = (it, ym) => realOf(it, ym) != null ? 'real' : dateOf(it, ym) > todayISO ? 'future' : it.vary ? 'pending' : 'auto';
  /** Best figure for one occurrence: the exact amount if entered, otherwise the planned one. */
  const amountIn = (it, ym) => realOf(it, ym) ?? it.amount;

  const sumIn = (arr, ym) => arr.reduce((s, i) => s + (occ(i, ym) ? amountIn(i, ym) : 0), 0);
  const incomeOf = (ym) => sumIn(ins, ym);
  const outOf = (ym) => sumIn(direct, ym);
  /** What budgets take from a month: monthly ones as above; yearly ones, what you logged against them that month. */
  const budOf = (ym) => round2(mbud.reduce((s, b) => s + budUse(b, ym), 0) + ybud.reduce((s, b) => s + budSpent(b, ym), 0));
  const target = goal / 12;
  const incomeY = season.reduce((s, ym) => s + incomeOf(ym), 0);
  const outY = season.reduce((s, ym) => s + outOf(ym), 0);
  /** A yearly budget: what you logged against it over the 12 months. */
  const budSpentY = (b) => round2(season.reduce((s, ym) => s + budSpent(b, ym), 0));
  /** Budgets over the year: monthly ones month by month, yearly ones at their limit (or what you spent, if more). */
  const budY = round2(season.reduce((s, ym) => s + mbud.reduce((a, b) => a + budUse(b, ym), 0), 0) + ybud.reduce((s, b) => s + Math.max(b.amount, budSpentY(b)), 0));
  const possible = incomeY - outY - budY;
  /** Día a día: what's left for everything not in the plan, after expected expenses, budgets and savings. */
  /**
   * Each month's savings target follows the plan: what the month leaves once its expected expenses and limits are
   * planned for, minus an even share of everything else. Months with an extra pay aim higher, expensive months lower
   * (even below zero), every month leaves the same amount unplanned, and the twelve add up to the yearly goal.
   */
  const plannedNet = (ym) => round2(ins.reduce((s, i) => s + (occ(i, ym) ? i.amount : 0), 0) - direct.reduce((s, i) => s + (occ(i, ym) ? i.amount : 0), 0)
    - mbud.reduce((s, b) => s + b.amount, 0) - ybud.reduce((s, b) => s + b.amount, 0) / 12);
  const slack = (season.reduce((s, ym) => s + plannedNet(ym), 0) - goal) / 12; // planned and unplanned each month
  const targetOf = (ym) => (goal > 0 ? round2(plannedNet(ym) - slack) : 0);
  const restOf = (ym) => round2(incomeOf(ym) - outOf(ym) - budOf(ym) - targetOf(ym));
  const restAvg = (possible - goal) / 12;

  const payItem = ins.filter((i) => i.freq === 'monthly' && i.day).sort((a, b) => b.amount - a.amount)[0];
  const payday = payItem ? payItem.day : null;

  const idx = ymDiff(start, curYM);
  const pre = idx < 0, over = idx > 11;
  const curIdx = clamp(idx, 0, 11);
  const cur = season[curIdx];

  // ---------- the account: balances and what left it ----------
  const endISO = (ym) => range(ym).to;
  /** Balance when the month began: entered by hand, or the previous month's closing balance. */
  const balStart = (ym) => {
    const m = mon(ym);
    if (m.open != null) return +m.open;
    const p = mon(ymAdd(ym, -1));
    return p.bal == null ? null : +p.bal;
  };
  /** The plan's money in and out of the account in a month, up to a date (ISO): what came in, fixed expenses
   *  (paid from the month or from a fund), and what you logged against budgets. */
  const flowTo = (ym, upto) => {
    let inc = 0, out = 0, bud = 0, save = 0;
    const after = mon(ym).openDate || ''; // you started on that day: what came before is already in your balance
    for (const it of items) {
      if (it.budget) continue;
      const r = realOf(it, ym);
      if (r == null && !occ(it, ym)) continue;
      if (after && dateOf(it, ym) <= after) continue;
      const v = r != null ? r : dateOf(it, ym) <= upto ? it.amount : 0;
      if (it.kind === 'in') inc += v; else if (isSave(it)) save += v; else out += v;
    }
    for (const e of allSpends) {
      if (monthOf(e.date) !== ym || e.date > upto || e.date <= after) continue;
      if (e.cat === SAVE_CAT) save += e.amount; else if (budByCat.has(e.cat)) bud += e.amount;
    }
    // older months may carry what was moved to savings as a figure of the month
    return { inc: round2(inc), out: round2(out), bud: round2(bud), save: round2(save + (+mon(ym).saved || 0)) };
  };
  /** Logged spends against Resto de vida in a month, after a date (ISO, exclusive). */
  const loggedRest = (ym, after = '') => round2(spends.reduce((s, e) => s + (monthOf(e.date) === ym && e.date > after ? e.amount : 0), 0));
  /**
   * The month read from a balance: given the account's balance on a date of the month, everything that follows.
   * cash: spent outside the plan (budgets included) · rest: of that, what went to Resto de vida (cash − logged budget spends)
   * left: what's left over (how much the account grew, or shrank if negative): at the close it counts as saved.
   * Null when the balance at the start of the month isn't known.
   */
  const fromBalance = (ym, bal, upto = endISO(ym)) => {
    const start = balStart(ym);
    if (start == null || bal == null) return null;
    const f = flowTo(ym, upto), saved = f.save;
    const cash = round2(start + f.inc - f.out - saved - bal);
    return { start, bal, ...f, saved, cash, rest: round2(cash - f.bud), left: round2(bal - start) };
  };
  /**
   * The account through a month, day by day, counted from the day it began (0): incomes and expected expenses on
   * their days (no day: the last one), what you put aside on payday, logged spends on their dates, and the rest
   * of what left the account (worked out from the closing balance) spread evenly over the days.
   * pts: [{ day (0..days), y, events: [{ label, amount, kind }] }] · daily: that spread, per day. Null without the start balance.
   */
  const curveOf = (ym, bal) => {
    const r = fromBalance(ym, bal);
    if (!r) return null;
    const dim = range(ym).days, at = (iso) => clamp(dayOfCycle(iso, ym, D), 1, dim), ev = Array.from({ length: dim + 1 }, () => []);
    for (const it of items) {
      if (it.budget) continue;
      const real = realOf(it, ym);
      if (real == null && !occ(it, ym)) continue;
      const v = real ?? it.amount;
      if (v) ev[at(dateOf(it, ym))].push({ label: it.name, amount: it.kind === 'in' ? v : -v, kind: isSave(it) ? 'save' : it.kind });
    }
    const legacy = +mon(ym).saved || 0;
    if (legacy) ev[payItem && occ(payItem, ym) ? at(dateOf(payItem, ym)) : 1].push({ label: legacy > 0 ? 'Al ahorro' : 'Del ahorro', amount: -legacy, kind: 'save' });
    let logged = 0;
    for (const e of allSpends) {
      if (monthOf(e.date) !== ym) continue;
      if (e.cat !== SAVE_CAT) logged += e.amount;
      ev[at(e.date)].push({ label: e.note || CAT[e.cat]?.name || t('Gasto'), amount: -e.amount, kind: e.cat === SAVE_CAT ? 'save' : 'spend' });
    }
    const daily = -(r.cash - logged) / dim;
    const pts = [{ day: 0, y: 0, events: [] }];
    let y = 0;
    for (let d = 1; d <= dim; d++) { y += ev[d].reduce((s, e) => s + e.amount, 0) + daily; pts.push({ day: d, date: cycleDate(ym, d, D), y: round2(y), events: ev[d] }); }
    pts[dim].y = round2(bal - r.start); // no rounding drift: the month ends where the balance says
    return { pts, daily: round2(daily) };
  };
  /** Where a month's spending comes from: 'bal' (closed with a balance), 'check' (a look mid-month) or 'log' (logged spends). */
  const spentSrc = (ym) => {
    const m = mon(ym);
    if (m.bal != null && balStart(ym) != null) return 'bal';
    if (m.check && balStart(ym) != null) return 'check';
    return 'log';
  };
  /** Spent against Resto de vida in a month: from the closing balance, or from the last look at it plus what you logged since. */
  const spentOf = (ym) => {
    const m = mon(ym), src = spentSrc(ym);
    if (src === 'bal') return fromBalance(ym, +m.bal).rest;
    if (src === 'check') return round2(fromBalance(ym, +m.check.bal, m.check.date).rest + loggedRest(ym, m.check.date));
    return loggedRest(ym, m.openDate || '');
  };
  /** Everything spent in a month up to a date (default: all of it): expected expenses already due, what you logged
   *  against budgets, and the rest (from the balance, or what you logged). What you put aside isn't spending. */
  const spentAll = (ym, upto = endISO(ym)) => { const f = flowTo(ym, upto); return round2(f.out + f.bud + Math.max(0, spentOf(ym))); };
  /** What came in during a month up to a date (default: all of it). */
  const incomeTo = (ym, upto = endISO(ym)) => flowTo(ym, upto).inc;
  /** Saved in a month: what you moved to savings, plus what was left over when it closed (minus, if it was missing). */
  const savedOf = (ym) => {
    if (ym > curYM) return 0;
    const m = mon(ym);
    return round2(flowTo(ym, ym === curYM ? todayISO : endISO(ym)).save + (m.close ? +m.close.amount || 0 : 0));
  };
  const status = (ym) => {
    const m = mon(ym), spent = spentOf(ym);
    if (m.saved == null && m.bal == null && !m.close && !spent) return 'none';
    const okS = savedOf(ym) >= targetOf(ym) - 0.5;
    const okR = spent <= Math.max(0, restOf(ym)) + 0.5;
    return okS && okR ? 'clear' : 'partial';
  };
  const saved = round2(season.reduce((s, ym) => s + savedOf(ym), 0));
  let streak = 0;
  for (let i = pre ? -1 : status(cur) === 'clear' ? curIdx : curIdx - 1; i >= 0 && status(season[i]) === 'clear'; i--) streak++;
  const cleared = season.filter((ym) => status(ym) === 'clear').length;
  const paidMonths = pre ? 0 : over ? 12 : curIdx + (!payItem || !occ(payItem, cur) || dateOf(payItem, cur) <= todayISO ? 1 : 0);
  const expected = round2(season.slice(0, paidMonths).reduce((s, ym) => s + targetOf(ym), 0));
  /** Everything planned for a month, by day (0 = no fixed day). */
  const plannedIn = (ym) => {
    const out = [];
    for (const it of items) {
      if (it.budget || !occ(it, ym)) continue;
      const date = dateOf(it, ym);
      out.push({ it, date, day: it.day ? +date.slice(8) : 0, amount: amountIn(it, ym), state: stateOf(it, ym), save: isSave(it) });
    }
    return out.sort((a, b) => (a.it.day ? 0 : 1) - (b.it.day ? 0 : 1) || a.date.localeCompare(b.date) || (a.it.kind === b.it.kind ? b.it.amount - a.it.amount : a.it.kind === 'in' ? -1 : 1));
  };
  /** Variable amounts already due that you haven't confirmed, in a month. */
  const pendingIn = (ym) => plannedIn(ym).filter((p) => p.state === 'pending');

  return {
    items, goal, start, season, ins, outs, direct, target, targetOf, incomeOf, outOf, restOf, restAvg, savedOf,
    incomeY, outY, possible, payday, idx, pre, over, curIdx, cur, curYM, mon, status, spentOf, saved, streak, cleared,
    paidMonths, expected, plannedIn, pendingIn, realOf, stateOf, amountIn, spends,
    cycleDay: D, isSave, saveItems, monthOf, range, dateOf, occurs: occ, todayISO, dayOf: (iso, ym) => dayOfCycle(iso, ym, D),
    balStart, flowTo, fromBalance, curveOf, spentSrc, loggedRest, endISO, spentAll, incomeTo,
    budgets, mbud, ybud, budSpent, budUse, budOf, budY, budSpentY, allSpends, budByCat, byCat,
  };
}

/** Days from today to the next `day` of the month (0 = today). */
export function daysTo(day, today = new Date()) {
  if (!day) return null;
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const at = (y, m) => new Date(y, m, Math.min(day, new Date(y, m + 1, 0).getDate()));
  let t = at(d.getFullYear(), d.getMonth());
  if (t < d) t = at(d.getFullYear(), d.getMonth() + 1);
  return Math.round((t - d) / 864e5);
}

/** Monday-first grid for a month: [{date, day, inMonth}] in whole weeks. */
export function monthGrid(ym) {
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const lead = (first.getDay() + 6) % 7;
  const n = daysInMonth(ym);
  const cells = [];
  for (let i = 0; i < Math.ceil((lead + n) / 7) * 7; i++) {
    const d = new Date(y, m - 1, 1 - lead + i);
    cells.push({ date: toISO(d), day: d.getDate(), inMonth: d.getMonth() === m - 1 });
  }
  return cells;
}

/** Plan file (export/import): validates and normalises what comes from outside. */
export function parsePlanFile(obj) {
  if (!obj || typeof obj !== 'object') throw new Error(t('El archivo no tiene un plan'));
  const items = Array.isArray(obj.items) ? obj.items.map(normItem) : [];
  if (!items.length) throw new Error(t('El archivo no tiene ingresos ni gastos'));
  const settings = normSettings({ ...(obj.settings || {}), goal: obj.goal ?? obj.settings?.goal, start: obj.start ?? obj.settings?.start, years: obj.years ?? obj.settings?.years, cats: obj.cats ?? obj.settings?.cats, cycleDay: obj.cycleDay ?? obj.settings?.cycleDay });
  const months = {};
  for (const [ym, m] of Object.entries(obj.months || {})) if (isYM(ym)) months[ym] = normMonth(m);
  const spends = Array.isArray(obj.spends) ? obj.spends.map(normSpend).filter(Boolean) : [];
  return { settings, items, months, spends };
}
/** Settings: the yearly goal, the plan's first month, and past years' closes. */
export function normSettings(o = {}) {
  const st = { goal: Math.max(0, num(o.goal) ?? 0), start: isYM(o.start) ? o.start : toYM(new Date()) };
  const cd = Math.round(num(o.cycleDay) ?? 0);
  if (cd >= 1 && cd <= 28) st.cycleDay = cd;
  if (Array.isArray(o.cats)) {
    const cats = o.cats.filter((c) => c && isCustomCat(c.id) && String(c.name || '').trim())
      .map((c) => ({ id: String(c.id), name: String(c.name).trim().slice(0, 24), icon: String(c.icon || 'otros') }));
    if (cats.length) st.cats = cats;
  }
  if (Array.isArray(o.years) && o.years.length) st.years = o.years.filter((y) => y && isYM(y.start)).map((y) => ({ ...y }));
  return st;
}
export function normMonth(m) {
  const o = {};
  const s = num(m?.saved);
  if (s != null) o.saved = s;
  if (truthy(m?.pots)) o.pots = true;
  for (const k of ['bal', 'open']) { const n = num(m?.[k]); if (n != null) o[k] = n; }
  if (o.open != null && isISO(m?.openDate)) o.openDate = m.openDate; // the day you started, when it wasn't the month's first
  const cb = num(m?.check?.bal);
  if (cb != null && isISO(m?.check?.date)) o.check = { date: m.check.date, bal: cb };
  const ps = {};
  for (const [k, v] of Object.entries(m?.potSpent || {})) { const n = num(v); if (n != null) ps[k] = n; }
  if (Object.keys(ps).length) o.potSpent = ps;
  const re = {};
  for (const [k, v] of Object.entries(m?.real || {})) { const n = num(v); if (n != null) re[k] = n; }
  if (Object.keys(re).length) o.real = re;
  // month close: what was left over (or missing), which counts as saved
  const ca = num(m?.close?.amount);
  if (m?.close && ca != null) o.close = { amount: ca };
  // the month's challenge
  const cp = num(m?.challenge?.p);
  if (m?.challenge?.id) o.challenge = { id: String(m.challenge.id), p: cp ?? 0 };
  return o;
}
export function normSpend(e) {
  const amount = num(e?.amount);
  if (!isISO(e?.date) || !amount) return null;
  const o = { id: String(e.id || uid('g')), date: e.date, amount, note: String(e.note || '') };
  if (e.cat) o.cat = String(e.cat);
  return o;
}
