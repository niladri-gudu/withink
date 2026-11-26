// @vitest-environment node
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

import { EDITOR_HTML } from "../../../apps/mobile/src/lib/editor-webview.generated";
import { buildEditorHtml } from "../scripts/build-webview.mjs";
import { renderEditorHtml } from "./html-template";

interface BridgeMessage {
  type: string;
  id?: number;
  snapshot?: { html: string; text: string };
  state?: unknown;
}

describe("editor WebView bundle", () => {
  it("cannot be terminated early by document content", () => {
    const html = renderEditorHtml("</script><b>");
    expect(html).toContain("<\\/script><b>");
    expect(html).not.toContain("</script><b>");
  });

  it("is reproducible from source", async () => {
    expect(await buildEditorHtml()).toBe(EDITOR_HTML);
  }, 60_000);

  it("boots, loads content and acknowledges a flush", async () => {
    const messages: BridgeMessage[] = [];
    const dom = new JSDOM(EDITOR_HTML, {
      runScripts: "dangerously",
      pretendToBeVisual: true,
      beforeParse(window) {
        (window as unknown as Record<string, unknown>).ReactNativeWebView = {
          postMessage(data: string) {
            messages.push(JSON.parse(data) as BridgeMessage);
          },
        };
      },
    });

    try {
      await waitFor(() => messages.some((message) => message.type === "ready"));
      const bridge = (
        dom.window as unknown as {
          __withinkEditorReceive(message: unknown): void;
        }
      ).__withinkEditorReceive;

      bridge({
        id: 1,
        type: "setContent",
        content: { html: "<p>Hello <strong>bridge</strong></p>" },
      });
      await waitFor(() =>
        messages.some((message) => message.type === "ack" && message.id === 1),
      );

      bridge({ id: 2, type: "flush" });
      const ack = await waitFor(
        () =>
          messages.find(
            (message) => message.type === "ack" && message.id === 2,
          ),
        2_000,
      );

      expect(ack.snapshot?.html).toBe("<p>Hello <strong>bridge</strong></p>");
      expect(ack.snapshot?.text).toBe("Hello bridge");
    } finally {
      dom.window.close();
    }
  }, 30_000);
});

async function waitFor<T>(
  predicate: () => T | false | undefined,
  timeoutMs = 5_000,
): Promise<T> {
  const started = Date.now();
  for (;;) {
    const value = predicate();
    if (value) return value;
    if (Date.now() - started > timeoutMs) {
      throw new Error("Timed out waiting for the WebView bridge.");
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
