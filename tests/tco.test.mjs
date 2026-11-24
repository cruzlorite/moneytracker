import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tco, valueAt, CURVES, compare, optOf, aheadFrom, savingsTax, prepare, evenRet } from '../js/tco.js';

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
  const c = { years: 20, infl: 2, rets: [3], rows: [{ id: 'c', n: 'Compra', f: 'o' }, { id: 'i', n: 'IBI', f: 'y' }, { id: 'm', n: 'Mant.', f: 'y' }, { id: 'a', n: 'Alquiler', f: 'm' }],
    alts: [{ name: 'Comprar', price: 200000, vm: 'rate', dep: 2, loan: 160000, rate: 3, term: 300, v: { c: 20000, i: 400, m: 1000 } }, { name: 'Alquilar', price: 0, vm: 'none', v: { a: 900 } }] };
  for (const tax of [false, true]) {
    const k = compare(c, { tax }), s = k.scen[0];
    assert.equal(s.best, 0); // buying, over 20 years at 3 %
    const y = aheadFrom(s.pn[0], s.pn[1]);
    assert.ok(y > 1 && y < 20, `year ${y}`); // but only from some year on: the purchase taxes are lost on day one
    assert.ok(s.pn[0][y] >= s.pn[1][y] && s.pn[0][y - 1] < s.pn[1][y - 1]);
    const e = evenRet(k, 0, 1, tax);
    assert.ok(e > 3, `return ${e}`); // above some return, renting and investing the rest wins
    const at = compare({ ...c, rets: [e] }, { tax }).scen[0];
    near(at.pnFin[0], at.pnFin[1], 2500); // e is rounded to 0,1 %
  }
});

test('resale value: each mode', () => {
  const P = { price: 10000 };
  near(valueAt({ ...P, vm: 'rate', dep: -10 }, 2, 5), 8100, 0.01);
  near(valueAt({ ...P, vm: 'rate', dep: 2 }, 1, 5), 10200, 0.01);
  near(valueAt({ ...P, vm: 'curve', vc: 'carNew' }, 2, 5), 10000 * 0.82 * 0.88, 0.01);
  near(valueAt({ ...P, vm: 'curve', vc: 'carNew' }, 12, 12), 10000 * 0.82 * 0.88 * 0.9 * 0.91 * 0.92 * 0.92 * 0.93 * 0.93 * 0.94 * 0.94 ** 3, 0.01); // the last figure repeats
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
  const c = dec([0]), k = compare(c, { tax: false }), s = k.scen[0];
  const tot = k.base.map((b) => b.total);
  near(s.fin[1] - s.fin[0], tot[0] - tot[1], 0.05);
  assert.equal(k.K, k.base[0].cf[0]); // the dearest first day: the car's down payment
  near(s.wealth[0][0], s.wealth[1][0], 0.01); // on day one nobody is richer: the car is worth what it cost
  assert.equal(k.put, k.K); // nothing is added from income: what you pay comes out of your net worth
  // at 0 %, an alternative's net worth is just the initial money minus what it paid, plus what it is worth, minus debt
  near(s.pn[0][k.H], k.K - k.base[0].total, 0.05); near(s.pn[1][k.H], k.K - k.base[1].total, 0.05);
});

test('with a return, ranking by wealth is ranking by cost in today\'s money, and the gap grows with it', () => {
  const c = dec([3, 8]), k = compare(c, { tax: false });
  for (const s of k.scen) {
    const pv = k.os.map((o) => tco(o, c, s.ret).pv), g = (1 + s.ret / 100) ** k.H;
    near(s.fin[1] - s.fin[0], (pv[0] - pv[1]) * g, 1); // future value of the difference in present cost
    assert.equal(s.best, pv[1] < pv[0] ? 1 : 0);
  }
  assert.ok(k.scen[1].fin[1] - k.scen[1].fin[0] > k.scen[0].fin[1] - k.scen[0].fin[0]);
});

test('identical alternatives leave identical wealth; aheadFrom finds when one line stays above', () => {
  const c = dec([5]); c.alts = [c.alts[0], { ...c.alts[0], name: 'Igual' }];
  const s = compare(c, { tax: false }).scen[0];
  assert.deepEqual(s.wealth[0], s.wealth[1]);
  assert.equal(aheadFrom([0, 1, 3, 5], [0, 2, 2, 4]), 2);
  assert.equal(aheadFrom([0, 1, 1], [0, 0, 2]), null);
  assert.equal(aheadFrom([5, 5], [1, 1]), 0);
});

test('what an alternative costs is how much poorer it leaves you than spending nothing: its cost in today\'s money, carried to the end', () => {
  const c = dec([0, 4]), k = compare(c, { tax: false });
  for (const s of k.scen) {
    const g = (1 + s.ret / 100) ** k.H;
    k.os.forEach((o, i) => near(s.costFin[i], tco(o, c, s.ret).pv * g, 1));
    assert.ok(s.cost.every((line) => line[0] < 1)); // day one: nothing lost yet (the car is worth what it cost)
    assert.equal(s.best, s.costFin.indexOf(Math.min(...s.costFin)));
  }
  near(k.scen[0].costFin[0], k.base[0].total, 0.05); // at 0 %: just what you paid minus what you got back
});

test('net worth: everyone starts with the initial money; a car takes it down, a cheap alternative can take it up', () => {
  const c = dec([5]), k = compare(c, { tax: false }), s = k.scen[0];
  assert.ok(s.pn.every((p) => Math.abs(p[0] - k.K) < 0.01)); // day one: buying is a swap (no one-off costs here)
  assert.ok(s.dpn[0] < 0); // the car: depreciation, costs and interest
  near(s.dpn[0] - s.dpn[1], s.fin[0] - s.fin[1], 0.05); // the same differences as wealth
  const k2 = compare({ ...c, cap: 3000 }, { tax: false }), s2 = k2.scen[0];
  assert.equal(k2.K, 3000); assert.ok(k2.short[0] > 0); assert.equal(k2.short[1], 0); // the car needs more than you have
  near(s2.dpn[0] - s2.dpn[1], s.dpn[0] - s.dpn[1], 0.05); // the initial money moves everyone alike
  const one = compare({ ...c, alts: [c.alts[1]], cap: 20000 }, { tax: false }).scen[0]; // a bus pass and 20.000 € at 5 %: the return beats the pass
  assert.ok(one.dpn[0] > 0);
});

test('curves follow the thing\'s age: a used car picks the curve up where it is, and loses less', () => {
  const nw = { price: 20000, vm: 'curve', vc: 'carNew' }, used = { ...nw, age: 3 };
  near(valueAt(nw, 1, 5), 20000 * (1 - CURVES.carNew[0] / 100), 0.01);
  near(valueAt(used, 1, 5), 20000 * (1 - CURVES.carNew[3] / 100), 0.01); // its 4th year
  assert.ok(1 - valueAt(used, 5, 5) / 20000 < 1 - valueAt(nw, 5, 5) / 20000);
  for (const k of ['carNew', 'carKeep', 'carPremium', 'carEV']) assert.ok(CURVES[k][0] > CURVES[k][CURVES[k].length - 1]); // more at first, less later
});

test('each alternative depends only on itself: adding a dearer one changes nobody else\'s net worth (with the same initial money)', () => {
  const c = { ...dec([6]), cap: 30000 }, a = compare(c, { tax: false }).scen[0];
  const more = compare({ ...c, alts: [...c.alts, { name: 'Lujo', price: 90000, vm: 'rate', dep: -20, loan: 0, rate: 0, term: 0, v: { s: 2000, g: 300 } }] }, { tax: false }).scen[0];
  near(more.pn[0][8], a.pn[0][8], 0.01); near(more.pn[1][8], a.pn[1][8], 0.01);
  // a car with costs only goes down: depreciation and payments never turn into a gain
  assert.ok(a.pn[0].every((v, k) => k === 0 || v <= a.pn[0][k - 1] + 0.01));
});

test('a cost can be fixed, follow inflation, or also rise or fall with age', () => {
  const c = { years: 3, infl: 10, ret: 0 }, run = (x) => tco({ price: 0, costs: [{ n: 'x', a: 100, f: 'y', ...x }] }, c).running;
  near(run({ fix: true }), 300, 0.01);
  near(run({}), 100 + 110 + 121, 0.01);
  near(run({ ag: 10 }), 100 + 121 + 146.41, 0.01); // (1,1 × 1,1) a year
  near(run({ ag: -10 }), 100 + 99 + 98.01, 0.01); // (1,1 × 0,9) a year: falls a little
});

test('an income (a flat let out) comes into your pocket and raises net worth', () => {
  const c = { years: 5, infl: 0, rets: [0], rows: [{ id: 'r', n: 'Alquiler', f: 'm', inc: true }, { id: 'g', n: 'IBI', f: 'y' }],
    alts: [{ name: 'Piso', price: 100000, vm: 'rate', dep: 0, v: { r: 500, g: 400 } }, { name: 'Nada', price: 0, vm: 'none', v: {} }] };
  const k = compare(c, { tax: false }), s = k.scen[0];
  near(k.base[0].income, 500 * 60, 0.01); near(k.base[0].running, 400 * 5, 0.01);
  near(s.dpn[0], 500 * 60 - 400 * 5, 0.05); // at 0 % and no change in value: rent minus costs
  near(s.dpn[1], 0, 0.01);
});

test('Spain\'s savings tax goes by bands: 19 % up to 6.000, 21 % to 50.000, 23 % to 200.000, 27 % to 300.000, 30 % above', () => {
  near(savingsTax(0), 0, 0.001); near(savingsTax(-500), 0, 0.001);
  near(savingsTax(6000), 1140, 0.01);
  near(savingsTax(10000), 1140 + 4000 * 0.21, 0.01);
  near(savingsTax(400000), 1140 + 44000 * 0.21 + 150000 * 0.23 + 100000 * 0.27 + 100000 * 0.3, 0.01);
});

test('with the tax, selling pays on what the investments earned and on the gain of the sale; a car sold at a loss pays nothing on it', () => {
  const c = { years: 10, infl: 0, rets: [5], rows: [{ id: 'o', n: 'Compra', f: 'o' }],
    alts: [{ name: 'Fondos', price: 0, vm: 'none', v: {} }, { name: 'Piso', price: 100000, vm: 'rate', dep: 4, sellc: 0, v: { o: 10000 } }, { name: 'Coche', price: 100000, vm: 'rate', dep: -10, v: { o: 10000 } }] };
  const no = compare(c, { tax: false }).scen[0], yes = compare(c).scen[0], K = compare(c).K;
  near(K, 110000, 0.01);
  near(no.dpn[0] - yes.dpn[0], savingsTax(no.dpn[0]), 1); // the fund: all of its gain is taxed
  const saleGain = 100000 * 1.04 ** 10 - 100000 - 10000; // the purchase costs count against the gain
  near(yes.tax[1], savingsTax(saleGain), 1); // the flat: nothing left invested, the gain of the sale
  near(yes.tax[2], 0, 0.01); // the car: a loss, and nothing invested
  // the even return is worked out after tax too
  const p = prepare(c), e = evenRet(p, 0, 1); if (e != null) { const s = compare({ ...c, rets: [e] }).scen[0]; near(s.pnFin[0], s.pnFin[1], 1500); } // e is rounded to 0,1 %
});
