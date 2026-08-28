import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  loadEditorContent,
  type CachedDocSnapshot,
  type EditorLoadFacts,
  type EditorLoadPort,
} from "./editor-load";

const DUMMY_KEY = { algorithm: "AES-GCM", usages: [] } as unknown as CryptoKey;

const CIPHER_TITLE = "iv1:authtag:cipherjson";
const CIPHER_CONTENT = "iv2:authtag:cipherpayload";
const DECRYPTED_JSON = '{"type":"doc","content":[{"type":"paragraph"}]}';

/** Master-key-present ZK facts (the "all green" baseline for decrypt paths). */
function makeFacts(overrides: Partial<EditorLoadFacts> = {}): EditorLoadFacts {
  return {
    seeded: true,
    isClientEncrypted: true,
    masterKey: DUMMY_KEY,
    date: "2026-08-27",
    initialTitle: CIPHER_TITLE,
    initialContent: CIPHER_CONTENT,
    initialNotebookId: null,
    ...overrides,
  };
}

/** Decrypts any colon payload deterministically; other args rejected. */
function makePort(
  overrides: Partial<EditorLoadPort> = {},
  cachedDoc: CachedDocSnapshot | null = null,
): EditorLoadPort {
  return {
    getLocalDocument: vi.fn().mockResolvedValue(cachedDoc),
    decryptText: vi
      .fn()
      .mockImplementation(async (value: string) =>
        value === CIPHER_TITLE ? "Unlocked Title" : DECRYPTED_JSON,
      ),
    onDecryptError: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadEditorContent gating windows", () => {
  // THE race being fixed: provider seed not yet landed must never reach the
  // plaintext branch and commit server ciphertext into a mounting editor.
  it("waits while seeding has not landed (regression pin)", async () => {
    const port = makePort();
    const outcome = await loadEditorContent(makeFacts({ seeded: false }), port);
    expect(outcome).toEqual({ kind: "wait" });
    expect(port.getLocalDocument).not.toHaveBeenCalled();
    expect(port.decryptText).not.toHaveBeenCalled();
  });

  it("waits while zero-knowledge account lacks the in-memory master key", async () => {
    const port = makePort();
    const outcome = await loadEditorContent(
      makeFacts({ masterKey: null }),
      port,
    );
    expect(outcome).toEqual({ kind: "wait" });
    expect(port.getLocalDocument).not.toHaveBeenCalled();
  });
});

describe("loadEditorContent legacy accounts", () => {
  it("commits plaintext props wholesale, coercing falsy content to {}", async () => {
    const port = makePort();
    const outcome = await loadEditorContent(
      makeFacts({ isClientEncrypted: false, initialContent: "" }),
      port,
    );
    expect(outcome).toMatchObject({
      kind: "resolved",
      commitTitle: CIPHER_TITLE,
      contentJson: {},
      editorSeed: { html: "", text: "", json: {} },
    });
  });

  it("passes through structured plaintext content by identity", async () => {
    const doc = { type: "doc", content: [] };
    const port = makePort();
    const outcome = await loadEditorContent(
      makeFacts({ isClientEncrypted: false, initialContent: doc }),
      port,
    );
    expect(outcome).toMatchObject({
      kind: "resolved",
      contentJson: doc,
      editorSeed: { html: "", text: "", json: doc },
    });
  });
});

describe("loadEditorContent zero-knowledge cache hits", () => {
  const cachedDoc: CachedDocSnapshot = {
    date: "2026-08-27",
    title: "Cached Title",
    mood: 4,
    contentHtml: "<p>cached</p>",
    contentText: "cached",
    contentJson: { type: "doc" },
    notebookId: "nb-cache",
  };

  it("prefers the local cache over server props, full editorSeed", async () => {
    const port = makePort(undefined, cachedDoc);
    const outcome = await loadEditorContent(
      makeFacts({ initialNotebookId: "nb-server" }),
      port,
    );
    expect(outcome).toMatchObject({
      kind: "resolved",
      commitTitle: "Cached Title",
      mood: 4,
      notebookId: "nb-cache",
      contentJson: { type: "doc" },
      editorSeed: {
        html: "<p>cached</p>",
        text: "cached",
        json: { type: "doc" },
      },
    });
  });

  it("falls back to the initial notebook id when the cache holds none", async () => {
    const port = makePort(undefined, { ...cachedDoc, notebookId: undefined });
    const outcome = await loadEditorContent(
      makeFacts({ initialNotebookId: "nb-server" }),
      port,
    );
    expect(outcome).toMatchObject({ notebookId: "nb-server" });
  });

  it("downgrades a null cached mood to null explicitly", async () => {
    const port = makePort(undefined, { ...cachedDoc, mood: null });
    const outcome = await loadEditorContent(makeFacts(), port);
    expect(outcome).toMatchObject({ mood: null });
  });
});

describe("loadEditorContent zero-knowledge fresh decrypt", () => {
  it("decrypts cipher title/content and seeds an empty-html editor", async () => {
    const port = makePort();
    const outcome = await loadEditorContent(makeFacts(), port);

    expect(port.decryptText).toHaveBeenCalledWith(CIPHER_TITLE, DUMMY_KEY);
    expect(port.decryptText).toHaveBeenCalledWith(CIPHER_CONTENT, DUMMY_KEY);
    expect(outcome).toMatchObject({
      kind: "resolved",
      commitTitle: "Unlocked Title",
      contentJson: JSON.parse(DECRYPTED_JSON),
      editorSeed: {
        html: "",
        text: "",
        json: JSON.parse(DECRYPTED_JSON),
      },
    });
    expect(port.onDecryptError).not.toHaveBeenCalled();
  });

  it("keeps the current title (no commit) when title decryption fails", async () => {
    const port = makePort({
      decryptText: vi.fn().mockRejectedValue(new Error("bad tag")),
    });
    const outcome = await loadEditorContent(makeFacts(), port);

    expect(outcome.kind).toBe("resolved");
    if (outcome.kind === "resolved") {
      expect(outcome).not.toHaveProperty("commitTitle");
      expect(outcome.contentJson).toEqual({});
    }
    expect(port.onDecryptError).toHaveBeenCalledWith(
      "title",
      expect.any(Error),
    );
  });

  it("falls back to an empty document when content decryption fails", async () => {
    let calls = 0;
    const port = makePort({
      decryptText: vi.fn().mockImplementation(async () => {
        calls += 1;
        if (calls === 1) return "Unlocked Title"; // title succeeds
        throw new Error("corrupt");
      }),
    });
    const outcome = await loadEditorContent(makeFacts(), port);

    expect(outcome).toMatchObject({
      kind: "resolved",
      commitTitle: "Unlocked Title",
      contentJson: {},
      editorSeed: { html: "", text: "", json: {} },
    });
    expect(port.onDecryptError).toHaveBeenCalledWith(
      "content",
      expect.any(Error),
    );
  });

  it("treats non-cipher strings as passthrough plaintext (no colon)", async () => {
    const port = makePort();
    const outcome = await loadEditorContent(
      makeFacts({
        initialTitle: "Plain Title",
        initialContent: "not-a-payload",
      }),
      port,
    );

    expect(port.decryptText).not.toHaveBeenCalled();
    expect(outcome).toMatchObject({
      commitTitle: "Plain Title",
      contentJson: "not-a-payload",
    });
  });

  it("reports title errors but still resolves the content field", async () => {
    let calls = 0;
    const port = makePort({
      decryptText: vi.fn().mockImplementation(async () => {
        calls += 1;
        if (calls === 1) throw new Error("title boom");
        return DECRYPTED_JSON;
      }),
    });
    const outcome = await loadEditorContent(makeFacts(), port);

    expect(outcome.kind).toBe("resolved");
    if (outcome.kind === "resolved") {
      expect(outcome).not.toHaveProperty("commitTitle");
      expect(JSON.stringify(outcome.contentJson)).toBe(DECRYPTED_JSON);
    }
  });
});
