// Off-thread PBKDF2 key derivation using a Web Worker, so 50k–100k iteration
// KDF runs never block the main thread. Falls back to the main thread when
// workers are unavailable (older browsers, strict CSP, non-browser contexts).

import { bytesToHex, importKeyFromHex } from "./crypto-client";
import { deriveKeyFromPassword } from "./crypto-client";

const workerCode = `
  function hexToBytes(hex) {
    if (!hex) return new Uint8Array(0);
    if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
      throw new Error("Invalid hex string");
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  self.onmessage = async (e) => {
    const { id, password, saltHex, iterations } = e.data;
    try {
      const passwordBytes = new TextEncoder().encode(password);
      const saltBytes = hexToBytes(saltHex);

      const baseKey = await crypto.subtle.importKey(
        "raw",
        passwordBytes,
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
      );

      const bits = await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt: saltBytes,
          iterations: iterations || 100000,
          hash: "SHA-256"
        },
        baseKey,
        256
      );

      self.postMessage({ id, success: true, bytes: bits }, [bits]);
    } catch (err) {
      self.postMessage({
        id,
        success: false,
        error: (err && err.message) || "KDF derivation failed"
      });
    }
  };
`;

const KDF_TIMEOUT_MS = 15_000;

let workerInstance: Worker | null = null;
const pendingPromises = new Map<
  string,
  { resolve: (bytes: ArrayBuffer) => void; reject: (err: Error) => void }
>();
let messageCounter = 0;

function getWorker(): Worker | null {
  if (typeof window === "undefined") return null;
  if (typeof Worker === "undefined") return null;
  if (!workerInstance) {
    try {
      const blob = new Blob([workerCode], { type: "application/javascript" });
      workerInstance = new Worker(URL.createObjectURL(blob));
      workerInstance.onmessage = (e) => {
        const { id, success, bytes, error } = e.data;
        const promise = pendingPromises.get(id);
        if (promise) {
          pendingPromises.delete(id);
          if (success && bytes) {
            promise.resolve(bytes);
          } else {
            promise.reject(new Error(error || "Worker KDF derivation failed"));
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
 * Derives an AES-GCM-256 CryptoKey from a password and salt using PBKDF2.
 * Runs in a Web Worker off the main thread; falls back to the main thread.
 */
export async function deriveKeyFromPasswordAsync(
  password: string,
  saltHex: string,
  iterations = 100000,
): Promise<CryptoKey> {
  const worker = getWorker();
  if (worker) {
    try {
      const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
        messageCounter++;
        const id = `kdf-msg-${messageCounter}`;

        const timer = setTimeout(() => {
          pendingPromises.delete(id);
          reject(new Error("KDF derivation timed out"));
        }, KDF_TIMEOUT_MS);

        pendingPromises.set(id, {
          resolve: (value) => {
            clearTimeout(timer);
            resolve(value);
          },
          reject: (err) => {
            clearTimeout(timer);
            reject(err);
          },
        });

        worker.postMessage({ id, password, saltHex, iterations });
      });

      return await importKeyFromHex(bytesToHex(new Uint8Array(bytes)));
    } catch (err) {
      console.warn(
        "KDF worker derivation failed, falling back to main thread:",
        err,
      );
    }
  }

  return await deriveKeyFromPassword(password, saltHex, iterations);
}
