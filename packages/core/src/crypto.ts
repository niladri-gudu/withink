/**
 * Portable crypto contracts. The web adapter implements these with WebCrypto
 * (`crypto.subtle`); the native adapter will implement them with a native
 * module. Journal and sync logic depend only on these interfaces.
 */

export interface Cipher<TKey> {
  /** Returns `<iv hex>:<ciphertext hex>`, matching the web format. */
  encryptText(plaintext: string, key: TKey): Promise<string>;
  decryptText(ciphertext: string, key: TKey): Promise<string>;
}

export interface KeyDerivation<TKey> {
  generateMasterKey(): Promise<TKey>;
  importKeyFromHex(hex: string): Promise<TKey>;
  exportKeyToHex(key: TKey): Promise<string>;
  deriveKeyFromPassword(
    password: string,
    saltHex: string,
    iterations: number,
  ): Promise<TKey>;
  /** HKDF subkey proving possession of the master key, hex-encoded. */
  deriveUnlockProofHex(key: TKey): Promise<string>;
}

export interface CryptoProvider<TKey>
  extends Cipher<TKey>,
    KeyDerivation<TKey> {}

/** A master key wrapped by a password/PIN-derived key. */
export interface WrappedMasterKey {
  saltHex: string;
  verificationCiphertext: string;
  kdfIterations: number;
}

/** A random encryption salt, hex-encoded (16 bytes / 32 chars). */
export type SaltHex = string;
