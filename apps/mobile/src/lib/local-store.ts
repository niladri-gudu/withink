import { createMemoryLocalStore } from "./memory-store";

/**
 * Non-native entry point for the local store. Metro resolves
 * `local-store.native.ts` (SQLite) on iOS/Android; this fallback serves web
 * and happens to be what Node tests import.
 */
export const mobileLocalStore = createMemoryLocalStore();
