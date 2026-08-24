"use client";

import * as React from "react";
import { Button } from "@withink/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@withink/ui/dialog";
import { Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  /** Body rendered between the description and the actions (extra inputs). */
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** While true the dialog cannot be dismissed and both actions disable. */
  pending?: boolean;
  onConfirm: () => void;
}

/**
 * The ONE app-wide destructive-confirmation convention (Phase 3 decision):
 * a visible trigger opens this centered confirm Dialog — never hover-reveal
 * inline Yes/No strips. Radix owns focus trap + Escape; while `pending` the
 * dialog locks (no escape/outside dismiss) so a delete can't double-fire.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  pending = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && pending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        size="sm"
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (pending) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (pending) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {children}

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
