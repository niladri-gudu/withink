"use client";

import * as React from "react";
import {
  deriveKeyFromPassword,
  decryptText,
  importKeyFromHex,
  exportKeyToHex,
  hexToBytes,
  bytesToHex,
  deriveKeyFromPassword as derivePasscodeKey
} from "@/lib/crypto-client";

interface EncryptionSettings {
  isClientEncrypted: boolean;
  encryptionSalt: string;
  verificationCiphertext: string;
}

interface EncryptionContextType {
  masterKey: CryptoKey | null;
  isClientEncrypted: boolean;
  encryptionSalt: string;
  verificationCiphertext: string;
  isUnlocked: boolean;
  isPromptOpen: boolean;
  setPromptOpen: (open: boolean) => void;
  setEncryptionSettings: (settings: EncryptionSettings) => void;
  unlockWithPassword: (password: string) => Promise<boolean>;
  unlockWithPin: (pin: string, encryptedMasterKeyHex: string) => Promise<boolean>;
  lock: () => void;
}

const EncryptionContext = React.createContext<EncryptionContextType | undefined>(undefined);

export function EncryptionProvider({ children }: { children: React.ReactNode }) {
  const [masterKey, setMasterKey] = React.useState<CryptoKey | null>(null);
  const [isClientEncrypted, setIsClientEncrypted] = React.useState(false);
  const [encryptionSalt, setEncryptionSalt] = React.useState("");
  const [verificationCiphertext, setVerificationCiphertext] = React.useState("");
  const [isPromptOpen, setPromptOpen] = React.useState(false);

  const isUnlocked = React.useMemo(() => {
    if (!isClientEncrypted) return true;
    return masterKey !== null;
  }, [isClientEncrypted, masterKey]);

  // Attempt to restore master key from sessionStorage or localStorage on load
  React.useEffect(() => {
    const restoreKey = async () => {
      const storedKeyHex = localStorage.getItem("withink_master_key") || sessionStorage.getItem("withink_master_key");
      if (storedKeyHex && isClientEncrypted) {
        try {
          const key = await importKeyFromHex(storedKeyHex);
          setMasterKey(key);
        } catch (e) {
          console.error("Failed to restore master key", e);
          sessionStorage.removeItem("withink_master_key");
          localStorage.removeItem("withink_master_key");
        }
      }
    };
    if (isClientEncrypted) {
      restoreKey();
    }
  }, [isClientEncrypted]);

  const setEncryptionSettings = React.useCallback((settings: EncryptionSettings) => {
    setIsClientEncrypted(settings.isClientEncrypted);
    setEncryptionSalt(settings.encryptionSalt);
    setVerificationCiphertext(settings.verificationCiphertext);
  }, []);

  const unlockWithPassword = React.useCallback(
    async (password: string): Promise<boolean> => {
      if (!encryptionSalt || !verificationCiphertext) {
        console.error("Encryption settings not loaded");
        return false;
      }

      try {
        // 1. Derive the temporary key from the Sanctuary Password + Salt
        const passwordKey = await deriveKeyFromPassword(password, encryptionSalt);

        // 2. Try to decrypt the verification ciphertext (which yields the Master Key hex)
        const decryptedMasterKeyHex = await decryptText(verificationCiphertext, passwordKey);

        // 3. Import decrypted master key hex as the real CryptoKey
        const key = await importKeyFromHex(decryptedMasterKeyHex);
        setMasterKey(key);

        // 4. Cache it in sessionStorage for persistence across page refreshes
        sessionStorage.setItem("withink_master_key", decryptedMasterKeyHex);

        // 5. Cache in localStorage if PIN lock is not enabled
        const isLockEnabled = localStorage.getItem("withink_lock_enabled") === "true";
        if (!isLockEnabled) {
          localStorage.setItem("withink_master_key", decryptedMasterKeyHex);
        } else {
          localStorage.removeItem("withink_master_key");
        }

        setPromptOpen(false);
        return true;
      } catch (err) {
        console.error("Incorrect Sanctuary Password", err);
        return false;
      }
    },
    [encryptionSalt, verificationCiphertext]
  );

  const unlockWithPin = React.useCallback(
    async (pin: string, encryptedMasterKeyHex: string): Promise<boolean> => {
      if (!encryptionSalt) {
        console.error("Encryption settings not loaded");
        return false;
      }

      try {
        // 1. Derive the Passcode Key from the 4-digit PIN + Salt
        // Using iterations = 50000 for faster pin verification
        const pinKey = await derivePasscodeKey(pin, encryptionSalt, 50000);

        // 2. Decrypt the Master Key hex from localStorage
        const decryptedMasterKeyHex = await decryptText(encryptedMasterKeyHex, pinKey);

        // 3. Import decrypted master key hex as the CryptoKey
        const key = await importKeyFromHex(decryptedMasterKeyHex);
        setMasterKey(key);

        // 4. Cache in sessionStorage
        sessionStorage.setItem("withink_master_key", decryptedMasterKeyHex);

        // 5. Clean up raw key in localStorage if lock is enabled
        localStorage.removeItem("withink_master_key");

        setPromptOpen(false);
        return true;
      } catch (err) {
        console.error("PIN Decryption failed", err);
        return false;
      }
    },
    [encryptionSalt]
  );

  const lock = React.useCallback(() => {
    setMasterKey(null);
    sessionStorage.removeItem("withink_master_key");
    localStorage.removeItem("withink_master_key");
  }, []);

  return (
    <EncryptionContext.Provider
      value={{
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
      }}
    >
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
