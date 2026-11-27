import { Editor, type Content } from "@tiptap/core";

import {
  createEditorExtensions,
  type EditorExtensionOptions,
} from "./extensions";
import type { EditorContentInput, EditorSnapshot } from "./types";

/** Matches the web editor: a blank ProseMirror document is stored as "". */
export const EMPTY_HTML = "<p></p>";

export function normalizeHtml(html: string): string {
  return html === EMPTY_HTML ? "" : html;
}

/** The snapshot the web editor sends to autosave, with the same normalizing. */
export function serializeEditor(editor: Editor): EditorSnapshot {
  const characterCount = editor.storage.characterCount as
    | { words?: () => number }
    | undefined;
  return {
    html: normalizeHtml(editor.getHTML()),
    text: editor.getText().trim(),
    json: editor.getJSON(),
    wordCount: characterCount?.words?.() ?? 0,
  };
}

export function isDocumentJson(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "doc"
  );
}

/**
 * Prefer the stored JSON (lossless), fall back to HTML, then empty. Legacy
 * documents that only kept plain text are converted by the caller.
 */
export function resolveEditorContent(
  input: EditorContentInput | undefined,
): Content {
  if (!input) return "";
  if (isDocumentJson(input.json)) return input.json as Content;
  if (typeof input.html === "string" && input.html.length > 0) {
    return input.html;
  }
  return "";
}

export interface CreateEditorOptions extends EditorExtensionOptions {
  element?: HTMLElement | null;
  content?: Content;
  editable?: boolean;
  onCreate?: () => void;
  onUpdate?: () => void;
  onSelectionUpdate?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

/**
 * The single way an editor is constructed. The WebView bridge boots with it;
 * the fixture tests use it in jsdom, so the tested code is the shipped code.
 */
export function createEditorInstance(
  options: CreateEditorOptions = {},
): Editor {
  return new Editor({
    element: options.element ?? undefined,
    extensions: createEditorExtensions({ imageSrc: options.imageSrc }),
    content: options.content ?? "",
    editable: options.editable ?? true,
    editorProps: {
      attributes: {
        class: "wi-editor",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Journal entry content",
      },
    },
    onCreate: options.onCreate,
    onUpdate: options.onUpdate,
    onSelectionUpdate: options.onSelectionUpdate,
    onFocus: options.onFocus,
    onBlur: options.onBlur,
  });
}
