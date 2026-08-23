"use client";

import type { Editor } from "@tiptap/react";
import { Button } from "@withink/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@withink/ui/sheet";
import {
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Link as LinkIcon,
  ListOrdered,
  type LucideIcon,
  Quote,
  RemoveFormatting,
  Strikethrough,
} from "lucide-react";

import { useFormatState } from "./format-state";

export type FormatAction =
  | "h1"
  | "h2"
  | "h3"
  | "strike"
  | "highlight"
  | "orderedList"
  | "quote"
  | "code"
  | "clear"
  | "link"
  | "image";

interface FormattingSheetProps {
  editor: Editor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The toolbar executes actions (and decides what closes when). */
  onSelect: (action: FormatAction) => void;
}

function FormatRow({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(10);
        }
        onClick();
      }}
      className={
        active
          ? "bg-accent/10 text-accent hover:bg-accent/15 flex h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left font-serif text-sm font-medium transition-colors"
          : "text-foreground hover:bg-muted flex h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left font-serif text-sm transition-colors"
      }
    >
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {active && (
        <span
          aria-hidden="true"
          className="bg-accent h-1.5 w-1.5 shrink-0 rounded-full"
        />
      )}
    </button>
  );
}

function RowDivider() {
  return <div aria-hidden="true" className="bg-border/50 mx-2 h-px" />;
}

/**
 * The "+" formatting sheet: every control that doesn't earn a slot on the
 * thumb's primary row — headings, the quieter inline marks, block formats,
 * clear, link, image. Bottom sheet on phones, right folio panel on md+
 * (the Phase-1 `side="auto"` behavior).
 */
export function FormattingSheet({
  editor,
  open,
  onOpenChange,
  onSelect,
}: FormattingSheetProps) {
  const state = useFormatState(editor);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="auto">
        <SheetHeader>
          <SheetTitle>Formatting</SheetTitle>
          <SheetDescription>
            Structure for the page, set in small strokes.
          </SheetDescription>
        </SheetHeader>

        <nav
          aria-label="Text formatting"
          className="no-scrollbar -mx-1 flex-1 overflow-y-auto px-1 pb-2"
        >
          <div className="flex flex-col gap-0.5">
            <div role="group" aria-label="Headings" className="flex flex-col gap-0.5">
              <FormatRow
                icon={Heading1}
                label="Heading 1"
                active={state.isH1}
                onClick={() => onSelect("h1")}
              />
              <FormatRow
                icon={Heading2}
                label="Heading 2"
                active={state.isH2}
                onClick={() => onSelect("h2")}
              />
              <FormatRow
                icon={Heading3}
                label="Heading 3"
                active={state.isH3}
                onClick={() => onSelect("h3")}
              />
            </div>

            <RowDivider />

            <div
              role="group"
              aria-label="Inline marks"
              className="flex flex-col gap-0.5"
            >
              <FormatRow
                icon={Strikethrough}
                label="Strikethrough"
                active={state.isStrike}
                onClick={() => onSelect("strike")}
              />
              <FormatRow
                icon={Highlighter}
                label="Highlight"
                active={state.isHighlight}
                onClick={() => onSelect("highlight")}
              />
              <FormatRow
                icon={ListOrdered}
                label="Numbered list"
                active={state.isOrderedList}
                onClick={() => onSelect("orderedList")}
              />
            </div>

            <RowDivider />

            <div
              role="group"
              aria-label="Blocks and insertions"
              className="flex flex-col gap-0.5"
            >
              <FormatRow
                icon={Quote}
                label="Blockquote"
                active={state.isBlockquote}
                onClick={() => onSelect("quote")}
              />
              <FormatRow
                icon={Code}
                label="Code block"
                active={state.isCodeBlock || state.isCode}
                onClick={() => onSelect("code")}
              />
              <FormatRow
                icon={RemoveFormatting}
                label="Clear formatting"
                onClick={() => onSelect("clear")}
              />
              <FormatRow
                icon={LinkIcon}
                label={state.isLink ? "Edit link" : "Add link"}
                active={state.isLink}
                onClick={() => onSelect("link")}
              />
              <FormatRow
                icon={ImageIcon}
                label="Add image"
                onClick={() => onSelect("image")}
              />
            </div>
          </div>
        </nav>

        {/* Keyboard users can dismiss without hunting; Radix already traps
            focus and handles Escape. */}
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="cursor-pointer"
        >
          Done
        </Button>
      </SheetContent>
    </Sheet>
  );
}
