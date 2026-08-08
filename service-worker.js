// One Chords — service worker
// Only caches this app's own files (the shell). Firebase, Google Fonts, and
// the QR code library are all loaded from other companies' servers and are
// deliberately left alone here — intercepting them could break the live
// sync or serve stale SDK code.
const CACHE_NAME = 'one-chords-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .catch((err) => console.warn('Shell cache warm-up failed (non-fatal):', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never touch cross-origin requests (Firebase, fonts, CDN libraries) —
  // let the browser handle those exactly as it normally would.
  if (url.origin !== self.location.origin) return;

  const isAppShellPage =
    event.request.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('index.html');

  if (isAppShellPage) {
    // Always prefer the freshest copy of the app when online, so updates
    // show up immediately instead of getting stuck on a cached version.
    // Only fall back to the cache when there's no network at all.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets (icons, manifest): cache-first, network as a fallback.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
