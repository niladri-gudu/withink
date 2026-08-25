"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@withink/ui/dialog";

export interface DayVignette {
  title: string;
  quote: string;
  words: number;
}

interface DayVignetteDialogProps {
  day: number | null;
  vignette: DayVignette | null;
  moodLabel: string | null;
  moodBadgeClass: string | null;
  onClose: () => void;
}

export function DayVignetteDialog({
  day,
  vignette,
  moodLabel,
  moodBadgeClass,
  onClose,
}: DayVignetteDialogProps) {
  const open = day !== null && vignette !== null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        className="rounded-xl p-6 sm:max-w-md md:p-7"
      >
        {day !== null && vignette ? (
          <>
            <div className="border-border/70 flex items-center gap-3 border-b pb-4 pr-8">
              <span className="text-foreground font-serif text-base font-bold">
                July {day}
              </span>
              {moodLabel ? (
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${moodBadgeClass ?? ""}`}
                >
                  {moodLabel}
                </span>
              ) : null}
            </div>

            <div className="mt-4">
              <DialogTitle className="text-foreground font-serif text-xl font-bold">
                {vignette.title}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground border-border/70 mt-3 border-l pl-4 font-serif text-sm leading-relaxed italic">
                &ldquo;{vignette.quote}&rdquo;
              </DialogDescription>
            </div>

            <div className="text-muted-foreground border-border/70 mt-5 flex items-center justify-between border-t pt-4 font-serif text-xs">
              <span>{vignette.words} words</span>
              <span className="font-hand text-lg">kept for later.</span>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
