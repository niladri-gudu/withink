"use client";

import { useRef } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
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
  Maximize2,
  Minimize2,
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
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onMouseDown={(e) => {
        e.preventDefault();
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
      } ${disabled ? "cursor-not-allowed opacity-30" : ""} `}
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
  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      try {
        const ed = ctx?.editor;
        if (!ed || ed.isDestroyed) {
          return {
            isBold: false,
            isItalic: false,
            isUnderline: false,
            isStrike: false,
            isHighlight: false,
            isCode: false,
            isCodeBlock: false,
            isBlockquote: false,
            isH1: false,
            isH2: false,
            isH3: false,
            isBulletList: false,
            isOrderedList: false,
            isTaskList: false,
            isLink: false,
            canUndo: false,
            canRedo: false,
            words: 0,
            chars: 0,
          };
        }
        return {
          isBold: ed.isActive("bold"),
          isItalic: ed.isActive("italic"),
          isUnderline: ed.isActive("underline"),
          isStrike: ed.isActive("strike"),
          isHighlight: ed.isActive("highlight"),
          isCode: ed.isActive("code"),
          isCodeBlock: ed.isActive("codeBlock"),
          isBlockquote: ed.isActive("blockquote"),
          isH1: ed.isActive("heading", { level: 1 }),
          isH2: ed.isActive("heading", { level: 2 }),
          isH3: ed.isActive("heading", { level: 3 }),
          isBulletList: ed.isActive("bulletList"),
          isOrderedList: ed.isActive("orderedList"),
          isTaskList: ed.isActive("taskList"),
          isLink: ed.isActive("link"),
          canUndo:
            typeof ed.can === "function" && ed.can()?.undo() ? true : false,
          canRedo:
            typeof ed.can === "function" && ed.can()?.redo() ? true : false,
          words: ed.storage.characterCount?.words() ?? 0,
          chars: ed.storage.characterCount?.characters() ?? 0,
        };
      } catch (err) {
        console.error("Tiptap selector error:", err);
        return {
          isBold: false,
          isItalic: false,
          isUnderline: false,
          isStrike: false,
          isHighlight: false,
          isCode: false,
          isCodeBlock: false,
          isBlockquote: false,
          isH1: false,
          isH2: false,
          isH3: false,
          isBulletList: false,
          isOrderedList: false,
          isTaskList: false,
          isLink: false,
          canUndo: false,
          canRedo: false,
          words: 0,
          chars: 0,
        };
      }
    },
  });

  const imageInputRef = useRef<HTMLInputElement>(null);

  const addLink = () => {
    const existing = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL:", existing ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url }).run();
  };

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
    const { state } = editor;
    state.doc.descendants((node, pos) => {
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
    const { state } = editor;
    state.doc.descendants((node, pos) => {
      if (node.type.name === "image" && node.attrs.alt === placeholderAlt) {
        editor
          .chain()
          .deleteRange({ from: pos, to: pos + node.nodeSize })
          .run();
      }
    });
  }

  const readingTime = Math.max(1, Math.ceil(editorState.words / 200));

  return (
    <div
      role="toolbar"
      aria-label="Formatting options"
      className="no-scrollbar flex w-full flex-nowrap items-center gap-1 overflow-x-auto px-1 py-1 sm:gap-1.5"
    >
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editorState.canUndo}
        title="Undo (Ctrl+Z)"
      >
        <Undo className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editorState.canRedo}
        title="Redo (Ctrl+Y)"
      >
        <Redo className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editorState.isH1}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editorState.isH2}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editorState.isH3}
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editorState.isBold}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editorState.isItalic}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editorState.isUnderline}
        title="Underline (Ctrl+U)"
      >
        <Underline className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editorState.isStrike}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        active={editorState.isHighlight}
        title="Highlight text"
      >
        <Highlighter className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editorState.isBulletList}
        title="Bullet list"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editorState.isOrderedList}
        title="Numbered list"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        active={editorState.isTaskList}
        title="Checklist / Task list"
      >
        <SquareCheck className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editorState.isBlockquote}
        title="Blockquote"
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editorState.isCodeBlock || editorState.isCode}
        title="Code block"
      >
        <Code className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={addLink}
        active={editorState.isLink}
        title="Add link"
      >
        <LinkIcon className="h-4 w-4" />
      </ToolbarButton>
      {editorState.isLink && (
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
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={addImage}
      />

      <ToolbarButton
        onClick={() =>
          editor.chain().focus().unsetAllMarks().clearNodes().run()
        }
        title="Clear formatting"
      >
        <RemoveFormatting className="h-4 w-4" />
      </ToolbarButton>

      {onToggleFocusMode && (
        <>
          <Divider />

          {isFocusMode && onToggleTypewriter && (
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

          <ToolbarButton
            onClick={onToggleFocusMode}
            active={isFocusMode}
            title={isFocusMode ? "Exit Focus Mode" : "Zen Focus Mode"}
          >
            {isFocusMode ? (
              <Minimize2 className="text-accent h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </ToolbarButton>
        </>
      )}

      <Divider />

      {/* Live Word Count & Reading Time Badge */}
      <div className="text-muted-foreground/80 bg-muted/40 flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 font-serif text-xs select-none">
        <span>
          {editorState.words} {editorState.words === 1 ? "word" : "words"}
        </span>
        <span className="opacity-40">•</span>
        <span>{readingTime}m read</span>
      </div>
    </div>
  );
}
