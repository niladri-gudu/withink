"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import { deriveFormatState, type FormatState } from "@withink/editor";

/**
 * Web adapter over the shared derivation. The native WebView bridge derives
 * the same toolbar state in `@withink/editor`, so both toolbars agree.
 */
export type { FormatState };

/**
 * Single subscription for every formatting toggle, shared by the primary
 * toolbar row and the formatting sheet so their active states can never
 * disagree.
 */
export function useFormatState(editor: Editor): FormatState {
  return useEditorState({
    editor,
    selector: (ctx) => deriveFormatState(ctx?.editor),
  });
}
