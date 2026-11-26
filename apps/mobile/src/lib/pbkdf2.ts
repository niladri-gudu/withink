/**
 * Node/test implementation. Metro resolves `pbkdf2.native.ts` on devices,
 * which uses native WebCrypto and falls back here if the bridge is
 * unavailable.
 */
export { deriveKeyFromPasswordImpl } from "./pbkdf2-pure";
