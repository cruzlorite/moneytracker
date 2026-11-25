// node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compute, normMonth, normSettings, normItem, occurs, num, daysTo, monthGrid, parsePlanFile, ymAdd, ymDiff, timesIn, cycleRange, cycleOf, cycleDayOf } from '../js/model.js';
import { parseSheet, toRows, TABS } from '../js/google.js';

const plan = (items, extra = {}) => ({ settings: { goal: 1200, start: '2027-01', cycleDay: 1 }, items: items.map(normItem), months: {}, spends: [], ...extra });

test('num reads Spanish and plain numbers', () => {
  assert.equal(num('1.234,5'), 1234.5);
  assert.equal(num('12,30'), 12.3);
  assert.equal(num('99.9'), 99.9);
  assert.equal(num(''), null);
  assert.equal(num('abc'), null);
});

test('month arithmetic', () => {
  assert.equal(ymAdd('2026-12', 1), '2027-01');
  assert.equal(ymAdd('2027-01', -1), '2026-12');
  assert.equal(ymDiff('2026-12', '2027-11'), 11);
});

test('occurs: monthly, quarterly, yearly, once', () => {
  const q = normItem({ kind: 'out', freq: 'quarterly', month: 2, amount: 10 });
  assert.deepEqual(['2027-02', '2027-05', '2027-08', '2027-11'].map((m) => occurs(q, m)), [true, true, true, true]);
  assert.equal(occurs(q, '2027-03'), false);
  const o = normItem({ kind: 'in', freq: 'once', month: 3, year: 2027, amount: 5 });
  assert.equal(occurs(o, '2027-03'), true);
  assert.equal(occurs(o, '2028-03'), false);
});

test('normItem keeps rules: a yearly expense without a date is a yearly budget, vary flag', () => {
  const v = normItem({ kind: 'out', freq: 'yearly', month: 0, name: 'Veterinario', amount: 5, pot: true });
  assert.deepEqual([v.budget, v.month, v.pot, v.cat], [true, 0, undefined, 'mascotas']);
  assert.equal(normItem({ kind: 'out', freq: 'yearly', month: 3, amount: 5, pot: true }).pot, undefined); // no more funds
  assert.equal(normItem({ kind: 'out', freq: 'monthly', vary: 'sí', amount: 5 }).vary, true);
  assert.equal(normItem({ kind: 'out', freq: 'monthly', track: true, amount: 5 }).track, undefined);
  assert.equal(normItem({ kind: 'in', freq: 'monthly', amount: '-5' }).amount, 0);
});

test('compute: possible savings, every expense in its own month', () => {
  const d = plan([
    { id: 'n', kind: 'in', name: 'Nómina', amount: 2000, freq: 'monthly', day: 26 },
    { id: 'x', kind: 'in', name: 'Extra', amount: 600, freq: 'yearly', month: 6 },
    { id: 'r', kind: 'out', name: 'Casa', amount: 800, freq: 'monthly' },
    { id: 's', kind: 'out', name: 'Seguro', amount: 240, freq: 'yearly', month: 2, pot: true },
    { id: 'i', kind: 'out', name: 'IBI', amount: 300, freq: 'yearly', month: 9 },
    { id: 'q', kind: 'out', name: 'Agua', amount: 30, freq: 'quarterly', month: 1 },
  ]);
  const m = compute(d, new Date(2027, 2, 10));
  assert.equal(m.incomeY, 2000 * 12 + 600);
  assert.equal(m.outY, 800 * 12 + 240 + 300 + 120);
  assert.equal(m.possible, 24600 - 10260);
  assert.equal(m.outOf('2027-02'), 1040); // February pays the insurance: an expensive month
  assert.equal(m.outOf('2027-09'), 1100);
  // each month's target follows the plan: every month leaves the same unplanned (1095), the targets add up to the goal
  assert.equal(m.restOf('2027-01'), 1095);
  assert.equal(m.restOf('2027-03'), 1095);
  assert.equal(m.targetOf('2027-06'), 2600 - 800 - 1095); // the extra pay: aim higher
  assert.equal(m.targetOf('2027-02'), 2000 - 800 - 240 - 1095); // the insurance: below zero, and that's the plan
  assert.equal(round(m.season.reduce((s, ym) => s + m.targetOf(ym), 0)), 1200);
  assert.equal(m.restAvg, (24600 - 10260 - 1200) / 12);
  assert.equal(m.payday, 26);
  assert.equal(m.cur, '2027-03');
  assert.equal(m.paidMonths, 2); // March payday (26th) not reached on the 10th
});

test('compute: month status, streak', () => {
  const d = plan([
    { id: 'n', kind: 'in', name: 'N', amount: 2000, freq: 'monthly' },
    { id: 'o', kind: 'out', name: 'Casa', amount: 1700, freq: 'monthly' },
  ], {
    months: { '2027-01': { saved: 100 }, '2027-02': { saved: 100 }, '2027-03': { saved: 50 } },
    spends: [{ id: 'a', date: '2027-02-03', amount: 250, note: '' }, { id: 'b', date: '2027-01-03', amount: 40, note: '' }],
  });
  const m = compute(d, new Date(2027, 3, 2));
  assert.equal(m.status('2027-01'), 'clear');
  assert.equal(m.restOf('2027-02'), 2000 - 1700 - 100);
  assert.equal(m.status('2027-02'), 'partial'); // 250 spent > 200 for the día a día
  assert.equal(m.status('2027-03'), 'partial');
  assert.equal(m.status('2027-04'), 'none');
  assert.equal(m.saved, 250);
  assert.equal(m.streak, 0);
});

test('exact amounts: confirmed, taken as planned, pending, and resto de vida follows them', () => {
  const d = plan([
    { id: 'n', kind: 'in', name: 'Nómina', amount: 1000, freq: 'monthly', day: 26 },
    { id: 'm', kind: 'out', name: 'Móvil', amount: 10, freq: 'monthly', day: 5, vary: true },
    { id: 'c', kind: 'out', name: 'Casa', amount: 400, freq: 'monthly', day: 1 },
    { id: 's', kind: 'out', name: 'Seguro', amount: 120, freq: 'yearly', month: 2, day: 10 },
  ], { months: { '2027-01': { real: { n: 1031, m: 12.4 } }, '2027-02': { potSpent: { s: 95 } } } }); // older plans kept exact amounts of funded items here
  const m = compute(d, new Date(2027, 1, 20)); // 20 Feb
  assert.equal(m.amountIn(m.items[0], '2027-01'), 1031);
  assert.equal(m.stateOf(m.items[0], '2027-01'), 'real');
  assert.equal(m.targetOf('2027-01'), 110); // (590 × 12 − 120 − 1200) / 12 = 480 unplanned a month → 590 − 480
  assert.equal(m.restOf('2027-01'), round(1031 - 12.4 - 400 - 110)); // the insurance falls in February
  assert.equal(m.stateOf(m.items[2], '2027-02'), 'auto'); // fixed, day 1 has passed
  assert.equal(m.stateOf(m.items[1], '2027-02'), 'pending'); // variable, day 5 passed, not confirmed
  assert.equal(m.stateOf(m.items[0], '2027-02'), 'future'); // payday 26
  assert.deepEqual(m.pendingIn('2027-02').map((p) => p.it.id), ['m']);
  assert.equal(m.amountIn(m.items[3], '2027-02'), 95);
  assert.equal(m.outOf('2027-02'), 95 + 10 + 400);
});
const round = (n) => Math.round(n * 100) / 100;

test('daysTo and monthGrid', () => {
  assert.equal(daysTo(26, new Date(2027, 0, 20)), 6);
  assert.equal(daysTo(5, new Date(2027, 0, 20)), 16);
  assert.equal(daysTo(31, new Date(2027, 1, 27)), 1); // Feb has 28 days
  const g = monthGrid('2027-02'); // 1 Feb 2027 is a Monday
  assert.equal(g[0].date, '2027-02-01');
  assert.equal(g.length % 7, 0);
});

test('plan file import validates', () => {
  assert.throws(() => parsePlanFile({}), /ingresos ni gastos/);
  const p = parsePlanFile({ goal: '5000', start: '2026-12', items: [{ kind: 'in', name: 'N', amount: 10 }], months: { '2027-01': { saved: '20' }, bad: {} } });
  assert.equal(p.settings.goal, 5000);
  assert.deepEqual(Object.keys(p.months), ['2027-01']);
});

test('sheet round trip', () => {
  const d = plan([{ id: 'n', kind: 'in', name: 'Nómina', amount: 2000, freq: 'monthly', day: 26, note: 'hola' },
    { id: 'v', kind: 'out', name: 'Vet', amount: 240, freq: 'yearly', month: 0, pot: true, vary: true }],
  { months: { '2027-01': { saved: 100, pots: true, potSpent: { v: 15 }, real: { n: 2031.5 } } }, spends: [{ id: 'g1', date: '2027-01-03', amount: 12.5, note: 'café' }] });
  const rows = toRows(d);
  const vr = Object.entries(TABS).map(([k, t]) => ({ range: `'${t.title}'!A1:Z100`, values: rows[k].map((r) => r.map((c) => (c === true ? true : c))) }));
  const back = parseSheet(vr);
  assert.deepEqual(back.items, d.items);
  assert.deepEqual(back.months, d.months);
  assert.deepEqual(back.spends, d.spends);
  assert.equal(back.settings.goal, 1200);
  assert.equal(back.settings.start, '2027-01');
});

test('budgets: monthly limit comes out of Resto de vida; what is left over goes back once the month ends', () => {
  const items = [
    { id: 'pay', kind: 'in', name: 'Pay', amount: 2000, freq: 'monthly' },
    { id: 'rent', kind: 'out', name: 'Rent', amount: 800, freq: 'monthly' },
    { id: 'food', kind: 'out', name: 'Food', amount: 300, freq: 'monthly', budget: true, day: 5, vary: true, cat: 'super' },
    { id: 'clothes', kind: 'out', name: 'Ropa', amount: 240, freq: 'yearly', budget: true, month: 4 }, // type guessed from the name
  ];
  const spends = [
    { id: 'a', date: '2027-01-03', amount: 120, cat: 'super' },
    { id: 'b', date: '2027-01-10', amount: 50 },
    { id: 'c', date: '2027-02-03', amount: 350, cat: 'food' }, // older spends point at the budget's id
    { id: 'd', date: '2027-02-08', amount: 60, cat: 'ropa' },
    { id: 'e', date: '2027-02-09', amount: 10, cat: 'cafe' }, // a type without a budget: Resto de vida
  ];
  const d = plan(items, { spends });
  const food = d.items[2], clothes = d.items[3];
  assert.deepEqual([food.budget, food.vary, food.day], [true, undefined, undefined]);
  assert.deepEqual([clothes.pot, clothes.month, clothes.cat], [undefined, 0, 'ropa']); // a yearly budget has no date
  const m = compute(d, new Date(2027, 1, 15)); // mid February
  // target 100 · the yearly budget counts in the month you spend it
  assert.equal(m.budSpent(food, '2027-01'), 120);
  assert.equal(m.budOf('2027-01'), 120); // January is over: the unused 180 went back
  assert.equal(m.restOf('2027-01'), 2000 - 800 - 120 - 100);
  assert.equal(m.budOf('2027-02'), 350 + 60); // February runs and Súper went over: the whole spend counts, plus the clothes bought
  assert.equal(m.budOf('2027-03'), 300); // a future month: the full budget
  assert.equal(m.spentOf('2027-01'), 50); // only Resto de vida spends
  assert.equal(m.spentOf('2027-02'), 10);
  assert.equal(m.allSpends.length, 5);
  assert.equal(m.budSpentY(clothes), 60);
  assert.equal(m.budY, 120 + 350 + 300 * 10 + 240); // budgets over the year: January, February, ten more months, and the yearly limit
  assert.ok(m.plannedIn('2027-02').every((p) => !p.it.budget));
  assert.deepEqual(m.byCat('2027-02').map((x) => [x.cat, x.amount, x.budget?.id ?? null]), [['super', 350, 'food'], ['ropa', 60, 'clothes'], ['cafe', 10, null]]);
  // a budget without a recognisable name still gets a type
  assert.equal(normItem({ kind: 'out', freq: 'monthly', name: 'Zzz', amount: 5, budget: true }).cat, 'otros');
  assert.equal(normItem({ kind: 'out', freq: 'monthly', name: 'Qwerty', amount: 5, cat: 'nope' }).cat, undefined);
  // only monthly or yearly expenses can be budgets
  assert.equal(normItem({ kind: 'out', freq: 'once', month: 1, year: 2027, amount: 5, budget: true }).budget, undefined);
  assert.equal(normItem({ kind: 'in', freq: 'monthly', amount: 5, budget: true }).budget, undefined);
});

test('budgets and spend categories survive the sheet round trip', () => {
  const d = plan([{ id: 'food', kind: 'out', name: 'Food', amount: 300, freq: 'monthly', budget: true, cat: 'super' }],
    { spends: [{ id: 'a', date: '2027-01-03', amount: 12.5, note: 'x', cat: 'super' }] });
  const rows = toRows(d);
  const back = parseSheet(Object.entries(rows).map(([k, values]) => ({ range: `'${TABS[k].title}'!A1:Z`, values })));
  assert.deepEqual([back.items[0].budget, back.items[0].cat], [true, 'super']);
  assert.deepEqual(back.spends[0], { id: 'a', date: '2027-01-03', amount: 12.5, note: 'x', cat: 'super' });
});

test('spending types: guessed from names', async () => {
  const { guessCat, CATS } = await import('../js/cats.js');
  assert.equal(new Set(CATS.map((c) => c.id)).size, CATS.length);
  const g = (n) => guessCat(n);
  assert.deepEqual(['Súper', 'Seguro del coche', 'Luz, agua e internet', 'Móvil', 'Gasolina', 'Barbería', 'Cañas', 'Veterinario', 'Nómina'].map(g),
    ['super', 'seguros', 'suministros', 'internet', 'gasolina', 'belleza', 'copas', 'mascotas', null]);
});

test('the month read from the account balance: spent, and what is left over counts as saved', () => {
  const items = [
    { id: 'pay', kind: 'in', name: 'Nómina', amount: 2000, freq: 'monthly', day: 1 },
    { id: 'rent', kind: 'out', name: 'Alquiler', amount: 1000, freq: 'monthly', day: 2 },
    { id: 'ins', kind: 'out', name: 'Seguro', amount: 600, freq: 'yearly', month: 2, day: 10 },
    { id: 'trip', kind: 'out', name: 'Viajes', amount: 1200, freq: 'yearly', budget: true, cat: 'viajes' },
  ];
  // planned per month 2000 − 1000 − 100 (trips / 12) = 900, February 300; unplanned (10200 − 3600) / 12 = 550
  // → target 350 a month, −250 in February
  const d = plan(items, {
    settings: { goal: 3600, start: '2027-01', cycleDay: 1 },
    months: {
      '2027-01': { open: 1000, saved: 300, bal: 1250, close: { amount: 250 } },
      '2027-02': { saved: 300, bal: 600 },
      '2027-03': { saved: 300, check: { date: '2027-03-15', bal: 1100 } },
    },
    spends: [
      { id: 'a', date: '2027-02-20', amount: 400, cat: 'viajes' }, // a trip, logged against its yearly budget
      { id: 'b', date: '2027-03-20', amount: 30, note: 'cena' }, // after the look at the balance: adds up
    ],
  });
  const m = compute(d, new Date(2027, 2, 25));
  assert.equal(m.restOf('2027-01'), 650);
  assert.equal(m.targetOf('2027-02'), -250);
  // January: 1000 + 2000 − 1000 − 300 − 1250 = 450 spent outside the plan; the account grew 250
  const j = m.fromBalance('2027-01', 1250);
  assert.deepEqual([j.cash, j.rest, j.left], [450, 450, 250]);
  assert.equal(m.spentSrc('2027-01'), 'bal');
  assert.equal(m.spentOf('2027-01'), 450);
  assert.equal(m.savedOf('2027-01'), 550); // 300 put aside + 250 left over at the close
  // February starts where January ended: nothing carried, the leftover stays in the account counted as saved
  assert.equal(m.balStart('2027-02'), 1250);
  const f = m.fromBalance('2027-02', 600);
  assert.equal(f.cash, 1250 + 2000 - 1000 - 600 - 300 - 600); // 750, the trip included
  assert.equal(f.rest, 750 - 400);
  assert.equal(f.left, 600 - 1250); // an expensive month: −650, it would come off savings
  assert.equal(m.restOf('2027-02'), 2000 - 1600 - 400 + 250);
  assert.equal(m.savedOf('2027-02'), 300); // not closed yet
  // the money through February: 0 on day 0, pay and rent early on, ends where the balance says
  const cv = m.curveOf('2027-02', 600);
  assert.equal(cv.pts.length, 29);
  assert.equal(cv.pts[0].y, 0);
  assert.equal(cv.pts[28].y, -650);
  assert.deepEqual(cv.pts[1].events.map((e) => e.label).sort(), ['Al ahorro', 'Nómina']); // no payday day set: savings on day 1
  // March: a look at the balance on the 15th (pay and rent are in) plus a logged spend after it
  assert.equal(m.spentSrc('2027-03'), 'check');
  assert.equal(m.balStart('2027-03'), 600);
  assert.equal(m.spentOf('2027-03'), 600 + 2000 - 1000 - 300 - 1100 + 30);
  assert.equal(m.restOf('2027-03'), 650);
});

test('months from payday to payday', () => {
  // ranges and which month a date belongs to
  assert.deepEqual(cycleRange('2026-11', 26), { from: '2026-10-26', to: '2026-11-25', days: 31 });
  assert.deepEqual(cycleRange('2027-03', 26), { from: '2027-02-26', to: '2027-03-25', days: 28 });
  assert.deepEqual(cycleRange('2026-11', 1), { from: '2026-11-01', to: '2026-11-30', days: 30 });
  assert.equal(cycleOf('2026-10-26', 26), '2026-11');
  assert.equal(cycleOf('2026-10-25', 26), '2026-10');
  assert.equal(cycleOf('2026-12-31', 26), '2027-01');
  // the start day comes from a late payday, or from the settings
  const items = [
    { id: 'n', kind: 'in', name: 'Nómina', amount: 2000, freq: 'monthly', day: 26 },
    { id: 'x', kind: 'in', name: 'Extra', amount: 1000, freq: 'yearly', month: 6, day: 28 },
    { id: 'r', kind: 'out', name: 'Alquiler', amount: 800, freq: 'monthly', day: 1 },
    { id: 'i', kind: 'out', name: 'Seguro', amount: 300, freq: 'yearly', month: 3, day: 15 },
  ].map(normItem);
  assert.equal(cycleDayOf({}, items), 26);
  assert.equal(cycleDayOf({ cycleDay: 1 }, items), 1);
  assert.equal(cycleDayOf({}, [normItem({ kind: 'in', amount: 1, freq: 'monthly', day: 5 })]), 1);
  const d = { settings: { goal: 1200, start: '2026-11' }, items, months: {}, spends: [
    { id: 'a', date: '2026-10-30', amount: 40, note: '' }, // inside "noviembre"
    { id: 'b', date: '2026-11-27', amount: 25, note: '' }, // already "diciembre"
  ] };
  const m = compute(d, new Date(2026, 10, 3)); // 3 Nov 2026
  assert.equal(m.curYM, '2026-11');
  assert.equal(m.cycleDay, 26);
  assert.equal(m.dateOf(m.items[0], '2026-11'), '2026-10-26'); // the pay opens the month
  assert.equal(m.dateOf(m.items[2], '2026-11'), '2026-11-01');
  assert.equal(m.incomeOf('2026-11'), 2000);
  assert.equal(m.incomeOf('2027-07'), 3000); // the June 28 extra falls in "julio" (26 Jun – 25 Jul)
  assert.equal(m.incomeOf('2027-06'), 2000);
  assert.equal(m.outOf('2027-03'), 1100);
  assert.equal(m.loggedRest('2026-11'), 40);
  assert.equal(m.loggedRest('2026-12'), 25);
  assert.equal(m.stateOf(m.items[0], '2026-11'), 'auto'); // paid on 26 Oct, before today
  assert.equal(m.paidMonths, 1);
  assert.equal(m.dayOf('2026-11-03', '2026-11'), 9);
});

test('money moved to savings leaves the account but is not spending', () => {
  const d = plan([
    { id: 'pay', kind: 'in', name: 'Nómina', amount: 2000, freq: 'monthly', day: 1 },
    { id: 'rent', kind: 'out', name: 'Alquiler', amount: 1000, freq: 'monthly', day: 2 },
    { id: 'sv', kind: 'out', name: 'Traspaso al ahorro', amount: 300, freq: 'monthly', day: 3 }, // a standing order
  ], {
    settings: { goal: 3600, start: '2027-01', cycleDay: 1 },
    months: { '2027-01': { open: 1000, bal: 1300, close: { amount: 300 } } },
    spends: [
      { id: 'a', date: '2027-01-20', amount: 100, cat: 'ahorro', note: 'extra' }, // logged with the +
      { id: 'b', date: '2027-01-21', amount: 40, cat: 'restaurante' },
    ],
  });
  const m = compute(d, new Date(2027, 1, 10));
  assert.equal(m.saveItems.length, 1);
  assert.equal(m.items[2].cat, 'ahorro'); // guessed from the name
  assert.equal(m.outOf('2027-01'), 1000); // the transfer isn't an expense
  const r = m.fromBalance('2027-01', 1300);
  assert.equal(r.save, 400); // 300 planned + 100 logged
  assert.equal(r.cash, 1000 + 2000 - 1000 - 400 - 1300); // spent outside the plan: 300
  assert.equal(m.spentAll('2027-01'), 1000 + 300);
  assert.equal(m.loggedRest('2027-01'), 40); // the 100 to savings isn't a spend
  assert.equal(m.savedOf('2027-01'), 400 + 300); // moved + left over in the account
  assert.equal(round(m.incomeTo('2027-01') - m.spentAll('2027-01')), 700); // the same thing: in − spent
});

test('the current month before closing: a line from the start balance, estimated after today', () => {
  const salary = { id: 's', kind: 'in', name: 'Sueldo', amount: 2000, freq: 'monthly', day: 1 };
  const d = plan([salary], { months: { '2027-01': { open: 900, openDate: '2027-01-10', check: { date: '2027-01-15', bal: 700 } } } });
  const m = compute(d, new Date(2027, 0, 20));
  const cv = m.curveNow('2027-01');
  assert.ok(cv, 'there is a curve with a start balance');
  assert.equal(cv.pts[0].day, 9, 'it starts at the beginning of the day the balance refers to (the end of the day before), not on day 1');
  assert.equal(cv.pts[0].y, 0);
  assert.equal(cv.pts.find((p) => p.day === 15).y, -200, 'on the day of the look it matches the balance you gave');
  assert.equal(cv.fromDay, 21, 'what comes after today is an estimate');
  const trail = m.balanceTrail(30);
  assert.ok(trail.length > 5 && trail.some((p) => p.proj) && trail.some((p) => !p.proj));
  assert.equal(trail.find((p) => p.date === '2027-01-15').bal, 700);
  assert.equal(compute(plan([salary]), new Date(2027, 0, 20)).curveNow('2027-01'), null, 'no start balance, no curve');
});

test('a start balance counts as the balance at the start of its day: that day\'s pay is added on top', () => {
  const salary = { id: 's', kind: 'in', name: 'Sueldo', amount: 2000, freq: 'monthly', day: 26 };
  const mk = (openDate) => plan([salary], { settings: { goal: 0, start: '2027-01', cycleDay: 26 }, months: { '2027-02': { open: 900, openDate } } });
  // the month called February runs from 26 Jan to 25 Feb
  assert.equal(compute(mk('2027-01-26'), new Date(2027, 0, 28)).incomeTo('2027-02', '2027-01-28'), 2000, 'the pay on the start day is counted');
  assert.equal(compute(mk('2027-01-27'), new Date(2027, 0, 28)).incomeTo('2027-02', '2027-01-28'), 0, 'a start the day after has the pay already in it');
});

test('a planned item can be confirmed on another day: it moves, and survives the sheet', () => {
  const salary = { id: 's', kind: 'in', name: 'Sueldo', amount: 2000, freq: 'monthly', day: 26 };
  const base = plan([salary], { settings: { goal: 0, start: '2027-01', cycleDay: 1 }, months: { '2027-01': { open: 100, openDate: '2026-12-31', bal: 100 } } });
  const m0 = compute(base, new Date(2027, 0, 30));
  assert.equal(m0.dateOf(m0.items[0], '2027-01'), '2027-01-26');
  const moved = plan([salary], { settings: { goal: 0, start: '2027-01', cycleDay: 1 }, months: { '2027-01': { open: 100, openDate: '2026-12-31', real: { s: 2000 }, dates: { s: '2027-01-28' } } } });
  const m1 = compute(moved, new Date(2027, 0, 30));
  assert.equal(m1.dateOf(m1.items[0], '2027-01'), '2027-01-28', 'the day it really arrived');
  assert.equal(m1.incomeTo('2027-01', '2027-01-27'), 0, 'not before that day');
  assert.equal(m1.incomeTo('2027-01', '2027-01-28'), 2000, 'and from that day on');
  const rows = toRows({ ...moved, items: m1.items });
  const back = parseSheet(Object.entries(rows).map(([k, values]) => ({ range: `'${TABS[k].title}'!A1:Z`, values })));
  assert.deepEqual(back.months['2027-01'].dates, { s: '2027-01-28' });
});

test('only real dates are kept for a moved item', () => {
  assert.deepEqual(normMonth({ dates: { a: '2027-01-28', b: 'no-date', c: '' } }).dates, { a: '2027-01-28' });
});

test('a one-off item is placed in its payday-to-payday month, whatever its calendar month says', () => {
  const m = compute(plan([{ id: 'b', kind: 'in', name: 'Venta', amount: 150, freq: 'once', month: 11, year: 2026, day: 28 }, { id: 'c', kind: 'in', name: 'Otra', amount: 80, freq: 'once', month: 11, year: 2026 }], { settings: { goal: 0, start: '2026-07', cycleDay: 26 } }), new Date(2026, 10, 30));
  assert.equal(m.onceDate(m.items.find((i) => i.id === 'b')), '2026-11-28', 'the 28th is in the month that starts on the 26th');
  assert.equal(m.onceDate(m.items.find((i) => i.id === 'c')), '2026-10-26', 'no day: the first day of its month');
});

test('a balance higher than the plan explains is an unlogged income, not money coming in every day', () => {
  const d = plan([], { settings: { goal: 0, start: '2027-01', cycleDay: 1 }, months: { '2027-01': { open: -2000, openDate: '2026-12-31', check: { date: '2027-01-15', bal: 500 } } } });
  const cv = compute(d, new Date(2027, 0, 20)).curveNow('2027-01');
  assert.equal(cv.extra, 2500, 'the surplus is reported');
  assert.equal(cv.daily, 0, 'and is not spread as a daily gain');
  const ys = cv.pts.map((p) => p.y);
  assert.ok(ys.slice(0, 14).every((y) => y === 0), 'flat until the day it showed up');
  assert.equal(cv.pts.find((p) => p.day === 15).y, 2500);
  assert.ok(ys.slice(15).every((y) => y === 2500), 'and flat after it: no invented gains');
});

test('the month chart counts the pay on the first day when the start balance is from the day before (or that very day)', () => {
  const salary = { id: 's', kind: 'in', name: 'Sueldo', amount: 2000, freq: 'monthly', day: 26 };
  for (const openDate of ['2026-10-25', '2026-10-26']) {
    const d = plan([salary], { settings: { goal: 0, start: '2026-07', cycleDay: 26 }, months: { '2026-11': { open: -100, openDate, check: { date: '2026-11-10', bal: 1500 } } } });
    const m = compute(d, new Date(2026, 10, 12)), cv = m.curveNow('2026-11');
    assert.equal(cv.extra, 0, `${openDate}: nothing unexplained once the pay is counted`);
    const y1 = cv.pts.find((p) => p.day === 1).y;
    assert.ok(y1 > 1900 && y1 <= 2000, `${openDate}: the pay lands on the first day (${y1})`);
    assert.ok(cv.daily < 0 && cv.daily > -100, `${openDate}: the rest is a small daily spend, never a gain`);
  }
});

import { planEdit, planDelete, planAdd, planShown, planNext } from '../js/model.js';
test('the plan over time: a change cuts the old version and adds the new one; any month can be rebuilt', () => {
  const sal = { id: 's', kind: 'in', name: 'Sueldo', amount: 2000, freq: 'monthly', day: 28 };
  let items = [normItem(sal)];
  // a raise from March 2027 on
  items = planEdit(items, 's', { ...sal, amount: 2300 }, '2027-03', '', '2027-02-10T10:00:00Z');
  assert.equal(items.length, 2);
  const m = compute({ settings: { goal: 0, start: '2027-01', cycleDay: 1 }, items, months: {}, spends: [] }, new Date(2027, 0, 20));
  assert.equal(m.incomeOf('2027-02'), 2000, 'before the change: the old amount');
  assert.equal(m.incomeOf('2027-03'), 2300, 'from the change on: the new one');
  assert.equal(m.incomeOf('2027-12'), 2300);
  // a change for a few months only, then it goes back
  items = planEdit(items, 's', { ...sal, amount: 1000 }, '2027-05', '2027-06');
  const m2 = compute({ settings: { goal: 0, start: '2027-01', cycleDay: 1 }, items, months: {}, spends: [] }, new Date(2027, 0, 20));
  assert.deepEqual(['2027-04', '2027-05', '2027-06', '2027-07'].map((ym) => m2.incomeOf(ym)), [2300, 1000, 1000, 2300], 'it comes back after the end month');
  assert.equal(m2.incomeY, 2000 * 2 + 2300 * 2 + 1000 * 2 + 2300 * 6, 'the year adds up version by version');
  // the plan as it stood in a given month
  assert.equal(planShown(items, '2027-02')[0].amount, 2000);
  assert.equal(planShown(items, '2027-05')[0].amount, 1000);
  assert.equal(planNext(items, 's', '2027-04').amount, 1000, 'the next change already planned');
  // ending an item keeps its past
  const ended = planDelete(items, 's', '2027-08');
  const m3 = compute({ settings: { goal: 0, start: '2027-01', cycleDay: 1 }, items: ended, months: {}, spends: [] }, new Date(2027, 0, 20));
  assert.equal(m3.incomeOf('2027-07'), 2300, 'what it was before the end is untouched');
  assert.equal(m3.incomeOf('2027-08'), 0, 'and from the end month it no longer counts');
  assert.equal(planShown(ended, '2027-09').length, 0, 'an ended item is no longer shown');
  // an edit that covers an older version replaces it
  const again = planEdit(planEdit([normItem(sal)], 's', { ...sal, amount: 1800 }, '2027-06'), 's', { ...sal, amount: 2100 }, '2027-03');
  assert.deepEqual(again.map((i) => [i.from || '', i.to || '', i.amount]), [['', '2027-02', 2000], ['2027-03', '', 2100]], 'a later edit from an earlier month supersedes the later version');
  // adding applies from the month you say
  const added = planAdd([], { id: 'r', kind: 'out', name: 'Alquiler', amount: 600, freq: 'monthly', day: 1 }, '2027-04');
  const m4 = compute({ settings: { goal: 0, start: '2027-01', cycleDay: 1 }, items: added, months: {}, spends: [] }, new Date(2027, 0, 20));
  assert.deepEqual(['2027-03', '2027-04'].map((ym) => m4.outOf(ym)), [0, 600]);
});

test('versions and the change log survive the sheet', () => {
  const sal = { id: 's', kind: 'in', name: 'Sueldo', amount: 2000, freq: 'monthly', day: 28 };
  const items = planEdit([normItem(sal)], 's', { ...sal, amount: 2300 }, '2027-03', '2027-09', '2027-02-10T10:00:00.000Z');
  const log = [{ at: '2027-02-10T10:00:00.000Z', id: 's', name: 'Sueldo', action: 'edit', from: '2027-03', to: '2027-09', before: { amount: 2000 }, after: { amount: 2300 } }];
  const d = { settings: { goal: 100, start: '2027-01' }, items, months: {}, spends: [], log };
  const rows = toRows(d);
  const back = parseSheet(Object.entries(rows).map(([k, values]) => ({ range: `'${TABS[k].title}'!A1:Z`, values })));
  assert.deepEqual(back.items.map((i) => [i.amount, i.from || '', i.to || '', i.at ? 'at' : '']), items.map((i) => [i.amount, i.from || '', i.to || '', i.at ? 'at' : '']));
  assert.deepEqual(back.log, log);
});

import { searchCats } from '../js/cats.js';
test('the type search finds types by name, by loosely related words, with typos and without accents', () => {
  const top = (q) => searchCats(q)[0];
  for (const [q, id] of [['dentista', 'medico'], ['gasolinera', 'gasolina'], ['netflix', 'suscripciones'], ['uñas', 'belleza'], ['cumple', 'regalos'], ['fontanero', 'reparaciones'],
    ['guarderia', 'familia'], ['veterinario', 'mascotas'], ['irpf', 'impuestos'], ['restaurnate', 'restaurante'], ['cervesa', 'copas'], ['gym', 'deporte'], ['mercadona', 'super'], ['rent', 'alquiler']]) {
    assert.equal(top(q), id, `${q} → ${id}`);
  }
  assert.deepEqual(searchCats('zzzqq'), [], 'nothing for nonsense');
  assert.deepEqual(searchCats(''), []);
  assert.ok(!searchCats('cine').includes('farmacia'), 'a short word does not match unrelated types by typo');
});

test('budgets over time: each month uses the budget in force, its spends count against it, and the year adds up version by version', () => {
  const tab = { id: 'b', kind: 'out', name: 'Tabaco', amount: 50, freq: 'monthly', budget: true, cat: 'tabaco' };
  let items = [normItem(tab)];
  items = planEdit(items, 'b', { ...tab, amount: 80 }, '2027-07');             // a raise from July
  items = planEdit(items, 'b', { ...tab, amount: 20 }, '2027-10', '2027-11');  // a temporary cut, then back to 80
  const spends = [{ id: 'g1', date: '2027-03-10', amount: 30, note: '', cat: 'tabaco' }, { id: 'g2', date: '2027-08-10', amount: 90, note: '', cat: 'tabaco' }];
  const m = compute({ settings: { goal: 0, start: '2027-01', cycleDay: 1 }, items, months: {}, spends }, new Date(2027, 11, 20));
  const inForce = (ym) => items.find((i) => i.cat === 'tabaco' && (!i.from || ym >= i.from) && (!i.to || ym <= i.to)).amount;
  assert.deepEqual(['2027-02', '2027-07', '2027-10', '2027-12'].map(inForce), [50, 80, 20, 80]);
  // the months already over use what was spent; the current one (December) uses the budget in force
  assert.equal(m.budOf('2027-03'), 30, 'a past month: what was spent against the budget of that month');
  assert.equal(m.budOf('2027-08'), 90, 'spent more than the budget then (80): what was spent');
  assert.equal(m.budOf('2027-12'), 80, 'this month: the version in force');
  // the plan's savings target takes each month's budget: the same goal, spread over different budgets
  const net = (ym) => m.targetOf(ym);
  assert.equal(m.budByCat.get('tabaco').amount, 80, 'today the budget of that type is the one in force this month');
  assert.equal(m.budFor('tabaco', '2027-02').amount, 50);
  assert.equal(m.budFor('tabaco', '2027-10').amount, 20);
  assert.equal(m.budFor('tabaco', '2028-01').amount, 80, 'after the temporary cut it is back');
  void net;
  // one version per budget for the screens
  assert.equal(m.shown('2027-02').filter((i) => i.budget).length, 1);
  assert.equal(m.shown('2027-10')[0].amount, 20);
  // ended: spends of that type no longer count against a budget (they go to the day to day)
  const ended = planDelete(items, 'b', '2027-09');
  const m2 = compute({ settings: { goal: 0, start: '2027-01', cycleDay: 1 }, items: ended, months: {}, spends }, new Date(2027, 11, 20));
  assert.equal(m2.budFor('tabaco', '2027-08').amount, 80);
  assert.equal(m2.budFor('tabaco', '2027-09'), undefined);
  assert.equal(m2.shown('2027-12').length, 0, 'an ended budget is not shown any more');
});

test('an item with no day counts from the first day of the month; with a day, from that day', () => {
  const rent = { id: 'r', kind: 'out', name: 'Alquiler', amount: 600, freq: 'monthly' };
  const gym = { id: 'g', kind: 'out', name: 'Gimnasio', amount: 30, freq: 'monthly', day: 20 };
  const m = compute({ settings: { goal: 0, start: '2027-01', cycleDay: 1 }, items: [rent, gym].map(normItem), months: {}, spends: [] }, new Date(2027, 0, 5));
  assert.deepEqual(m.plannedIn('2027-01').map((p) => [p.it.id, p.date, p.state]), [['r', '2027-01-01', 'auto'], ['g', '2027-01-20', 'future']], 'the rent is due from day 1, the gym from day 20');
  assert.equal(m.outOf('2027-01'), 630);
  assert.equal(m.flowTo('2027-01', '2027-01-05').out, 600, 'so far this month: the one with no day');
});

test('balance updates: several per month, the latest one is the month\'s check', () => {
  const m = normMonth({ checks: [{ date: '2027-02-12', bal: 1300 }, { date: '2027-02-10', bal: 1200 }] });
  assert.deepEqual(m.checks.map((c) => c.date), ['2027-02-10', '2027-02-12']);
  assert.deepEqual(m.check, { date: '2027-02-12', bal: 1300 });
  assert.deepEqual(normMonth({ check: { date: '2027-02-10', bal: 5 } }).checks, [{ date: '2027-02-10', bal: 5 }]); // a single old check joins the list
});

test('custom types keep a colour from the palette only', () => {
  const st = normSettings({ goal: 0, start: '2026-01', cats: [{ id: 'c-1', name: 'Padel', icon: 'ocio', color: 'p9' }, { id: 'c-2', name: 'Moto', icon: 'transporte', color: '#ff0000' }] });
  assert.equal(st.cats[0].color, 'p9');
  assert.equal(st.cats[1].color, undefined);
});

test('the chosen language and currency are kept with the settings, and only when valid', () => {
  const st = normSettings({ goal: 0, start: '2026-01', lang: 'en', cur: 'USD', theme: 'dark' });
  assert.equal(st.lang, 'en'); assert.equal(st.cur, 'USD'); assert.equal(st.theme, 'dark');
  const bad = normSettings({ goal: 0, start: '2026-01', lang: 'english', cur: 'dollars' });
  assert.equal(bad.lang, undefined); assert.equal(bad.cur, undefined);
});

test('a pay that came in early and a bill charged late: each month counts what belongs to it', () => {
  // the month runs from the 28th: «febrero» is 28 Jan – 27 Feb
  const d = plan([
    { id: 'pay', kind: 'in', name: 'Nómina', amount: 2000, freq: 'monthly', day: 28 },
    { id: 'rent', kind: 'out', name: 'Alquiler', amount: 800, freq: 'monthly', day: 26 },
  ], {
    settings: { goal: 3600, start: '2027-01', cycleDay: 28 },
    months: {
      // February's rent was charged on 1 March; March's pay came in on 27 February, February's last day
      '2027-02': { open: 1000, bal: 4500, real: { rent: 800 }, dates: { rent: '2027-03-01' } },
      '2027-03': { bal: 2400, real: { pay: 2000 }, dates: { pay: '2027-02-27' } },
    },
  });
  const m = compute(d, new Date(2027, 3, 10));
  const f = m.fromBalance('2027-02', 4500);
  assert.equal(f.cash, 500); // 1000 + 2000 + 2000 (March's pay, in the account) − 4500
  assert.equal(f.shift, 2000 + 800); // in the balance but not February's: the early pay, the rent still to come
  assert.equal(f.left, 700); // February's own: 2000 − 800 − 500
  assert.equal(f.out, 800); // the rent is still February's expense
  assert.equal(m.spentAll('2027-02'), 800 + 500);
  const g = m.fromBalance('2027-03', 2400);
  assert.equal(g.start, 4500);
  assert.equal(g.cash, 500); // 4500 − 800 (February's rent) − 800 − 2400; March's pay is already in the start
  assert.equal(g.left, 700);
  assert.equal(g.inc, 2000); // March's pay is March's income
  assert.equal(round(f.left + g.left), 2400 - 1000);
  // the day-by-day line follows the account: the early pay on February's last day, the late rent in March
  const cf = m.curveOf('2027-02', 4500), cm = m.curveOf('2027-03', 2400);
  assert.ok(cf.pts.at(-1).events.some((e) => e.other === '2027-03' && e.amount === 2000));
  assert.ok(cm.pts[m.dayOf('2027-03-01', '2027-03')].events.some((e) => e.other === '2027-02' && e.amount === -800));
  assert.equal(cf.pts.at(-1).y, 3500);
});
