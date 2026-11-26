// Pure calculations: no DOM, no storage. Everything the views show comes from compute().
import { CAT, guessCat, isCustomCat, SAVE_CAT } from './cats.js';
import { t, lang, locale, cur, curDecimals } from './i18n.js';

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
  // es: "1.234,5", "12.000" and "1234.5" all work; en: "1,234.5" (commas group thousands)
  const n = lang === 'en' ? parseFloat(s.replace(/,/g, ''))
    : parseFloat(/,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : /^-?\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, '') : s.replace(',', '.')); // "12.000" is twelve thousand
  return Number.isFinite(n) ? round2(n) : null;
}
// Amounts always with their cents, as the bank shows them (1.680,60 €; 1.900,00 €), thousands always grouped so figures line up
const nf = new Intl.NumberFormat(locale, { minimumFractionDigits: curDecimals, maximumFractionDigits: curDecimals, useGrouping: 'always' });
const money = new Intl.NumberFormat(locale, { style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol', minimumFractionDigits: curDecimals, maximumFractionDigits: curDecimals, useGrouping: 'always' });
/** The number alone (1.680,6 / 1,680.6), for "980 / 1.660 €" where the unit goes once. */
const rnd = (n) => (curDecimals ? Math.round((+n || 0) * 100) / 100 : Math.round(+n || 0));
export const fmtN = (n) => nf.format(rnd(n));
/** Money in the chosen currency and the language's way of writing it: "1.680,60 €", "€1,680.60", "$1,680.60". */
export const fmt = (n) => money.format(rnd(n)).replace(/\u00a0/g, ' ');
/** Whole amounts, for big figures compared side by side (41.200 €): cents would only add noise. */
const money0 = new Intl.NumberFormat(locale, { style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0, useGrouping: 'always' });
export const fmt0 = (n) => money0.format(Math.round(+n || 0)).replace(/\u00a0/g, ' ').replace(/^-/, '−');
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
  // versions: the same item can be defined differently over time. `from`/`to` are the first and last month (YYYY-MM) a
  // version applies to; none = no limit. `at` is when the change was made (ISO timestamp)
  if (isYM(r.from)) it.from = r.from;
  if (isYM(r.to) && (!it.from || r.to >= it.from)) it.to = r.to;
  if (r.at && !Number.isNaN(Date.parse(r.at))) it.at = String(r.at);
  return it;
}
const truthy = (v) => v === true || /^(true|1|s[ií]|yes|x)$/i.test(String(v ?? '').trim());

/** Is this version of the item in force in month `ym`? */
export const activeIn = (it, ym) => (!it.from || ym >= it.from) && (!it.to || ym <= it.to);
/** Does it recur in that calendar month, whatever version is in force. */
function recurs(it, ym) {
  const mm = +ym.slice(5), yy = +ym.slice(0, 4);
  switch (it.freq) {
    case 'monthly': return true;
    case 'quarterly': return ((mm - (it.month || 1)) % 3 + 3) % 3 === 0;
    case 'yearly': return it.month === mm;
    case 'once': return it.month === mm && it.year === yy;
  }
  return false;
}
/** It recurs in that month and this version is in force. */
export const occurs = (it, ym) => activeIn(it, ym) && recurs(it, ym);
export const unit = (it) => ({ monthly: t('/mes'), quarterly: t('/trim.'), yearly: t('/año'), once: '' }[it.freq]);
export function freqText(it) {
  const day = it.day ? ' · ' + t('día {d}', { d: it.day }) : '';
  if (it.freq === 'monthly') return t('cada mes') + day;
  if (it.freq === 'quarterly') return t('cada 3 meses desde {m}', { m: MES[(it.month || 1) - 1] }) + day;
  if (it.freq === 'yearly') return it.month ? t('cada {m}', { m: MES[it.month - 1] }) + day : t('una vez al año, sin fecha fija');
  return it.day ? t('solo el {d} de {m} {y}', { d: it.day, m: MES[(it.month || 1) - 1], y: it.year }) : t('solo {m} {y}', { m: MES[(it.month || 1) - 1], y: it.year });
}
// ---------- the plan over time ----------
// An item is a list of versions (rows with the same id): each one in force from a month to a month. Changing the plan
// never overwrites: it cuts the versions it overlaps and adds the new one, so the plan of any month can be rebuilt.
/** The parts of a version that fall outside the months F..T (T empty: no end). */
function cutOut(seg, F, T) {
  const out = [], a = seg.from || '', b = seg.to || '', lastLeft = ymAdd(F, -1);
  if (!a || a <= lastLeft) out.push({ ...seg, ...(!b || b > lastLeft ? { to: lastLeft } : {}) });
  if (T) {
    const firstRight = ymAdd(T, 1);
    if (!b || b >= firstRight) out.push({ ...seg, from: !a || a < firstRight ? firstRight : a });
  }
  return out;
}
function rebuild(items, id, newSeg, F, T) {
  const out = []; const old = []; let at = -1;
  for (const it of items) {
    if (it.id !== id) { out.push(it); continue; }
    if (at < 0) at = out.length;
    old.push(...cutOut(it, F, T));
  }
  const all = [...old, ...(newSeg ? [newSeg] : [])].sort((x, y) => (x.from || '').localeCompare(y.from || ''));
  out.splice(at < 0 ? out.length : at, 0, ...all);
  return out;
}
/** Change an item from month F (to month T, or onwards): `def` is its whole new definition. */
export function planEdit(items, id, def, F, T = '', at = new Date().toISOString()) {
  return rebuild(items, id, normItem({ ...def, id, from: F || undefined, to: T || undefined, at }), F, T);
}
/** Stop an item from month F on (what it was stays in the past). */
export const planDelete = (items, id, F) => rebuild(items, id, null, F, '');
/** Add an item that applies from month F. */
export const planAdd = (items, def, F, at = new Date().toISOString()) => [...items, normItem({ ...def, from: F || undefined, at })];
/** One version per item for a month: the one in force, or else the next one that starts. */
export function planShown(items, ym) {
  const seen = new Set(), out = [];
  for (const it of items) {
    if (seen.has(it.id)) continue;
    seen.add(it.id);
    const segs = items.filter((i) => i.id === it.id);
    const now = segs.find((i) => activeIn(i, ym)) || segs.filter((i) => i.from && i.from > ym).sort((a, b) => a.from.localeCompare(b.from))[0];
    if (now) out.push(now);
  }
  return out;
}
/** The version of an item that starts after month `ym` (the next change already planned), if any. */
export const planNext = (items, id, ym) => items.filter((i) => i.id === id && i.from && i.from > ym).sort((a, b) => a.from.localeCompare(b.from))[0] || null;

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
  const base = (ym) => cycleRange(ym, D); // the month by the calendar: what each planned item belongs to
  // By default the month starts the day your pay comes in: if it comes early (on a Friday, before a holiday), the new month
  // starts that day and the old one ends the day before. `cycleBy: 'day'` keeps the month on its fixed days.
  const byPay = data.settings?.cycleBy !== 'day';
  const payers = items.filter((i) => i.kind === 'in' && i.freq === 'monthly' && i.day && !i.budget).sort((a, b) => b.amount - a.amount);
  /** The date (ISO) an item falls on in month `ym`, or null if it doesn't. No day: the month's first day. */
  const dateIn = (it, ym) => {
    if (!activeIn(it, ym)) return null; // this version isn't in force in that month
    if (!it.day || D <= 1) return recurs(it, ym) ? (it.day ? `${ym}-${pad(dayIn(it.day, ym))}` : base(ym).from) : null; // no day: from the month's first day
    const r = base(ym);
    for (const c of [ymAdd(ym, -1), ym]) {
      if (!recurs(it, c)) continue;
      const d = `${c}-${pad(dayIn(it.day, c))}`;
      if (d >= r.from && d <= r.to) return d;
    }
    return null;
  };
  /** The pay that starts month ym (months from payday to payday): the main monthly income, when it's planned on the month's first days. */
  const anchorOf = (ym) => {
    if (!byPay || D <= 1) return null; // calendar months: the pay doesn't start them
    const p = payers.find((i) => activeIn(i, ym)), d = p && dateIn(p, ym), f = base(ym).from;
    return d && d >= f && isoDays(d) - isoDays(f) <= 3 ? p : null;
  };
  const starts = new Map(), todayStr = toISO(today);
  /** Month ym's pay is due but you haven't said it came in: the month before goes on until you do (up to 10 days). */
  const waitingPay = (ym) => {
    const p = anchorOf(ym), mo = (data.months || {})[ym] || {};
    // you said it came in, or you already gave the month a balance of its own: it has started
    if (!p || (mo.dates || {})[p.id] || (mo.real || {})[p.id] != null || mo.open != null || mo.check || mo.bal != null) return false;
    const d = dateIn(p, ym);
    return d <= todayStr && todayStr < isoAdd(d, 10);
  };
  /** The first day of month ym: the day its pay came in, if you said it came on another day (up to 10 days off);
   *  while it's due and not confirmed, tomorrow (today still belongs to the month before). */
  const startIn = (ym) => {
    if (!starts.has(ym)) {
      const f = base(ym).from, p = anchorOf(ym), moved = p && ((data.months || {})[ym]?.dates || {})[p.id];
      starts.set(ym, moved && Math.abs(isoDays(moved) - isoDays(f)) <= 10 ? moved : waitingPay(ym) ? isoAdd(todayStr, 1) : f);
    }
    return starts.get(ym);
  };
  const range = (ym) => {
    const from = startIn(ym), to = isoAdd(startIn(ymAdd(ym, 1)), -1);
    return { from, to, days: isoDays(to) - isoDays(from) + 1 };
  };
  const monthOf = (iso) => {
    const b = cycleOf(iso, D);
    return iso >= startIn(ymAdd(b, 1)) ? ymAdd(b, 1) : iso < startIn(b) ? ymAdd(b, -1) : b;
  };
  /** Day number (1…) of a date inside month ym, and the date of day n. */
  const dayOfM = (iso, ym) => isoDays(iso) - isoDays(range(ym).from) + 1;
  const dateOfDay = (ym, n) => isoAdd(range(ym).from, n - 1);
  const curYM = monthOf(toISO(today));
  const goal = Math.max(0, num(data.settings?.goal) ?? 0);
  const start = isYM(data.settings?.start) ? data.settings.start : curYM;
  const season = Array.from({ length: 12 }, (_, i) => ymAdd(start, i));

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
  // a closing balance stands with its close: one left behind by a close you undid isn't where the next month starts
  const months = Object.fromEntries(Object.entries(data.months || {}).map(([k, v]) => [k, v && v.bal != null && !v.close ? (({ bal, ...r }) => r)(v) : v]));
  const mon = (ym) => months[ym] || {};
  const todayISO = toISO(today);

  // budgets by type (one budget per type: the first one wins)
  /** The budget of a type in force in a month (one per type: the first one wins). */
  const budFor = (cat, ym) => budgets.find((b) => b.cat === cat && activeIn(b, ym));
  // as they stand this month (what the screens show)
  const budByCat = new Map();
  for (const b of budgets) if (activeIn(b, curYM) && !budByCat.has(b.cat)) budByCat.set(b.cat, b);
  // allSpends: every one (older ones may point at a budget's id: read them as its type);
  // spends: the ones against Resto de vida
  const idCat = new Map(budgets.map((b) => [b.id, b.cat]));
  const allSpends = (data.spends || []).map((e) => (idCat.has(e.cat) ? { ...e, cat: idCat.get(e.cat) } : e));
  const spends = allSpends.filter((e) => !budFor(e.cat, monthOf(e.date)) && e.cat !== SAVE_CAT);
  /** What you logged against a budget in a month. */
  const budSpent = (b, ym) => budFor(b.cat, ym) !== b ? 0
    : round2(allSpends.reduce((s, e) => s + (e.cat === b.cat && monthOf(e.date) === ym ? e.amount : 0), 0));
  /** A month's spending by type, largest first ('' = no type). */
  const byCat = (ym) => {
    const t = {};
    for (const e of allSpends) if (monthOf(e.date) === ym && e.cat !== SAVE_CAT) t[e.cat || ''] = round2((t[e.cat || ''] || 0) + e.amount);
    return Object.entries(t).map(([cat, amount]) => ({ cat, amount, budget: budFor(cat, ym) || null })).sort((a, b) => b.amount - a.amount);
  };
  /** What a monthly budget takes from its month: the whole budget while the month runs (more if you went over);
   *  once the month is over, only what you spent: the rest goes back to the month's leftover. */
  const budUse = (b, ym) => { if (!activeIn(b, ym)) return 0; const sp = budSpent(b, ym); return ym < curYM ? sp : Math.max(b.amount, sp); };

  /** Exact amount entered for that month, if any (older plans kept some under potSpent). */
  const realOf = (it, ym) => {
    if (it.budget) return null;
    const v = (mon(ym).real || {})[it.id] ?? (mon(ym).potSpent || {})[it.id];
    return v == null ? null : +v;
  };
  /** The date an item falls on in a month; without a day, the first day of the month. */
  const dateOf = (it, ym) => (mon(ym).dates || {})[it.id] || (waitingPay(ym) && anchorOf(ym).id === it.id ? range(ym).from : null) || dateIn(it, ym) || range(ym).from;
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
  // a yearly limit is one amount for the year even if it changed: the one in force last in the plan year, against all that was spent
  const yids = [...new Set(ybud.map((b) => b.id))];
  const budY = round2(season.reduce((s, ym) => s + mbud.reduce((a, b) => a + budUse(b, ym), 0), 0) + yids.reduce((s, id) => {
    const segs = ybud.filter((b) => b.id === id), last = [...season].reverse().map((ym) => segs.find((b) => activeIn(b, ym))).find(Boolean);
    return s + (last ? Math.max(last.amount, segs.reduce((a, b) => a + budSpentY(b), 0)) : 0);
  }, 0));
  const possible = incomeY - outY - budY;
  /** Día a día: what's left for everything not in the plan, after expected expenses, budgets and savings. */
  /**
   * Each month's savings target follows the plan: what the month leaves once its expected expenses and limits are
   * planned for, minus an even share of everything else. Months with an extra pay aim higher, expensive months lower
   * (even below zero), every month leaves the same amount unplanned, and the twelve add up to the yearly goal.
   */
  const plannedNet = (ym) => round2(ins.reduce((s, i) => s + (occ(i, ym) ? i.amount : 0), 0) - direct.reduce((s, i) => s + (occ(i, ym) ? i.amount : 0), 0)
    - mbud.reduce((s, b) => s + (activeIn(b, ym) ? b.amount : 0), 0) - ybud.reduce((s, b) => s + (activeIn(b, ym) ? b.amount : 0), 0) / 12);
  const slack = (season.reduce((s, ym) => s + plannedNet(ym), 0) - goal) / 12; // planned and unplanned each month
  const targetOf = (ym) => (goal > 0 ? round2(plannedNet(ym) - slack) : 0);
  const restOf = (ym) => round2(incomeOf(ym) - outOf(ym) - budOf(ym) - targetOf(ym));
  const restAvg = (possible - goal) / 12;

  const payItem = payers.find((i) => activeIn(i, curYM)) || payers[0];
  const payday = payItem ? payItem.day : null;

  const idx = ymDiff(start, curYM);
  const pre = idx < 0, over = idx > 11;
  const curIdx = clamp(idx, 0, 11);
  const cur = season[curIdx];

  // ---------- the account: balances and what left it ----------
  const endISO = (ym) => range(ym).to;
  /** The date of a one-off item, in whichever month (payday to payday) it falls: null when none of them holds it. */
  const onceDate = (it) => {
    const base = `${it.year}-${String(it.month || 1).padStart(2, '0')}`;
    for (const ym of [ymAdd(base, -1), base, ymAdd(base, 1)]) if (occ(it, ym)) return dateOf(it, ym);
    return null;
  };
  /** The start balance is the one at the start of `openDate`: the day before it is the last that is already in it. */
  const openAfter = (ym) => (mon(ym).openDate ? isoAdd(mon(ym).openDate, -1) : '');
  /** Balance when the month began: entered by hand, or the previous month's closing balance. */
  const balStart = (ym) => {
    const m = mon(ym);
    if (m.open != null) return +m.open;
    const p = mon(ymAdd(ym, -1));
    return p.bal == null ? null : +p.bal;
  };
  /** A month's planned occurrences (no budgets): the item, the day it happened (or is due) and its amount. `any`: confirmed
   *  without a date of its own, so it counts whatever the date you ask up to. */
  const occsOf = (ym) => {
    const out = [];
    for (const it of items) {
      if (it.budget) continue;
      const r = realOf(it, ym);
      if (r == null && !occ(it, ym)) continue;
      out.push({ it, ym, date: dateOf(it, ym), v: r ?? it.amount, any: r != null && !(mon(ym).dates || {})[it.id] });
    }
    return out;
  };
  /** What moved through the account during month ym, by the day it really happened: its own occurrences that fell in it, and
   *  those of the month before or after that came early or late (a pay that came in on the last day, a bill charged after). */
  const cashOccs = (ym) => {
    const r = range(ym);
    return [ymAdd(ym, -1), ym, ymAdd(ym, 1)].flatMap(occsOf).filter((o) => o.date >= r.from && o.date <= r.to);
  };
  /** The plan's money in and out in a month, up to a date (ISO): what came in, fixed expenses, what you logged against budgets
   *  and what you put aside. By default what belongs to the month, even if it was paid in the one before or after (it counts on
   *  its month's last day at the latest); `cash`: what moved through the account in it instead, whichever month it belongs to. */
  const flowTo = (ym, upto, cash = false) => {
    let inc = 0, out = 0, bud = 0, save = 0;
    const after = openAfter(ym), r = range(ym); // the balance is the one at the start of its day: what came before is already in it
    for (const o of cash ? cashOccs(ym) : occsOf(ym)) {
      if (after && o.date <= after) continue;
      const due = o.ym === ym && o.any ? '' : cash ? o.date : o.date > r.to ? r.to : o.date;
      const v = due <= upto ? o.v : 0;
      if (o.it.kind === 'in') inc += v; else if (isSave(o.it)) save += v; else out += v;
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
   * left: what's left over (how much the account grew, or shrank if negative, leaving out what came in or went out early
   * or late for another month): at the close it counts as saved · shift: that, as it stands in the balance.
   * Null when the balance at the start of the month isn't known.
   */
  const fromBalance = (ym, bal, upto = endISO(ym)) => {
    const start = balStart(ym);
    if (start == null || bal == null) return null;
    // what left outside the plan comes from what really moved through the account; what's left over, from what belongs to the
    // month: a pay that came in early belongs to the next one, a bill charged late is still this one's
    const f = flowTo(ym, upto), c = flowTo(ym, upto, true), saved = f.save;
    // a balance looked at after the month ended also holds what the next one has moved so far: its pay, what you logged
    let nxt = 0;
    if (upto > range(ym).to) {
      const nx = ymAdd(ym, 1), x = flowTo(nx, upto, true), after = openAfter(nx);
      const logged = allSpends.reduce((a, e) => a + (monthOf(e.date) === nx && e.date <= upto && !(after && e.date <= after) && e.cat !== SAVE_CAT ? e.amount : 0), 0);
      nxt = round2(x.inc - x.out - (x.save - (+mon(nx).saved || 0)) - logged);
    }
    const cash = round2(start + c.inc - c.out - c.save + nxt - bal);
    const shift = round2(c.inc - c.out - c.save + nxt - (f.inc - f.out - f.save)); // in the balance, but from another month (+ in, − out)
    return { start, bal, ...f, saved, cash, rest: round2(cash - f.bud), left: round2(bal - start - shift), shift };
  };
  /** A planned occurrence as a movement of the account in month ym (one of another month says which). */
  const occEvent = (o, ym) => ({ label: o.ym === ym ? o.it.name : `${o.it.name} (${t('de {m}', { m: monthName(o.ym) })})`, amount: o.it.kind === 'in' ? o.v : -o.v, kind: isSave(o.it) ? 'save' : o.it.kind, other: o.ym === ym ? '' : o.ym });
  /**
   * The account through a month, day by day, counted from the day it began (0): incomes and expected expenses on
   * their days (no day: the last one), what you put aside on payday, logged spends on their dates, and the rest
   * of what left the account (worked out from the closing balance) spread evenly over the days.
   * pts: [{ day (0..days), y, events: [{ label, amount, kind }] }] · daily: that spread, per day. Null without the start balance.
   */
  const curveOf = (ym, bal) => {
    const r = fromBalance(ym, bal);
    if (!r) return null;
    const dim = range(ym).days, at = (iso) => clamp(dayOfM(iso, ym), 1, dim), ev = Array.from({ length: dim + 1 }, () => []);
    for (const o of cashOccs(ym)) if (o.v) ev[at(o.date)].push(occEvent(o, ym));
    const legacy = +mon(ym).saved || 0;
    if (legacy) ev[payItem && occ(payItem, ym) ? at(dateOf(payItem, ym)) : 1].push({ label: legacy > 0 ? 'Al ahorro' : 'Del ahorro', amount: -legacy, kind: 'save' });
    let logged = 0;
    for (const e of allSpends) {
      if (monthOf(e.date) !== ym) continue;
      if (e.cat !== SAVE_CAT) logged += e.amount;
      ev[at(e.date)].push({ label: e.note || CAT[e.cat]?.name || t('Gasto'), amount: -e.amount, kind: e.cat === SAVE_CAT ? 'save' : 'spend' });
    }
    const daily = -(r.cash - logged) / dim;
    const pts = [{ day: 0, date: isoAdd(dateOfDay(ym, 1), -1), y: 0, events: [] }]; // the balance at the start of the month's first day
    let y = 0;
    for (let d = 1; d <= dim; d++) { y += ev[d].reduce((s, e) => s + e.amount, 0) + daily; pts.push({ day: d, date: dateOfDay(ym, d), y: round2(y), events: ev[d] }); }
    pts[dim].y = round2(bal - r.start); // no rounding drift: the month ends where the balance says
    return { pts, daily: round2(daily) };
  };

  /**
   * The current month's account, day by day, before it is closed: from its start balance, with the incomes and expenses
   * on their days. What the balance you looked at last says was spent beyond what is logged is spread evenly up to that
   * day and carried on at the same pace to the end of the month (an estimate). Same shape as curveOf, plus `fromDay`:
   * the first day that is not known yet (after today). Null without a start balance.
   */
  const curveNow = (ym) => {
    const s = balStart(ym);
    if (s == null) return null;
    const m = mon(ym), dim = range(ym).days, at = (iso) => clamp(dayOfM(iso, ym), 1, dim), after = openAfter(ym);
    // the last day already inside the start balance, as a day of the month (0 = the balance is from before the month's first day)
    const d0 = after && after >= range(ym).from ? clamp(at(after), 0, dim) : 0, ev = Array.from({ length: dim + 1 }, () => []);
    for (const o of cashOccs(ym)) if (o.v && !(after && o.date <= after)) ev[at(o.date)].push(occEvent(o, ym));
    for (const e of allSpends) {
      if (monthOf(e.date) !== ym || (after && e.date <= after)) continue;
      ev[at(e.date)].push({ label: e.note || CAT[e.cat]?.name || t('Gasto'), amount: -e.amount, kind: e.cat === SAVE_CAT ? 'save' : 'spend' });
    }
    const E = Array(dim + 1).fill(0);
    for (let d = Math.max(1, d0 + 1); d <= dim; d++) E[d] = E[d - 1] + ev[d].reduce((a, e) => a + e.amount, 0);
    const chk = m.check, a = chk ? clamp(at(chk.date), d0, dim) : d0;
    // what the balance you gave says beyond the plan and what you logged: a shortfall is spending nobody logged, spread
    // evenly up to that day and carried on; a surplus is money that came in unexplained (never a daily gain): it lands on that day
    const ya = chk ? +chk.bal - s : 0, gap = chk && a > d0 ? ya - E[a] : 0;
    const extra = gap > 0.5 ? round2(gap) : 0, daily = chk && a > d0 && !extra ? gap / (a - d0) : 0;
    if (extra) ev[a].push({ label: t('Ingreso sin apuntar'), amount: extra, kind: 'in' });
    const y = (d) => (extra ? (d < a ? E[d] : ya + (E[d] - E[a])) : d <= a ? E[d] + daily * (d - d0) : ya + (E[d] - E[a]) + daily * (d - a));
    // From today on, the balance follows the same projection as the month's spending (what the plan still has to come, plus your
    // pace on everything else), so the line ends where "A este ritmo" says it will.
    const tDay = ym === curYM ? at(todayISO) : dim;
    let V = null;
    if (ym === curYM && tDay - d0 >= 3) {
      const paid = items.filter((it) => !it.budget && it.kind === 'out' && !isSave(it) && occ(it, ym) && dateOf(it, ym) <= todayISO && !(after && dateOf(it, ym) <= after)).reduce((a, it) => a + (realOf(it, ym) ?? it.amount), 0);
      V = Math.max(0, spentAll(ym, todayISO) - paid) / (tDay - d0);
    }
    const yy = (d) => (V == null || d <= tDay ? y(d) : y(tDay) + (E[d] - E[tDay]) - V * (d - tDay));
    const pts = [];
    for (let d = Math.max(0, d0); d <= dim; d++) pts.push({ day: d, date: d ? dateOfDay(ym, d) : isoAdd(dateOfDay(ym, 1), -1), y: round2(d <= d0 ? 0 : yy(d)), events: d > d0 ? ev[d] : [] });
    // what leaves the account for savings and investment in the month, done and planned: it is saved, though the balance drops by it
    const saveMoved = round2(-ev.reduce((a, day) => a + day.filter((e) => e.kind === 'save').reduce((b, e) => b + e.amount, 0), 0));
    const saveDone = round2(-ev.slice(0, tDay + 1).reduce((a, day) => a + day.filter((e) => e.kind === 'save').reduce((b, e) => b + e.amount, 0), 0));
    return { pts, daily: round2(daily), extra, start: s, fromDay: ym === curYM ? at(todayISO) + 1 : dim + 1, d0, saveMoved, saveDone };
  };
  /**
   * The balance of the main account over the last `back` days and, for the current month, on to its end: a line of
   * { date, bal, proj }. Closed months use the day-by-day line from their closing balance; the current one is estimated.
   */
  const balanceTrail = (back = 60) => {
    const out = [], first = isoAdd(todayISO, -back);
    for (let k = Math.ceil(back / 28) + 1; k >= 0; k--) {
      const ym = ymAdd(curYM, -k), st = balStart(ym), m = mon(ym);
      if (st == null) continue;
      if (ym < curYM) {
        if (m.bal == null) continue;
        const cv = curveOf(ym, +m.bal);
        if (cv) for (const p of cv.pts) out.push({ date: p.date, bal: round2(st + p.y), proj: false });
      } else {
        const cv = curveNow(ym);
        if (cv) for (const p of cv.pts) out.push({ date: p.date, bal: round2(st + p.y), proj: p.day >= cv.fromDay });
      }
    }
    // one point per day: where one month ends the next one starts, at the same balance
    const seen = new Set();
    const pts = out.filter((p) => p.date >= first && !seen.has(p.date) && seen.add(p.date)).sort((a, b) => a.date.localeCompare(b.date));
    // a month that was never closed leaves a hole: only the latest unbroken stretch is a line worth drawing
    let from = 0;
    for (let i = 1; i < pts.length; i++) if (isoDays(pts[i].date) - isoDays(pts[i - 1].date) > 1) from = i;
    return pts.slice(from);
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
    return loggedRest(ym, openAfter(ym));
  };
  /** Everything spent in a month up to a date (default: all of it): expected expenses already due, what you logged
   *  against budgets, and the rest (from the balance, or what you logged). What you put aside isn't spending. */
  const spentAll = (ym, upto = endISO(ym)) => { const f = flowTo(ym, upto); return round2(f.out + f.bud + Math.max(0, spentOf(ym))); };
  /** What came in during a month up to a date (default: all of it). */
  const incomeTo = (ym, upto = endISO(ym)) => flowTo(ym, upto).inc;
  /** Saved in a month: what you moved to savings or investment. What stays in the account isn't saving. */
  const savedOf = (ym) => {
    if (ym > curYM) return 0;
    return round2(flowTo(ym, ym === curYM ? todayISO : endISO(ym)).save);
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
    return out.sort((a, b) => a.date.localeCompare(b.date) || (a.it.kind === b.it.kind ? b.it.amount - a.it.amount : a.it.kind === 'in' ? -1 : 1));
  };
  /** Variable amounts already due that you haven't confirmed, in a month. */
  const pendingIn = (ym) => plannedIn(ym).filter((p) => p.state === 'pending');

  return {
    items, goal, start, season, ins, outs, direct, target, targetOf, incomeOf, outOf, restOf, restAvg, savedOf,
    incomeY, outY, possible, payday, idx, pre, over, curIdx, cur, curYM, mon, status, spentOf, saved, streak, cleared,
    paidMonths, expected, plannedIn, pendingIn, realOf, stateOf, amountIn, spends,
    cycleDay: D, isSave, saveItems, monthOf, range, dateOf, occurs: occ, todayISO, dayOf: dayOfM, byPay, anchorOf, base, waitingPay,
    balStart, openAfter, onceDate, flowTo, fromBalance, curveOf, curveNow, balanceTrail, spentSrc, loggedRest, endISO, spentAll, incomeTo,
    budgets, mbud, ybud, budSpent, budUse, budOf, budY, budSpentY, allSpends, budByCat, budFor, byCat,
    /** One version per item, as it stands in month ym (default: this one). */
    shown: (ym = curYM) => planShown(items, ym), segmentsOf: (id) => items.filter((i) => i.id === id), itemAt: (id, ym) => items.find((i) => i.id === id && activeIn(i, ym)) || null,
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
  return { settings, items, months, spends, log: normLog(obj.log), calcs: normCalcs(obj.calcs) };
}
/** The log of plan changes: who changed what, when and from which month: [{ at, id, name, action, from, to, before, after }]. */
export function normLog(arr) {
  const obj = (o) => (o && typeof o === 'object' && !Array.isArray(o) ? o : {});
  return (Array.isArray(arr) ? arr : []).map((e) => ({
    at: String(e?.at || ''), id: String(e?.id || ''), name: String(e?.name || ''),
    action: ['add', 'edit', 'delete'].includes(e?.action) ? e.action : 'edit',
    from: isYM(e?.from) ? e.from : '', to: isYM(e?.to) ? e.to : '', before: obj(e?.before), after: obj(e?.after),
  })).filter((e) => e.at && e.id);
}
/** Settings: the yearly goal, the plan's first month, and past years' closes. */
export function normSettings(o = {}) {
  const st = { goal: Math.max(0, num(o.goal) ?? 0), start: isYM(o.start) ? o.start : toYM(new Date()) };
  const cd = Math.round(num(o.cycleDay) ?? 0);
  if (cd >= 1 && cd <= 28) st.cycleDay = cd;
  if (o.cycleBy === 'day') st.cycleBy = 'day'; // the month on fixed days, not from the day your pay comes in
  // the look you chose (language, currency), kept with the data so it comes back when the browser forgets this device
  if (/^[a-z]{2}$/.test(String(o.lang || ''))) st.lang = o.lang;
  if (/^[A-Z]{3}$/.test(String(o.cur || ''))) st.cur = o.cur;
  if (['light', 'dark', 'auto'].includes(o.theme)) st.theme = o.theme;
  if (Array.isArray(o.cats)) {
    const cats = o.cats.filter((c) => c && isCustomCat(c.id) && String(c.name || '').trim())
      .map((c) => ({ id: String(c.id), name: String(c.name).trim().slice(0, 24), icon: String(c.icon || 'otros'), ...(/^p([1-9]|1[0-2])$/.test(c.color) ? { color: c.color } : {}) }));
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
  // every look at the balance you gave (the latest one, `check`, is what the month uses)
  const ck = (Array.isArray(m?.checks) ? m.checks : []).map((c) => ({ date: c?.date, bal: num(c?.bal) })).filter((c) => isISO(c.date) && c.bal != null);
  if (o.check && !ck.some((c) => c.date === o.check.date)) ck.push({ ...o.check });
  if (ck.length) { ck.sort((a, b) => a.date.localeCompare(b.date)); o.checks = ck; o.check = ck[ck.length - 1]; }
  const ps = {};
  for (const [k, v] of Object.entries(m?.potSpent || {})) { const n = num(v); if (n != null) ps[k] = n; }
  if (Object.keys(ps).length) o.potSpent = ps;
  const re = {};
  for (const [k, v] of Object.entries(m?.real || {})) { const n = num(v); if (n != null) re[k] = n; }
  if (Object.keys(re).length) o.real = re;
  // the day something planned really happened, when it wasn't the planned one: { itemId: 'YYYY-MM-DD' }
  const dt = {};
  for (const [k, v] of Object.entries(m?.dates || {})) if (isISO(v)) dt[k] = v;
  if (Object.keys(dt).length) o.dates = dt;
  // month close: how much the account grew (or shrank) over the month; a record, not saving
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
  // a negative amount is only for taking money out of savings; for anything else it is just the amount
  const o = { id: String(e.id || uid('g')), date: e.date, amount: amount < 0 && e.cat !== SAVE_CAT ? -amount : amount, note: String(e.note || '') };
  if (e.cat) o.cat = String(e.cat);
  return o;
}

/**
 * Saved decisions (what to do about something: buy a car, rent or buy a home): { id, name, at, years, infl (% a year costs go up),
 * rets: [% a year the money would earn invested, net — one per scenario], sel (the scenario shown), rows, alts }.
 * rows: the concepts every alternative is compared on { id, n, f: 'm' a month | 'y' a year | 'o' once, at the start | '2'…'10'
 * every that many years, fix: true if it does not go up with inflation (a lease), ag: the % a year it also goes up (maintenance,
 * repairs) or down (insurance) with age, on top of inflation, inc: true if it is an income (the rent a flat brings in),
 * from / to: the years it applies (from 1; none: all) }.
 * alts: the alternatives { name, price, how it keeps its value (vm, dep, vc, ve, life), sellc (% it costs to sell), a loan
 * (loan, rate, term in months; none when 0), v: { rowId: amount } }.
 * Saved by an older version (one list of costs per option, one return): the costs become shared rows, the return one scenario.
 */
export const CALC_FREQ = ['m', 'y', '2', '3', '4', '5', '6', '8', '10', 'o'];
export const CALC_MAX = { alts: 6, rows: 30, rets: 4 };
export function normCalcs(arr) {
  if (!Array.isArray(arr)) return [];
  const n = (v) => Math.max(0, num(v) ?? 0), lim = (v, a, b, d) => { const x = num(v); return x == null ? d : Math.min(b, Math.max(a, x)); };
  const freq = (f) => (CALC_FREQ.includes(String(f)) ? String(f) : 'm');
  // the years a concept applies (from 1): none means all; a one-off can be paid at the start of a later year
  const yearsOf = (r) => { const a = Math.round(num(r?.from) ?? 0), b = Math.round(num(r?.to) ?? 0), o = {}; if (a > 1 && a <= 50) o.from = a; if (b >= Math.max(1, a) && b <= 50 && r?.f !== 'o') o.to = b; return o; };
  const agOf = (r) => { const x = num(r?.ag) ?? (r?.grow ? 10 : 0); return Math.round(Math.max(-50, Math.min(50, x)) * 10) / 10; }; // % a year of age, on top of inflation
  const alt = (o, years, v) => {
    // saved long ago: what it was worth at the end, in % of the price → the yearly change that gets there
    const dep = num(o?.dep) != null ? lim(o.dep, -100, 50, 0) : num(o?.residual) != null ? Math.round(((Math.min(100, n(o.residual)) / 100) ** (1 / years) - 1) * 1000) / 10 : 0;
    const fin = o?.fin === undefined ? true : !!o.fin; // the old shape had a switch; now a loan is simply an amount and a term
    return {
      name: String(o?.name || '').slice(0, 60), price: n(o?.price), vm: ['curve', 'rate', 'end', 'linear', 'none', 'infl'].includes(o?.vm) ? o.vm : 'rate', dep,
      // the old "used car" curve is the average one, picked up at 3 years old
      ...(o?.vc ? { vc: o.vc === 'carUsed' ? 'carNew' : String(o.vc) } : {}), ...(o?.vc === 'carUsed' && num(o?.age) == null ? { age: 3 } : n(o?.age) ? { age: Math.min(30, Math.round(n(o.age))) } : {}), ...(n(o?.ve) ? { ve: n(o.ve) } : {}), ...(n(o?.life) ? { life: Math.min(50, n(o.life)) } : {}), ...(n(o?.sellc) ? { sellc: Math.min(100, n(o.sellc)) } : {}),
      loan: fin ? n(o?.loan) : 0, rate: fin ? Math.min(50, n(o?.rate)) : 0, term: fin ? Math.min(600, Math.round(n(o?.term))) : 0, v,
    };
  };
  return arr.filter((c) => c && c.id).map((c0) => {
    const c = c0.opts && typeof c0.opts === 'object' && !Array.isArray(c0.opts) ? { ...c0, ...c0.opts } : c0; // from the sheet: the details travel in one cell
    const years = Math.min(50, Math.max(1, Math.round(n(c.years) || n(c.opts?.[0]?.years) || 5)));
    let rows = [], alts = [];
    if (Array.isArray(c.alts)) {
      const seen = new Set();
      rows = (Array.isArray(c.rows) ? c.rows : []).filter((r) => r && /^[\w-]{1,16}$/.test(String(r.id)) && !seen.has(String(r.id)) && seen.add(String(r.id)))
        .slice(0, CALC_MAX.rows).map((r) => ({ id: String(r.id), n: String(r.n || '').slice(0, 60), f: freq(r.f), ...(r.inc ? { inc: true } : {}), ...(r.f === 'o' ? {} : r.fix ? { fix: true } : agOf(r) ? { ag: agOf(r) } : {}), ...yearsOf(r) }));
      alts = c.alts.slice(0, CALC_MAX.alts).map((a) => {
        const v = {};
        for (const r of rows) { const x = n(a?.v?.[r.id]); if (x) v[r.id] = x; }
        return alt(a, years, v);
      });
    } else {
      // one list of costs per option → shared concepts: the same name, frequency and kind is the same row
      const key = new Map();
      alts = (Array.isArray(c.opts) ? c.opts : []).slice(0, CALC_MAX.alts).map((o) => {
        const v = {};
        for (const x of Array.isArray(o?.costs) ? o.costs : []) {
          const nm = String(x?.n || '').slice(0, 60), f = freq(x?.f), fix = !!x?.fix && f !== 'o', k = `${nm.trim().toLowerCase()}|${f}|${fix}`;
          if (!key.has(k)) { if (rows.length >= CALC_MAX.rows) continue; const id = 'r' + (rows.length + 1); key.set(k, id); rows.push({ id, n: nm, f, ...(fix ? { fix: true } : {}) }); }
          const id = key.get(k); v[id] = (v[id] || 0) + n(x?.a);
        }
        return alt(o, years, v);
      });
      for (const a of alts) a.v = Object.fromEntries(rows.filter((r) => a.v[r.id]).map((r) => [r.id, a.v[r.id]])); // in the rows' order
    }
    const rets = [...new Set((Array.isArray(c.rets) && c.rets.length ? c.rets : [c.ret ?? 4]).map((r) => lim(r, -10, 30, 4)))].slice(0, CALC_MAX.rets);
    return {
      id: String(c.id), name: String(c.name || '').slice(0, 80), at: String(c.at || ''), years, infl: lim(c.infl, -5, 30, 2.5),
      rets, sel: Math.min(rets.length - 1, Math.max(0, Math.round(num(c.sel) ?? 0))), rows, alts,
    };
  });
}
