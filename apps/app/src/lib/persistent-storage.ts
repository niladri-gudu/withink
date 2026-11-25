/**
 * Ask the browser to keep the encrypted IndexedDB diary cache even under
 * storage pressure. Safari/iOS can evict site data; persistent storage is
 * granted automatically based on engagement. Safe to call repeatedly — it is
 * a no-op when already persisted or unsupported.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) {
    return false;
  }

  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/**
 * Read (without requesting) whether the browser has already promised not to
 * evict this origin's data.
 */
export async function getPersistentStorageStatus(): Promise<
  "persisted" | "denied" | "unsupported"
> {
  if (typeof navigator === "undefined" || !navigator.storage?.persisted) {
    return "unsupported";
  }

  try {
    return (await navigator.storage.persisted()) ? "persisted" : "denied";
  } catch {
    return "unsupported";
  }
}

/** Approximate bytes used by this origin and the browser's quota. */
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
} | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return null;
  }

  try {
    const { usage, quota } = await navigator.storage.estimate();
    if (typeof usage !== "number" || typeof quota !== "number") return null;
    return { usage, quota };
  } catch {
    return null;
  }
}
