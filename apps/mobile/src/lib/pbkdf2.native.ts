import { hexToBytes } from "@withink/core/encoding";

import { deriveKeyHexNatively } from "../../modules/withink-crypto/src";
import { deriveKeyViaBridge } from "./crypto-webview";
import { deriveKeyFromPasswordImpl as deriveNoble } from "./pbkdf2-pure";

declare const __DEV__: boolean;

let announcedNative = false;

/**
 * Prefer the native PBKDF2 module (development and release builds). Expo Go
 * cannot load custom native code, so fall back to the hidden WebView's
 * WebCrypto and finally to the audited pure-JS implementation.
 *
 * The native module is self-tested against a known-answer vector before it is
 * trusted, so a broken platform build degrades to the fallbacks instead of
 * deriving different keys.
 */
export async function deriveKeyFromPasswordImpl(
  password: string,
  saltHex: string,
  iterations: number,
): Promise<Uint8Array> {
  try {
    const nativeHex = await deriveKeyHexNatively(password, saltHex, iterations);
    if (nativeHex) {
      if (__DEV__ && !announcedNative) {
        announcedNative = true;
        console.info("[withink] PBKDF2 via native module");
      }
      return hexToBytes(nativeHex);
    }
  } catch {
    // Fall through to the WebView bridge.
  }

  try {
    return await deriveKeyViaBridge(password, saltHex, iterations);
  } catch {
    return await deriveNoble(password, saltHex, iterations);
  }
}
