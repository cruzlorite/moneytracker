import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compute, normItem } from '../js/model.js';
import { pace, closeDue } from '../js/play.js';
import { parseSheet, toRows, TABS } from '../js/google.js';

// 1000 in, 600 fixed, goal 1200 → 100 a month to save, 300 left for life
const base = (extra = {}) => ({
  settings: { goal: 1200, start: '2027-01' },
  items: [
    { id: 'n', kind: 'in', name: 'Nómina', amount: 1000, freq: 'monthly', day: 1 },
    { id: 'c', kind: 'out', name: 'Casa', amount: 600, freq: 'monthly', day: 1 },
  ].map(normItem),
  months: {}, spends: [], ...extra,
});
const sp = (date, amount) => ({ id: date + amount, date, amount, note: '' });

test('pace: even spending line, forecast and daily allowance', () => {
  const m = compute(base({ spends: [sp('2027-01-03', 50), sp('2027-01-09', 70)] }), new Date(2027, 0, 10));
  const p = pace(m, '2027-01', new Date(2027, 0, 10));
  assert.equal(p.rest, 300);
  assert.equal(p.left, 180);
  assert.equal(p.day, 10);
  assert.ok(Math.abs(p.idealLeft - (300 - 300 * 10 / 31)) < 1e-9);
  assert.equal(p.onPace, false); // 120 spent > 96.8 at an even pace
  assert.equal(p.forecast, Math.round((300 - 120 / 10 * 31) * 100) / 100);
  assert.equal(p.daysLeft, 22);
});

test('month close: what is left over counts as saved, nothing carries over', () => {
  const d = base({ months: { '2027-01': { saved: 100, open: 900, bal: 1040, close: { amount: 40 } }, '2027-02': { saved: 100, bal: 1100, check: { date: '2027-02-10', bal: 1200 }, checks: [{ date: '2027-02-10', bal: 1200 }], close: { amount: -25 } } } });
  const m = compute(d, new Date(2027, 2, 5));
  assert.equal(m.restOf('2027-02'), 300); // no carry from January
  assert.equal(m.savedOf('2027-01'), 140);
  assert.equal(m.savedOf('2027-02'), 75); // 100 put aside, 25 missing at the close
  assert.equal(m.saved, 215);
  assert.equal(m.balStart('2027-03'), 1100);
  const rows = toRows(d);
  const back = parseSheet(Object.entries(TABS).map(([k, t]) => ({ range: `'${t.title}'!A1:Z100`, values: rows[k] })));
  assert.deepEqual(back.months, d.months);
});

test('closeDue: last month of the plan, until it is closed', () => {
  const t = new Date(2027, 2, 2), open = { open: 500 };
  assert.equal(closeDue(compute(base({ months: { '2027-02': open } }), t), t), '2027-02'); // the close is how the month gets its figures
  assert.equal(closeDue(compute(base(), t), t), null, 'a month with no start balance behind it is not asked to close');
  assert.equal(closeDue(compute(base({ months: { '2027-02': open } }), new Date(2027, 0, 20)), new Date(2027, 0, 20)), null); // December isn't in the plan
  assert.equal(closeDue(compute(base({ months: { '2027-02': { ...open, saved: 100 } } }), t), t), '2027-02');
  assert.equal(closeDue(compute(base({ months: { '2027-02': { ...open, saved: 100, close: { to: 'save', amount: 0 } } } }), t), t), null);
});


test('the sheet keeps the language and currency of the device', () => {
  const d = base({ settings: { goal: 0, start: '2027-01', lang: 'en', cur: 'GBP' } });
  const rows = toRows(d);
  const back = parseSheet(Object.entries(TABS).map(([k, tab]) => ({ range: `'${tab.title}'!A1:Z100`, values: rows[k] })));
  assert.equal(back.settings.lang, 'en');
  assert.equal(back.settings.cur, 'GBP');
});

test('saved decisions survive the sheet', () => {
  const calc = { id: 'calc-1', name: 'Coche', at: '2026-11-17', years: 8, infl: 2.5, rets: [3, 5, 10], sel: 1,
    rows: [{ id: 'r1', n: 'Seguro', f: 'y', ag: -5 }, { id: 'r2', n: 'Gasolina', f: 'm' }, { id: 'r3', n: 'Cuota', f: 'm', fix: true }, { id: 'r4', n: 'Matrícula', f: 'o' }, { id: 'r5', n: 'Alquiler', f: 'm', inc: true }],
    alts: [
      { name: 'Nuevo', price: 24000, vm: 'curve', dep: 0, vc: 'carNew', loan: 18000, rate: 7, term: 72, v: { r1: 550, r2: 110, r4: 300 } },
      { name: 'Usado', price: 11000, vm: 'rate', dep: -10, sellc: 3, loan: 0, rate: 0, term: 0, v: { r1: 450, r2: 130 } },
      { name: 'Renting', price: 0, vm: 'none', dep: 0, loan: 0, rate: 0, term: 0, v: { r3: 420, r2: 110 } }] };
  const d = base({ calcs: [calc] });
  const rows = toRows(d);
  const back = parseSheet(Object.entries(TABS).map(([k, tab]) => ({ range: `'${tab.title}'!A1:Z100`, values: rows[k] })));
  assert.deepEqual(back.calcs, [calc]);
  const none = parseSheet(Object.entries(TABS).filter(([k]) => k !== 'calcs').map(([k, tab]) => ({ range: `'${tab.title}'!A1:Z100`, values: rows[k] })));
  assert.deepEqual(none.calcs, []); // a sheet made before the calculator
});

test('a comparison saved by the older version reads as a decision: its costs become shared rows', () => {
  const head = TABS.calcs.head;
  const old = [{ name: 'Nuevo', price: 24000, vm: 'curve', dep: 0, vc: 'carNew', fin: true, loan: 18000, rate: 7, term: 72, costs: [{ n: 'Seguro', a: 550, f: 'y' }, { n: 'Gasolina', a: 110, f: 'm' }] },
    { name: 'Usado', price: 11000, vm: 'rate', dep: -10, fin: false, loan: 9000, rate: 5, term: 48, costs: [{ n: 'gasolina ', a: 130, f: 'm' }, { n: 'ITV', a: 40, f: '2' }] }];
  const rows = toRows(base());
  rows.calcs = [head, ['calc-9', 'Coche', '2026-01-01', 8, 2.5, 4, JSON.stringify(old)]];
  const [c] = parseSheet(Object.entries(TABS).map(([k, tab]) => ({ range: `'${tab.title}'!A1:Z100`, values: rows[k] }))).calcs;
  assert.deepEqual(c.rets, [4]); assert.equal(c.sel, 0);
  assert.deepEqual(c.rows, [{ id: 'r1', n: 'Seguro', f: 'y' }, { id: 'r2', n: 'Gasolina', f: 'm' }, { id: 'r3', n: 'ITV', f: '2' }]);
  assert.deepEqual(c.alts.map((a) => a.v), [{ r1: 550, r2: 110 }, { r2: 130, r3: 40 }]);
  assert.deepEqual(c.alts.map((a) => [a.loan, a.term]), [[18000, 72], [0, 0]]); // a loan that was switched off stays off
});

test('a decision saved with the old used-car curve becomes the average curve at 3 years old', async () => {
  const { normCalcs } = await import('../js/model.js');
  const [c] = normCalcs([{ id: 'x', years: 5, rets: [4], rows: [], alts: [{ name: 'Usado', price: 9000, vm: 'curve', vc: 'carUsed', v: {} }, { name: 'Otro', price: 9000, vm: 'curve', vc: 'carNew', age: 4, v: {} }] }]);
  assert.deepEqual([c.alts[0].vc, c.alts[0].age, c.alts[1].vc, c.alts[1].age], ['carNew', 3, 'carNew', 4]);
});

test('a concept\'s change with age is kept (and an older "grow" flag reads as +10 % a year)', async () => {
  const { normCalcs } = await import('../js/model.js');
  const [c] = normCalcs([{ id: 'x', years: 5, rets: [4], rows: [{ id: 'a', n: 'Mant', f: 'y', ag: 12 }, { id: 'b', n: 'Seg', f: 'y', ag: -5 }, { id: 'c', n: 'Old', f: 'y', grow: true }, { id: 'd', n: 'Once', f: 'o', ag: 5 }], alts: [] }]);
  assert.deepEqual(c.rows.map((r) => r.ag), [12, -5, 10, undefined]);
});
