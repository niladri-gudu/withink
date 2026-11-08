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
