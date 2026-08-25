"use client";

import type { Editor } from "@tiptap/react";
import { Button } from "@withink/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@withink/ui/dialog";
import { Input } from "@withink/ui/input";

interface LinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor;
  /** Controlled field value; the opener seeds it from the selection. */
  href: string;
  onHrefChange: (href: string) => void;
  /** Whether the selection carried a link when the dialog was opened. */
  hasExistingLink: boolean;
}

/**
 * Replaces the old `window.prompt` link flow: a small focus-trapped dialog
 * with a real URL input, Insert, and Remove. Radix owns the focus trap and
 * Escape; Enter submits.
 */
export function LinkDialog({
  open,
  onOpenChange,
  editor,
  href,
  onHrefChange,
  hasExistingLink,
}: LinkDialogProps) {
  const applyLink = () => {
    const url = href.trim();
    if (url === "") {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
    onOpenChange(false);
  };

  const removeLink = () => {
    editor.chain().focus().unsetLink().run();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Insert a link</DialogTitle>
          <DialogDescription>
            Point to a page worth revisiting.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyLink();
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="withink-link-url"
              className="text-running-head text-muted-foreground/70"
            >
              URL
            </label>
            <Input
              id="withink-link-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://"
              value={href}
              onChange={(e) => onHrefChange(e.target.value)}
              autoFocus
            />
          </div>

          <DialogFooter>
            {hasExistingLink && (
              <Button
                type="button"
                variant="ghost"
                onClick={removeLink}
                className="cursor-pointer"
              >
                Remove
              </Button>
            )}
            <Button type="submit" className="cursor-pointer">
              Insert
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
