import { describe, expect, it } from "vitest";

import { expoOriginPlugin } from "./expo-auth-plugin";

function request(headers: Record<string, string>): Request {
  return new Request("http://localhost:3000/api/auth/sign-out", {
    method: "POST",
    headers,
  });
}

describe("expoOriginPlugin", () => {
  it("copies expo-origin into origin when origin is absent", async () => {
    const plugin = expoOriginPlugin();
    const result = await plugin.onRequest?.(
      request({ "expo-origin": "withink://" }),
      {} as never,
    );

    const forwarded =
      result && "request" in result ? result.request : null;
    expect(forwarded?.headers.get("origin")).toBe("withink://");
  });

  it("leaves an existing origin untouched", async () => {
    const plugin = expoOriginPlugin();
    const result = await plugin.onRequest?.(
      request({ origin: "http://localhost:3000", "expo-origin": "withink://" }),
      {} as never,
    );
    expect(result).toBeUndefined();
  });

  it("no-ops without expo-origin", async () => {
    const plugin = expoOriginPlugin();
    const result = await plugin.onRequest?.(request({}), {} as never);
    expect(result).toBeUndefined();
  });

  it("trusts the app scheme", () => {
    const plugin = expoOriginPlugin();
    expect(plugin.init?.({} as never)).toMatchObject({
      options: { trustedOrigins: ["withink://"] },
    });
  });
});
