import type { Editor } from "@tiptap/core";

import type {
  EditorToHostMessage,
  HostToEditorMessage,
} from "./bridge-protocol";
import {
  createEditorInstance,
  resolveEditorContent,
  serializeEditor,
} from "./editor-core";
import { deriveFormatState } from "./format-state";
import type { EditorCommand, EditorSnapshot, EditorTheme } from "./types";

/**
 * The WebView-side editor host.
 *
 * Bundled by `scripts/build-webview.mjs` into one inline script. It boots
 * TipTap with the shared extension factory, reports snapshots on a trailing
 * debounce (the same 400 ms the web editor uses), and answers the host's
 * `flush` so a save can never race the page teardown.
 */

interface BridgeWindow extends Window {
  __withinkEditorReceive?: (message: string | HostToEditorMessage) => void;
  ReactNativeWebView?: { postMessage(data: string): void };
}

const SNAPSHOT_DEBOUNCE_MS = 400;
const STATE_DEBOUNCE_MS = 100;

const bridgeWindow = window as BridgeWindow;

let editor: Editor | null = null;
let snapshotTimer: ReturnType<typeof setTimeout> | null = null;
let stateTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Stored image URL → local data URI. The document keeps the stored URL; this
 * map only changes what the node view paints.
 */
const imageSources = new Map<string, string>();

function imageSource(src: string): string | undefined {
  return imageSources.get(src);
}

function applyImageSource(src: string, dataUri: string): void {
  imageSources.set(src, dataUri);
  // Node views already in the document read the map on creation; repaint the
  // ones that were waiting without touching the ProseMirror document.
  document.querySelectorAll<HTMLImageElement>("img[data-wi-src]").forEach((img) => {
    if (img.getAttribute("data-wi-src") === src) {
      img.src = dataUri;
      img.removeAttribute("data-wi-pending");
    }
  });
}

function post(message: EditorToHostMessage): void {
  try {
    bridgeWindow.ReactNativeWebView?.postMessage(JSON.stringify(message));
  } catch {
    // The host went away; nothing to report to.
  }
}

function currentSnapshot(): EditorSnapshot | null {
  return editor && !editor.isDestroyed ? serializeEditor(editor) : null;
}

function clearSnapshotTimer(): void {
  if (snapshotTimer !== null) {
    clearTimeout(snapshotTimer);
    snapshotTimer = null;
  }
}

/** Emit immediately (blur, flush) unless the editor is gone. */
function emitSnapshot(): EditorSnapshot | null {
  clearSnapshotTimer();
  const snapshot = currentSnapshot();
  if (!snapshot) return null;
  post({ type: "snapshot", snapshot, state: deriveFormatState(editor) });
  return snapshot;
}

function scheduleSnapshot(): void {
  clearSnapshotTimer();
  snapshotTimer = setTimeout(() => {
    snapshotTimer = null;
    emitSnapshot();
  }, SNAPSHOT_DEBOUNCE_MS);
}

function emitState(): void {
  post({ type: "state", state: deriveFormatState(editor) });
}

function scheduleState(): void {
  if (stateTimer !== null) clearTimeout(stateTimer);
  stateTimer = setTimeout(() => {
    stateTimer = null;
    emitState();
  }, STATE_DEBOUNCE_MS);
}

function applyTheme(theme: EditorTheme): void {
  const root = document.documentElement;
  root.style.setProperty("--wi-text", theme.text);
  root.style.setProperty("--wi-muted", theme.muted);
  root.style.setProperty("--wi-accent", theme.accent);
  root.style.setProperty("--wi-border", theme.border);
  root.style.setProperty("--wi-code", theme.codeBackground);
  document.body.style.background = theme.background;
}

function runCommand(command: EditorCommand): void {
  if (!editor || editor.isDestroyed) return;
  const chain = editor.chain().focus();
  switch (command.name) {
    case "bold":
      chain.toggleBold().run();
      break;
    case "italic":
      chain.toggleItalic().run();
      break;
    case "underline":
      chain.toggleUnderline().run();
      break;
    case "strike":
      chain.toggleStrike().run();
      break;
    case "highlight":
      chain.toggleHighlight().run();
      break;
    case "heading1":
      chain.toggleHeading({ level: 1 }).run();
      break;
    case "heading2":
      chain.toggleHeading({ level: 2 }).run();
      break;
    case "heading3":
      chain.toggleHeading({ level: 3 }).run();
      break;
    case "bulletList":
      chain.toggleBulletList().run();
      break;
    case "orderedList":
      chain.toggleOrderedList().run();
      break;
    case "taskList":
      chain.toggleTaskList().run();
      break;
    case "blockquote":
      chain.toggleBlockquote().run();
      break;
    case "codeBlock":
      chain.toggleCodeBlock().run();
      break;
    case "horizontalRule":
      chain.setHorizontalRule().run();
      break;
    case "undo":
      chain.undo().run();
      break;
    case "redo":
      chain.redo().run();
      break;
    case "link":
      if (command.href) {
        chain.extendMarkRange("link").setLink({ href: command.href }).run();
      } else {
        chain.unsetLink().run();
      }
      break;
    case "unlink":
      chain.unsetLink().run();
      break;
    case "image":
      if (command.src) {
        chain.setImage({ src: command.src, alt: command.alt }).run();
      }
      break;
  }
}

function handleMessage(message: HostToEditorMessage): void {
  if (!editor || editor.isDestroyed) {
    post({ type: "error", id: message.id, message: "Editor is not ready." });
    return;
  }

  try {
    switch (message.type) {
      case "setContent": {
        const content = resolveEditorContent(message.content ?? undefined);
        try {
          editor.commands.setContent(content, { emitUpdate: false });
        } catch (err) {
          // A document written by a newer schema may fail to parse; keep the
          // raw HTML view instead of leaving an empty editor.
          const html = message.content?.html ?? "";
          editor.commands.setContent(html, { emitUpdate: false });
          post({
            type: "error",
            id: message.id,
            message: err instanceof Error ? err.message : "Content rejected.",
          });
        }
        post({ type: "ack", id: message.id, snapshot: currentSnapshot() });
        emitState();
        break;
      }
      case "flush":
        post({ type: "ack", id: message.id, snapshot: emitSnapshot() });
        break;
      case "focus":
        editor.commands.focus();
        break;
      case "blur":
        editor.commands.blur();
        break;
      case "setEditable":
        editor.setEditable(message.editable);
        break;
      case "setTheme":
        applyTheme(message.theme);
        break;
      case "setImageSource":
        applyImageSource(message.src, message.dataUri);
        break;
      case "command":
        runCommand(message.command);
        break;
    }
  } catch (err) {
    post({
      type: "error",
      id: message.id,
      message: err instanceof Error ? err.message : "Bridge command failed.",
    });
  }
}

function boot(): void {
  const element = document.getElementById("editor");
  if (!element) return;
  editor = createEditorInstance({
    element,
    content: "",
    imageSrc: imageSource,
    onCreate: () => post({ type: "ready" }),
    onUpdate: scheduleSnapshot,
    onSelectionUpdate: scheduleState,
    onFocus: () => post({ type: "focus" }),
    onBlur: () => {
      emitSnapshot();
      post({ type: "blur" });
    },
  });
}

bridgeWindow.__withinkEditorReceive = (message) => {
  try {
    const parsed =
      typeof message === "string"
        ? (JSON.parse(message) as HostToEditorMessage)
        : message;
    handleMessage(parsed);
  } catch (err) {
    post({
      type: "error",
      message: err instanceof Error ? err.message : "Malformed bridge message.",
    });
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
