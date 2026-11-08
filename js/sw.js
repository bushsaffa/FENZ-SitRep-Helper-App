// Network first: when there is signal you always get the newest files; with no signal (or a very slow one) the saved copy is used.
const CACHE = 'sitrep-v8';   // only needs changing if you add or rename files in FILES
const FILES = ['./', 'index.html', 'manifest.json', 'css/styles.css',
  'js/helpers.js','js/config.js','js/vocab.js','js/patients.js','js/extract.js',
  'js/script-builder.js','js/ui.js','js/timer.js','js/reports.js','js/voice.js','js/main.js',
  'icon-192.png','icon-512.png'];
const SLOW_MS = 3000;   // on a slow connection, give up waiting after this long and use the saved copy

// cache: 'reload' skips the browser's own HTTP cache, so a fresh install can never save stale files
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => clients.claim())));

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const net = fetch(e.request, { cache: 'no-cache' }).then(r => { if (r && r.ok) cache.put(e.request, r.clone()); return r; });
    net.catch(() => {});
    try {
      const r = await Promise.race([net, new Promise(res => setTimeout(() => res(null), SLOW_MS))]);
      if (r) return r;
    } catch (err) { /* offline: fall through to the saved copy */ }
    const saved = await cache.match(e.request, { ignoreSearch: true });
    return saved || net;
  })());
});