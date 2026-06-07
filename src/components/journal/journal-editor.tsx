/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Editor from "@/components/editor";
import { SaveIndicator } from "@/components/journal/save-indicator";
import { useAutoSave } from "@/hooks/use-auto-save";
import { Toolbar } from "../editor/toolbar";
import Link from "next/link";
import { Button } from "../ui/button";
import { ChevronLeft } from "lucide-react";
import { MoodSelector } from "@/components/journal/mood-selector";

interface Props {
  date: string;
  initialTitle: string;
  initialContent: any;
  initialMood?: number | null;
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function JournalEditor({
  date,
  initialTitle,
  initialContent,
  initialMood,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [mood, setMood] = useState<number | null>(initialMood ?? null);
  const [editorContent, setEditorContent] = useState({
    html: "",
    text: "",
    json: initialContent,
  });
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [toolbarBottom, setToolbarBottom] = useState(32);

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
      document.head.removeChild(style);
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

  const saveStatus = useAutoSave({
    date,
    title,
    mood,
    contentHtml: editorContent.html,
    contentText: editorContent.text,
    contentJson: editorContent.json,
  }, 1500, editorReady);

  return (
    <div className="min-h-dvh bg-background text-foreground selection:bg-primary selection:text-primary-foreground transition-colors duration-500">
      <div className="fixed top-0 left-0 right-0 z-20 h-24 sm:h-32 bg-linear-to-b from-background via-background/80 to-transparent pointer-events-none" />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-22 sm:pt-32 pb-[45vh] relative z-30">
        <div className="flex flex-col">
          {/* 1. HEADER ROW */}
          <div className="flex items-start justify-between gap-3 sm:gap-6">
            <div className="flex-1">
              <input
                placeholder="Untitled_Log"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-[clamp(2.4rem,15vw,4.5rem)] sm:text-7xl font-black bg-transparent outline-none text-foreground placeholder:text-muted-foreground/8 tracking-tight leading-[0.92] sm:leading-[0.9] transition-all mb-2 sm:mb-4"
              />
            </div>

            <Link href="/home" className="shrink-0 mt-1 sm:mt-2">
              <Button
                variant="ghost"
                className="rounded-full h-10 w-10 sm:h-14 sm:w-14 p-0 border border-border/40 bg-background/50 group hover:bg-foreground hover:text-background transition-all"
              >
                <ChevronLeft className="h-6 w-6 group-hover:-translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {/* 2. METADATA BAR - Reduced padding and gaps for phone */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6 py-3.5 sm:py-5 border-y border-border/10">
            <div className="flex items-center gap-4">
              {/* <div className="h-2 w-2 rounded-full bg-primary/40 animate-pulse" /> */}
              <time className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.16em] sm:tracking-[0.2em] text-muted-foreground/60 italic">
                {formatDate(date)}
              </time>
            </div>

            <MoodSelector selected={mood} onSelect={setMood} />
          </div>

          {/* 3. EDITOR AREA - Reduced top margin for mobile */}
          <div className="prose-container mt-1 sm:mt-4 -mx-2 sm:mx-0">
            <Editor
              content={initialContent}
              onChange={setEditorContent}
              onEditorReady={(editor) => {
                setEditorInstance(editor);
                setEditorReady(true);
              }}
            />
          </div>
        </div>
      </main>

      {/* Floating Toolbar */}
      <div
        className="fixed left-0 right-0 z-40 flex justify-center pointer-events-none transition-[bottom] duration-300 ease-out px-2 sm:px-4"
        style={{ bottom: toolbarBottom }}
      >
        {editorInstance && (
          <div className="pointer-events-auto w-full sm:w-auto max-w-[calc(100vw-1rem)] sm:max-w-fit rounded-2xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.22)] p-1 flex items-center overflow-hidden">
            <div className="overflow-x-auto no-scrollbar flex items-center">
              <Toolbar editor={editorInstance} />
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:bottom-6 right-4 sm:right-6 z-50 pointer-events-none sm:pointer-events-auto">
        <SaveIndicator status={saveStatus} />
      </div>
    </div>
  );
}
