// Helpers to coordinate cache purging with the service worker.
// Used on logout / account deletion so no authenticated HTML (which may contain
// server-rendered, decrypted journal content) can be served to the next session.

export async function clearSwCaches(): Promise<void> {
  if (typeof window === "undefined") return;

  const controller = navigator.serviceWorker?.controller;
  if (controller) {
    try {
      const acked = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => resolve(false), 3000);
        const onMessage = (event: MessageEvent) => {
          if (event.data?.type === "CACHES_CLEARED") {
            clearTimeout(timer);
            resolve(true);
          }
        };
        navigator.serviceWorker.addEventListener("message", onMessage, {
          once: true,
        });
        controller.postMessage({ type: "CLEAR_CACHES" });
      });
      if (acked) return;
    } catch {
      // fall through to a direct purge below
    }
  }

  if ("caches" in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch {
      // caches unavailable (e.g. private browsing) - nothing more we can do
    }
  }
}
