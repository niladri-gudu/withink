/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";
import TiptapEditor from "./editor/tiptap-editor";
import { EditorToolbar } from "./editor/editor-toolbar";
import { MoodSelector } from "./mood-selector";
import { SaveIndicator } from "./save-indicator";
import { useAutoSave } from "../hooks/use-auto-save";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { useEncryption } from "@/providers/encryption-provider";
import { decryptText } from "@/lib/crypto-client";

interface Props {
  date: string;
  initialTitle: string;
  initialContent: any;
  initialMood: number | null;
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) return dateStr;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
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
  const [toolbarBottom, setToolbarBottom] = useState(32);

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
        const fallback = initialContent || {};
        setDecryptedContent(fallback);
        setEditorContent((prev) => ({ ...prev, json: fallback }));
      }
    };
    loadContent();
  }, [initialContent, isClientEncrypted, masterKey]);

  // Setup scroll-padding for visual viewport (keyboard avoidance on mobile/Safari)
  useEffect(() => {
    const topBuffer = 120;
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
  }, [toolbarBottom]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const fromBottom =
        window.innerHeight - viewport.height - viewport.offsetTop;
      setToolbarBottom(Math.max(fromBottom, 0) + 24);
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
    editorReady,
  );

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 relative flex flex-col w-full">
      {/* Top fading gradient header spacer */}
      <div className="fixed top-0 left-0 right-0 z-20 h-20 sm:h-28 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-[40vh] w-full relative z-30 flex-grow">
        <div className="flex flex-col">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3 sm:gap-6">
            <div className="flex-grow">
              <input
                placeholder="Untitled Log"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                aria-label="Journal entry title"
                className="w-full text-4xl sm:text-5xl font-serif font-bold bg-transparent outline-none text-foreground placeholder:text-muted-foreground/30 tracking-tight leading-tight transition-all mb-2 sm:mb-4"
              />
            </div>

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
          </div>

          {/* Metadata Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-y border-border/10">
            <div className="flex items-center gap-3">
              <time className="text-xs font-mono uppercase tracking-widest text-muted-foreground/70">
                {formatDate(date)}
              </time>
            </div>

            <MoodSelector selected={mood} onSelect={setMood} />
          </div>

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
        className="fixed left-0 right-0 z-40 flex justify-center pointer-events-none transition-[bottom] duration-300 ease-out px-4"
        style={{ bottom: toolbarBottom }}
      >
        {editorInstance && (
          <div className="pointer-events-auto w-full sm:w-auto max-w-full rounded-2xl border border-border/60 bg-background/90 backdrop-blur-md shadow-lg p-1.5 flex items-center overflow-hidden">
            <EditorToolbar editor={editorInstance} />
          </div>
        )}
      </div>

      {/* Save Status Indicator */}
      <div className="fixed bottom-6 right-6 z-50 pointer-events-none sm:pointer-events-auto">
        <SaveIndicator status={saveStatus} />
      </div>
    </div>
  );
}
