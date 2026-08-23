"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  decryptText,
  deriveUnlockProofHex,
  importKeyFromHex,
} from "@/lib/crypto-client";
import { deriveKeyFromPasswordAsync } from "@/lib/crypto-worker-client";
import { safeStorage } from "@/lib/safe-storage";
import { diaryCacheService } from "@/features/journal/services/diary-cache-service";
import { journalSyncService } from "@/features/journal/services/journal-sync-service";
import { unlockSessionAction } from "@/features/lock/actions/lock-actions";
import { clearMediaEntryCache } from "@/features/media/lib/media-entry-cache";

// Memory-only cache of derived wrapper keys keyed by `${iterations}:${saltHex}:${password}`.
// The derived key alone cannot decrypt journal content — it only unwraps the
// master key — but keeping it in memory (never persisted) makes re-unlock after
// an auto-lock within the same tab session instant, since PBKDF2 no longer
// re-runs. Cleared on page reload by design.
const derivedKeyCache = new Map<string, CryptoKey>();

async function deriveCachedKey(
  password: string,
  saltHex: string,
  iterations: number,
): Promise<CryptoKey> {
  // The password MUST be part of the key: derived keys are password-bound, so
  // keying only on (iterations, salt) would return the wrong key after any
  // earlier attempt with a different password, rejecting the correct one.
  const cacheKey = `${iterations}:${saltHex}:${password}`;
  const cached = derivedKeyCache.get(cacheKey);
  if (cached) return cached;

  const key = await deriveKeyFromPasswordAsync(password, saltHex, iterations);
  derivedKeyCache.set(cacheKey, key);
  return key;
}

function evictCachedKey(
  password: string,
  saltHex: string,
  iterations: number,
): void {
  derivedKeyCache.delete(`${iterations}:${saltHex}:${password}`);
}

function clearDerivedKeyCache(): void {
  derivedKeyCache.clear();
}

interface EncryptionSettings {
  isClientEncrypted: boolean;
  encryptionSalt: string;
  verificationCiphertext: string;
}

interface EncryptionContextType {
  masterKey: CryptoKey | null;
  setMasterKey: (key: CryptoKey | null) => void;
  isClientEncrypted: boolean;
  encryptionSalt: string;
  verificationCiphertext: string;
  isUnlocked: boolean;
  isPromptOpen: boolean;
  setPromptOpen: (open: boolean) => void;
  setEncryptionSettings: (settings: EncryptionSettings) => void;
  encryptionSettingsSeeded: boolean;
  unlockWithPassword: (password: string) => Promise<boolean>;
  unlockWithPin: (
    pin: string,
    encryptedMasterKeyHex: string,
  ) => Promise<boolean>;
  /** Derives the server unlock proof from the in-memory master key.
   *  Returns null when no key is available (locked / non-ZK session). */
  getUnlockProof: () => Promise<string | null>;
  /** True when the server has no bound unlock proof for this account and the
   *  one-time email-code binding step must complete before content streams. */
  proofBindingRequired: boolean;
  setProofBindingRequired: (required: boolean) => void;
  lock: () => void;
  clearLocalMasterKey: () => void;
}

const EncryptionContext = React.createContext<
  EncryptionContextType | undefined
>(undefined);

export function EncryptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [masterKey, setMasterKeyState] = React.useState<CryptoKey | null>(null);
  // Ref mirror of the master key so async flows that finish after a state
  // update (e.g. the PIN fast-path's background server verify) can still
  // derive the unlock proof without waiting for a re-render.
  const masterKeyRef = React.useRef<CryptoKey | null>(null);
  const setMasterKey = React.useCallback((key: CryptoKey | null) => {
    masterKeyRef.current = key;
    setMasterKeyState(key);
  }, []);
  const [isClientEncrypted, setIsClientEncrypted] = React.useState(false);
  const [encryptionSalt, setEncryptionSalt] = React.useState("");
  const [verificationCiphertext, setVerificationCiphertext] =
    React.useState("");
  const [isPromptOpen, setPromptOpen] = React.useState(false);
  // True when a diary-password unlock decrypted correctly but the server has
  // no bound unlock proof yet (accounts that enabled zero-knowledge before
  // proof binding existed). The user must complete the one-time email-code
  // upgrade before server-gated content will stream.
  const [proofBindingRequired, setProofBindingRequired] = React.useState(false);
  // Flips true the moment server-seeded settings land, so consumers can tell
  // "account is genuinely not zero-knowledge" apart from "seed hasn't run yet"
  // and avoid mounting setup/migration UI off stale defaults.
  const [encryptionSettingsSeeded, setEncryptionSettingsSeeded] =
    React.useState(false);

  const isUnlocked = React.useMemo(() => {
    if (!isClientEncrypted) return true;
    return masterKey !== null;
  }, [isClientEncrypted, masterKey]);

  // Attempt to restore master key from sessionStorage or localStorage on load is removed
  // to avoid exposing plaintext master key in browser storage.
  React.useEffect(() => {
    // Clear any legacy plaintext keys from storage
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("withink_master_key");
      localStorage.removeItem("withink_master_key");
    }
  }, []);

  // Background cloud sync when the diary is unlocked.
  // Runs on unlock, on network recovery, on tab becoming visible again,
  // and on a periodic interval (covers "server down but navigator.onLine=true").
  React.useEffect(() => {
    if (!masterKey) return;

    const runSync = () => {
      journalSyncService.requestSync(masterKey);
    };

    // Run once on unlock
    runSync();

    const handleOnline = () => {
      runSync();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        runSync();
      }
    };

    const interval = setInterval(() => {
      // Skip background sync while the tab is hidden — the visibilitychange
      // handler above runs it when the tab becomes visible again. The interval
      // is intentionally long: the pull path bails out when the server sync
      // list is unchanged, so frequent ticks would only re-run the cheap
      // fingerprint check.
      if (document.hidden) return;
      runSync();
    }, 120_000);

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [masterKey]);

  const setEncryptionSettings = React.useCallback(
    (settings: EncryptionSettings) => {
      setIsClientEncrypted(settings.isClientEncrypted);
      setEncryptionSalt(settings.encryptionSalt);
      setVerificationCiphertext(settings.verificationCiphertext);
      setEncryptionSettingsSeeded(true);
    },
    [],
  );

  const unlockWithPassword = React.useCallback(
    async (password: string): Promise<boolean> => {
      if (!encryptionSalt || !verificationCiphertext) {
        console.error("Encryption settings not loaded");
        return false;
      }

      try {
        // 1. Derive the temporary key from the Diary Password + Salt
        const passwordKey = await deriveCachedKey(
          password,
          encryptionSalt,
          100000,
        );

        // 2. Try to decrypt the verification ciphertext (which yields the Master Key hex)
        const decryptedMasterKeyHex = await decryptText(
          verificationCiphertext,
          passwordKey,
        );

        // 3. Import decrypted master key hex as the real CryptoKey
        const key = await importKeyFromHex(decryptedMasterKeyHex);
        masterKeyRef.current = key;
        setMasterKey(key);

        // Set the server-side unlock cookie best-effort and non-blocking so the
        // UI reveals instantly instead of waiting on a network round-trip. The
        // unlock proof (derived from the master key) is required — the server
        // refuses to mint the cookie without it. Once confirmed, refresh so
        // server-gated content streams in behind the reveal. The refresh is
        // deferred to the next task: calling it synchronously inside the
        // action's promise chain corrupts the router flight cache in dev
        // (enqueueModel null crash) and takes the whole app down.
        void deriveUnlockProofHex(key)
          .then((proof) => unlockSessionAction(proof))
          .then((res) => {
            if (!res.success) {
              if (res.error === "UNLOCK_PROOF_NOT_BOUND") {
                setProofBindingRequired(true);
                return;
              }
              throw new Error(res.error || "Unlock verification failed");
            }
            setTimeout(() => router.refresh(), 0);
          })
          .catch((err) => {
            console.error("Failed to set unlock session cookie:", err);
          });

        setPromptOpen(false);
        return true;
      } catch (err) {
        evictCachedKey(password, encryptionSalt, 100000);
        console.error("Incorrect Diary Password", err);
        return false;
      }
    },
    [encryptionSalt, verificationCiphertext, router, setMasterKey],
  );

  const unlockWithPin = React.useCallback(
    async (pin: string, encryptedMasterKeyHex: string): Promise<boolean> => {
      if (!encryptionSalt) {
        console.error("Encryption settings not loaded");
        return false;
      }

      try {
        // 1. Derive the Passcode Key from the 4-digit PIN + Salt
        // Using iterations = 50000 for faster PIN verification
        const pinKey = await deriveCachedKey(pin, encryptionSalt, 50000);

        // 2. Decrypt the Master Key hex from localStorage
        const decryptedMasterKeyHex = await decryptText(
          encryptedMasterKeyHex,
          pinKey,
        );

        // 3. Import decrypted master key hex as the CryptoKey
        const key = await importKeyFromHex(decryptedMasterKeyHex);
        masterKeyRef.current = key;
        setMasterKey(key);

        // Plaintext key caching is removed.

        setPromptOpen(false);
        return true;
      } catch (err) {
        evictCachedKey(pin, encryptionSalt, 50000);
        console.error("PIN Decryption failed", err);
        return false;
      }
    },
    [encryptionSalt, setMasterKey],
  );

  const getUnlockProof = React.useCallback(async (): Promise<string | null> => {
    const key = masterKeyRef.current;
    if (!key) return null;
    try {
      return await deriveUnlockProofHex(key);
    } catch {
      return null;
    }
  }, []);

  const lock = React.useCallback(() => {
    masterKeyRef.current = null;
    setMasterKey(null);
    // Release the derived wrapper keys too: they decrypt verificationCiphertext
    // straight to the master-key hex, so keeping them after lock would defeat
    // the memory-hygiene goal. Re-unlock re-runs PBKDF2 in the worker (~100ms).
    clearDerivedKeyCache();
    // Release decrypted plaintext held for instant local search and the media
    // lightbox.
    diaryCacheService.clearTimelineCache();
    clearMediaEntryCache();
    if (typeof window !== "undefined") {
      safeStorage.removeSessionItem("withink_master_key");
      safeStorage.removeItem("withink_master_key");
    }
  }, [setMasterKey]);

  const clearLocalMasterKey = React.useCallback(() => {
    safeStorage.removeItem("withink_encrypted_master_key");
    safeStorage.removeSessionItem("withink_master_key");
    safeStorage.removeItem("withink_master_key");
  }, []);

  // Memoize the context value so consumers (the app shell, sidebar, editor,
  // save indicator, media lightbox, settings) don't re-render on every provider
  // render. Without this, toggling the unlock prompt or the master key would
  // cascade re-renders through the whole consumer tree.
  const contextValue = React.useMemo<EncryptionContextType>(
    () => ({
      masterKey,
      setMasterKey,
      isClientEncrypted,
      encryptionSalt,
      verificationCiphertext,
      encryptionSettingsSeeded,
      isUnlocked,
      isPromptOpen,
      setPromptOpen,
      setEncryptionSettings,
      unlockWithPassword,
      unlockWithPin,
      getUnlockProof,
      proofBindingRequired,
      setProofBindingRequired,
      lock,
      clearLocalMasterKey,
    }),
    [
      masterKey,
      isClientEncrypted,
      encryptionSalt,
      verificationCiphertext,
      encryptionSettingsSeeded,
      isUnlocked,
      isPromptOpen,
      setPromptOpen,
      setEncryptionSettings,
      unlockWithPassword,
      unlockWithPin,
      getUnlockProof,
      proofBindingRequired,
      lock,
      clearLocalMasterKey,
      setMasterKey,
    ],
  );

  return (
    <EncryptionContext.Provider value={contextValue}>
      {children}
    </EncryptionContext.Provider>
  );
}

export function useEncryption() {
  const context = React.useContext(EncryptionContext);
  if (context === undefined) {
    throw new Error("useEncryption must be used within an EncryptionProvider");
  }
  return context;
}
