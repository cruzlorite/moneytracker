// Total cost of ownership, the way a financial planner works it out. Every option becomes the money that leaves your pocket month
// by month (down payment and one-off costs, loan payments, running costs that go up with inflation) and, on the day you sell,
// what is still owed on the loan minus what you get for it. Those payments are brought to today's money at the return you would
// get by investing instead (net present value): a euro paid in ten years costs less than one paid today, because meanwhile it
// could be earning. The monthly figure is the fixed payment worth the same (equivalent monthly cost). No DOM, no i18n.

const pos = (v) => Math.max(0, +v || 0);

/**
 * Typical resale curves: the % of its value it loses in each year of its life (year 1, 2…; the last figure repeats). With
 * `o.age` (its age when you buy it) a used one picks the curve up where it is: a 2-year-old car loses what a new one loses in
 * its 3rd year — the first owner pays the big drop. Rough averages from published data, to start from:
 *  - cars, average: Kelley Blue Book / Experian (≈16–20 % the first year, then 10–15 %), iSeeCars 2025–26 (≈42–46 % in five
 *    years); Mapfre and RACE for Spain (15–25 % the first year, 40–60 % in five)
 *  - keeps its value (hybrids, trucks, much-wanted models): iSeeCars ≈35 % in five years
 *  - premium / luxury: ≈55 % in five years (iSeeCars: luxury models fill the worst list)
 *  - electric: iSeeCars ≈57 % in five years; Ganvam-DAT ≈47 % in three
 *  - phones: BankMyCell trade-in reports (iPhone ≈17 % / 35 % / … 66 % in four; Android flagship ≈34 % / 62 % / … 81 %;
 *    phones under 400 ≈42 % / 59 % / 72 % / 88 %)
 */
export const CURVES = {
  carNew: [18, 12, 10, 9, 8, 8, 7, 7, 6, 6],
  carKeep: [12, 9, 8, 7, 6, 6, 6, 5, 5],
  carPremium: [22, 16, 13, 11, 10, 9, 8, 8, 7],
  carEV: [25, 17, 13, 11, 9, 8, 8, 7],
  phoneApple: [17, 22, 28, 28, 30],
  phoneAndroid: [34, 42, 30, 30, 30],
  phoneBudget: [42, 29, 31, 57, 60],
};
/** What it is worth after k more years, as a share of its price, on curve `c` bought at age `age`. */
export const curveKeep = (c, age, k) => { let v = 1; for (let j = 0; j < k; j++) v *= 1 - c[Math.min(age + j, c.length - 1)] / 100; return v; };
/**
 * What it is worth after k years (of H). Modes (o.vm):
 *  'curve'  a typical curve (o.vc), from its age when bought (o.age)      'rate'   the same % every year (o.dep: −15 loses, +2 gains)
 *  'end'    you know what you'll get (o.ve €, at the end; in between it follows a steady %)
 *  'linear' it loses the same each year until it is worth nothing after o.life years      'none'  nothing back
 */
export function valueAt(o, k, H) {
  const P = pos(o.price);
  if (!P) return 0;
  switch (o.vm) {
    case 'none': return 0;
    case 'curve': return P * curveKeep(CURVES[o.vc] || CURVES.carNew, Math.max(0, Math.round(+o.age || 0)), k);
    case 'end': { const E = pos(o.ve); if (!k) return P; if (!E) return P * Math.max(0, 1 - k / H); return P * (E / P) ** (k / H); }
    case 'linear': { const L = Math.max(1, pos(o.life) || 1); return P * Math.max(0, 1 - k / L); }
    default: return P * Math.max(0, 1 + Math.max(-100, +o.dep || 0) / 100) ** k;
  }
}
const r2 = (v) => Math.round(v * 100) / 100;

/**
 * One option over the comparison `c` ({ years, infl, ret }), optionally at another return (`retOverride`, in %).
 * Returns figures in nominal euros (what you pay) and in today's euros (pv*), plus the cost if you sold it each year (sell[k]).
 */
export function tco(o, c, retOverride = null) {
  const H = Math.min(50, Math.max(1, Math.round(+c.years || 1))), M = H * 12, P = pos(o.price);
  const i = (+c.infl || 0) / 100, r = (retOverride ?? (+c.ret || 0)) / 100;
  const rm = (1 + r) ** (1 / 12) - 1, disc = (m) => (1 + rm) ** -m;
  // the loan: a fixed payment (French amortisation), and what is still owed after m payments
  const n = o.fin ? Math.round(pos(o.term)) : 0, F = o.fin && n ? Math.min(P, pos(o.loan)) : 0, lr = (F ? pos(o.rate) : 0) / 1200;
  const pay = F ? (lr ? F * lr / (1 - (1 + lr) ** -n) : F / n) : 0;
  const owedAt = (m) => (!F || m >= n ? 0 : lr ? F * (1 + lr) ** m - pay * (((1 + lr) ** m - 1) / lr) : F - pay * m);
  const worth = (k) => valueAt(o, k, H);
  const cf = new Array(M + 1).fill(0); // what you pay each month; month 0 is the day you buy it
  cf[0] = P - F;
  let running = 0, once = 0;
  for (const x of o.costs || []) {
    const a = pos(x.a);
    if (!a) continue;
    if (x.f === 'o') { cf[0] += a; once += a; continue; }
    const g = x.fix ? 0 : i; // a fixed price (a lease) does not follow inflation
    if (x.f === 'm') { for (let m = 1; m <= M; m++) { const v = a * (1 + g) ** Math.floor((m - 1) / 12); cf[m] += v; running += v; } continue; }
    // a year, or every N years: paid at the start of that year, at that year's prices ("every 2 years": in years 3, 5…)
    const every = x.f === 'y' ? 1 : Math.max(1, +x.f || 1);
    for (let k = x.f === 'y' ? 0 : every; k < H; k += every) { const v = a * (1 + g) ** k; cf[12 * k + 1] += v; running += v; }
  }
  for (let m = 1; m <= Math.min(n, M); m++) cf[m] += pay;
  // running sums: paid so far (nominal) and its present value, to know the cost if you sold it at the end of any year
  const paid = [], pvPaid = [];
  let s = 0, sp = 0;
  for (let m = 0; m <= M; m++) { s += cf[m]; sp += cf[m] * disc(m); paid.push(s); pvPaid.push(sp); }
  const sc = Math.min(100, pos(o.sellc)) / 100; // selling costs, % of the sale price (agency, taxes on the sale)
  const exitAt = (k) => owedAt(12 * k) - worth(k) * (1 - sc); // selling after k years: pay off the loan, get its value minus those costs
  const sell = Array.from({ length: H + 1 }, (_, k) => r2(pvPaid[12 * k] + exitAt(k) * disc(12 * k)));
  const total = paid[M] + exitAt(H), pv = pvPaid[M] + exitAt(H) * disc(M);
  const month = rm ? pv * rm / (1 - (1 + rm) ** -M) : pv / M; // the fixed monthly payment worth the same as all of it
  return {
    cf, exit: Array.from({ length: H + 1 }, (_, k) => exitAt(k)), // for compare(): what leaves your pocket each month, and what selling costs (−: gives) each year
    H, M, price: P, loan: F, sellCost: r2(worth(H) * sc), pay: r2(pay), interest: r2(pay * Math.min(n, M) + owedAt(M) - F), owed: r2(owedAt(M)), value: r2(worth(H)),
    running: r2(running), once: r2(once), total: r2(total), pv: r2(pv), month: r2(month), sell,
    out: Array.from({ length: H + 1 }, (_, k) => r2(paid[12 * k])), // money paid by the end of each year (nothing sold)
  };
}

/**
 * A decision's alternative ({ name, price, value mode…, loan, rate, term, v: { rowId: amount } }) as an option for tco():
 * the decision's concepts (rows: { id, n, f, fix }) with this alternative's amounts. A loan counts when it has an amount and a term.
 */
export function optOf(a, rows = []) {
  const loan = pos(a?.loan), term = Math.round(pos(a?.term));
  return { ...a, fin: !!(loan && term), loan, rate: pos(a?.rate), term, costs: rows.map((r) => ({ n: r.n, a: pos(a?.v?.[r.id]), f: r.f, ...(r.fix ? { fix: true } : {}) })) };
}

/**
 * What each alternative does to your net worth (patrimonio), the way an accountant sees it. You start with the money you have
 * for this (c.cap; by default what the dearest one needs on day one), invested at the scenario's return. Buying is a swap
 * (money → a thing) and paying off a loan's capital is saving: neither changes your net worth. Everything you pay comes out of
 * it — money you stop having and stop earning on — and depreciation takes it down; appreciation and the return of what is left
 * invested take it up. Nothing is added from your income: it would be the same whatever you chose. An alternative that needs
 * more than you have runs a negative balance (as if borrowing at the scenario's return) and is flagged in `short`.
 * c: { years, infl, rets: [%…], cap?, rows, alts }. For each return:
 *   pn[i][k]  net worth after k years if you stopped (and sold) then: starts at K, in euros of that year
 *   dpn[i]    the change over the whole period; cost[i][k] what it costs you against spending nothing
 */
export function compare(c) {
  const os = (c.alts || []).map((a) => optOf(a, c.rows));
  const base = os.map((o) => tco(o, c));
  if (!base.length) return { H: 0, M: 0, os, base, K: 0, autoK: 0, put: 0, short: [], scen: [] };
  const { H, M } = base[0];
  const autoK = Math.max(...base.map((b) => b.cf[0])); // what the dearest one needs the first day
  const K = +c.cap > 0 ? +c.cap : autoK;
  // nothing is added each month: what you pay comes out of your net worth (money you stop having, and stop earning on).
  // So each alternative depends only on itself and the initial money, and the differences are the same as in cost.
  const B = new Array(M + 1).fill(0), putY = new Array(H + 1).fill(K), put = K;
  const short = base.map((b) => (b.cf[0] > K + 0.5 ? r2(b.cf[0] - K) : 0));
  const scen = (c.rets || []).map((ret) => {
    const rm = (1 + (+ret || 0) / 100) ** (1 / 12) - 1;
    const runs = base.map((b) => {
      let P = K - b.cf[0];
      const w = [r2(P - b.exit[0])], cash = [r2(P)];
      for (let m = 1; m <= M; m++) { P = P * (1 + rm) + (B[m] - b.cf[m]); if (m % 12 === 0) { w.push(r2(P - b.exit[m / 12])); cash.push(r2(P)); } }
      return { w, cash, port: r2(P) };
    });
    // what you would have spending nothing at all: the same money, all of it invested. What an alternative costs is how much
    // poorer it leaves you than that — what you pay, plus what that money would have earned, minus what you get back
    let Q = K; const none = [r2(Q)];
    for (let m = 1; m <= M; m++) { Q = Q * (1 + rm) + B[m]; if (m % 12 === 0) none.push(r2(Q)); }
    const wealth = runs.map((x) => x.w), fin = wealth.map((w) => w[H]);
    const cost = wealth.map((w) => w.map((v, k) => r2(none[k] - v)));
    const pn = wealth.map((w) => w.map((v, k) => r2(v - (putY[k] - K)))); // the monthly money is income passing through, not a gain
    return { ret: +ret || 0, none, wealth, cost, pn, pnFin: pn.map((p) => p[H]), dpn: pn.map((p) => r2(p[H] - K)), cash: runs.map((x) => x.cash), port: runs.map((x) => x.port), fin, costFin: cost.map((x) => x[H]), best: fin.reduce((b, v, i) => (v > fin[b] ? i : b), 0) };
  });
  return { H, M, os, base, K: r2(K), autoK: r2(autoK), put: r2(put), short, scen };
}

/** The year from which wealth line `a` stays at or above `b` (0: always; null: not at the end). */
export function aheadFrom(a, b) {
  let k = a.length - 1;
  if (a[k] < b[k]) return null;
  while (k > 0 && a[k - 1] >= b[k - 1]) k--;
  return k;
}

/** The index of the cheapest option (in today's money). */
export const cheapestOf = (rs) => rs.reduce((b, x, k) => (x.pv < rs[b].pv ? k : b), 0);

/**
 * The year from which option `a` stays cheaper than `b` if you sold then (0: from the start; null: never within the horizon).
 * Owning something often only pays off after some years, once the costs of buying and selling are spread out.
 */
export function evenYear(ra, rb) {
  let k = ra.sell.length - 1;
  if (ra.sell[k] > rb.sell[k]) return null;
  while (k > 1 && ra.sell[k - 1] <= rb.sell[k - 1]) k--;
  return k === 1 && ra.sell[1] <= rb.sell[1] ? 0 : k;
}

/** The return (%, between −5 and 20) at which `a` and `b` cost the same, or null if they don't cross in that range. */
export function evenReturn(oa, ob, c) {
  const f = (r) => tco(oa, c, r).pv - tco(ob, c, r).pv;
  let lo = -5, flo = f(lo);
  for (let hi = -4.5; hi <= 20; hi += 0.5) {
    const fhi = f(hi);
    if (Math.sign(fhi) !== Math.sign(flo)) {
      let a = hi - 0.5, b = hi;
      for (let j = 0; j < 30; j++) { const mid = (a + b) / 2; if (Math.sign(f(mid)) === Math.sign(f(a))) a = mid; else b = mid; }
      return Math.round((a + b) / 2 * 10) / 10;
    }
    lo = hi; flo = fhi;
  }
  return null;
}
