import { requireOptionalNativeModule } from "expo-modules-core";

interface NativePbkdf2Module {
  pbkdf2Sha256(
    password: string,
    saltHex: string,
    iterations: number,
  ): Promise<string>;
}

const nativeModule =
  requireOptionalNativeModule<NativePbkdf2Module>("WithinkCrypto");

/**
 * Known-answer vector computed with Node's `crypto.pbkdf2Sync` (SHA-256).
 * A platform build that disagrees with it must never derive real keys, so the
 * wrapper reports the module as unavailable and the caller falls back.
 */
const SELF_TEST = {
  password: "withink-kdf-self-test",
  saltHex: "00112233445566778899aabbccddeeff",
  iterations: 2,
  expected: "4917bc0f29b8c8c2fae237fd4e17c7e2e188f5bc30ae92a6f055b00a4f664420",
};

let selfTest: Promise<boolean> | null = null;

function verifyNativeModule(): Promise<boolean> {
  if (!nativeModule) return Promise.resolve(false);

  let pending = selfTest;
  if (!pending) {
    pending = nativeModule
      .pbkdf2Sha256(SELF_TEST.password, SELF_TEST.saltHex, SELF_TEST.iterations)
      .then((hex) => hex === SELF_TEST.expected)
      .catch(() => false);
    selfTest = pending;
  }
  return pending;
}

export function hasNativePbkdf2Module(): boolean {
  return nativeModule != null;
}

/**
 * Derives a 32-byte key as hex on a native thread. Returns `null` when the
 * module is missing (Expo Go) or fails its self-test, so the caller can use the
 * WebView bridge or the pure-JS fallback.
 */
export async function deriveKeyHexNatively(
  password: string,
  saltHex: string,
  iterations: number,
): Promise<string | null> {
  const module = nativeModule;
  if (!module || !(await verifyNativeModule())) return null;
  return module.pbkdf2Sha256(password, saltHex, iterations);
}

/** Test seam: forget the memoized self-test result. */
export function resetNativePbkdf2ForTests(): void {
  selfTest = null;
}
