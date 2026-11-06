// Service Worker: speichert die App beim ersten Aufruf, danach läuft sie offline.
// Bei jeder Änderung an den Dateien VERSION erhöhen, damit das iPhone die neue
// Version lädt.
const VERSION = 'binoxxo-v3';
const FILES = [
  './',
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/binoxxo.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION)
      // cache: 'reload' umgeht den Browser-Zwischenspeicher, sonst landen alte Dateien im neuen Cache
      .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Erst aus dem Speicher, im Hintergrund aktualisieren (stale-while-revalidate).
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(e.request, { ignoreSearch: true });
      const network = fetch(e.request, { cache: 'no-cache' })
        .then((res) => { if (res.ok) cache.put(e.request, res.clone()); return res; })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
