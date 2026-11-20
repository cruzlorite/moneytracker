// MoneyTracker service worker.
// 1) The app opens with no connection: same-origin files go to the network first (updates always win when you are online)
//    and the last copy is kept for when you are not.
// 2) Reminders: the page leaves a short list of dated reminders here; when the browser wakes this worker up
//    (periodic sync) the ones that are due are shown as system notifications, with the app's own icon.
const CACHE = 'moneytracker-shell';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return; // Google's calls go straight through
  e.respondWith(
    fetch(r, { cache: 'no-cache' })
      .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(r, copy)); } return res; })
      .catch(() => caches.match(r).then((m) => m || caches.match('./index.html') || caches.match('./'))),
  );
});

// ---- reminders ----
const db = () => new Promise((ok, no) => {
  const q = indexedDB.open('moneytracker', 1);
  q.onupgradeneeded = () => q.result.createObjectStore('kv');
  q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error);
});
const get = async (k) => { const d = await db(); return new Promise((ok) => { const r = d.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => ok(r.result); r.onerror = () => ok(undefined); }); };
const put = async (k, v) => { const d = await db(); return new Promise((ok) => { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => ok(); t.onerror = () => ok(); }); };

async function due() {
  const list = (await get('reminders')) || [], shown = new Set((await get('shown')) || []), now = Date.now();
  let any = false;
  for (const r of list) {
    const at = Date.parse(r.at);
    if (!(at <= now) || now - at > 10 * 864e5 || shown.has(r.key)) continue; // not yet, more than ten days ago, or already said
    await self.registration.showNotification(r.title, { body: r.body, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', tag: r.key, data: { url: r.url || './#hoy' } });
    shown.add(r.key); any = true;
  }
  if (any) await put('shown', [...shown].slice(-200));
}

self.addEventListener('message', (e) => {
  const m = e.data || {};
  if (m.type === 'reminders') e.waitUntil(put('reminders', m.list || []));
  if (m.type === 'test') e.waitUntil(self.registration.showNotification(m.title, { body: m.body, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', tag: 'test', data: { url: './#hoy' } }));
});
self.addEventListener('periodicsync', (e) => { if (e.tag === 'moneytracker-reminders') e.waitUntil(due()); });
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || './#hoy';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => (cs.length ? cs[0].focus() : self.clients.openWindow(url))));
});
