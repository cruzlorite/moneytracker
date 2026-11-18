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
  const d = base({ months: { '2027-01': { saved: 100, open: 900, bal: 1040, close: { amount: 40 } }, '2027-02': { saved: 100, bal: 1100, check: { date: '2027-02-10', bal: 1200 }, close: { amount: -25 } } } });
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

