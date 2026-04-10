"use client";

import { useState } from "react";
import Editor from "@/components/editor";
import { SaveIndicator } from "@/components/save-indicator";
import { useAutoSave } from "@/hooks/use-auto-save";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getLocalDateString } from "@/lib/utils/date";

interface Props {
  date: string;
  initialTitle: string;
  initialContent: any;
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function JournalEditor({ date, initialTitle, initialContent }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [editorContent, setEditorContent] = useState({
    html: "",
    text: "",
    json: initialContent,
  });

  const saveStatus = useAutoSave({
    date,
    title,
    contentHtml: editorContent.html,
    contentText: editorContent.text,
    contentJson: editorContent.json,
  });

  const isToday = date === getLocalDateString();

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 border-b border-zinc-800/60 bg-[#020617]/80 backdrop-blur">
        <Link
          href="/journal"
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Journal
        </Link>

        <div className="flex items-center gap-4">
          <SaveIndicator status={saveStatus} />
          <span className="text-xs text-zinc-600">
            {isToday ? "Today" : formatDate(date)}
          </span>
        </div>
      </header>

      {/* Editor area */}
      <main className="max-w-2xl mx-auto px-6 py-14">
        {/* Title */}
        <input
          placeholder="Untitled"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-4xl font-bold bg-transparent outline-none text-zinc-100 placeholder:text-zinc-700 tracking-tight mb-3"
        />

        {/* Date */}
        <p className="text-sm text-zinc-600 mb-8">{formatDate(date)}</p>

        {/* Editor */}
        <Editor
          content={initialContent}
          onChange={setEditorContent}
        />
      </main>
    </div>
  );
}