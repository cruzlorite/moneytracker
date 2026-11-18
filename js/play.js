// How the month is going, worked out from the data each time; nothing here is stored.
import { round2, clamp, ymAdd } from './model.js';

/**
 * How the month's spending money is going (what it leaves after expected expenses, budgets and savings).
 * day: days of the month gone (today counts) · ideal: what you'd have spent at an even pace
 * idealLeft: what should be left today · forecast: left at month end at the current pace (null early in the month)
 */
export function pace(m, ym) {
  // a balance higher than the plan explains would read as negative spending: count it as nothing spent
  const rest = m.restOf(ym), spent = Math.max(0, m.spentOf(ym)), dim = m.range(ym).days, cur = m.curYM;
  const day = ym < cur ? dim : ym > cur ? 0 : clamp(m.dayOf(m.todayISO, ym), 1, dim);
  const left = round2(rest - spent);
  const ideal = rest * day / dim;
  const forecast = day >= 3 && day < dim ? round2(rest - spent / day * dim) : day >= dim ? left : null;
  const daysLeft = dim - day + (ym === cur ? 1 : 0);
  return {
    rest, spent, left, dim, day, daysLeft,
    idealLeft: Math.max(0, rest - ideal),
    hp: rest > 0 ? clamp(left / rest, 0, 1) : 0,
    perDay: daysLeft > 0 && left > 0 ? left / daysLeft : 0,
    onPace: spent <= ideal + 0.5,
    forecast,
  };
}

/** The most recent finished month of the plan that still needs closing, or null. */
export function closeDue(m) {
  const prev = ymAdd(m.curYM, -1);
  if (!m.season.includes(prev)) return null;
  if (m.balStart(prev) == null) return null; // nothing to close from: a new plan has no balance behind it yet
  return m.mon(prev).close ? null : prev;
}
