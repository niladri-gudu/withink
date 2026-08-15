/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@withink/ui/button";
import { ChevronLeft, Loader2 } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { decryptText } from "@/lib/crypto-client";
import { formatDisplayDate } from "@/lib/utils/date";
import { zenAudioService } from "@/lib/zen-audio";
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
  const [toolbarBottom, setToolbarBottom] = useState(24);
  const [isFocusMode, setIsFocusMode] = useState(false);

  const [typewriterEnabled, setTypewriterEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("withink-typewriter-enabled") === "true";
    }
    return false;
  });

  const [ambientSound, setAmbientSound] = useState<
    "none" | "rain" | "library" | "forest"
  >(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("withink-ambient-sound") as any) || "none";
    }
    return "none";
  });

  const [scrollProgress, setScrollProgress] = useState(0);

  // Sync settings to local storage
  useEffect(() => {
    localStorage.setItem(
      "withink-typewriter-enabled",
      String(typewriterEnabled),
    );
  }, [typewriterEnabled]);

  useEffect(() => {
    localStorage.setItem("withink-ambient-sound", ambientSound);
  }, [ambientSound]);

  // Track window scroll progress, rAF-throttled so we only re-render when the
  // value actually changes (scroll fires at up to 60Hz+).
  useEffect(() => {
    let rafId: number | null = null;
    let lastProgress = -1;

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const totalHeight =
          document.documentElement.scrollHeight - window.innerHeight;
        const progress =
          totalHeight <= 0
            ? 0
            : Math.min((window.scrollY / totalHeight) * 100, 100);
        if (progress !== lastProgress) {
          lastProgress = progress;
          setScrollProgress(progress);
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

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
            setTitle(decTitle);
          } catch (err) {
            console.error("Failed to decrypt initial title:", err);
          }
        } else {
          setTitle(initialTitle);
        }

        if (
          typeof initialContent === "string" &&
          initialContent.includes(":")
        ) {
          try {
            const decrypted = await decryptText(initialContent, masterKey);
            const parsed = JSON.parse(decrypted);
            setDecryptedContent(parsed);
            setEditorContent((prev) => ({ ...prev, json: parsed }));
          } catch (err) {
            console.error("Failed to decrypt initial content:", err);
            setDecryptedContent({});
          }
        } else {
          const fallback = initialContent || {};
          setDecryptedContent(fallback);
          setEditorContent((prev) => ({ ...prev, json: fallback }));
        }
      } else {
        setTitle(initialTitle);
        const fallback = initialContent || {};
        setDecryptedContent(fallback);
        setEditorContent((prev) => ({ ...prev, json: fallback }));
      }
    };
    loadContent();
  }, [initialTitle, initialContent, isClientEncrypted, masterKey, date]);

  // Setup scroll-padding for visual viewport (keyboard avoidance on mobile/Safari).
  // The <style> element is created once and mutated in place instead of being
  // appended/removed on every toolbar/viewport change.
  const scrollPaddingStyleRef = useRef<HTMLStyleElement | null>(null);
  useEffect(() => {
    const topBuffer = isFocusMode ? 40 : 120;
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

  return (
    <div className="bg-background text-foreground relative flex min-h-screen w-full flex-col transition-colors duration-500">
      {/* Scroll Progress Indicator Bar */}
      <div className="bg-secondary/30 pointer-events-none fixed top-0 right-0 left-0 z-50 h-1">
        <div
          className="bg-accent h-full transition-all duration-100 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Top fading gradient header spacer (hidden in focus mode) */}
      {!isFocusMode && (
        <div className="from-background via-background/80 pointer-events-none fixed top-0 right-0 left-0 z-20 h-20 bg-gradient-to-b to-transparent transition-opacity duration-300 sm:h-28" />
      )}

      {/* Ruled ledger paper behind the writing */}
      <div
        aria-hidden="true"
        className="ledger-rules pointer-events-none fixed top-0 right-0 bottom-0 left-0"
      />

      <main
        className={`relative z-30 mx-auto w-full max-w-3xl flex-grow px-4 transition-all duration-300 sm:px-6 ${
          isFocusMode ? "pt-12 pb-[30vh] sm:pt-16" : "pt-16 pb-[40vh] sm:pt-24"
        }`}
      >
        <div className="flex flex-col">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3 sm:gap-6">
            <div className="flex-grow">
              <input
                placeholder="Untitled Log"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                aria-label="Journal entry title"
                className={`text-foreground placeholder:text-muted-foreground/30 mb-2 w-full bg-transparent font-serif leading-tight font-bold tracking-tight transition-all outline-none sm:mb-4 ${
                  isFocusMode
                    ? "text-3xl opacity-80 focus:opacity-100 sm:text-4xl"
                    : "text-4xl sm:text-5xl"
                }`}
              />
            </div>

            {!isFocusMode && (
              <Button
                asChild
                variant="ghost"
                aria-label="Back to dashboard"
                className="border-border/40 bg-background/50 hover:bg-foreground hover:text-background group mt-1 h-9 w-9 shrink-0 rounded-full border p-0 transition-all sm:h-12 sm:w-12"
              >
                <Link href={ROUTES.APP.DASHBOARD}>
                  <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
                </Link>
              </Button>
            )}
          </div>

          {/* Metadata Bar (hidden in focus mode) */}
          {!isFocusMode && (
            <div className="border-border/10 flex flex-col justify-between gap-4 border-y py-4 transition-opacity duration-300 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <time className="text-muted-foreground/70 font-hand text-lg">
                  {formatDisplayDate(date)}
                </time>
              </div>

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
      </main>

      {/* Floating Formatting Toolbar */}
      <div
        className="pointer-events-none fixed right-0 left-0 z-40 flex justify-center px-3 transition-[bottom,left] duration-300 ease-out sm:px-4 md:left-[var(--sidebar-width)]"
        style={{ bottom: toolbarBottom }}
      >
        {editorInstance && (
          <div className="border-border/60 bg-card/95 pointer-events-auto flex w-full max-w-full items-center overflow-hidden rounded-xl border p-1.5 shadow-lg backdrop-blur-md sm:w-auto">
            <EditorToolbar
              editor={editorInstance}
              isFocusMode={isFocusMode}
              onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
              typewriterEnabled={typewriterEnabled}
              onToggleTypewriter={() =>
                setTypewriterEnabled(!typewriterEnabled)
              }
              ambientSound={ambientSound}
              onChangeAmbientSound={setAmbientSound}
            />
          </div>
        )}
      </div>

      {/* Save Status Indicator (hidden in focus mode unless saving/error) */}
      <div
        className={`pointer-events-none fixed right-6 bottom-6 z-50 transition-opacity duration-300 sm:pointer-events-auto ${isFocusMode ? "opacity-30 hover:opacity-100" : "opacity-100"}`}
      >
        <SaveIndicator status={saveStatus} syncState={syncState} />
      </div>
    </div>
  );
}
