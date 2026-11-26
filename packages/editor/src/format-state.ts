import type { Editor } from "@tiptap/core";

import type { FormatState } from "./types";

export const INACTIVE_FORMAT_STATE: FormatState = {
  isBold: false,
  isItalic: false,
  isUnderline: false,
  isStrike: false,
  isHighlight: false,
  isCode: false,
  isCodeBlock: false,
  isBlockquote: false,
  isH1: false,
  isH2: false,
  isH3: false,
  isBulletList: false,
  isOrderedList: false,
  isTaskList: false,
  isLink: false,
  canUndo: false,
  canRedo: false,
};

/**
 * One derivation of the toolbar state, used by the web hook and the WebView
 * bridge so the two toolbars can never disagree about the active marks.
 */
export function deriveFormatState(
  editor: Editor | null | undefined,
): FormatState {
  if (!editor || editor.isDestroyed) return INACTIVE_FORMAT_STATE;
  try {
    return {
      isBold: editor.isActive("bold"),
      isItalic: editor.isActive("italic"),
      isUnderline: editor.isActive("underline"),
      isStrike: editor.isActive("strike"),
      isHighlight: editor.isActive("highlight"),
      isCode: editor.isActive("code"),
      isCodeBlock: editor.isActive("codeBlock"),
      isBlockquote: editor.isActive("blockquote"),
      isH1: editor.isActive("heading", { level: 1 }),
      isH2: editor.isActive("heading", { level: 2 }),
      isH3: editor.isActive("heading", { level: 3 }),
      isBulletList: editor.isActive("bulletList"),
      isOrderedList: editor.isActive("orderedList"),
      isTaskList: editor.isActive("taskList"),
      isLink: editor.isActive("link"),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    };
  } catch (err) {
    console.error("Tiptap format-state selector error:", err);
    return INACTIVE_FORMAT_STATE;
  }
}
