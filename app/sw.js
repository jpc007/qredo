// =====================================================================
// QREDO - Service worker : fonctionnement hors ligne
// ---------------------------------------------------------------------
// À la première visite, tous les fichiers de l'application sont mis en
// cache. Ensuite QREDO fonctionne sans Internet (mode avion).
// Stratégie "réseau d'abord" : avec Internet, on reçoit toujours la
// dernière version ; sans Internet, on utilise la copie en cache.
// Ajouter ici tout nouveau fichier de l'application (APP_FILES).
// =====================================================================

const CACHE_VERSION = 'qredo-v0.5.0';

const APP_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/core/qr-text.js',
  './js/core/qr-render.js',
  './js/core/storage.js',
  './js/data/picklists.js',
  './js/data/sample-dossier.js',
  './js/ui/form.js',
  './js/ui/wallpaper.js',
  './js/ui/scanner.js',
  './js/ui/print-card.js',
  './lib/qrcode-generator.js',
  './lib/jsqr.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Réseau d'abord (toujours la dernière version), cache si hors ligne
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    // cache: 'no-cache' = toujours demander au serveur si le fichier a changé
    // (sinon le navigateur peut resservir une ancienne version ~10 min)
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req, { ignoreSearch: true });
        if (cached) return cached;
        if (req.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      }),
  );
});
