/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { IconButton } from "@withink/ui/icon-button";
import { ChevronLeft, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { ROUTES } from "@/constants/routes";
import { decryptText } from "@/lib/crypto-client";
import { safeStorage } from "@/lib/safe-storage";
import { formatDisplayDate } from "@/lib/utils/date";
import { zenAudioService } from "@/lib/zen-audio";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useEncryption } from "@/providers/encryption-provider";

import { useAutoSave } from "../hooks/use-auto-save";
import { useSyncStatus } from "../hooks/use-sync-status";
import { diaryCacheService } from "../services/diary-cache-service";
import { EditorToolbar } from "./editor/editor-toolbar";
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
}

/** How long the revealed toolbar lingers on a phone in zen mode. */
const ZEN_REVEAL_HIDE_MS = 3000;
/** The app's one scroll container (the shell's <main id="main-content">). */
const SCROLL_ROOT_ID = "main-content";

export function JournalEditorShell({
  date,
  initialTitle,
  initialContent,
  initialMood,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [mood, setMood] = useState<number | null>(initialMood);
  const [editorContent, setEditorContent] = useState({
    html: "",
    text: "",
    json: {},
  });
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [editorReady, setEditorReady] = useState(false);
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

  const { isClientEncrypted, masterKey } = useEncryption();
  const [decryptedContent, setDecryptedContent] = useState<any>(null);

  // Decrypt content on mount if zero-knowledge is active
  useEffect(() => {
    // Guard against overlapping runs: quick A→B navigation can start two
    // loads; without this check a slow load for A could resolve after B's and
    // commit A's content under B's date.
    let cancelled = false;
    const loadContent = async () => {
      if (isClientEncrypted) {
        // Wait until the master key is restored in memory
        if (!masterKey) {
          return;
        }

        // Try to load from local document cache first if available (works offline)
        const cachedDoc = await diaryCacheService.getLocalDocument(
          date,
          masterKey,
        );
        if (cancelled) return;
        if (cachedDoc) {
          setTitle(cachedDoc.title);
          setMood(cachedDoc.mood);
          setDecryptedContent(cachedDoc.contentJson);
          setEditorContent({
            html: cachedDoc.contentHtml,
            text: cachedDoc.contentText,
            json: cachedDoc.contentJson,
          });
          return;
        }

        // Decrypt title if encrypted
        if (initialTitle && initialTitle.includes(":")) {
          try {
            const decTitle = await decryptText(initialTitle, masterKey);
            if (cancelled) return;
            setTitle(decTitle);
          } catch (err) {
            console.error("Failed to decrypt initial title:", err);
          }
        } else {
          if (cancelled) return;
          setTitle(initialTitle);
        }

        if (
          typeof initialContent === "string" &&
          initialContent.includes(":")
        ) {
          try {
            const decrypted = await decryptText(initialContent, masterKey);
            const parsed = JSON.parse(decrypted);
            if (cancelled) return;
            setDecryptedContent(parsed);
            setEditorContent({ html: "", text: "", json: parsed });
          } catch (err) {
            console.error("Failed to decrypt initial content:", err);
            if (cancelled) return;
            setDecryptedContent({});
            setEditorContent({ html: "", text: "", json: {} });
          }
        } else {
          const fallback = initialContent || {};
          if (cancelled) return;
          setDecryptedContent(fallback);
          setEditorContent({ html: "", text: "", json: fallback });
        }
      } else {
        setTitle(initialTitle);
        const fallback = initialContent || {};
        setDecryptedContent(fallback);
        setEditorContent({ html: "", text: "", json: fallback });
      }
    };
    loadContent();
    return () => {
      cancelled = true;
    };
  }, [initialTitle, initialContent, isClientEncrypted, masterKey, date]);

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

  useEffect(() => {
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

  const isUnlocked = editorReady && decryptedContent !== null;
  const canEncrypt = isClientEncrypted ? !!masterKey : true;

  // Stable callbacks so the memoized TiptapEditor doesn't re-render when the
  // shell updates (e.g. title/mood/scroll changes).
  const handleEditorReady = useCallback((editor: any) => {
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

      {/* Floating formatting toolbar — the ONE owner of fixed bottom chrome.
          Repositions above the mobile keyboard via visualViewport; clears
          the tab-bar band and the home indicator even though the tab bar is
          hidden on this route. On phones in zen it stays hidden until the
          page is tapped. */}
      <div
        className={`fixed right-0 left-0 z-40 flex justify-center px-2 transition-[bottom] duration-300 ease-out sm:px-4 md:left-[var(--sidebar-width)] ${zenHidesChrome ? "pointer-events-none" : ""}`}
        style={{
          bottom: `calc(${toolbarBottom}px + env(safe-area-inset-bottom))`,
        }}
      >
        <AnimatePresence>
          {editorInstance && toolbarVisible && (
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
              <EditorToolbar
                editor={editorInstance}
                isFocusMode={isFocusMode}
                onToggleFocusMode={toggleFocusMode}
                typewriterEnabled={typewriterEnabled}
                onToggleTypewriter={() =>
                  setTypewriterEnabled(!typewriterEnabled)
                }
                ambientSound={ambientSound}
                onChangeAmbientSound={setAmbientSound}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Save status pill — sm+ only (phones read the quiet inline line in
          the header). Dims but stays findable in zen. */}
      <div
        className={`pointer-events-auto fixed right-6 bottom-6 z-40 hidden transition-opacity duration-300 sm:block ${
          isFocusMode ? "opacity-30 hover:opacity-100" : "opacity-100"
        }`}
      >
        <SaveIndicator status={saveStatus} syncState={syncState} />
      </div>
    </div>
  );
}
