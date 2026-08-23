import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { encryptText } from "@/lib/crypto-client";
import { getLocalDateString } from "@/lib/utils/date";
import { useEncryption } from "@/providers/encryption-provider";

import { saveEntryAction } from "../actions/entry-actions";
import { diaryCacheService } from "../services/diary-cache-service";
import { journalSyncService } from "../services/journal-sync-service";

export type SaveStatus =
  | "idle"
  | "saving"
  | "saved"
  | "offline"
  | "error"
  | "locked";

interface AutoSaveData {
  date: string;
  title: string;
  mood: number | null;
  contentHtml: string;
  contentText: string;
  contentJson: unknown;
}

type PersistOutcome = "saved" | "locked" | "error";

const SAVE_TIMEOUT_MS = 25_000;
const IDLE_RESET_MS = 2_000;
const RETRY_BASE_MS = 5_000;
const RETRY_MAX_MS = 60_000;
const LOCKED_RETRY_MS = 30_000;

function isDataDirty(a: AutoSaveData, b: AutoSaveData): boolean {
  // Compare the serialized string fields only — they change on every edit
  // (html even for pure formatting changes) and are far cheaper than a full
  // JSON.stringify of the ProseMirror tree on every keystroke.
  return (
    a.date !== b.date ||
    a.title !== b.title ||
    a.mood !== b.mood ||
    a.contentHtml !== b.contentHtml ||
    a.contentText !== b.contentText
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Request timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function useAutoSave(
  data: AutoSaveData,
  debounceMs = 1500,
  enabled = true,
) {
  const queryClient = useQueryClient();
  const { isClientEncrypted, masterKey } = useEncryption();
  const [status, setStatus] = useState<SaveStatus>("idle");

  // Always-current payload + configuration for async closures
  const latestDataRef = useRef(data);
  const enabledRef = useRef(enabled);

  // Newest payload of the PREVIOUS render. When the date changes, React has
  // already replaced `latestDataRef` with the new date's data — this keeps
  // the old date's last known content around long enough to flush it.
  const prevDataRef = useRef<AutoSaveData>(data);
  const pendingFlushRef = useRef<AutoSaveData | null>(null);

  // Single-flight state machine
  const baselineRef = useRef<AutoSaveData | null>(null);
  const lastDateRef = useRef(data.date);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  const retryAttemptRef = useRef(0);
  const unmountedRef = useRef(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightSaveRef = useRef<Promise<void> | null>(null);

  // Latest-callback refs so timers/effects always invoke the most recent closure
  // (e.g. after the master key changes on unlock) without re-binding listeners.
  const runSaveRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const scheduleSaveRef = useRef<() => void>(() => {});
  const flushStaleDateEditsRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (prevDataRef.current.date !== data.date) {
      // The date is switching: capture the previous date's newest payload
      // (including keystrokes still inside the debounce windows) so the
      // state reset below can flush it instead of dropping it.
      pendingFlushRef.current = prevDataRef.current;
    }
    prevDataRef.current = data;
    latestDataRef.current = data;
  }, [data]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const clearDebounceTimer = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  };

  const clearRetryTimer = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const clearIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  };

  const clearAllTimers = () => {
    clearDebounceTimer();
    clearRetryTimer();
    clearIdleTimer();
  };

  const scheduleIdleReset = () => {
    clearIdleTimer();
    idleTimerRef.current = setTimeout(() => {
      if (!dirtyRef.current && !savingRef.current) {
        setStatus("idle");
      }
    }, IDLE_RESET_MS);
  };

  // Persist the given payload to the local encrypted store. Throws when the
  // write fails — the local store is the source of truth, so a failure means
  // the entry is not yet safe.
  const persistLocalCache = async (
    payload: AutoSaveData,
    wordCount: number,
    updatedAt: string | Date,
  ) => {
    if (!masterKey) {
      throw new Error("Master key unavailable for local persist");
    }
    await diaryCacheService.saveLocalDocument(
      payload.date,
      payload.title,
      payload.mood,
      payload.contentHtml,
      payload.contentText,
      payload.contentJson,
      masterKey,
    );
    await diaryCacheService.saveLocalMetadata(
      payload.date,
      payload.title,
      payload.contentText,
      wordCount,
      payload.mood,
      updatedAt,
      masterKey,
    );
  };

  // Enqueue a cloud push for the given date. The queue is keyed by date, so
  // only the newest content per date is ever pushed.
  const enqueuePendingSync = async (
    payload: AutoSaveData,
    wordCount: number,
  ) => {
    if (!masterKey) {
      throw new Error("Master key unavailable for sync queue");
    }
    await diaryCacheService.enqueueOfflineSync(
      payload.date,
      {
        date: payload.date,
        title: payload.title,
        mood: payload.mood,
        contentHtml: payload.contentHtml,
        contentText: payload.contentText,
        contentJson: payload.contentJson,
        wordCount,
      },
      masterKey,
    );
  };

  const persist = async (payload: AutoSaveData): Promise<PersistOutcome> => {
    const userLocalToday = getLocalDateString();
    const wordCount = payload.contentText.split(/\s+/).filter(Boolean).length;

    // Security: never send plaintext when encryption is enabled but key is missing
    if (isClientEncrypted && !masterKey) {
      return "locked";
    }

    let titlePayload = payload.title;
    let htmlPayload = payload.contentHtml;
    let textPayload = payload.contentText;
    let jsonPayload: unknown = payload.contentJson;

    if (isClientEncrypted && masterKey) {
      try {
        const jsonStr =
          typeof payload.contentJson === "string"
            ? payload.contentJson
            : JSON.stringify(payload.contentJson);
        titlePayload = await encryptText(payload.title, masterKey);
        htmlPayload = await encryptText(payload.contentHtml, masterKey);
        textPayload = await encryptText(payload.contentText, masterKey);
        jsonPayload = await encryptText(jsonStr, masterKey);
      } catch (err) {
        console.error("Auto-save encryption failed:", err);
        return "error";
      }
    }

    // Local-first: write to the encrypted local store, then sync to the cloud
    // in the background. The entry is safe the moment it lands locally.
    if (isClientEncrypted && masterKey) {
      const savedAt = new Date();
      try {
        await persistLocalCache(payload, wordCount, savedAt);
        await enqueuePendingSync(payload, wordCount);
      } catch (err) {
        console.error("Auto-save local persist failed:", err);
        return "error";
      }
      journalSyncService.markPending(payload.date);
      void journalSyncService.requestPush(masterKey);
      return "saved";
    }

    // Legacy path (no client encryption): direct network save.
    try {
      const result = await withTimeout(
        saveEntryAction(
          {
            date: payload.date,
            title: titlePayload,
            mood: payload.mood,
            contentHtml: htmlPayload,
            contentText: textPayload,
            contentJson: jsonPayload,
            wordCount,
          },
          userLocalToday,
        ),
        SAVE_TIMEOUT_MS,
      );

      if (result.success && result.data) {
        return "saved";
      }

      if (result.error === "Locked") {
        return "locked";
      }

      return "error";
    } catch (err) {
      console.warn("Failed to reach server, will retry:", err);
      return "error";
    }
  };

  const runSave = async () => {
    if (savingRef.current) {
      pendingRef.current = true;
      return;
    }
    if (!enabledRef.current || !dirtyRef.current || !baselineRef.current)
      return;

    // Security: never attempt a save when encryption is enabled but the key is missing
    if (isClientEncrypted && !masterKey) {
      if (!unmountedRef.current) setStatus("locked");
      return;
    }

    savingRef.current = true;
    if (!unmountedRef.current) setStatus("saving");

    // Clear debounce timer since we're now actually saving
    clearDebounceTimer();

    const payload = { ...latestDataRef.current };
    // Reset retry counter on a fresh save attempt (not a retry)
    retryAttemptRef.current = 0;

    const exec = (async () => {
      try {
        const outcome = await persist(payload);

        if (outcome === "saved") {
          if (payload.date === lastDateRef.current) {
            // Only the current date's save may touch the session baseline: a
            // save for a previous date completing after navigation must not
            // arm the new date's dirty state with mixed content.
            baselineRef.current = payload;
            // If the user typed while this save was in flight, keep it dirty
            // so the follow-up save (or the pending debounce) persists the
            // newest content.
            dirtyRef.current = isDataDirty(latestDataRef.current, payload);
          } else {
            dirtyRef.current = false;
          }
          retryAttemptRef.current = 0;
          if (!unmountedRef.current) {
            setStatus("saved");
            scheduleIdleReset();
            queryClient.invalidateQueries({ queryKey: ["entries"] });
          }
        } else if (outcome === "locked") {
          // Keep dirty so we retry once the session is unlocked again.
          if (!unmountedRef.current) {
            setStatus("locked");
            clearRetryTimer();
            retryTimerRef.current = setTimeout(() => {
              void runSaveRef.current();
            }, LOCKED_RETRY_MS);
          }
        } else {
          // Local persist failure (encrypted) or server error (legacy): keep
          // dirty and retry with capped exponential backoff.
          if (!unmountedRef.current) {
            setStatus("error");
            retryAttemptRef.current += 1;
            const delay = Math.min(
              RETRY_BASE_MS * 2 ** Math.max(retryAttemptRef.current - 1, 0),
              RETRY_MAX_MS,
            );
            clearRetryTimer();
            retryTimerRef.current = setTimeout(() => {
              void runSaveRef.current();
            }, delay);
          }
        }
      } finally {
        savingRef.current = false;
        inflightSaveRef.current = null;
        if (pendingRef.current) {
          pendingRef.current = false;
          void runSaveRef.current();
        }
      }
    })();
    inflightSaveRef.current = exec;
  };

  const scheduleSave = () => {
    clearDebounceTimer();
    clearRetryTimer();
    // Reset retry counter when the user makes new changes
    retryAttemptRef.current = 0;
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void runSaveRef.current();
    }, debounceMs);
  };

  // Flush unsaved edits belonging to the PREVIOUS date before the state reset
  // drops them. Local-first persist keyed by the old date — it never blocks
  // navigation on a network round-trip. Waits out any in-flight save first so
  // two write chains never race the same date's stores.
  const flushStaleDateEdits = () => {
    const stale = pendingFlushRef.current;
    pendingFlushRef.current = null;
    if (!stale || !dirtyRef.current || !enabledRef.current) return;

    void (async () => {
      const inflight = inflightSaveRef.current;
      if (inflight) await inflight.catch(() => {});
      try {
        const outcome = await persist(stale);
        if (outcome === "error") {
          console.warn(`Failed to flush pending edits for ${stale.date}`);
        }
      } catch (err) {
        console.error(`Failed to flush pending edits for ${stale.date}:`, err);
      }
    })();
  };

  // Keep the latest closures available to timers and effects.
  useEffect(() => {
    runSaveRef.current = runSave;
    scheduleSaveRef.current = scheduleSave;
    flushStaleDateEditsRef.current = flushStaleDateEdits;
  });

  // Establish/reset the baseline and track dirtiness
  useEffect(() => {
    if (data.date !== lastDateRef.current) {
      // Persist the previous date's pending edits BEFORE resetting state —
      // clearing timers here used to silently drop up to ~1.9s of typing
      // (debounce + snapshot windows) from both local store and cloud.
      flushStaleDateEditsRef.current();
      lastDateRef.current = data.date;
      baselineRef.current = null;
      dirtyRef.current = false;
      pendingRef.current = false;
      retryAttemptRef.current = 0;
      clearAllTimers();
      if (!unmountedRef.current) setStatus("idle");
    }

    if (!enabled || !baselineRef.current) {
      if (enabled) {
        baselineRef.current = { ...data };
        dirtyRef.current = false;
      }
      return;
    }

    if (isDataDirty(data, baselineRef.current)) {
      dirtyRef.current = true;
      scheduleSaveRef.current();
    } else {
      dirtyRef.current = false;
      clearDebounceTimer();
      clearRetryTimer();
    }
  }, [data, enabled, debounceMs]);

  // Flush any in-flight debounce when the tab is hidden or the page unloads.
  // Local-first: this writes to IndexedDB (fast) and enqueues a push — it never
  // blocks unload on a server round-trip.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void runSaveRef.current();
      }
    };
    const handlePageHide = () => {
      void runSaveRef.current();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);

  // Track enabled state for async closures
  useEffect(() => {
    enabledRef.current = enabled;
  });

  // Flush pending edits the moment the key arrives (e.g. after an auto-lock
  // was lifted) instead of waiting out the 30s locked-retry timer.
  const prevMasterKeyRef = useRef(masterKey);
  useEffect(() => {
    if (masterKey && !prevMasterKeyRef.current && dirtyRef.current) {
      void runSaveRef.current();
    }
    prevMasterKeyRef.current = masterKey;
  }, [masterKey]);

  // Clean up timers when enabled changes
  useEffect(() => {
    if (!enabled) {
      clearAllTimers();
    }
  }, [enabled]);

  // Best-effort flush of unsaved changes on unmount
  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      clearAllTimers();
      if (dirtyRef.current && enabledRef.current && baselineRef.current) {
        void runSaveRef.current();
      }
    };
  }, []);

  return status;
}
