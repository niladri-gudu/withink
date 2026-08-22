"use client";

import * as React from "react";

import { decryptText, importKeyFromHex } from "@/lib/crypto-client";
import { deriveKeyFromPasswordAsync } from "@/lib/crypto-worker-client";
import { diaryCacheService } from "@/features/journal/services/diary-cache-service";
import { journalSyncService } from "@/features/journal/services/journal-sync-service";
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
  unlockWithPassword: (password: string) => Promise<boolean>;
  unlockWithPin: (
    pin: string,
    encryptedMasterKeyHex: string,
  ) => Promise<boolean>;
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
  const [masterKey, setMasterKey] = React.useState<CryptoKey | null>(null);
  const [isClientEncrypted, setIsClientEncrypted] = React.useState(false);
  const [encryptionSalt, setEncryptionSalt] = React.useState("");
  const [verificationCiphertext, setVerificationCiphertext] =
    React.useState("");
  const [isPromptOpen, setPromptOpen] = React.useState(false);

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
        setMasterKey(key);

        // Set the server-side unlock cookie best-effort and non-blocking so the
        // UI reveals instantly instead of waiting on a network round-trip. If
        // the cookie fails to set, this session still works (the key is in
        // memory) and the next page load simply asks to unlock again.
        void import("@/features/lock/actions/lock-actions")
          .then(({ unlockSessionAction }) => unlockSessionAction())
          .catch((err) => {
            console.error("Failed to set unlock session cookie:", err);
          });

        setPromptOpen(false);
        return true;
      } catch (err) {
        console.error("Incorrect Diary Password", err);
        return false;
      }
    },
    [encryptionSalt, verificationCiphertext],
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
        setMasterKey(key);

        // Plaintext key caching is removed.

        setPromptOpen(false);
        return true;
      } catch (err) {
        console.error("PIN Decryption failed", err);
        return false;
      }
    },
    [encryptionSalt],
  );

  const lock = React.useCallback(() => {
    setMasterKey(null);
    // Release decrypted plaintext held for instant local search and the media
    // lightbox.
    diaryCacheService.clearTimelineCache();
    clearMediaEntryCache();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("withink_master_key");
      localStorage.removeItem("withink_master_key");
    }
  }, []);

  const clearLocalMasterKey = React.useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("withink_encrypted_master_key");
      sessionStorage.removeItem("withink_master_key");
      localStorage.removeItem("withink_master_key");
    }
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
      isUnlocked,
      isPromptOpen,
      setPromptOpen,
      setEncryptionSettings,
      unlockWithPassword,
      unlockWithPin,
      lock,
      clearLocalMasterKey,
    }),
    [
      masterKey,
      isClientEncrypted,
      encryptionSalt,
      verificationCiphertext,
      isUnlocked,
      isPromptOpen,
      setPromptOpen,
      setEncryptionSettings,
      unlockWithPassword,
      unlockWithPin,
      lock,
      clearLocalMasterKey,
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
