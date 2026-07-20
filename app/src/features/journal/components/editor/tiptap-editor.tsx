/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import UnderlineExt from "@tiptap/extension-underline";
import ImageExt from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import CharacterCount from "@tiptap/extension-character-count";
import { toast } from "sonner";

let uploadCounter = 0;
function generateTempId(): string {
  uploadCounter += 1;
  return `upload-${uploadCounter}`;
}

interface EditorProps {
  content?: any;
  onChange?: (data: { html: string; text: string; json: any }) => void;
  onEditorReady?: (editor: any) => void;
}

export default function TiptapEditor({
  content = "",
  onChange,
  onEditorReady,
}: EditorProps) {
  function getEditorSnapshot(editorInstance: any) {
    const html = editorInstance.getHTML();
    return {
      html: html === "<p></p>" ? "" : html,
      text: editorInstance.getText().trim(),
      json: editorInstance.getJSON(),
    };
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      UnderlineExt,
      ImageExt.configure({ inline: false, allowBase64: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", class: "text-primary underline cursor-pointer" },
      }),
      Placeholder.configure({
        placeholder: "Start writing your thoughts...",
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      CharacterCount,
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "tiptap max-w-none focus:outline-none text-[1.125rem] leading-[1.65] font-serif text-foreground min-h-[350px] md:min-h-[450px]",
        "aria-label": "Journal entry content",
      },
      // Paste handler for images
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        const imageItem = items.find((item) => item.type.startsWith("image"));

        if (imageItem) {
          const file = imageItem.getAsFile();
          if (file) {
            uploadAndInsertImage(view.state, view.dispatch, file);
            return true; // Prevents default paste
          }
        }
        return false;
      },
      // Drop handler for files
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith("image/")) {
            uploadAndInsertImage(view.state, view.dispatch, file);
            return true; // Prevents default drop
          }
        }
        return false;
      },
    },
    onCreate({ editor: createdEditor }) {
      onChange?.(getEditorSnapshot(createdEditor));
      onEditorReady?.(createdEditor);
    },
    onUpdate({ editor: updatedEditor }) {
      onChange?.(getEditorSnapshot(updatedEditor));
    },
    immediatelyRender: false,
  });

  // Upload logic (uses R2 upload API, falls back to base64)
  async function uploadAndInsertImage(state: any, dispatch: any, file: File) {
    if (!editor) return;

    const tempId = generateTempId();

    // 1. Insert temporary loading placeholder image
    editor
      .chain()
      .focus()
      .setImage({ src: "/uploading.png", alt: tempId })
      .run();

    try {
      // 2. Try pre-signed URL upload
      const res = await fetch("/api/media/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });

      if (!res.ok) {
        throw new Error("Presigned URL failed");
      }

      const { presignedUrl, publicUrl } = await res.json();

      // 3. Upload binary file
      await fetch(presignedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      // 4. Replace placeholder with R2 URL
      replacePlaceholder(tempId, publicUrl);
      toast.success("Image uploaded successfully");
    } catch {
      // Fallback: Convert to base64 locally so it still functions in Phase 5
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const base64Url = readerEvent.target?.result as string;
        if (base64Url) {
          replacePlaceholder(tempId, base64Url);
          toast.success("Image embedded locally");
        } else {
          removePlaceholder(tempId);
          toast.error("Failed to load image");
        }
      };
      reader.readAsDataURL(file);
    }
  }

  function replacePlaceholder(placeholderAlt: string, finalSrc: string) {
    if (!editor) return;
    const { doc } = editor.state;
    doc.descendants((node, pos) => {
      if (node.type.name === "image" && node.attrs.alt === placeholderAlt) {
        editor
          .chain()
          .focus()
          .setNodeSelection(pos)
          .deleteSelection()
          .setImage({ src: finalSrc })
          .run();
      }
    });
  }

  function removePlaceholder(placeholderAlt: string) {
    if (!editor) return;
    const { doc } = editor.state;
    doc.descendants((node, pos) => {
      if (node.type.name === "image" && node.attrs.alt === placeholderAlt) {
        editor.chain().focus().setNodeSelection(pos).deleteSelection().run();
      }
    });
  }

  if (!editor) return null;

  return (
    <div
      className="bg-transparent max-w-none cursor-text min-h-[350px] md:min-h-[450px]"
      onClick={(e) => {
        if (e.target === e.currentTarget && editor) {
          editor.chain().focus("end").run();
        }
      }}
    >
      <EditorContent editor={editor} />
    </div>
  );
}

