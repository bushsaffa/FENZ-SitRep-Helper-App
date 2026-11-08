const CACHE = 'sitrep-v5';   // change the number every time you update the app
const FILES = ['./', 'index.html', 'manifest.json', 'css/styles.css',
  'js/helpers.js','js/config.js','js/vocab.js','js/patients.js','js/extract.js',
  'js/script-builder.js','js/ui.js','js/timer.js','js/reports.js','js/voice.js','js/main.js',
  'icon-192.png','icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => clients.claim())));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));