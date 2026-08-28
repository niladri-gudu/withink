"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { EditorToolbar } from "./editor-toolbar";

/* eslint-disable @typescript-eslint/no-explicit-any */

type AmbientSound = "none" | "rain" | "library" | "forest";

interface EditorToolbarDockProps {
  /** The live Tiptap instance; the dock renders empty until it exists. */
  editor: any;
  /**
   * False keeps the dock mounted but empty — the journal's phone-zen state
   * (hidden until the page is tapped). Defaults to always visible.
   */
  visible?: boolean;
  /**
   * Reports the keyboard-avoidance offset so hosts can keep caret-critical
   * scroll-padding in sync (the journal does; the letter composer does).
   */
  onBottomChange?: (px: number) => void;
  /** EditorToolbar passthroughs (zen/typewriter/ambient are journal-only). */
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
  typewriterEnabled?: boolean;
  onToggleTypewriter?: () => void;
  ambientSound?: AmbientSound;
  onChangeAmbientSound?: (sound: AmbientSound) => void;
}

/**
 * The ONE owner of fixed bottom formatting chrome, shared by every
 * fullscreen writing surface (journal editor, letter composer). Centers in
 * the content column (right of the desktop rail), rides the visual viewport
 * above the soft keyboard, respects safe-area insets, and fades/slides in
 * and out — reduced-motion users get instant swaps.
 */
export function EditorToolbarDock({
  editor,
  visible = true,
  onBottomChange,
  ...toolbarProps
}: EditorToolbarDockProps) {
  const reduceMotion = useReducedMotion();
  const [toolbarBottom, setToolbarBottom] = React.useState(16);

  // Keyboard avoidance: the visual viewport shrinks when the soft keyboard
  // opens; the toolbar rides the gap between viewport bottom and layout
  // bottom. rAF-throttled like every other viewport listener.
  React.useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    let rafId: number | null = null;
    let lastBottom = -1;
    const update = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const fromBottom =
          window.innerHeight - viewport.height - viewport.offsetTop;
        const bottom = Math.max(fromBottom, 0) + 16;
        if (bottom !== lastBottom) {
          lastBottom = bottom;
          setToolbarBottom(bottom);
        }
      });
    };
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    update();
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  React.useEffect(() => {
    onBottomChange?.(toolbarBottom);
  }, [onBottomChange, toolbarBottom]);

  return (
    <div
      className="fixed right-0 left-0 z-40 flex justify-center px-2 transition-[bottom] duration-300 ease-out sm:px-4 md:left-[var(--sidebar-width)]"
      style={{
        bottom: `calc(${toolbarBottom}px + env(safe-area-inset-bottom))`,
      }}
    >
      <AnimatePresence>
        {editor && visible && (
          <motion.div
            key="editor-toolbar"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.18, ease: "easeOut" }
            }
            className="border-border/60 bg-card/95 pointer-events-auto w-full max-w-full overflow-hidden rounded-xl border p-1 shadow-lg backdrop-blur-md sm:w-auto"
          >
            <EditorToolbar editor={editor} {...toolbarProps} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
