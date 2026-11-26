/**
 * Shapes shared by the web editor, the native WebView bridge and the fixtures.
 * Types only — no TipTap import, so the mobile app can import this file for
 * typechecking without pulling ProseMirror into its bundle.
 */

/** The serialized document, exactly as the journal stores it. */
export interface EditorSnapshot {
  /** Empty documents normalize to `""`, matching the web editor's snapshot. */
  html: string;
  /** Whitespace-trimmed plain text. */
  text: string;
  /** ProseMirror document JSON. */
  json: unknown;
  wordCount: number;
}

/** Content read from local storage and handed to the editor on open. */
export interface EditorContentInput {
  html?: string;
  json?: unknown;
}

/** Colors pushed from React Native so the WebView matches the app theme. */
export interface EditorTheme {
  text: string;
  background: string;
  muted: string;
  accent: string;
  border: string;
  codeBackground: string;
}

export type EditorCommandName =
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "highlight"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bulletList"
  | "orderedList"
  | "taskList"
  | "blockquote"
  | "codeBlock"
  | "horizontalRule"
  | "undo"
  | "redo"
  | "link"
  | "unlink"
  | "image";

/** A formatting command from the native toolbar. */
export interface EditorCommand {
  name: EditorCommandName;
  href?: string;
  src?: string;
  alt?: string;
}

export interface FormatState {
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isStrike: boolean;
  isHighlight: boolean;
  isCode: boolean;
  isCodeBlock: boolean;
  isBlockquote: boolean;
  isH1: boolean;
  isH2: boolean;
  isH3: boolean;
  isBulletList: boolean;
  isOrderedList: boolean;
  isTaskList: boolean;
  isLink: boolean;
  canUndo: boolean;
  canRedo: boolean;
}
