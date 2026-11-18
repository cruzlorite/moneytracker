// Made-up data for the demo. Nothing here belongs to a real person.
import { toYM, ymAdd, toISO, daysInMonth, compute, round2 } from './model.js';
import { t } from './i18n.js';

export function demoData(today = new Date()) {
  const cur = toYM(today);
  const start = ymAdd(cur, -4);
  const items = [
    { id: 'd-nomina', kind: 'in', name: t('Nómina'), amount: 1900, freq: 'monthly', day: 28 },
    { id: 'd-extra-jun', kind: 'in', name: t('Paga extra verano'), amount: 1100, freq: 'yearly', month: 6, day: 28 },
    { id: 'd-extra-dic', kind: 'in', name: t('Paga extra Navidad'), amount: 1100, freq: 'yearly', month: 12, day: 20 },
    { id: 'd-alquiler', kind: 'out', name: t('Alquiler'), amount: 650, freq: 'monthly', day: 1 },
    { id: 'd-ahorro', kind: 'out', name: t('Traspaso al ahorro'), amount: 300, freq: 'monthly', day: 1, cat: 'ahorro' }, // a standing order: not spending
    { id: 'd-luz', kind: 'out', name: t('Luz, agua e internet'), amount: 85, freq: 'monthly', day: 5, vary: true },
    { id: 'd-movil', kind: 'out', name: t('Móvil'), amount: 12, freq: 'monthly', day: 12, vary: true },
    { id: 'd-gym', kind: 'out', name: t('Gimnasio'), amount: 30, freq: 'monthly', day: 3 },
    { id: 'd-transporte', kind: 'out', name: t('Transporte'), amount: 40, freq: 'monthly', day: 1 },
    { id: 'd-seguro', kind: 'out', name: t('Seguro del coche'), amount: 360, freq: 'yearly', month: 3, day: 15 },
    { id: 'd-vacaciones', kind: 'out', name: t('Vacaciones'), amount: 1200, freq: 'yearly', budget: true, cat: 'viajes' },
    { id: 'd-tabaco', kind: 'out', name: t('Tabaco'), amount: 50, freq: 'monthly', budget: true, cat: 'tabaco' },
    { id: 'd-ibi', kind: 'out', name: t('Impuestos'), amount: 180, freq: 'quarterly', month: 1, day: 20 },
    { id: 'd-regalos', kind: 'out', name: t('Regalos'), amount: 250, freq: 'yearly', budget: true, cat: 'regalos' },
    { id: 'd-super', kind: 'out', name: t('Súper'), amount: 220, freq: 'monthly', budget: true, cat: 'super' },
    { id: 'd-ropa', kind: 'out', name: t('Ropa'), amount: 300, freq: 'yearly', budget: true, cat: 'ropa' },
  ];
  // give each made-up spend its type: Súper counts against its budget, the rest against Resto de vida
  const TYPE = { 'Súper': 'super', 'Cena': 'restaurante', 'Café': 'cafe', 'Cañas': 'copas' };
  const tag = (e) => (TYPE[e.note] ? { ...e, note: '', cat: TYPE[e.note] } : e);
  const months = {}, spends = [];
  const pattern = [[340, true, 430, 1900, 92, 12], [340, true, 600, 1931, 78, 14], [380, true, 390, 1900, 101, 12], [340, true, 470, 1900, 88, 13]];
  pattern.forEach(([saved, , spent, pay, luz, movil], i) => {
    const ym = ymAdd(start, i);
    months[ym] = { real: { 'd-nomina': pay, 'd-luz': luz, 'd-movil': movil } };
    let left = spent, d = 2;
    while (left > 0 && d <= daysInMonth(ym)) {
      const a = Math.min(left, [32, 55, 18, 60, 28][d % 5]);
      spends.push(tag({ id: `dg-${ym}-${d}`, date: `${ym}-${String(d).padStart(2, '0')}`, amount: a, note: ['Súper', 'Cena', 'Café', 'Súper', 'Cañas'][d % 5] }));
      left -= a; d += 2;
    }
  });
  months[ymAdd(start, 2)].challenge = { id: 'nospend', p: 8 };
  months[cur] = { challenge: { id: 'week', p: 120 } };
  // a few spends this month, up to today
  for (let d = 1; d <= Math.min(today.getDate(), 20); d += 4) spends.push(tag({ id: `dg-now-${d}`, date: toISO(new Date(today.getFullYear(), today.getMonth(), d)), amount: [34, 22, 9, 41, 12][d % 5], note: ['Súper', 'Cena', 'Café', 'Súper', 'Cañas'][d % 5] }));
  spends.push({ id: 'dg-viaje-1', date: `${start}-18`, amount: 640, note: t('Asturias'), cat: 'viajes' });
  for (let i = 0; i < 4; i++) for (const d of [4, 11, 19, 26]) spends.push({ id: `dg-tab-${i}-${d}`, date: `${ymAdd(start, i)}-${String(d).padStart(2, '0')}`, amount: 13.5, note: '', cat: 'tabaco' });
  spends.push({ id: 'dg-ropa-1', date: `${ymAdd(start, 1)}-14`, amount: 45, note: t('Zapatillas'), cat: 'ropa' }, { id: 'dg-ropa-2', date: `${ymAdd(start, 3)}-09`, amount: 80, note: t('Abrigo'), cat: 'ropa' });

  // balances: each month ends with what the plan, the logged spends and some unlogged day-to-day spending leave
  const data = { settings: { goal: 4000, start }, items, months, spends };
  months[start].open = 1500;
  const unlogged = [40, 640, 20, 70]; // the balance tells the truth: logged spends aren't everything (August overspends and loses money)
  const closes = [true, true, true, false]; // the last one is left to close
  pattern.forEach(([,, spent], i) => {
    // months run from payday to payday (the 28th here): ranges and dates come from the model
    const ym = ymAdd(start, i), m = compute(data, today), end = m.range(ym).to;
    const f = m.flowTo(ym, end), logged = spends.reduce((a, e) => a + (m.monthOf(e.date) === ym ? e.amount : 0), 0);
    months[ym].bal = round2(m.balStart(ym) + f.inc - f.out - f.save - (logged + unlogged[i]));
    if (closes[i]) months[ym].close = { amount: compute(data, today).fromBalance(ym, months[ym].bal).left };
  });
  // the month left to close keeps no closing balance (you write it when you close it); this month starts from it
  const now = compute(data, today).curYM, last = ymAdd(now, -1);
  if (months[last] && !months[last].close && months[last].bal != null) {
    months[now] = { ...(months[now] || {}), open: months[last].bal };
    delete months[last].bal;
  }
  // and a look at this month's balance a couple of days ago
  const m = compute(data, today), date = toISO(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2));
  if (m.dayOf(date, now) >= 3 && m.balStart(now) != null) {
    const f = m.flowTo(now, date), logged = spends.reduce((a, e) => a + (m.monthOf(e.date) === now && e.date <= date ? e.amount : 0), 0);
    months[now].check = { date, bal: round2(m.balStart(now) + f.inc - f.out - f.save - logged - 45) };
  }
  return data;
}
// A normal demo month: 1.900 in, 817 expected expenses, limits for the supermarket (220) and tobacco (50), the rest as planned.
