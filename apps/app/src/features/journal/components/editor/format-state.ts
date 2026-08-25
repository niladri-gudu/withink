"use client";

import { useEditorState, type Editor } from "@tiptap/react";

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

const INACTIVE_STATE: FormatState = {
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

function selectFormatState(ctx: { editor?: Editor | null }): FormatState {
  try {
    const ed = ctx?.editor;
    if (!ed || ed.isDestroyed) {
      return INACTIVE_STATE;
    }
    return {
      isBold: ed.isActive("bold"),
      isItalic: ed.isActive("italic"),
      isUnderline: ed.isActive("underline"),
      isStrike: ed.isActive("strike"),
      isHighlight: ed.isActive("highlight"),
      isCode: ed.isActive("code"),
      isCodeBlock: ed.isActive("codeBlock"),
      isBlockquote: ed.isActive("blockquote"),
      isH1: ed.isActive("heading", { level: 1 }),
      isH2: ed.isActive("heading", { level: 2 }),
      isH3: ed.isActive("heading", { level: 3 }),
      isBulletList: ed.isActive("bulletList"),
      isOrderedList: ed.isActive("orderedList"),
      isTaskList: ed.isActive("taskList"),
      isLink: ed.isActive("link"),
      canUndo: typeof ed.can === "function" && ed.can()?.undo() ? true : false,
      canRedo: typeof ed.can === "function" && ed.can()?.redo() ? true : false,
    };
  } catch (err) {
    console.error("Tiptap format-state selector error:", err);
    return INACTIVE_STATE;
  }
}

/**
 * Single subscription for every formatting toggle, shared by the primary
 * toolbar row and the formatting sheet so their active states can never
 * disagree.
 */
export function useFormatState(editor: Editor): FormatState {
  return useEditorState({ editor, selector: selectFormatState });
}
