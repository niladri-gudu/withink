import { getLocalDateString } from "@withink/core";

import { createDiaryClient } from "./api";
import { mobileCrypto } from "./crypto";
import { createDiaryCache } from "./diary-cache-core";
import { mobileLocalStore } from "./local-store";

/**
 * App-wired diary cache: SQLite on device, HTTP sync with the bearer session
 * and unlock token, AES-GCM/HKDF from the shared native crypto adapter.
 */
export const diaryCache = createDiaryCache({
  store: mobileLocalStore,
  api: createDiaryClient(),
  crypto: mobileCrypto,
  now: Date.now,
  localToday: getLocalDateString,
});

export type {
  DiaryCache,
  LocalDocument,
  PullResult,
  SaveEntryLocallyInput,
  SyncResult,
} from "./diary-cache-core";
export { METADATA_VERSION } from "./diary-cache-core";
