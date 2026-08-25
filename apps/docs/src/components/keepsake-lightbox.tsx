"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@withink/ui/dialog";
import { IconButton } from "@withink/ui/icon-button";

export interface KeepsakePhoto {
  src: string;
  caption: string;
}

interface KeepsakeLightboxProps {
  photos: KeepsakePhoto[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
}

export function KeepsakeLightbox({
  photos,
  index,
  onIndexChange,
}: KeepsakeLightboxProps) {
  const open = index !== null;
  const photo = open ? photos[index] : undefined;

  const goPrev = React.useCallback(() => {
    if (index === null || index <= 0) return;
    onIndexChange(index - 1);
  }, [index, onIndexChange]);

  const goNext = React.useCallback(() => {
    if (index === null || index >= photos.length - 1) return;
    onIndexChange(index + 1);
  }, [index, photos.length, onIndexChange]);

  /* Swipe navigation: a deliberate horizontal drag past the threshold moves
     between keepsakes (same gesture contract as the app's media lightbox). */
  const handleDragEnd = (
    _event: unknown,
    info: { offset: { x: number }; velocity: { x: number } },
  ) => {
    const swipe = info.offset.x + info.velocity.x * 0.2;
    if (swipe < -64) goNext();
    else if (swipe > 64) goPrev();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onIndexChange(null);
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") goPrev();
          if (e.key === "ArrowRight") goNext();
        }}
        className="gap-0 rounded-xl p-3 sm:max-w-2xl sm:p-4"
      >
        {photo ? (
          <>
            <div className="bg-secondary/20 relative aspect-4/3 w-full touch-pan-y overflow-hidden rounded-md">
              <motion.div
                key={photo.src}
                className="absolute inset-0"
                drag="x"
                dragDirectionLock
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                onDragEnd={handleDragEnd}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                <div className="relative h-full w-full">
                  <Image
                    src={photo.src}
                    alt={photo.caption}
                    fill
                    sizes="(max-width: 640px) 100vw, 512px"
                    priority
                    draggable={false}
                    className="object-cover"
                  />
                </div>
              </motion.div>

              <IconButton
                variant="secondary"
                size="lg"
                aria-label="Previous keepsake"
                onClick={goPrev}
                disabled={index === 0}
                className="bg-background/70 border-border/60 absolute top-1/2 left-2 -translate-y-1/2 rounded-full border backdrop-blur-sm"
              >
                <ChevronLeft className="h-4 w-4" />
              </IconButton>
              <IconButton
                variant="secondary"
                size="lg"
                aria-label="Next keepsake"
                onClick={goNext}
                disabled={index === photos.length - 1}
                className="bg-background/70 border-border/60 absolute top-1/2 right-2 -translate-y-1/2 rounded-full border backdrop-blur-sm"
              >
                <ChevronRight className="h-4 w-4" />
              </IconButton>
            </div>

            <div className="flex items-center justify-between px-1 pt-3 pb-1">
              <DialogTitle className="font-hand text-muted-foreground min-w-0 truncate text-xl font-normal">
                {photo.caption}
              </DialogTitle>
              <span className="text-muted-foreground shrink-0 pl-3 font-serif text-xs tabular-nums">
                {(index ?? 0) + 1} / {photos.length}
              </span>
            </div>
            <DialogDescription className="sr-only">
              Swipe or use the arrows to move between keepsakes.
            </DialogDescription>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
