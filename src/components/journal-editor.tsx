/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Editor from "@/components/editor";
import { SaveIndicator } from "@/components/save-indicator";
import { useAutoSave } from "@/hooks/use-auto-save";
import { Toolbar } from "./editor/toolbar";

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
  const [editorInstance, setEditorInstance] = useState<any>(null);

  const saveStatus = useAutoSave({
    date,
    title,
    contentHtml: editorContent.html,
    contentText: editorContent.text,
    contentJson: editorContent.json,
  });

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <div className="fixed top-20 left-0 right-0 z-10 flex justify-center pointer-events-none">
        {editorInstance && (
          <div className="pointer-events-auto">
            <Toolbar editor={editorInstance} />
          </div>
        )}
      </div>

      <main className="max-w-3xl mx-auto px-6 pt-26 pb-14">
        <input
          placeholder="Untitled"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-4xl font-bold bg-transparent outline-none text-foreground placeholder:text-muted-foreground/20 tracking-tight mb-3"
        />
        <p className="text-sm text-muted-foreground mb-8">{formatDate(date)}</p>
        <Editor
          content={initialContent}
          onChange={setEditorContent}
          onEditorReady={setEditorInstance}
        />
      </main>

      {/* Save indicator — fixed bottom right */}
      <div className="fixed bottom-6 right-6 z-50">
        <SaveIndicator status={saveStatus} />
      </div>
    </div>
  );
}
