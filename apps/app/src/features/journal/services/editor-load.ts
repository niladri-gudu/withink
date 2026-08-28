/**
 * Pure load-resolution for the journal editor's display state.
 *
 * Extracted from JournalEditorShell so the branching that decides WHAT the
 * editor shows is exhaustively unit-testable away from React. This is the
 * fix surface for the zero-knowledge hard-reload race: during the hydration
 * window where the provider's `isClientEncrypted` flag has not been seeded
 * yet (or the master key is absent mid-unlock), the old inline logic fell
 * into the plaintext branch and committed server ciphertext into a freshly
 * mounting Tiptap instance — whose `content` prop only seeds at creation.
 * The "wait" stage below makes that window unrepresentable.
 *
 * The module deliberately imports NOTHING from the app: callers inject the
 * crypto/cache port, keeping this file deterministic for tests.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Shape returned by DiaryCacheService.getLocalDocument (structural copy). */
export interface CachedDocSnapshot {
  date?: string;
  title: string;
  mood: number | null;
  contentHtml: string;
  contentText: string;
  contentJson: any;
  notebookId?: string;
}

/** Inputs the shell resolves before asking the loader what to display. */
export interface EditorLoadFacts {
  /** Provider has received server-seeded encryption settings. */
  seeded: boolean;
  isClientEncrypted: boolean;
  masterKey: CryptoKey | null;
  date: string;
  /** Server-provided props (ciphertext on zero-knowledge accounts). */
  initialTitle: string;
  initialContent: unknown;
  initialNotebookId?: string | null;
}

/** Injected side effects: cache read, decryption, error reporting. */
export interface EditorLoadPort {
  getLocalDocument(date: string, key: CryptoKey): Promise<CachedDocSnapshot | null>;
  decryptText(value: string, key: CryptoKey): Promise<string>;
  onDecryptError(scope: "title" | "content", err: unknown): void;
}

/** What a freshly-mounted Tiptap should render / autosave should see. */
export interface EditorSeed {
  html: string;
  text: string;
  json: any;
}

export type EditorLoadOutcome =
  /**
   * Nothing may be committed yet — render the spinner. Covers the pre-seed
   * hydration window (THE race being fixed) and the keyless unlock beat.
   */
  | { kind: "wait" }
  /**
   * A definitive display decision. Fields are present only when they were
   * decided: absence (`commitTitle`) preserves the old decrypt-failure
   * behavior of leaving the current title untouched.
   */
  | {
      kind: "resolved";
      commitTitle?: string;
      mood?: number | null;
      notebookId?: string | null;
      contentJson: any;
      editorSeed: EditorSeed;
    };

/** Mirrors the shell's historical heuristic: `"iv:cipher"` colon payloads. */
function looksEncrypted(value: unknown): value is string {
  return typeof value === "string" && value.includes(":");
}

/**
 * Decides what the editor should show for a given day.
 * Deterministic given (facts, port) — never touches React or globals.
 */
export async function loadEditorContent(
  facts: EditorLoadFacts,
  port: EditorLoadPort,
): Promise<EditorLoadOutcome> {
  // Unknowable-yet window: seeding flips this within one layout effect for
  // real accounts, so waiting costs a paint at most. Committing during it is
  // how server ciphertext historically reached a mounting editor.
  if (!facts.seeded) return { kind: "wait" };
  if (facts.isClientEncrypted && !facts.masterKey) return { kind: "wait" };

  // Legacy (non-ZK) account: server content arrives as plaintext.
  if (!facts.isClientEncrypted) {
    const fallback = facts.initialContent || {};
    return {
      kind: "resolved",
      commitTitle: facts.initialTitle,
      contentJson: fallback,
      editorSeed: { html: "", text: "", json: fallback },
    };
  }

  const key = facts.masterKey as CryptoKey;

  // Zero-knowledge: prefer the local encrypted cache (works offline).
  const cachedDoc = await port.getLocalDocument(facts.date, key);
  if (cachedDoc) {
    return {
      kind: "resolved",
      commitTitle: cachedDoc.title,
      mood: cachedDoc.mood ?? null,
      notebookId: cachedDoc.notebookId ?? facts.initialNotebookId ?? null,
      contentJson: cachedDoc.contentJson,
      editorSeed: {
        html: cachedDoc.contentHtml,
        text: cachedDoc.contentText,
        json: cachedDoc.contentJson,
      },
    };
  }

  // Fresh ZK path: decrypt title and content independently, preserving the
  // old behavior where one failing field doesn't blank the other.
  let commitTitle: string | undefined;
  if (looksEncrypted(facts.initialTitle)) {
    try {
      commitTitle = await port.decryptText(facts.initialTitle, key);
    } catch (err) {
      port.onDecryptError("title", err);
    }
  } else {
    commitTitle = facts.initialTitle;
  }

  let contentJson: any = {};
  if (looksEncrypted(facts.initialContent)) {
    try {
      const decrypted = await port.decryptText(
        facts.initialContent as string,
        key,
      );
      contentJson = JSON.parse(decrypted);
    } catch (err) {
      port.onDecryptError("content", err);
      contentJson = {};
    }
  } else {
    contentJson = facts.initialContent || {};
  }

  return {
    kind: "resolved",
    ...(commitTitle !== undefined ? { commitTitle } : {}),
    contentJson,
    editorSeed: { html: "", text: "", json: contentJson },
  };
}
