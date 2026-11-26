import { describe, expect, it } from "vitest";

import {
  apiErrorSchema,
  notebookMutationSchema,
  saveEntrySchema,
  syncDeleteRequestSchema,
  syncPullRequestSchema,
  syncPushEntrySchema,
  syncPushRequestSchema,
} from "./index";

function dates(count: number): string[] {
  return Array.from({ length: count }, (_, index) =>
    new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10),
  );
}

describe("saveEntrySchema", () => {
  it("applies the documented defaults", () => {
    expect(saveEntrySchema.parse({ date: "2026-11-26" })).toEqual({
      date: "2026-11-26",
      title: "",
      mood: null,
      contentHtml: "",
      contentText: "",
      contentJson: undefined,
      wordCount: undefined,
      notebookId: undefined,
    });
  });

  it("rejects malformed dates", () => {
    expect(saveEntrySchema.safeParse({ date: "26-11-2026" }).success).toBe(
      false,
    );
  });

  it("bounds the title and notebook id", () => {
    expect(
      saveEntrySchema.safeParse({
        date: "2026-11-26",
        title: "x".repeat(1001),
      }).success,
    ).toBe(false);
    expect(
      saveEntrySchema.safeParse({
        date: "2026-11-26",
        notebookId: "not-an-object-id",
      }).success,
    ).toBe(false);
    expect(
      saveEntrySchema.safeParse({
        date: "2026-11-26",
        notebookId: "0123456789abcdef01234567",
      }).success,
    ).toBe(true);
  });

  it("bounds mood to 1..5 or null", () => {
    expect(
      saveEntrySchema.safeParse({ date: "2026-11-26", mood: 0 }).success,
    ).toBe(false);
    expect(
      saveEntrySchema.safeParse({ date: "2026-11-26", mood: 6 }).success,
    ).toBe(false);
    expect(
      saveEntrySchema.safeParse({ date: "2026-11-26", mood: null }).success,
    ).toBe(true);
  });
});

describe("syncPushEntrySchema", () => {
  it("requires the viewer-local today", () => {
    expect(
      syncPushEntrySchema.safeParse({ date: "2026-11-26" }).success,
    ).toBe(false);
    expect(
      syncPushEntrySchema.safeParse({
        date: "2026-11-26",
        today: "2026-11-26",
      }).success,
    ).toBe(true);
  });

  it("accepts the optional stale-write guard", () => {
    expect(
      syncPushEntrySchema.safeParse({
        date: "2026-11-26",
        today: "2026-11-26",
        baseUpdatedAt: "2026-11-26T10:00:00.000Z",
      }).success,
    ).toBe(true);
  });
});

describe("batch schemas", () => {
  it("enforces the bulk limit on pull and push", () => {
    expect(syncPullRequestSchema.safeParse({ dates: dates(50) }).success).toBe(
      true,
    );
    expect(syncPullRequestSchema.safeParse({ dates: dates(51) }).success).toBe(
      false,
    );
    expect(syncPullRequestSchema.safeParse({ dates: [] }).success).toBe(false);

    const entries = dates(50).map((date) => ({ date, today: date }));
    expect(syncPushRequestSchema.safeParse({ entries }).success).toBe(true);
    expect(
      syncPushRequestSchema.safeParse({ entries: [...entries, entries[0]] })
        .success,
    ).toBe(false);
  });

  it("validates the delete body", () => {
    expect(
      syncDeleteRequestSchema.safeParse({ date: "2026-11-26" }).success,
    ).toBe(true);
    expect(syncDeleteRequestSchema.safeParse({ date: "nope" }).success).toBe(
      false,
    );
  });
});

describe("notebookMutationSchema", () => {
  it("accepts each supported action", () => {
    expect(
      notebookMutationSchema.safeParse({ action: "create", name: "Ideas" })
        .success,
    ).toBe(true);
    expect(
      notebookMutationSchema.safeParse({
        action: "rename",
        id: "0123456789abcdef01234567",
        name: "Ideas",
      }).success,
    ).toBe(true);
    expect(
      notebookMutationSchema.safeParse({
        action: "move-entry",
        date: "2026-11-26",
        notebookId: "0123456789abcdef01234567",
      }).success,
    ).toBe(true);
  });

  it("rejects unknown actions and ids", () => {
    expect(
      notebookMutationSchema.safeParse({ action: "archive", id: "x" }).success,
    ).toBe(false);
    expect(
      notebookMutationSchema.safeParse({ action: "delete", id: "x" }).success,
    ).toBe(false);
  });
});

describe("apiErrorSchema", () => {
  it("accepts a coded error and optional details", () => {
    const parsed = apiErrorSchema.parse({
      error: "Locked",
      code: "LOCKED",
      details: { retryAfter: 30 },
    });
    expect(parsed.code).toBe("LOCKED");
  });

  it("rejects unknown codes", () => {
    expect(
      apiErrorSchema.safeParse({ error: "x", code: "NOT_A_CODE" }).success,
    ).toBe(false);
  });
});
