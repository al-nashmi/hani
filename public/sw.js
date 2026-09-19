// Minimal service worker: only makes the app installable (PWA criteria require
// an active SW with a fetch handler). Static build assets are cached for faster
// repeat loads; everything else (pages, server actions, API routes) always goes
// to the network — this app shows live financial data, so stale cached reads
// would be actively wrong, not just inconvenient.
const CACHE_NAME = "hani-static-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isStaticAsset = url.origin === self.location.origin && url.pathname.startsWith("/_next/static/");

  if (!isStaticAsset) return; // let the network handle everything else as usual

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
  );
});
