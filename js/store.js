// App data and where it lives. Three modes:
//  - google: a sheet in the user's Drive, with a copy on the device so it opens instantly and works offline
//  - local:  only this device (localStorage), until the user connects Google
//  - demo:   made-up data in memory, nothing is saved
import { SheetStore, AuthError, tokenValid, TABS } from './google.js';
import { t } from './i18n.js';
import { toYM } from './model.js';
import { demoData } from './demo.js';

const CACHE_KEY = 'hucha:cache';
const ALL = Object.keys(TABS);
export const emptyData = () => ({ settings: { goal: 0, start: toYM(new Date()) }, items: [], months: {}, spends: [], log: [] });
const clone = (o) => JSON.parse(JSON.stringify(o));
const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* full or blocked */ } };

export class Store {
  constructor(onChange, onStatus) {
    this.onChange = onChange; this.onStatus = onStatus;
    this.mode = null; this.sheetId = null; this.data = null;
    this.dirty = new Set(); this.status = 'idle'; this.error = '';
    this.sheets = new SheetStore();
    this.timer = null; this.syncing = null;
    const c = lsGet(CACHE_KEY);
    if (c?.mode && c.data) {
      this.mode = c.mode; this.sheetId = c.sheetId || null; this.data = c.data;
      (c.dirty || []).forEach((t) => this.dirty.add(t));
    }
    window.addEventListener('online', () => this.sync());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this.refresh(); });
  }

  persist() {
    if (this.mode === 'demo' || !this.mode) return;
    lsSet(CACHE_KEY, { mode: this.mode, sheetId: this.sheetId, data: this.data, dirty: [...this.dirty] });
  }
  setStatus(s, err = '') { this.status = s; this.error = err; this.onStatus?.(s, err); }

  startDemo() { this.mode = 'demo'; this.sheetId = null; this.data = demoData(); this.dirty.clear(); this.setStatus('idle'); this.onChange(); }
  startLocal(data) { this.mode = 'local'; this.sheetId = null; this.data = data || emptyData(); this.dirty.clear(); this.persist(); this.setStatus('idle'); this.onChange(); }

  /** After signing in: open the app's sheet, or create it with what's on the device. */
  async connectGoogle() {
    this.setStatus('saving');
    const localData = this.mode === 'local' || this.mode === 'google' ? this.data : null;
    const wasLocal = this.mode === 'local' && localData?.items?.length > 0;
    const unsent = this.mode === 'google' && this.dirty.size > 0;
    const id = await this.sheets.find();
    if (!id) {
      const start = localData || emptyData();
      const nid = await this.sheets.create(start);
      this.mode = 'google'; this.sheetId = nid; this.data = clone(start); this.dirty.clear();
      this.persist(); this.setStatus('saved'); this.onChange();
      return { created: true };
    }
    const remote = await this.sheets.load(id);
    this.mode = 'google'; this.sheetId = id;
    if (unsent) { this.data = localData; ALL.forEach((t) => this.dirty.add(t)); this.persist(); this.onChange(); await this.sync(); return {}; }
    this.data = remote; this.dirty.clear(); this.persist(); this.setStatus('saved'); this.onChange();
    // A plan made on this device and a sheet already in Drive: the app asks which one to keep.
    return wasLocal ? { choose: true, local: localData } : {};
  }

  /** Reload from the sheet (e.g. edited on another device or by hand), unless there are unsent changes. */
  async refresh() {
    if (this.mode !== 'google' || !this.sheetId || !tokenValid()) return;
    if (this.dirty.size) return this.sync();
    try {
      const remote = await this.sheets.load(this.sheetId);
      if (JSON.stringify(remote) !== JSON.stringify(this.data)) { this.data = remote; this.persist(); this.onChange(); }
      this.setStatus('saved');
    } catch (e) { this.fail(e); }
  }

  /** Change the data. `tabs` says which parts of the sheet changed. */
  update(tabs, fn) {
    fn(this.data);
    if (this.mode === 'google') { [].concat(tabs).forEach((t) => this.dirty.add(t)); this.schedule(); }
    this.persist();
    this.onChange();
  }
  replaceAll(data) {
    this.data = data;
    if (this.mode === 'google') { ALL.forEach((t) => this.dirty.add(t)); this.schedule(); }
    this.persist(); this.onChange();
  }

  schedule() { clearTimeout(this.timer); this.setStatus('pending'); this.timer = setTimeout(() => this.sync(), 700); }

  async sync() {
    if (this.mode !== 'google' || !this.sheetId || !this.dirty.size) return;
    if (!navigator.onLine) return this.setStatus('offline');
    if (!tokenValid()) return this.setStatus('auth');
    if (this.syncing) { await this.syncing; if (this.dirty.size) return this.sync(); return; }
    const tabs = [...this.dirty];
    this.dirty.clear();
    this.setStatus('saving');
    this.syncing = this.sheets.save(this.sheetId, this.data, tabs)
      .then(() => { this.persist(); this.setStatus(this.dirty.size ? 'pending' : 'saved'); })
      .catch((e) => { tabs.forEach((t) => this.dirty.add(t)); this.persist(); this.fail(e); })
      .finally(() => { this.syncing = null; });
    await this.syncing;
    if (this.dirty.size && this.status === 'pending') this.schedule();
  }
  fail(e) {
    if (e instanceof AuthError) this.setStatus('auth');
    else if (!navigator.onLine) this.setStatus('offline');
    else this.setStatus('error', e?.message || t('Error al guardar'));
  }

  /** Forget everything on this device (the Google sheet stays in Drive). */
  reset() { clearTimeout(this.timer); this.mode = null; this.sheetId = null; this.data = null; this.dirty.clear(); lsSet(CACHE_KEY, null); this.setStatus('idle'); this.onChange(); }
}
