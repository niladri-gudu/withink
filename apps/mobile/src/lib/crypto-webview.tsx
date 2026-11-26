import { useEffect, useRef, type ComponentRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

/**
 * Hidden WebView that exposes native WebCrypto PBKDF2.
 *
 * Hermes has no SubtleCrypto, and a 600k-iteration PBKDF2 in pure JS takes
 * minutes. Android WebView's WebCrypto runs in native code, so the password
 * and salt are sent to a local (no-network) page and only the derived key hex
 * comes back. AES-GCM and HKDF stay in the audited pure-JS implementation.
 */

const BRIDGE_HTML = `<!doctype html>
<html>
<head><meta charset="utf-8" /></head>
<body>
<script>
  var hexToBytes = function (hex) {
    var match = hex.match(/../g) || [];
    return Uint8Array.from(match, function (byte) { return parseInt(byte, 16); });
  };
  var bytesToHex = function (bytes) {
    return Array.from(new Uint8Array(bytes), function (byte) {
      return byte.toString(16).padStart(2, "0");
    }).join("");
  };
  window.__withinkPbkdf2 = async function (message) {
    try {
      if (!window.crypto || !window.crypto.subtle) {
        throw new Error("WebCrypto unavailable");
      }
      var baseKey = await window.crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(message.password),
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
      );
      var bits = await window.crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt: hexToBytes(message.saltHex),
          iterations: message.iterations,
          hash: "SHA-256"
        },
        baseKey,
        256
      );
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ id: message.id, result: bytesToHex(bits) })
      );
    } catch (error) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ id: message.id, error: String(error) })
      );
    }
  };
  window.ReactNativeWebView.postMessage(JSON.stringify({ ready: true }));
</script>
</body>
</html>`;

const KDF_TIMEOUT_MS = 120_000;
const READY_TIMEOUT_MS = 15_000;

type Pending = {
  resolve: (hex: string) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

let webView: ComponentRef<typeof WebView> | null = null;
let isReady = false;
let nextId = 0;
const pending = new Map<number, Pending>();
let readyWaiters: { resolve: () => void; reject: (e: Error) => void }[] = [];

function markReady(): void {
  isReady = true;
  const waiters = readyWaiters;
  readyWaiters = [];
  for (const waiter of waiters) waiter.resolve();
}

function waitForReady(): Promise<void> {
  if (isReady) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      readyWaiters = readyWaiters.filter((waiter) => waiter.resolve !== resolve);
      reject(new Error("Crypto bridge did not start."));
    }, READY_TIMEOUT_MS);
    readyWaiters.push({
      resolve: () => {
        clearTimeout(timer);
        resolve();
      },
      reject,
    });
  });
}

function onBridgeMessage(event: { nativeEvent: { data: string } }): void {
  try {
    const data = JSON.parse(event.nativeEvent.data) as {
      ready?: boolean;
      id?: number;
      result?: string;
      error?: string;
    };
    if (data.ready) {
      markReady();
      return;
    }
    if (typeof data.id !== "number") return;

    const entry = pending.get(data.id);
    if (!entry) return;
    pending.delete(data.id);
    clearTimeout(entry.timer);

    if (data.error) entry.reject(new Error(data.error));
    else if (typeof data.result === "string") entry.resolve(data.result);
    else entry.reject(new Error("Crypto bridge returned no result."));
  } catch {
    // Ignore malformed bridge messages.
  }
}

export function CryptoWebViewHost() {
  const ref = useRef<ComponentRef<typeof WebView>>(null);

  useEffect(() => {
    webView = ref.current;
    return () => {
      webView = null;
      isReady = false;
    };
  }, []);

  return (
    <View pointerEvents="none" style={styles.hidden}>
      <WebView
        ref={ref}
        cacheEnabled={false}
        javaScriptEnabled
        onMessage={onBridgeMessage}
        originWhitelist={["*"]}
        source={{ html: BRIDGE_HTML, baseUrl: "https://localhost" }}
      />
    </View>
  );
}

export async function deriveKeyViaBridge(
  password: string,
  saltHex: string,
  iterations: number,
): Promise<Uint8Array> {
  await waitForReady();
  if (!webView) throw new Error("Crypto bridge is not mounted.");

  const id = ++nextId;
  const resultHex = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("Key derivation timed out."));
    }, KDF_TIMEOUT_MS);
    pending.set(id, { resolve, reject, timer });

    const message = JSON.stringify({ id, password, saltHex, iterations });
    webView?.injectJavaScript(
      `window.__withinkPbkdf2(${message}); true;`,
    );
  });

  const bytes = new Uint8Array(resultHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(resultHex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

const styles = StyleSheet.create({
  hidden: { position: "absolute", width: 1, height: 1, opacity: 0 },
});
