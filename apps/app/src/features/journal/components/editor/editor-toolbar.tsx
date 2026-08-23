"use client";

import { useCallback, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { Button } from "@withink/ui/button";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Headphones,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Keyboard,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minimize2,
  Plus,
  Quote,
  Redo,
  RemoveFormatting,
  SquareCheck,
  Strikethrough,
  Underline,
  Undo,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";

import { useFormatState } from "./format-state";
import {
  FormattingSheet,
  type FormatAction,
} from "./formatting-sheet";
import { LinkDialog } from "./link-dialog";

interface ToolbarProps {
  editor: Editor;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
  typewriterEnabled?: boolean;
  onToggleTypewriter?: () => void;
  ambientSound?: "none" | "rain" | "library" | "forest";
  onChangeAmbientSound?: (
    sound: "none" | "rain" | "library" | "forest",
  ) => void;
}

// Module scope counter for unique tempIds to avoid calling Date.now() inside the component
let uploadCounter = 0;
function generateTempId(): string {
  uploadCounter += 1;
  return `upload-${uploadCounter}`;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  className,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onMouseDown={(e) => {
        e.preventDefault();
      }}
      onClick={() => {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(10);
        }
        onClick();
      }}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`h-10 w-10 shrink-0 cursor-pointer touch-manipulation rounded-lg p-0 transition-all sm:h-9 sm:w-9 sm:rounded-md ${
        active
          ? "bg-accent/20 text-foreground border-accent/40 border font-semibold shadow-xs"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/70 active:bg-muted"
      } ${disabled ? "cursor-not-allowed opacity-30" : ""} ${className ?? ""}`}
    >
      {children}
    </Button>
  );
}

function Divider() {
  return <div className="bg-border/40 mx-1 h-5 w-px shrink-0" />;
}

export function EditorToolbar({
  editor,
  isFocusMode,
  onToggleFocusMode,
  typewriterEnabled = false,
  onToggleTypewriter,
  ambientSound = "none",
  onChangeAmbientSound,
}: ToolbarProps) {
  const state = useFormatState(editor);

  // Word/character count lives in its own subscription so the button grid does
  // not re-render purely because the count changed on every keystroke.
  const wordCount = useEditorState({
    editor,
    selector: (ctx) => {
      try {
        const ed = ctx?.editor;
        if (!ed || ed.isDestroyed) {
          return { words: 0, chars: 0 };
        }
        return {
          words: ed.storage.characterCount?.words() ?? 0,
          chars: ed.storage.characterCount?.characters() ?? 0,
        };
      } catch (err) {
        console.error("Tiptap word-count selector error:", err);
        return { words: 0, chars: 0 };
      }
    },
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkHref, setLinkHref] = useState("");
  const [linkHasExisting, setLinkHasExisting] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);

  // Seeds + opens the link dialog from whatever the selection carries.
  const openLinkDialog = useCallback(() => {
    const existing = editor.getAttributes("link").href ?? "";
    setLinkHref(existing);
    setLinkHasExisting(!!existing);
    setSheetOpen(false);
    setLinkOpen(true);
  }, [editor]);

  // Runs from the formatting sheet. Link opens its dialog (after the sheet
  // closes so Radix can hand focus over cleanly); image MUST call
  // input.click() synchronously inside the user gesture — iOS Safari drops
  // file choosers opened outside the gesture — and only then closes.
  const handleFormatSelect = useCallback(
    (action: FormatAction) => {
      switch (action) {
        case "h1":
          editor.chain().focus().toggleHeading({ level: 1 }).run();
          break;
        case "h2":
          editor.chain().focus().toggleHeading({ level: 2 }).run();
          break;
        case "h3":
          editor.chain().focus().toggleHeading({ level: 3 }).run();
          break;
        case "strike":
          editor.chain().focus().toggleStrike().run();
          break;
        case "highlight":
          editor.chain().focus().toggleHighlight().run();
          break;
        case "orderedList":
          editor.chain().focus().toggleOrderedList().run();
          break;
        case "quote":
          editor.chain().focus().toggleBlockquote().run();
          break;
        case "code":
          editor.chain().focus().toggleCodeBlock().run();
          break;
        case "clear":
          editor.chain().focus().unsetAllMarks().clearNodes().run();
          break;
        case "link":
          openLinkDialog();
          return;
        case "image":
          imageInputRef.current?.click();
          setSheetOpen(false);
          return;
      }
      setSheetOpen(false);
    },
    [editor, openLinkDialog],
  );

  const cycleAmbient = () => {
    if (!onChangeAmbientSound) return;
    const sequence: ("none" | "rain" | "library" | "forest")[] = [
      "none",
      "rain",
      "library",
      "forest",
    ];
    const currentIndex = sequence.indexOf(ambientSound);
    const nextIndex = (currentIndex + 1) % sequence.length;
    const nextSound = sequence[nextIndex]!;
    onChangeAmbientSound(nextSound);

    const labels = {
      none: "Ambient Sound: Off",
      rain: "Ambient Sound: Soft Rain",
      library: "Ambient Sound: Library Whir",
      forest: "Ambient Sound: Forest Wind",
    };
    toast.success(labels[nextSound]);
  };

  const addImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const tempId = generateTempId();

    // Insert loading placeholder
    editor
      .chain()
      .focus()
      .setImage({ src: "/uploading.png", alt: tempId })
      .run();

    try {
      // Compress the image before uploading (resizes to 1600px WebP at 80% quality)
      const { compressImage } = await import("@/lib/image-compressor");
      const compressedFile = await compressImage(file);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: compressedFile.name,
          contentType: compressedFile.type,
          size: compressedFile.size,
        }),
      });

      if (!res.ok) throw new Error("Upload URL failed");

      const { presignedUrl, publicUrl } = await res.json();

      await fetch(presignedUrl, {
        method: "PUT",
        body: compressedFile,
        headers: { "Content-Type": compressedFile.type },
      });

      replacePlaceholder(tempId, publicUrl);
      toast.success("Image uploaded successfully");
    } catch {
      // Fallback base64
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
  };

  function replacePlaceholder(placeholderAlt: string, finalSrc: string) {
    const { state: docState } = editor;
    docState.doc.descendants((node, pos) => {
      if (node.type.name === "image" && node.attrs.alt === placeholderAlt) {
        editor
          .chain()
          .focus()
          .deleteRange({ from: pos, to: pos + node.nodeSize })
          .setImage({ src: finalSrc })
          .run();
      }
    });
  }

  function removePlaceholder(placeholderAlt: string) {
    const { state: docState } = editor;
    docState.doc.descendants((node, pos) => {
      if (node.type.name === "image" && node.attrs.alt === placeholderAlt) {
        editor
          .chain()
          .deleteRange({ from: pos, to: pos + node.nodeSize })
          .run();
      }
    });
  }

  const readingTime = Math.max(1, Math.ceil(wordCount.words / 200));

  return (
    <>
      <div
        role="toolbar"
        aria-label="Formatting options"
        className="flex w-full min-w-0 items-center gap-1 px-1 py-1"
      >
        {/* Primary cluster. Scrolls only as a last-resort safety net on
            sub-360px screens; at the 375px baseline everything fits. */}
        <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!state.canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!state.canRedo}
            title="Redo (Ctrl+Y)"
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>

          <Divider />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={state.isBold}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={state.isItalic}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={state.isUnderline}
            title="Underline (Ctrl+U)"
          >
            <Underline className="h-4 w-4" />
          </ToolbarButton>

          <Divider />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={state.isBulletList}
            title="Bullet list"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            active={state.isTaskList}
            title="Checklist / Task list"
          >
            <SquareCheck className="h-4 w-4" />
          </ToolbarButton>

          {/* Extended group — desktop density only. On phones these live in
              the formatting sheet behind the "+" trigger. */}
          <div className="hidden min-w-0 items-center gap-0.5 md:flex">
            <Divider />
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              active={state.isH1}
              title="Heading 1"
            >
              <Heading1 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              active={state.isH2}
              title="Heading 2"
            >
              <Heading2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              active={state.isH3}
              title="Heading 3"
            >
              <Heading3 className="h-4 w-4" />
            </ToolbarButton>

            <Divider />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={state.isStrike}
              title="Strikethrough"
            >
              <Strikethrough className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              active={state.isHighlight}
              title="Highlight text"
            >
              <Highlighter className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={state.isOrderedList}
              title="Numbered list"
            >
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={state.isBlockquote}
              title="Blockquote"
            >
              <Quote className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              active={state.isCodeBlock || state.isCode}
              title="Code block"
            >
              <Code className="h-4 w-4" />
            </ToolbarButton>

            <Divider />

            <ToolbarButton
              onClick={openLinkDialog}
              active={state.isLink}
              title="Add link"
            >
              <LinkIcon className="h-4 w-4" />
            </ToolbarButton>
            {state.isLink && (
              <ToolbarButton
                onClick={() => editor.chain().focus().unsetLink().run()}
                title="Remove link"
              >
                <Unlink className="h-4 w-4" />
              </ToolbarButton>
            )}
            <ToolbarButton
              onClick={() => imageInputRef.current?.click()}
              title="Add image"
            >
              <ImageIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().unsetAllMarks().clearNodes().run()
              }
              title="Clear formatting"
            >
              <RemoveFormatting className="h-4 w-4" />
            </ToolbarButton>
          </div>

          {isFocusMode && onToggleTypewriter && (
            <>
              <Divider />
              <ToolbarButton
                onClick={onToggleTypewriter}
                active={typewriterEnabled}
                title={
                  typewriterEnabled
                    ? "Mute Typewriter Clicks"
                    : "Enable Typewriter Clicks"
                }
              >
                <Keyboard
                  className={`h-4 w-4 ${typewriterEnabled ? "text-accent" : ""}`}
                />
              </ToolbarButton>
            </>
          )}
          {isFocusMode && onChangeAmbientSound && (
            <ToolbarButton
              onClick={cycleAmbient}
              active={ambientSound !== "none"}
              title="Change Ambience (Rain/Library/Forest)"
            >
              <Headphones
                className={`h-4 w-4 ${ambientSound !== "none" ? "text-accent" : ""}`}
              />
            </ToolbarButton>
          )}
        </div>

        {/* "+" formatting-sheet trigger — phones/tablets only; md+ keeps the
            full strip inline above. */}
        {!isFocusMode && (
          <ToolbarButton
            onClick={() => setSheetOpen(true)}
            active={sheetOpen}
            title="More formatting"
            className="md:hidden"
          >
            <Plus className="h-4 w-4" />
          </ToolbarButton>
        )}

        {/* Zen exit stays reachable even when the primary cluster scrolls. */}
        {onToggleFocusMode && isFocusMode && (
          <ToolbarButton
            onClick={onToggleFocusMode}
            active
            title="Exit Focus Mode"
          >
            <Minimize2 className="text-accent h-4 w-4" />
          </ToolbarButton>
        )}

        {/* Live word count & reading time, pinned right. Bare count on
            phones (thumb-row budget); full detail from sm up. */}
        <div
          title={`${wordCount.words} words · ${readingTime}m read`}
          className="text-muted-foreground/80 bg-card flex shrink-0 items-center rounded-md px-1.5 py-1 font-serif text-xs tabular-nums select-none sm:bg-transparent sm:px-2"
        >
          <span aria-hidden="true">{wordCount.words}</span>
          <span className="sr-only">
            {wordCount.words} {wordCount.words === 1 ? "word" : "words"}
          </span>
          <span aria-hidden="true" className="hidden sm:inline">
            <span className="px-0.5 opacity-40">•</span>
            {readingTime}m read
          </span>
        </div>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={addImage}
        aria-hidden="true"
        tabIndex={-1}
      />

      <FormattingSheet
        editor={editor}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSelect={handleFormatSelect}
      />

      <LinkDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        editor={editor}
        href={linkHref}
        onHrefChange={setLinkHref}
        hasExistingLink={linkHasExisting}
      />
    </>
  );
}
