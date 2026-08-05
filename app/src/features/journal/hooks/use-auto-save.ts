import { useEffect, useRef, useState } from "react";
import { saveEntryAction } from "../actions/entry-actions";
import { getLocalDateString } from "@/lib/utils/date";
import { useQueryClient } from "@tanstack/react-query";
import { useEncryption } from "@/providers/encryption-provider";
import { encryptText } from "@/lib/crypto-client";
import { sanctuaryCacheService } from "../services/sanctuary-cache-service";

export type SaveStatus = "idle" | "saving" | "saved" | "offline" | "error" | "locked";

interface AutoSaveData {
  date: string;
  title: string;
  mood: number | null;
  contentHtml: string;
  contentText: string;
  contentJson: unknown;
}

type PersistOutcome = "synced" | "offline" | "locked" | "error";

const SAVE_TIMEOUT_MS = 25_000;
const IDLE_RESET_MS = 2_000;
const RETRY_BASE_MS = 5_000;
const RETRY_MAX_MS = 60_000;
const LOCKED_RETRY_MS = 30_000;

function isDataDirty(a: AutoSaveData, b: AutoSaveData): boolean {
  return (
    a.date !== b.date ||
    a.title !== b.title ||
    a.mood !== b.mood ||
    a.contentHtml !== b.contentHtml ||
    a.contentText !== b.contentText ||
    JSON.stringify(a.contentJson) !== JSON.stringify(b.contentJson)
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

  // Latest-callback refs so timers/effects always invoke the most recent closure
  // (e.g. after the master key changes on unlock) without re-binding listeners.
  const runSaveRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const scheduleSaveRef = useRef<() => void>(() => {});

  useEffect(() => {
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

  // Persist the given payload to the local encrypted cache (no-op when not encrypted)
  const persistLocalCache = async (
    payload: AutoSaveData,
    wordCount: number,
    updatedAt: string | Date,
  ) => {
    if (!isClientEncrypted || !masterKey) return;
    try {
      await sanctuaryCacheService.saveLocalDocument(
        payload.date,
        payload.title,
        payload.mood,
        payload.contentHtml,
        payload.contentText,
        payload.contentJson,
        masterKey,
      );
      await sanctuaryCacheService.saveLocalMetadata(
        payload.date,
        payload.title,
        payload.contentText,
        wordCount,
        payload.mood,
        updatedAt,
        masterKey,
      );
    } catch (err) {
      console.error(`Failed to persist local cache for ${payload.date}:`, err);
    }
  };

  const queueOffline = async (payload: AutoSaveData, wordCount: number) => {
    if (!isClientEncrypted || !masterKey) return;
    try {
      await sanctuaryCacheService.enqueueOfflineSync(
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
    } catch (err) {
      console.error(`Failed to queue offline sync for ${payload.date}:`, err);
    }
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
        void persistLocalCache(payload, wordCount, result.data.updatedAt);
        return "synced";
      }

      if (result.error === "Locked") {
        // Keep data safe locally even while locked so nothing is lost on close.
        void persistLocalCache(payload, wordCount, new Date());
        void queueOffline(payload, wordCount);
        return "locked";
      }

      // Generic server error: still cache locally before reporting error
      void persistLocalCache(payload, wordCount, new Date());
      return "error";
    } catch (err) {
      // Network failure, server unreachable, or timeout -> queue changes locally
      console.warn("Failed to reach server, falling back to offline queue:", err);
      void persistLocalCache(payload, wordCount, new Date());
      void queueOffline(payload, wordCount);
      return isClientEncrypted && masterKey ? "offline" : "error";
    }
  };

  const runSave = async () => {
    if (savingRef.current) {
      pendingRef.current = true;
      return;
    }
    if (!enabledRef.current || !dirtyRef.current || !baselineRef.current) return;

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

    try {
      const outcome = await persist(payload);

      if (outcome === "synced" || outcome === "offline") {
        baselineRef.current = payload;
        // If the user typed while this save was in flight, keep it dirty so the
        // follow-up save (or the pending debounce) persists the newest content.
        dirtyRef.current = isDataDirty(latestDataRef.current, payload);
        retryAttemptRef.current = 0;
        if (!unmountedRef.current) {
          setStatus(outcome === "synced" ? "saved" : "offline");
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
        // Generic server error: keep dirty and retry with capped exponential backoff.
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
      if (pendingRef.current) {
        pendingRef.current = false;
        void runSaveRef.current();
      }
    }
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

  // Keep the latest closures available to timers and effects.
  useEffect(() => {
    runSaveRef.current = runSave;
    scheduleSaveRef.current = scheduleSave;
  });

  // Establish/reset the baseline and track dirtiness
  useEffect(() => {
    if (data.date !== lastDateRef.current) {
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

  // Flush any in-flight debounce when the tab is hidden or the page unloads
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
