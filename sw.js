const CACHE_NAME = "flashcardcx-v2";
const CACHE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./core.mjs",
  "./backup.mjs",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "get-cache-name") return;
  const port = event.ports && event.ports[0];
  if (!port) return;
  port.postMessage({ cacheName: CACHE_NAME });
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") return response;
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned)).catch(() => undefined);
        return response;
      });
    })
  );
});
