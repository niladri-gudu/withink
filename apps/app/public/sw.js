// Withink PWA Service Worker
// Strategy:
//  - Navigation (HTML documents): network-first. HTML is NEVER cached because it
//    may contain server-rendered (decrypted) journal content.
//  - Static assets: cache-first (they are content-hashed / immutable).
//  - On offline navigation: serve offline.html.
//  - Message channel so the app can purge all caches on logout/account deletion.
const CACHE_NAME = "withink-static-v2";
const STATIC_ASSETS = ["/manifest.json", "/icon.svg", "/offline.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch((err) => console.error("[SW] Failed to pre-cache static assets:", err))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_CACHES") {
    const purge = caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
    if (typeof event.waitUntil === "function") {
      event.waitUntil(purge);
    }
    if (event.source && typeof event.source.postMessage === "function") {
      event.source.postMessage({ type: "CACHES_CLEARED" });
    }
  }
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/icon.svg"
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin GET requests.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // Never intercept API calls, auth endpoints, or dev HMR.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.includes("/_next/webpack-hmr")
  ) {
    return;
  }

  // Navigations: network-first, fall back to offline.html, never cache HTML.
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req).catch(async () => {
        const offline = await caches.match("/offline.html");
        return offline || Response.error();
      })
    );
    return;
  }

  // Immutable/versioned static assets: cache-first, populate cache on miss.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => {
                try {
                  cache.put(req, copy);
                } catch (err) {
                  console.error("[SW] Failed to cache asset:", err);
                }
              })
              .catch(() => {});
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else: network only.
});
