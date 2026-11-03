import { describe, expect, it } from "vitest";

import { scrubSentryBreadcrumb, scrubSentryEvent } from "./scrub-event";

const HEX_64 = "a".repeat(64);
const HEX_32 = "b".repeat(32);
const UUID = "123e4567-e89b-12d3-a456-426614174000";

describe("scrubSentryEvent", () => {
  it("drops request bodies, cookies, headers, and query strings", () => {
    const event = {
      request: {
        url: "https://app.withink.me/api/entries?token=secret",
        method: "POST",
        data: { contentText: "my private diary" },
        cookies: { session: "abc" },
        headers: { authorization: "Bearer abc" },
      },
    };

    const scrubbed = scrubSentryEvent(event);

    expect(scrubbed.request).toEqual({
      url: "https://app.withink.me/api/entries",
      method: "POST",
    });
  });

  it("redacts diary fields recursively but keeps harmless metadata", () => {
    const event = {
      extra: {
        entry: { contentText: "my private diary" },
        nested: { password: "hunter2", mood: 4 },
        title: "A quiet morning",
        count: 12,
      },
    };

    const scrubbed = scrubSentryEvent(event);

    expect(scrubbed.extra).toEqual({
      entry: "[REDACTED]",
      nested: { password: "[REDACTED]", mood: 4 },
      title: "[REDACTED]",
      count: 12,
    });
  });

  it("keeps only the user id", () => {
    const event = {
      user: { id: "user-123", email: "writer@withink.me", username: "writer" },
    };

    expect(scrubSentryEvent(event).user).toEqual({ id: "user-123" });
  });

  it("redacts secrets in messages and exception values", () => {
    const event = {
      message: `failed for writer@withink.me with ${UUID}`,
      exception: { values: [{ value: `key ${HEX_64} token ${HEX_32}` }] },
    };

    const scrubbed = scrubSentryEvent(event);

    expect(scrubbed.message).toBe(
      "failed for [REDACTED_EMAIL] with [REDACTED_UUID]",
    );
    expect(scrubbed.exception.values[0]?.value).toBe(
      "key [REDACTED_HEX_64] token [REDACTED_HEX_32]",
    );
  });

  it("passes primitives through untouched", () => {
    expect(scrubSentryEvent(null)).toBeNull();
    expect(scrubSentryEvent(42)).toBe(42);
  });
});

describe("scrubSentryBreadcrumb", () => {
  it("drops breadcrumbs that capture typed text", () => {
    expect(
      scrubSentryBreadcrumb({ category: "console", message: "typed text" }),
    ).toBeNull();
    expect(scrubSentryBreadcrumb({ category: "ui.input" })).toBeNull();
    expect(scrubSentryBreadcrumb({ category: "ui.click" })).toBeNull();
  });

  it("scrubs data and messages on kept breadcrumbs", () => {
    const breadcrumb = {
      category: "http",
      message: "GET https://app.withink.me?email=writer@withink.me",
      data: { body: "private", url: "https://app.withink.me" },
    };

    const scrubbed = scrubSentryBreadcrumb(breadcrumb);

    expect(scrubbed?.message).toBe(
      "GET https://app.withink.me?email=[REDACTED_EMAIL]",
    );
    expect(scrubbed?.data).toEqual({
      body: "[REDACTED]",
      url: "https://app.withink.me",
    });
  });
});
