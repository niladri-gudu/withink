// Withink PWA Service Worker for offline-first journal access
const CACHE_NAME = "withink-shell-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/entries",
  "/manifest.json",
  "/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET requests for our origin
  if (req.method !== "GET" || !req.url.startsWith(self.location.origin)) {
    return;
  }

  // Bypass API requests and Next.js HMR web socket hot reloads
  if (req.url.includes("/api/") || req.url.includes("/_next/webpack-hmr") || req.url.includes("chrome-extension")) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(req)
        .then((networkResponse) => {
          // Cache Next.js built chunks and fonts dynamically on navigation
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (req.url.includes("/_next/static/") || req.url.includes("/fonts/"))
          ) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, cacheCopy);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and navigating to a page, serve the cached entries/root shell
          if (req.headers.get("accept")?.includes("text/html")) {
            return caches.match("/entries") || caches.match("/");
          }
        });
    })
  );
});
