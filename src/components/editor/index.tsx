/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import UnderlineExt from "@tiptap/extension-underline";
import ImageExt from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";

export default function Editor({
  content = "",
  onChange,
  onEditorReady,
}: {
  content?: string;
  onChange?: (data: { html: string; text: string; json: any }) => void;
  onEditorReady?: (editor: any) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true, keepAttributes: true },
        orderedList: { keepMarks: true, keepAttributes: true },
        code: {},
        hardBreak: {},
      }),
      UnderlineExt,
      ImageExt.configure({ inline: false, allowBase64: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer" },
      }),
      Placeholder.configure({
        placeholder: "Start writing your thoughts...",
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "tiptap max-w-none focus:outline-none text-lg leading-snug text-foreground",
      },
    },
    onCreate({ editor }) {
      onEditorReady?.(editor);
    },
    onUpdate({ editor }) {
      onChange?.({
        html: editor.getHTML(),
        text: editor.getText(),
        json: editor.getJSON(),
      });
    },
    immediatelyRender: false,
  });

  if (!editor) return null;

  return (
    <div className="bg-background">
      <div className="px-8 py-8">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
