import type {
  EditorCommand,
  EditorContentInput,
  EditorSnapshot,
  EditorTheme,
  FormatState,
} from "./types";

/**
 * The host ↔ WebView contract. React Native sends one of these by calling
 * `window.__withinkEditorReceive(<message>);`; the page answers with the
 * outbound shapes below through `window.ReactNativeWebView.postMessage`.
 *
 * Every host message carries an `id`; `flush` and `setContent` are the two
 * that answer with an `ack` (the other commands are fire-and-forget).
 */

export type HostToEditorMessage =
  | { id: number; type: "setContent"; content: EditorContentInput | null }
  | { id: number; type: "flush" }
  | { id: number; type: "focus" }
  | { id: number; type: "blur" }
  | { id: number; type: "setEditable"; editable: boolean }
  | { id: number; type: "setTheme"; theme: EditorTheme }
  | { id: number; type: "command"; command: EditorCommand };

export type EditorToHostMessage =
  | { type: "ready" }
  | { type: "snapshot"; snapshot: EditorSnapshot; state: FormatState }
  | { type: "state"; state: FormatState }
  | { type: "focus" }
  | { type: "blur" }
  | { type: "ack"; id: number; snapshot: EditorSnapshot | null }
  | { type: "error"; id?: number; message: string };
