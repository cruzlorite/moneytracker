import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tco, cheapestOf, evenYear, evenReturn, valueAt, CURVES, compare, optOf, aheadFrom } from '../js/tco.js';

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

test('resale value: each mode', () => {
  const P = { price: 10000 };
  near(valueAt({ ...P, vm: 'rate', dep: -10 }, 2, 5), 8100, 0.01);
  near(valueAt({ ...P, vm: 'rate', dep: 2 }, 1, 5), 10200, 0.01);
  near(valueAt({ ...P, vm: 'curve', vc: 'carNew' }, 2, 5), 10000 * 0.8 * 0.88, 0.01);
  near(valueAt({ ...P, vm: 'curve', vc: 'carNew' }, 8, 8), 10000 * 0.8 * 0.88 * 0.9 * 0.9 * 0.91 * 0.92 ** 3, 0.01); // the last figure repeats
  near(valueAt({ ...P, vm: 'end', ve: 4000 }, 5, 5), 4000, 0.01);
  near(valueAt({ ...P, vm: 'end', ve: 4000 }, 0, 5), 10000, 0.01);
  near(valueAt({ ...P, vm: 'linear', life: 4 }, 1, 8), 7500, 0.01);
  near(valueAt({ ...P, vm: 'linear', life: 4 }, 6, 8), 0, 0.01);
  near(valueAt({ ...P, vm: 'none' }, 3, 5), 0, 0.01);
  // a new car keeps about 45–60 % after five years, as the sources say
  const v5 = valueAt({ ...P, vm: 'curve', vc: 'carNew' }, 5, 5) / 10000;
  assert.ok(v5 > 0.4 && v5 < 0.6, String(v5));
  assert.ok(Object.values(CURVES).every((c) => c.every((x) => x > 0 && x < 100)));
});

// ---------- decisions: the same money for everyone, what is not spent is invested ----------
const dec = (rets = [0, 5]) => ({ years: 8, infl: 2, rets, sel: 0,
  rows: [{ id: 's', n: 'Seguro', f: 'y' }, { id: 'g', n: 'Gasolina', f: 'm' }, { id: 'a', n: 'Abono', f: 'm', fix: true }],
  alts: [{ name: 'Coche', price: 20000, vm: 'rate', dep: -12, loan: 10000, rate: 6, term: 60, v: { s: 500, g: 100 } },
    { name: 'Bus', price: 0, vm: 'none', loan: 0, rate: 0, term: 0, v: { a: 50 } }] });

test('an alternative becomes an option with the decision\'s rows and its own amounts', () => {
  const o = optOf(dec().alts[1], dec().rows);
  assert.equal(o.fin, false);
  assert.deepEqual(o.costs.map((x) => [x.n, x.a, x.f, !!x.fix]), [['Seguro', 0, 'y', false], ['Gasolina', 0, 'm', false], ['Abono', 50, 'm', true]]);
  assert.equal(optOf({ loan: 5000, term: 0 }, []).fin, false); // no term, no loan
});

test('everyone starts with the same money; at 0 % the wealth gap is exactly the gap in what they cost', () => {
  const c = dec([0]), k = compare(c), s = k.scen[0];
  const tot = k.base.map((b) => b.total);
  near(s.fin[1] - s.fin[0], tot[0] - tot[1], 0.05);
  assert.equal(k.K, k.base[0].cf[0]); // the dearest first day: the car's down payment
  near(s.wealth[0][0], s.wealth[1][0], 0.01); // on day one nobody is richer: the car is worth what it cost
  near(k.put, k.base.reduce((m, b) => Math.max(m, b.cf[0]), 0) + Array.from({ length: k.M }, (_, i) => Math.max(...k.base.map((b) => b.cf[i + 1]))).reduce((x, y) => x + y, 0), 0.05);
});

test('with a return, ranking by wealth is ranking by cost in today\'s money, and the gap grows with it', () => {
  const c = dec([3, 8]), k = compare(c);
  for (const s of k.scen) {
    const pv = k.os.map((o) => tco(o, c, s.ret).pv), g = (1 + s.ret / 100) ** k.H;
    near(s.fin[1] - s.fin[0], (pv[0] - pv[1]) * g, 1); // future value of the difference in present cost
    assert.equal(s.best, pv[1] < pv[0] ? 1 : 0);
  }
  assert.ok(k.scen[1].fin[1] - k.scen[1].fin[0] > k.scen[0].fin[1] - k.scen[0].fin[0]);
});

test('identical alternatives leave identical wealth; aheadFrom finds when one line stays above', () => {
  const c = dec([5]); c.alts = [c.alts[0], { ...c.alts[0], name: 'Igual' }];
  const s = compare(c).scen[0];
  assert.deepEqual(s.wealth[0], s.wealth[1]);
  assert.equal(aheadFrom([0, 1, 3, 5], [0, 2, 2, 4]), 2);
  assert.equal(aheadFrom([0, 1, 1], [0, 0, 2]), null);
  assert.equal(aheadFrom([5, 5], [1, 1]), 0);
});

test('what an alternative costs is how much poorer it leaves you than spending nothing: its cost in today\'s money, carried to the end', () => {
  const c = dec([0, 4]), k = compare(c);
  for (const s of k.scen) {
    const g = (1 + s.ret / 100) ** k.H;
    k.os.forEach((o, i) => near(s.costFin[i], tco(o, c, s.ret).pv * g, 1));
    assert.ok(s.cost.every((line) => line[0] < 1)); // day one: nothing lost yet (the car is worth what it cost)
    assert.equal(s.best, s.costFin.indexOf(Math.min(...s.costFin)));
  }
  near(k.scen[0].costFin[0], k.base[0].total, 0.05); // at 0 %: just what you paid minus what you got back
});
