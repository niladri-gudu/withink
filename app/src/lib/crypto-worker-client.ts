// Web Worker key derivation offloader for Zero-Knowledge Sanctuary master key derivation
// Keeps main thread at 60fps on password check/unlock

import { deriveKeyFromPassword } from "./crypto-client";

const workerCode = `
  self.onmessage = async (e) => {
    const { id, password, saltHex, iterations } = e.data;
    try {
      const encoder = new TextEncoder();
      const passwordBytes = encoder.encode(password);
      
      // Convert saltHex to Uint8Array
      const bytes = new Uint8Array(saltHex.length / 2);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(saltHex.substring(i * 2, i * 2 + 2), 16);
      }

      // Import base password key
      const baseKey = await self.crypto.subtle.importKey(
        "raw",
        passwordBytes,
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
      );

      // Derive key
      const derivedKey = await self.crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: bytes,
          iterations,
          hash: "SHA-256",
        },
        baseKey,
        {
          name: "AES-GCM",
          length: 256,
        },
        true, // extractable
        ["encrypt", "decrypt"]
      );

      self.postMessage({ id, success: true, key: derivedKey });
    } catch (err) {
      self.postMessage({ id, success: false, error: err.message || "Worker KDF derivation failed" });
    }
  };
`;

let workerInstance: Worker | null = null;
const pendingPromises = new Map<
  string,
  { resolve: (key: CryptoKey) => void; reject: (err: Error) => void }
>();
let messageCounter = 0;

function getWorker(): Worker | null {
  if (typeof window === "undefined") return null;
  if (!workerInstance) {
    try {
      const blob = new Blob([workerCode], { type: "application/javascript" });
      workerInstance = new Worker(URL.createObjectURL(blob));
      workerInstance.onmessage = (e) => {
        const { id, success, key, error } = e.data;
        const promise = pendingPromises.get(id);
        if (promise) {
          pendingPromises.delete(id);
          if (success && key) {
            promise.resolve(key);
          } else {
            promise.reject(new Error(error || "Worker KDF execution failed"));
          }
        }
      };
    } catch (err) {
      console.warn("Failed to initialize KDF Web Worker:", err);
      return null;
    }
  }
  return workerInstance;
}

/**
 * Derives a CryptoKey from a password and salt on a background thread.
 * Falls back to main thread derivation if Web Workers are not supported.
 */
export async function deriveKeyFromPasswordAsync(
  password: string,
  saltHex: string,
  iterations = 100000
): Promise<CryptoKey> {
  const worker = getWorker();
  if (!worker) {
    // Fallback to main thread execution
    return await deriveKeyFromPassword(password, saltHex, iterations);
  }

  messageCounter++;
  const id = `kdf-${messageCounter}`;

  return new Promise<CryptoKey>((resolve, reject) => {
    pendingPromises.set(id, { resolve, reject });
    worker.postMessage({ id, password, saltHex, iterations });
  });
}
