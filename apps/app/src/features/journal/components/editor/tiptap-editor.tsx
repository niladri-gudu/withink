/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import CharacterCount from "@tiptap/extension-character-count";
import Highlight from "@tiptap/extension-highlight";
import ImageExt from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import UnderlineExt from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { toast } from "sonner";

let uploadCounter = 0;
function generateTempId(): string {
  uploadCounter += 1;
  return `upload-${uploadCounter}`;
}

// Serializing the whole document (getHTML/getText/getJSON) is O(doc) work that
// must not run on every keystroke. Emit snapshots on a trailing debounce; the
// autosave hook already debounces by 1500ms, so nothing is ever lost, and we
// flush on blur so navigation always carries the latest content.
const SNAPSHOT_DEBOUNCE_MS = 400;

interface EditorProps {
  content?: any;
  onChange?: (data: { html: string; text: string; json: any }) => void;
  onEditorReady?: (editor: any) => void;
}

function getEditorSnapshot(editorInstance: any) {
  const html = editorInstance.getHTML();
  return {
    html: html === "<p></p>" ? "" : html,
    text: editorInstance.getText().trim(),
    json: editorInstance.getJSON(),
  };
}

function TiptapEditor({ content = "", onChange, onEditorReady }: EditorProps) {
  const onChangeRef = useRef(onChange);
  const onEditorReadyRef = useRef(onEditorReady);
  const editorRef = useRef<any>(null);
  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
    onEditorReadyRef.current = onEditorReady;
  });

  const flushSnapshot = useCallback(() => {
    if (snapshotTimerRef.current) {
      clearTimeout(snapshotTimerRef.current);
      snapshotTimerRef.current = null;
    }
    if (editorRef.current) {
      onChangeRef.current?.(getEditorSnapshot(editorRef.current));
    }
  }, []);

  const scheduleSnapshot = useCallback(() => {
    if (snapshotTimerRef.current) {
      clearTimeout(snapshotTimerRef.current);
    }
    snapshotTimerRef.current = setTimeout(() => {
      snapshotTimerRef.current = null;
      if (editorRef.current) {
        onChangeRef.current?.(getEditorSnapshot(editorRef.current));
      }
    }, SNAPSHOT_DEBOUNCE_MS);
  }, []);

  // Flush a pending snapshot when the tab hides or the page unloads so a
  // debounced save never runs from stale content (some unload paths fire
  // pagehide without a preceding visibilitychange). On unmount, flush instead
  // of clearing — dropping the timer used to lose up to ~400ms of typing on
  // date navigation.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushSnapshot();
      }
    };
    const handlePageHide = () => {
      flushSnapshot();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      if (snapshotTimerRef.current) {
        flushSnapshot();
      }
    };
  }, [flushSnapshot]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      UnderlineExt,
      ImageExt.configure({ inline: false, allowBase64: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          class: "text-accent underline cursor-pointer",
        },
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
        if (
          !moved &&
          event.dataTransfer &&
          event.dataTransfer.files &&
          event.dataTransfer.files[0]
        ) {
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
      editorRef.current = createdEditor;
      onChangeRef.current?.(getEditorSnapshot(createdEditor));
      onEditorReadyRef.current?.(createdEditor);
    },
    onUpdate() {
      scheduleSnapshot();
    },
    onBlur() {
      flushSnapshot();
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
      // Compress the image before uploading (resizes to 1600px WebP at 80% quality)
      const { compressImage } = await import("@/lib/image-compressor");
      const compressedFile = await compressImage(file);

      // 2. Try pre-signed URL upload
      const res = await fetch("/api/media/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: compressedFile.name,
          contentType: compressedFile.type,
          size: compressedFile.size,
        }),
      });

      if (!res.ok) {
        throw new Error("Presigned URL failed");
      }

      const { presignedUrl, publicUrl } = await res.json();

      // 3. Upload binary file
      await fetch(presignedUrl, {
        method: "PUT",
        body: compressedFile,
        headers: { "Content-Type": compressedFile.type },
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
      className="min-h-[350px] max-w-none cursor-text bg-transparent md:min-h-[450px]"
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

export default memo(TiptapEditor);
