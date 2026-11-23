import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tco, cheapestOf, evenYear, evenReturn } from '../js/tco.js';

const near = (a, b, eps = 0.05) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);
const car = { price: 20000, dep: -10, fin: true, loan: 15000, rate: 6, term: 60, costs: [{ n: 'Seguro', a: 500, f: 'y' }, { n: 'Gasolina', a: 100, f: 'm' }, { n: 'Matrícula', a: 300, f: 'o' }] };

test('with no inflation and no return, it is just the sum: price + interest + costs − what it is worth', () => {
  const r = tco(car, { years: 8, infl: 0, ret: 0 });
  const value = 20000 * 0.9 ** 8, running = 500 * 8 + 100 * 96;
  near(r.value, value, 0.01); near(r.running, running, 0.01);
  near(r.total, 20000 + r.interest + running + 300 - value, 0.02);
  near(r.pv, r.total, 0.02); near(r.month, r.total / 96, 0.01);
  near(r.out[8], r.total + r.value - r.owed, 0.05); // paid by the end, before selling
});

test('a loan at the same rate your money earns costs nothing extra in today\'s money', () => {
  const c = { years: 5, infl: 0, ret: (1 + 0.06 / 12) ** 12 * 100 - 100 }; // 6 % nominal monthly = 6,17 % a year
  const cash = tco({ ...car, fin: false }, c), loan = tco(car, c);
  near(loan.pv, cash.pv, 0.5);
  assert.ok(loan.total > cash.total); // but you do pay more euros
});

test('inflation makes the costs grow year by year; the return brings them back to today', () => {
  const o = { price: 0, dep: 0, costs: [{ n: 'Alquiler', a: 1000, f: 'm' }] };
  const r = tco(o, { years: 2, infl: 10, ret: 0 });
  near(r.total, 12000 + 13200, 0.01);
  const p = tco(o, { years: 1, infl: 0, ret: 12 });
  assert.ok(p.pv < 12000 && p.pv > 11000);
});

test('every N years: paid at the start of those years, at their prices', () => {
  const o = { price: 0, dep: 0, costs: [{ n: 'Neumáticos', a: 400, f: '4' }] };
  near(tco(o, { years: 8, infl: 0, ret: 0 }).total, 400); // year 5 only (year 9 is beyond)
  near(tco(o, { years: 9, infl: 0, ret: 0 }).total, 800);
});

test('buying pays off only after some years; the break-even return flips the answer', () => {
  const c = { years: 20, infl: 2, ret: 3 };
  const buy = { price: 200000, dep: 2, fin: true, loan: 160000, rate: 3, term: 300, costs: [{ n: 'Compra', a: 20000, f: 'o' }, { n: 'IBI', a: 400, f: 'y' }, { n: 'Mant.', a: 1000, f: 'y' }] };
  const rent = { price: 0, dep: 0, costs: [{ n: 'Alquiler', a: 900, f: 'm' }] };
  const rb = tco(buy, c), rr = tco(rent, c);
  assert.equal(cheapestOf([rb, rr]), 0);
  const y = evenYear(rb, rr);
  assert.ok(y > 1 && y < 20, `year ${y}`);
  assert.ok(rb.sell[y] <= rr.sell[y] && rb.sell[y - 1] > rr.sell[y - 1]);
  const e = evenReturn(buy, rent, c);
  assert.ok(e > 3, `return ${e}`);
  near(tco(buy, c, e).pv, tco(rent, c, e).pv, 300);
});
