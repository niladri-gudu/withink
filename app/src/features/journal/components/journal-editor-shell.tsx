/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

const TiptapEditor = dynamic(() => import("./editor/tiptap-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col space-y-4 animate-pulse py-10 w-full">
      <div className="h-4 bg-muted/60 rounded-md w-[85%]" />
      <div className="h-4 bg-muted/60 rounded-md w-[95%]" />
      <div className="h-4 bg-muted/60 rounded-md w-[70%]" />
      <div className="h-4 bg-muted/60 rounded-md w-[80%]" />
      <div className="h-4 bg-muted/60 rounded-md w-[60%]" />
    </div>
  ),
});
import { EditorToolbar } from "./editor/editor-toolbar";
import { MoodSelector } from "./mood-selector";
import { SaveIndicator } from "./save-indicator";
import { useAutoSave } from "../hooks/use-auto-save";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { useEncryption } from "@/providers/encryption-provider";
import { decryptText } from "@/lib/crypto-client";
import { zenAudioService } from "@/lib/zen-audio";
import { sanctuaryCacheService } from "../services/sanctuary-cache-service";
import { formatDisplayDate } from "@/lib/utils/date";

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

  const [ambientSound, setAmbientSound] = useState<"none" | "rain" | "library" | "forest">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("withink-ambient-sound") as any) || "none";
    }
    return "none";
  });

  const [scrollProgress, setScrollProgress] = useState(0);

  // Sync settings to local storage
  useEffect(() => {
    localStorage.setItem("withink-typewriter-enabled", String(typewriterEnabled));
  }, [typewriterEnabled]);

  useEffect(() => {
    localStorage.setItem("withink-ambient-sound", ambientSound);
  }, [ambientSound]);

  // Track window scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) {
        setScrollProgress(0);
        return;
      }
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(Math.min(progress, 100));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
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
        "Shift", "Control", "Alt", "Meta", "CapsLock",
        "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"
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
        const cachedDoc = await sanctuaryCacheService.getLocalDocument(date, masterKey);
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

        if (typeof initialContent === "string" && initialContent.includes(":")) {
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

  // Setup scroll-padding for visual viewport (keyboard avoidance on mobile/Safari)
  useEffect(() => {
    const topBuffer = isFocusMode ? 40 : 120;
    const bottomBuffer = toolbarBottom + 120;
    document.documentElement.style.scrollPaddingTop = `${topBuffer}px`;
    document.documentElement.style.scrollPaddingBottom = `${bottomBuffer}px`;

    const style = document.createElement("style");
    style.innerHTML = `
      .prose-container p, .prose-container div[contenteditable] > * {
        scroll-margin-top: ${topBuffer}px;
        scroll-margin-bottom: ${bottomBuffer}px;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.documentElement.style.scrollPaddingTop = "0px";
      document.documentElement.style.scrollPaddingBottom = "0px";
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, [toolbarBottom, isFocusMode]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const fromBottom =
        window.innerHeight - viewport.height - viewport.offsetTop;
      setToolbarBottom(Math.max(fromBottom, 0) + 16);
    };
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    update();
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
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
    editorReady && decryptedContent !== null,
  );

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 relative flex flex-col w-full">
      {/* Scroll Progress Indicator Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-secondary/30 pointer-events-none">
        <div
          className="h-full bg-accent transition-all duration-100 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Top fading gradient header spacer (hidden in focus mode) */}
      {!isFocusMode && (
        <div className="fixed top-0 left-0 right-0 z-20 h-20 sm:h-28 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none transition-opacity duration-300" />
      )}

      <main
        className={`max-w-3xl mx-auto px-4 sm:px-6 w-full relative z-30 flex-grow transition-all duration-300 ${
          isFocusMode ? "pt-12 sm:pt-16 pb-[30vh]" : "pt-16 sm:pt-24 pb-[40vh]"
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
                className={`w-full font-serif font-bold bg-transparent outline-none text-foreground placeholder:text-muted-foreground/30 tracking-tight leading-tight transition-all mb-2 sm:mb-4 ${
                  isFocusMode
                    ? "text-3xl sm:text-4xl opacity-80 focus:opacity-100"
                    : "text-4xl sm:text-5xl"
                }`}
              />
            </div>

            {!isFocusMode && (
              <Button
                asChild
                variant="ghost"
                aria-label="Back to dashboard"
                className="rounded-full h-9 w-9 sm:h-12 sm:w-12 p-0 border border-border/40 bg-background/50 group hover:bg-foreground hover:text-background transition-all shrink-0 mt-1"
              >
                <Link href={ROUTES.APP.DASHBOARD}>
                  <ChevronLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
                </Link>
              </Button>
            )}
          </div>

          {/* Metadata Bar (hidden in focus mode) */}
          {!isFocusMode && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-y border-border/10 transition-opacity duration-300">
              <div className="flex items-center gap-3">
                <time className="text-xs font-mono uppercase tracking-widest text-muted-foreground/70">
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
                onEditorReady={(editor) => {
                  setEditorInstance(editor);
                  setEditorReady(true);
                }}
              />
            ) : (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating Formatting Toolbar */}
      <div
        className="fixed left-0 md:left-[var(--sidebar-width)] right-0 z-40 flex justify-center pointer-events-none transition-[bottom,left] duration-300 ease-out px-3 sm:px-4"
        style={{ bottom: toolbarBottom }}
      >
        {editorInstance && (
          <div className="pointer-events-auto w-full sm:w-auto max-w-full rounded-2xl border border-border/60 bg-background/90 backdrop-blur-md shadow-lg p-1.5 flex items-center overflow-hidden">
            <EditorToolbar
              editor={editorInstance}
              isFocusMode={isFocusMode}
              onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
              typewriterEnabled={typewriterEnabled}
              onToggleTypewriter={() => setTypewriterEnabled(!typewriterEnabled)}
              ambientSound={ambientSound}
              onChangeAmbientSound={setAmbientSound}
            />
          </div>
        )}
      </div>

      {/* Save Status Indicator (hidden in focus mode unless saving/error) */}
      <div className={`fixed bottom-6 right-6 z-50 pointer-events-none sm:pointer-events-auto transition-opacity duration-300 ${isFocusMode ? "opacity-30 hover:opacity-100" : "opacity-100"}`}>
        <SaveIndicator status={saveStatus} />
      </div>
    </div>
  );
}
