// Everything that talks to Google: sign-in, Drive and Sheets. There is no server: the browser
// calls Google's APIs with the user's own token, and the data lives in a sheet in their Drive.
import { CONFIG } from '../config.js';
import { t } from './i18n.js';
import { normItem, normMonth, normSettings, normSpend, num, isYM, pad } from './model.js';

const SCOPE_FILE = 'https://www.googleapis.com/auth/drive.file';
const SCOPES = `${SCOPE_FILE} openid email`;
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE = 'https://www.googleapis.com/drive/v3/files';
const SCHEMA = '1';

// The sheet format is fixed: you can edit it by hand, keeping the header row.
export const TABS = {
  settings: { title: '_hucha', head: ['key', 'value'] },
  items: { title: 'items', head: ['id', 'kind', 'name', 'amount', 'freq', 'month', 'year', 'day', 'pot', 'vary', 'note', 'real', 'budget', 'cat'] },
  months: { title: 'meses', head: ['ym', 'saved', 'pots', 'pot_spent', 'real', 'close', 'challenge', 'bal', 'open', 'check', 'open_date'] },
  spends: { title: 'gastos', head: ['id', 'date', 'amount', 'note', 'cat'] },
};

export class AuthError extends Error {
  constructor() { super(t('Tu sesión de Google ha caducado. Vuelve a conectar.')); this.name = 'AuthError'; }
}
export const isConfigured = () => Boolean(CONFIG.CLIENT_ID);
export const sheetUrl = (id) => `https://docs.google.com/spreadsheets/d/${id}/edit`;

// ---------- Google's sign-in script ----------
let gis;
export function loadGis() {
  return (gis ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { gis = null; reject(new Error(t('No se pudo cargar el inicio de sesión de Google. Revisa la conexión.'))); };
    document.head.appendChild(s);
  }));
}

// ---------- token ----------
const HINT_KEY = 'hucha:hint';
const TOKEN_KEY = 'hucha:token';
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* no storage */ } };
export const savedHint = () => lsGet(HINT_KEY) || '';

let token = null, tokenExp = 0, forceConsent = false;
// A still-valid token (at most 1 hour) is kept so reopening the installed app doesn't ask again.
try {
  const saved = JSON.parse(lsGet(TOKEN_KEY) || 'null');
  if (saved?.exp > Date.now()) ({ token, exp: tokenExp } = saved); else lsSet(TOKEN_KEY, null);
} catch { lsSet(TOKEN_KEY, null); }
function dropToken() { token = null; tokenExp = 0; lsSet(TOKEN_KEY, null); }
export const tokenValid = () => Boolean(token) && Date.now() < tokenExp;

/** Opens Google's popup. Call it straight from a click, before any await. */
export function signIn() {
  return new Promise((resolve, reject) => {
    const oauth = window.google?.accounts?.oauth2;
    if (!oauth) return reject(new Error(t('El inicio de sesión de Google aún está cargando. Prueba otra vez.')));
    const client = oauth.initTokenClient({
      client_id: CONFIG.CLIENT_ID,
      scope: SCOPES,
      callback: (r) => {
        if (r.error) return reject(new Error(r.error_description || r.error));
        if (!oauth.hasGrantedAllScopes(r, SCOPE_FILE)) {
          forceConsent = true; // Google shows the Drive permission as an unticked box: show it again
          return reject(new Error(t('Hace falta el permiso de Google Drive para guardar tu hoja. Márcalo al conectar.')));
        }
        forceConsent = false;
        token = r.access_token;
        tokenExp = Date.now() + (Number(r.expires_in || 3600) - 60) * 1000;
        lsSet(TOKEN_KEY, JSON.stringify({ token, exp: tokenExp }));
        resolve();
      },
      error_callback: (e) => reject(new Error(
        e?.type === 'popup_closed' ? t('Has cerrado la ventana de Google.')
          : e?.type === 'popup_failed_to_open' ? t('El navegador bloqueó la ventana de Google. Permite ventanas emergentes.')
            : t('No se pudo iniciar sesión con Google.'))),
    });
    const hint = savedHint();
    const prompt = forceConsent ? 'consent' : '';
    client.requestAccessToken(hint ? { prompt, login_hint: hint } : { prompt });
  });
}
export function signOut() {
  if (token) try { window.google?.accounts?.oauth2?.revoke(token, () => {}); } catch { /* ignore */ }
  dropToken(); lsSet(HINT_KEY, null);
}

async function api(url, { method = 'GET', body, query } = {}) {
  if (!tokenValid()) throw new AuthError();
  const u = new URL(url);
  for (const [k, v] of Object.entries(query || {})) u.searchParams.set(k, v);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  let res;
  try {
    res = await fetch(u, {
      method, signal: ctrl.signal,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error(e?.name === 'AbortError' ? t('Google tarda demasiado en responder.') : t('Sin conexión con Google.'));
  } finally { clearTimeout(timer); }
  if (res.status === 401) { dropToken(); throw new AuthError(); }
  if (!res.ok) {
    let msg = '';
    try { msg = (await res.json()).error?.message || ''; } catch { /* no body */ }
    const err = new Error(msg || t('Google respondió con un error ({s}).', { s: res.status }));
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

export async function rememberEmail() {
  try { const p = await api('https://www.googleapis.com/oauth2/v3/userinfo'); if (p.email) lsSet(HINT_KEY, p.email); return p.email || ''; }
  catch { return ''; }
}

// ---------- reading and writing the sheet ----------
const quote = (t) => `'${t.replace(/'/g, "''")}'`;

/** Hand-typed dates and months can come back as serial numbers. */
function serialToDate(v) {
  const d = new Date(Date.UTC(1899, 11, 30) + v * 864e5);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
const cellDate = (v) => (typeof v === 'number' ? serialToDate(v) : String(v ?? '').trim().slice(0, 10));
const cellYM = (v) => (typeof v === 'number' ? serialToDate(v).slice(0, 7) : String(v ?? '').trim().slice(0, 7));

function rowsToObjects(values, head) {
  const [hdr, ...rows] = values || [];
  const cols = (hdr || head).map((h) => String(h).trim());
  return rows.filter((r) => r.some((c) => c !== '' && c != null))
    .map((r) => Object.fromEntries(cols.map((c, i) => [c, r[i] ?? ''])));
}

export function parseSheet(valueRanges) {
  const get = (k) => valueRanges.find((v) => v.range?.replace(/'/g, '').startsWith(TABS[k].title + '!'))?.values || [];
  const settings = {};
  for (const [k, v] of get('settings').slice(1)) settings[String(k).trim()] = v;
  const items = rowsToObjects(get('items'), TABS.items.head).map(normItem);
  const months = {};
  for (const r of rowsToObjects(get('months'), TABS.months.head)) {
    const ym = cellYM(r.ym);
    if (!isYM(ym)) continue;
    const json = (v) => { try { return v ? JSON.parse(v) : {}; } catch { return {}; } };
    months[ym] = normMonth({ saved: r.saved === '' ? null : r.saved, pots: r.pots, potSpent: json(r.pot_spent), real: json(r.real), close: json(r.close), challenge: json(r.challenge),
      bal: r.bal, open: r.open, check: json(r.check), openDate: cellDate(r.open_date) });
  }
  const spends = rowsToObjects(get('spends'), TABS.spends.head)
    .map((r) => normSpend({ ...r, date: cellDate(r.date) })).filter(Boolean);
  const json = (v) => { try { return v ? JSON.parse(v) : undefined; } catch { return undefined; } };
  return {
    settings: normSettings({ goal: settings.goal, start: cellYM(settings.start), years: json(settings.years), cats: json(settings.cats), cycleDay: settings.cycle_day }),
    items, months, spends,
  };
}

export function toRows(data) {
  const b = (v) => (v ? true : '');
  return {
    settings: [TABS.settings.head, ['schema', SCHEMA], ['goal', data.settings.goal], ['start', data.settings.start],
      ['cycle_day', data.settings.cycleDay ?? ''], ['cats', data.settings.cats?.length ? JSON.stringify(data.settings.cats) : ''], ['years', data.settings.years?.length ? JSON.stringify(data.settings.years) : '']],
    items: [TABS.items.head, ...data.items.map((i) => [i.id, i.kind, i.name, i.amount, i.freq, i.month ?? '', i.year ?? '', i.day ?? '', b(i.pot), b(i.vary), i.note || '', i.real ?? '', b(i.budget), i.cat || ''])],
    months: [TABS.months.head, ...Object.keys(data.months).sort().map((ym) => {
      const m = data.months[ym];
      const j = (o) => (o && Object.keys(o).length ? JSON.stringify(o) : '');
      return [ym, m.saved ?? '', b(m.pots), j(m.potSpent), j(m.real), j(m.close), j(m.challenge), m.bal ?? '', m.open ?? '', j(m.check), m.openDate || ''];
    })],
    spends: [TABS.spends.head, ...[...data.spends].sort((a, b2) => a.date.localeCompare(b2.date)).map((e) => [e.id, e.date, e.amount, e.note || '', e.cat || ''])],
  };
}

export class SheetStore {
  constructor() { this.rowCount = {}; }

  /** The app's sheet: drive.file only lets it see the files it created itself. */
  async find() {
    const q = `appProperties has { key='app' and value='${CONFIG.APP_TAG}' } and trashed=false`;
    const r = await api(DRIVE, { query: { q, pageSize: 10, orderBy: 'modifiedTime desc', fields: 'files(id,name)' } });
    return r.files?.[0]?.id || null;
  }

  async create(data) {
    const ss = await api(SHEETS, {
      method: 'POST',
      body: { properties: { title: 'MoneyTracker', locale: 'es_ES' }, sheets: Object.values(TABS).map((t) => ({ properties: { title: t.title, gridProperties: { frozenRowCount: 1 } } })) },
    });
    const id = ss.spreadsheetId;
    await api(`${DRIVE}/${id}`, { method: 'PATCH', body: { appProperties: { app: CONFIG.APP_TAG, schema: SCHEMA } } });
    await this.save(id, data, Object.keys(TABS));
    return id;
  }

  async load(id) {
    const ranges = Object.values(TABS).map((t) => `${quote(t.title)}!A1:Z`);
    const u = new URL(`${SHEETS}/${id}/values:batchGet`);
    ranges.forEach((r) => u.searchParams.append('ranges', r));
    u.searchParams.set('valueRenderOption', 'UNFORMATTED_VALUE');
    const r = await api(u.toString());
    for (const [k, t] of Object.entries(TABS)) {
      const vr = r.valueRanges.find((v) => v.range?.replace(/'/g, '').startsWith(t.title + '!'));
      this.rowCount[k] = vr?.values?.length || 0;
    }
    return parseSheet(r.valueRanges);
  }

  /** Rewrites whole tabs (they're small). Blank rows cover what was there before, so deletions stick. */
  async save(id, data, tabs) {
    const rows = toRows(data);
    const payload = tabs.map((k) => {
      const t = TABS[k], vals = rows[k];
      const width = t.head.length;
      const total = Math.max(vals.length, this.rowCount[k] || 0);
      const padded = vals.concat(Array.from({ length: total - vals.length }, () => Array(width).fill('')));
      return { k, range: `${quote(t.title)}!A1`, values: padded, n: vals.length };
    });
    await api(`${SHEETS}/${id}/values:batchUpdate`, {
      method: 'POST',
      body: { valueInputOption: 'RAW', data: payload.map(({ range, values }) => ({ range, values })) },
    });
    for (const p of payload) this.rowCount[p.k] = p.n;
  }
}
