// Ambil dari jaringan dulu untuk file aplikasi, pakai simpanan hanya saat offline.
const VERSI = '1.0.0';
const CACHE = 'bukue-' + VERSI;
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css', 'fonts/PlusJakartaSans.woff2',
  'js/app.js', 'js/shared.js', 'js/config.js', 'js/calc.js', 'js/store.js', 'js/data.js', 'js/util.js', 'js/seed.js', 'js/qris.js', 'js/kalimat.js', 'js/splash.js',
  'js/views/ui.js', 'js/views/home.js', 'js/views/orders.js', 'js/views/products.js', 'js/views/more.js', 'js/views/production.js', 'js/views/auth.js', 'js/views/stok.js', 'js/views/openpo.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('bukue-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(req, { cache: 'no-cache' });
      if (res.ok) {
        const c = await caches.open(CACHE);
        c.put(req, res.clone());
      }
      return res;
    } catch {
      const c = await caches.open(CACHE);
      return (await c.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? c.match('index.html') : Response.error());
    }
  })());
});
