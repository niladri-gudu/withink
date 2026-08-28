/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { IconButton } from "@withink/ui/icon-button";
import {
  ChevronLeft,
  Loader2,
  Maximize2,
  Minimize2,
  Notebook,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { ROUTES } from "@/constants/routes";
import { decryptText } from "@/lib/crypto-client";
import { safeStorage } from "@/lib/safe-storage";
import { formatDisplayDate } from "@/lib/utils/date";
import { zenAudioService } from "@/lib/zen-audio";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useEncryption } from "@/providers/encryption-provider";
import { MoveEntryDialog } from "@/features/notebooks/components/move-entry-dialog";

import { useAutoSave } from "../hooks/use-auto-save";
import { useSyncStatus } from "../hooks/use-sync-status";
import { diaryCacheService } from "../services/diary-cache-service";
import {
  loadEditorContent,
  type EditorLoadPort,
} from "../services/editor-load";
import { EditorToolbarDock } from "./editor/editor-toolbar-dock";
import { MoodSelector } from "./mood-selector";
import { SaveIndicator } from "./save-indicator";

const TiptapEditor = dynamic(() => import("./editor/tiptap-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex w-full animate-pulse flex-col space-y-4 py-10">
      <div className="bg-muted/60 h-4 w-[85%] rounded-md" />
      <div className="bg-muted/60 h-4 w-[95%] rounded-md" />
      <div className="bg-muted/60 h-4 w-[70%] rounded-md" />
      <div className="bg-muted/60 h-4 w-[80%] rounded-md" />
      <div className="bg-muted/60 h-4 w-[60%] rounded-md" />
    </div>
  ),
});

interface Props {
  date: string;
  initialTitle: string;
  initialContent: any;
  initialMood: number | null;
  /**
   * Notebook filing target for this day: an existing entry's notebook, or
   * the resolved default/param choice for a not-yet-written day.
   */
  initialNotebookId?: string | null;
  /** The viewer's notebooks (id + name); the chip/move UI shows when > 1. */
  notebooks?: { id: string; name: string }[];
}

/** How long the revealed toolbar lingers on a phone in zen mode. */
const ZEN_REVEAL_HIDE_MS = 3000;
/** The app's one scroll container (the shell's <main id="main-content">). */
const SCROLL_ROOT_ID = "main-content";

/** The one wired port: pure resolver + real cache/crypto implementations. */
const editorLoadPort: EditorLoadPort = {
  getLocalDocument: (docDate, key) =>
    diaryCacheService.getLocalDocument(docDate, key),
  decryptText: (value, key) => decryptText(value, key),
  onDecryptError: (scope, err) =>
    console.error(`Failed to decrypt initial ${scope}:`, err),
};

export function JournalEditorShell({
  date,
  initialTitle,
  initialContent,
  initialMood,
  initialNotebookId,
  notebooks = [],
}: Props) {
  // Title starts EMPTY and is owned by loadContent below: seeding it from
  // `initialTitle` would flash server ciphertext on zero-knowledge accounts
  // during the provider-seed window.
  const [title, setTitle] = useState("");
  const [mood, setMood] = useState<number | null>(initialMood);
  const [notebookId, setNotebookId] = useState<string | null>(
    initialNotebookId ?? null,
  );
  const [moveOpen, setMoveOpen] = useState(false);
  const [editorContent, setEditorContent] = useState({
    html: "",
    text: "",
    json: {},
  });
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [editorReady, setEditorReady] = useState(false);
  /** Ref mirror so async load resolutions see the live instance immediately. */
  const editorInstanceRef = useRef<any>(null);
  /** Raw signature of the last payload committed to UI state. */
  const appliedJsonSigRef = useRef<string | null>(null);
  /**
   * Normalized getJSON() snapshot captured the moment the live editor
   * mounted. A later re-resolution may repaint only while the live document
   * still equals this snapshot — user typing diverges it and always wins.
   */
  const consumedDocSignatureRef = useRef<string | null>(null);
  const [toolbarBottom, setToolbarBottom] = useState(20);
  const [isFocusMode, setIsFocusMode] = useState(false);

  const [typewriterEnabled, setTypewriterEnabled] = useState(() => {
    return safeStorage.getItem("withink-typewriter-enabled") === "true";
  });

  const [ambientSound, setAmbientSound] = useState<
    "none" | "rain" | "library" | "forest"
  >(() => {
    return (safeStorage.getItem("withink-ambient-sound") as any) || "none";
  });

  const [scrollProgress, setScrollProgress] = useState(0);

  // Zen on phones: all floating chrome hides; tapping the page reveals the
  // toolbar for a few seconds. Desktop keeps today's always-visible zen.
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [toolbarRevealed, setToolbarRevealed] = useState(false);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleZenHide = useCallback(() => {
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    revealTimerRef.current = setTimeout(
      () => setToolbarRevealed(false),
      ZEN_REVEAL_HIDE_MS,
    );
  }, []);

  const revealZenToolbar = useCallback(() => {
    setToolbarRevealed(true);
    scheduleZenHide();
  }, [scheduleZenHide]);

  // Both entry points (header button, toolbar exit) route through here so a
  // fresh zen session always starts with chrome hidden — no reset effect.
  const toggleFocusMode = useCallback(() => {
    setToolbarRevealed(false);
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    setIsFocusMode((prev) => !prev);
  }, []);

  useEffect(() => {
    return () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, []);

  // Typing (each snapshot tick) keeps the revealed toolbar alive; it tucks
  // itself away once the writer settles back into the page.
  useEffect(() => {
    if (isFocusMode && isMobile && toolbarRevealed && editorContent.text) {
      scheduleZenHide();
    }
  }, [
    editorContent.html,
    editorContent.text,
    isFocusMode,
    isMobile,
    toolbarRevealed,
    scheduleZenHide,
  ]);

  // Sync settings to local storage
  useEffect(() => {
    safeStorage.setItem(
      "withink-typewriter-enabled",
      String(typewriterEnabled),
    );
  }, [typewriterEnabled]);

  useEffect(() => {
    safeStorage.setItem("withink-ambient-sound", ambientSound);
  }, [ambientSound]);

  // Scroll progress of THE scroll container (the shell's <main> — the window
  // itself never scrolls in this layout), rAF-throttled so we only re-render
  // when the value actually changes.
  useEffect(() => {
    const scroller = document.getElementById(SCROLL_ROOT_ID);
    if (!scroller) return;

    let rafId: number | null = null;
    let lastProgress = -1;

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const totalHeight = scroller.scrollHeight - scroller.clientHeight;
        const progress =
          totalHeight <= 0
            ? 0
            : Math.min((scroller.scrollTop / totalHeight) * 100, 100);
        if (progress !== lastProgress) {
          lastProgress = progress;
          setScrollProgress(progress);
        }
      });
    };

    scroller.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      scroller.removeEventListener("scroll", handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  // Escape leaves zen (keyboard users shouldn't have to hunt for the exit).
  useEffect(() => {
    if (!isFocusMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFocusMode(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFocusMode]);

  // Ambient sound management
  useEffect(() => {
    if (isFocusMode && ambientSound !== "none") {
      zenAudioService.startAmbientLandscape(ambientSound);
    } else {
      zenAudioService.stopAmbientLandscape();
    }
    return () => {
      zenAudioService.stopAmbientLandscape();
    };
  }, [isFocusMode, ambientSound]);

  // Mechanical typing sounds keydown listener
  useEffect(() => {
    if (!isFocusMode || !typewriterEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape") return;
      const ignoreKeys = [
        "Shift",
        "Control",
        "Alt",
        "Meta",
        "CapsLock",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ];
      if (ignoreKeys.includes(e.key)) return;

      zenAudioService.playTypewriterClick();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFocusMode, typewriterEnabled]);

  const { isClientEncrypted, masterKey, encryptionSettingsSeeded } =
    useEncryption();
  const [decryptedContent, setDecryptedContent] = useState<any>(null);

  // Resolve what the editor displays for THIS date. Every branch decision
  // lives in the pure resolver so the unseeded / keyless windows can never
  // feed server ciphertext into a mounting Tiptap ("content" seeds the doc
  // at creation only — a later prop change cannot heal a mounted editor).
  useEffect(() => {
    let cancelled = false;

    void loadEditorContent(
      {
        seeded: encryptionSettingsSeeded,
        isClientEncrypted,
        masterKey,
        date,
        initialTitle,
        initialContent,
        initialNotebookId,
      },
      editorLoadPort,
    )
      .then((outcome) => {
        if (cancelled || outcome.kind === "wait") return;

        // Deduplicate repeated resolutions carrying identical payloads:
        // identity-churn from streamed RSC refreshes must not reset state.
        const nextSignature = JSON.stringify(outcome.contentJson);
        if (nextSignature === appliedJsonSigRef.current) return;
        appliedJsonSigRef.current = nextSignature;

        if (outcome.commitTitle !== undefined) setTitle(outcome.commitTitle);
        if ("mood" in outcome) setMood(outcome.mood ?? null);
        if ("notebookId" in outcome) {
          setNotebookId(outcome.notebookId ?? null);
        }

        const liveEditor = editorInstanceRef.current;
        if (!liveEditor) {
          // First visibility: hand off to React; the mount consumes these.
          setDecryptedContent(outcome.contentJson);
          setEditorContent(outcome.editorSeed);
          return;
        }

        // A mounted editor still shows an older resolution (the historical
        // race shape). Repaint ONLY while its document equals the mount-time
        // snapshot — user typing diverges it and always wins. Uses the same
        // wholesale command path the revision-restore feature proved.
        const untouched =
          consumedDocSignatureRef.current !== null &&
          JSON.stringify(liveEditor.getJSON()) ===
            consumedDocSignatureRef.current;
        if (!untouched) return;

        liveEditor.commands.setContent(outcome.contentJson);
        consumedDocSignatureRef.current =
          JSON.stringify(liveEditor.getJSON());
        setDecryptedContent(outcome.contentJson);
      })
      .catch((err) => {
        console.error("Failed to load entry content:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [
    encryptionSettingsSeeded,
    initialTitle,
    initialContent,
    initialNotebookId,
    isClientEncrypted,
    masterKey,
    date,
  ]);

  // Setup scroll-padding for visual viewport (keyboard avoidance on mobile/Safari).
  // The <style> element is created once and mutated in place instead of being
  // appended/removed on every toolbar/viewport change.
  const scrollPaddingStyleRef = useRef<HTMLStyleElement | null>(null);
  useEffect(() => {
    const topBuffer = isFocusMode ? 40 : 72;
    const bottomBuffer = toolbarBottom + 120;
    document.documentElement.style.scrollPaddingTop = `${topBuffer}px`;
    document.documentElement.style.scrollPaddingBottom = `${bottomBuffer}px`;

    if (!scrollPaddingStyleRef.current) {
      const style = document.createElement("style");
      style.dataset.withinkScrollPadding = "true";
      scrollPaddingStyleRef.current = style;
    }
    scrollPaddingStyleRef.current.innerHTML = `
      .prose-container p, .prose-container div[contenteditable] > * {
        scroll-margin-top: ${topBuffer}px;
        scroll-margin-bottom: ${bottomBuffer}px;
      }
    `;
    if (!scrollPaddingStyleRef.current.isConnected) {
      document.head.appendChild(scrollPaddingStyleRef.current);
    }

    return () => {
      document.documentElement.style.scrollPaddingTop = "0px";
      document.documentElement.style.scrollPaddingBottom = "0px";
      if (
        scrollPaddingStyleRef.current &&
        document.head.contains(scrollPaddingStyleRef.current)
      ) {
        document.head.removeChild(scrollPaddingStyleRef.current);
      }
      scrollPaddingStyleRef.current = null;
    };
  }, [toolbarBottom, isFocusMode]);

  // Keyboard avoidance moved into EditorToolbarDock (shared with the letter
  // composer); it reports the offset back via onBottomChange, which feeds
  // the scroll-padding effect above so the caret never hides behind chrome.

  const isUnlocked = editorReady && decryptedContent !== null;
  const canEncrypt = isClientEncrypted ? !!masterKey : true;

  // Stable callbacks so the memoized TiptapEditor doesn't re-render when the
  // shell updates (e.g. title/mood/scroll changes).
  const handleEditorReady = useCallback((editor: any) => {
    editorInstanceRef.current = editor;
    consumedDocSignatureRef.current = JSON.stringify(editor.getJSON());
    setEditorInstance(editor);
    setEditorReady(true);
  }, []);

  const saveStatus = useAutoSave(
    {
      date,
      title,
      mood,
      contentHtml: editorContent.html,
      contentText: editorContent.text,
      contentJson: editorContent.json,
      notebookId: notebookId ?? undefined,
    },
    1500,
    isUnlocked && canEncrypt,
  );
  const syncState = useSyncStatus(date);

  const reduceMotion = useReducedMotion();

  // On phones in zen, ALL floating chrome hides until the page is tapped;
  // desktop keeps its familiar dimmed-but-present chrome.
  const zenHidesChrome = isFocusMode && isMobile;
  const toolbarVisible = !zenHidesChrome || toolbarRevealed;
  const headerVisible = !zenHidesChrome;

  return (
    <div className="relative flex min-h-full w-full flex-col">
      {/* Ruled ledger paper, scoped to the writing surface */}
      <div
        aria-hidden="true"
        className="ledger-rules pointer-events-none absolute inset-0"
      />

      {/* Single scroll-progress hairline (the only fixed top layer) */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 h-0.5">
        <div
          className="bg-accent h-full transition-all duration-100 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Editor header row: back · date · save state (phones) · zen.
          Sticky inside the shell's scroll container; hides entirely on
          phones in zen. */}
      <AnimatePresence>
        {headerVisible && (
          <motion.header
            key="editor-header"
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.15 }}
            className="border-border/40 bg-background/85 sticky top-0 z-20 w-full border-b backdrop-blur-md"
          >
            <div className="mx-auto flex h-12 w-full max-w-3xl items-center gap-1.5 px-3 sm:px-6">
              <IconButton
                asChild
                variant="ghost"
                aria-label="Back to dashboard"
                className="-ml-2 shrink-0"
              >
                <Link href={ROUTES.APP.DASHBOARD}>
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              </IconButton>

              <time className="text-muted-foreground/70 font-hand truncate text-lg leading-none">
                {formatDisplayDate(date)}
              </time>

              {/* Quiet filing chip: which notebook this page belongs to.
                  Tap to move — only offered when there's more than one. */}
              {notebooks.length > 1 && (
                <button
                  type="button"
                  onClick={() => setMoveOpen(true)}
                  aria-label={`Filed under ${
                    notebooks.find((n) => n.id === notebookId)?.name ??
                    "notebook"
                  }. Change notebook`}
                  className="text-muted-foreground/60 hover:text-accent focus-visible:ring-ring hover:border-accent/40 inline-flex h-8 min-w-0 cursor-pointer items-center gap-1 rounded-full border border-transparent px-1.5 font-serif text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <Notebook aria-hidden="true" className="h-3 w-3 shrink-0" />
                  <span className="max-w-[7rem] truncate sm:max-w-[10rem]">
                    {notebooks.find((n) => n.id === notebookId)?.name ??
                      "Notebook"}
                  </span>
                </button>
              )}

              <div className="min-w-2 flex-1" />

              {/* Quiet inline save state lives up here on phones — the
                  bottom-right pill competes with the toolbar and keyboard. */}
              <span className="sm:hidden">
                <SaveIndicator
                  status={saveStatus}
                  syncState={syncState}
                  variant="inline"
                />
              </span>

              <IconButton
                variant="ghost"
                aria-label={
                  isFocusMode ? "Exit Zen focus mode" : "Enter Zen focus mode"
                }
                title={isFocusMode ? "Exit Focus Mode" : "Zen Focus Mode"}
                onClick={toggleFocusMode}
                className="shrink-0"
              >
                {isFocusMode ? (
                  <Minimize2 className="text-accent h-5 w-5" />
                ) : (
                  <Maximize2 className="h-5 w-5" />
                )}
              </IconButton>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Writing column — the editor owns this surface end to end; the
          max-w-3xl measure below is reading comfort, not shell padding.
          (A div, not <main>: the shell's skip-link target is the landmark.) */}
      <div
        className="relative z-10 mx-auto w-full max-w-3xl flex-grow px-4 pt-5 pb-[32vh] sm:px-6 sm:pt-8"
        onPointerUp={() => {
          if (zenHidesChrome) {
            revealZenToolbar();
          }
        }}
      >
        <div className="flex flex-col">
          <input
            placeholder="Untitled Log"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Journal entry title"
            className={`text-foreground placeholder:text-muted-foreground/30 mb-3 w-full bg-transparent font-serif leading-tight font-bold tracking-tight transition-all outline-none ${
              isFocusMode
                ? "text-3xl opacity-80 focus:opacity-100 sm:text-4xl"
                : "text-4xl sm:text-5xl"
            }`}
          />

          {/* Mood sits directly beneath the title, comfortably above the
              fold, with full 44px thumb targets. */}
          {!isFocusMode && (
            <div className="mb-2 flex items-center">
              <MoodSelector selected={mood} onSelect={setMood} />
            </div>
          )}

          {/* Editor Container */}
          <div className="prose-container mt-6">
            {decryptedContent !== null ? (
              <TiptapEditor
                key={date}
                content={decryptedContent}
                onChange={setEditorContent}
                onEditorReady={handleEditorReady}
              />
            ) : (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="text-accent h-6 w-6 animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating formatting toolbar — the dock owns fixed bottom chrome
          (positioning, keyboard avoidance, motion) for every writing
          surface. On phones in zen it stays hidden until the page is
          tapped; the offset feeds the caret's scroll-padding below. */}
      <EditorToolbarDock
        editor={editorInstance}
        visible={toolbarVisible}
        onBottomChange={setToolbarBottom}
        isFocusMode={isFocusMode}
        onToggleFocusMode={toggleFocusMode}
        typewriterEnabled={typewriterEnabled}
        onToggleTypewriter={() => setTypewriterEnabled(!typewriterEnabled)}
        ambientSound={ambientSound}
        onChangeAmbientSound={setAmbientSound}
      />

      {/* Save status pill — sm+ only (phones read the quiet inline line in
          the header). Dims but stays findable in zen. */}
      <div
        className={`pointer-events-auto fixed right-6 bottom-6 z-40 hidden transition-opacity duration-300 sm:block ${
          isFocusMode ? "opacity-30 hover:opacity-100" : "opacity-100"
        }`}
      >
        <SaveIndicator status={saveStatus} syncState={syncState} />
      </div>

      {/* Move-to-notebook dialog (the ONE shared implementation): re-filing
          is an explicit server action — autosave never moves an existing
          entry between notebooks. */}
      <MoveEntryDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        date={date}
        notebooks={notebooks}
        currentNotebookId={notebookId}
        onMoved={setNotebookId}
      />
    </div>
  );
}
