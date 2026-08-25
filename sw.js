const CACHE_NAME = "magazijn-cache-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// App-shell bestanden: cache-first (werkt ook offline).
// Alles wat niet in de lijst staat (bv. Firebase-verkeer, CDN-scripts):
// gewoon naar het netwerk, niet cachen — die data moet altijd actueel zijn.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isAppShell = url.origin === self.location.origin;

  if (!isAppShell) return; // laat Firebase/CDN-requests gewoon door

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
