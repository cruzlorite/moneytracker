// Languages. The Spanish text is the key: t('Este mes') gives it in the chosen language, or as is when there is no
// translation, so a missing one never breaks a screen. {name} marks the places for values: t('Saldo del {d}', { d }).
import EN from './i18n/en.js';

export const LANGS = { es: 'Español', en: 'English' };
const DICT = { en: EN };
const KEY = 'hucha:lang';

function detect() {
  if (typeof window === 'undefined') return 'es'; // tests and tools: the source language
  try { const s = localStorage.getItem(KEY); if (LANGS[s]) return s; } catch { /* storage blocked */ }
  const nav = (navigator.languages || [navigator.language || 'es']).map((l) => String(l).slice(0, 2).toLowerCase());
  return nav.find((l) => LANGS[l]) || 'es';
}
export const lang = detect();
export const locale = lang === 'en' ? 'en-GB' : 'es-ES';
if (typeof document !== 'undefined') document.documentElement.lang = lang;

// Currency: its own choice, apart from the language (euros in English, dollars in Spanish...). Per device, like the language.
export const CURRENCIES = ['EUR', 'USD', 'GBP', 'MXN', 'ARS', 'COP', 'CLP', 'PEN', 'BRL', 'CHF', 'CAD', 'AUD', 'JPY'];
const NO_DECIMALS = ['JPY', 'CLP'];
const CKEY = 'hucha:cur';
function detectCur() {
  if (typeof window === 'undefined') return 'EUR';
  try { const s = localStorage.getItem(CKEY); if (CURRENCIES.includes(s)) return s; } catch { /* storage blocked */ }
  const region = (navigator.language || '').split('-')[1]?.toUpperCase();
  const byRegion = { US: 'USD', GB: 'GBP', MX: 'MXN', AR: 'ARS', CO: 'COP', CL: 'CLP', PE: 'PEN', BR: 'BRL', CH: 'CHF', CA: 'CAD', AU: 'AUD', JP: 'JPY' };
  return byRegion[region] || 'EUR';
}
export const cur = detectCur();
export const curDecimals = NO_DECIMALS.includes(cur) ? 0 : 1;
/** The symbol alone ("€", "$", "£"). */
export const curSym = new Intl.NumberFormat(locale, { style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find((p) => p.type === 'currency')?.value || cur;
export const curName = (c) => { try { return new Intl.DisplayNames([locale], { type: 'currency' }).of(c); } catch { return c; } };
export function setCurrency(c) {
  if (!CURRENCIES.includes(c) || c === cur) return;
  try { localStorage.setItem(CKEY, c); } catch { /* storage blocked */ }
  location.reload();
}

export function setLang(l) {
  if (!LANGS[l] || l === lang) return;
  try { localStorage.setItem(KEY, l); } catch { /* storage blocked */ }
  location.reload(); // every label is built once with the language: a reload is the simple, complete switch
}

export function t(s, p) {
  let out = (lang !== 'es' && DICT[lang]?.[s]) || s;
  if (p) out = out.replace(/\{(\w+)\}/g, (m, k) => (p[k] ?? m));
  return out;
}
/** One form or the other by count: tn(n, 'día', 'días'). */
export const tn = (n, one, many) => t(Math.abs(n) === 1 ? one : many);
