export function CryptoWebViewHost() {
  return null;
}

export async function deriveKeyViaBridge(): Promise<Uint8Array> {
  throw new Error("Crypto bridge is native-only.");
}
