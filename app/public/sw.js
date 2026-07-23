// Withink PWA Service Worker for offline-first journal access
const CACHE_NAME = "withink-shell-v1";
const ASSETS_TO_CACHE = [
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
          // Cache successful GET requests for resources we want to cache offline
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            !networkResponse.redirected
          ) {
            const isAsset = req.url.includes("/_next/static/") || req.url.includes("/fonts/");
            const isNav = req.headers.get("accept")?.includes("text/html");

            if (isAsset || isNav) {
              const cacheCopy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(req, cacheCopy);
              });
            }
          }
          return networkResponse;
        })
        .catch(async (err) => {
          // If offline and navigating to a page, serve the cached entries/root shell
          if (req.headers.get("accept")?.includes("text/html")) {
            const cachedEntries = await caches.match("/entries");
            if (cachedEntries) {
              return cachedEntries;
            }
            const cachedRoot = await caches.match("/");
            if (cachedRoot) {
              return cachedRoot;
            }
          }
          throw err;
        });
    })
  );
});
