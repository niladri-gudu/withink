import { deriveKeyViaBridge } from "./crypto-webview";
import { deriveKeyFromPasswordImpl as deriveNoble } from "./pbkdf2-pure";

/**
 * Prefer the native WebCrypto KDF (hidden WebView); fall back to the audited
 * pure-JS implementation if WebCrypto is unavailable.
 */
export async function deriveKeyFromPasswordImpl(
  password: string,
  saltHex: string,
  iterations: number,
): Promise<Uint8Array> {
  try {
    return await deriveKeyViaBridge(password, saltHex, iterations);
  } catch {
    return await deriveNoble(password, saltHex, iterations);
  }
}
