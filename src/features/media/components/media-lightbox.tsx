"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Trash2,
  X,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteMediaFileAction,
  findEntryForMediaAction,
  type MediaFile,
} from "../actions/media-actions";
import { Button } from "@/components/ui/button";

interface MediaLightboxProps {
  /** The full filtered, sorted list currently in view (for prev/next bounds). */
  files: MediaFile[];
  /** Index into `files` of the file being shown, or null when closed. */
  index: number | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  /** Called after a file is successfully deleted so the gallery can refresh. */
  onDeleted: (key: string) => void;
}

/**
 * Full-screen media preview. Extracted from the gallery so it can be
 * lazy-loaded (`ssr: false`) — it only ever mounts when the user opens an
 * image, so it does not belong in the gallery's initial bundle.
 */
export function MediaLightbox({
  files,
  index,
  onClose,
  onPrev,
  onNext,
  onDeleted,
}: MediaLightboxProps) {
  const file = index !== null ? files[index] : null;

  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [entryDate, setEntryDate] = React.useState<string | null>(null);
  const [entrySearchLoading, setEntrySearchLoading] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  // When the shown image changes, look up which entry it belongs to.
  React.useEffect(() => {
    if (index === null || !file) {
      queueMicrotask(() => {
        setEntryDate(null);
        setShowDeleteConfirm(false);
      });
      return;
    }

    queueMicrotask(() => {
      setEntryDate(null);
      setShowDeleteConfirm(false);
      setEntrySearchLoading(true);
    });

    let cancelled = false;
    findEntryForMediaAction(file.url)
      .then((res) => {
        if (cancelled) return;
        queueMicrotask(() => {
          setEntrySearchLoading(false);
          setEntryDate(res.success && res.date ? res.date : null);
        });
      })
      .catch(() => {
        if (cancelled) return;
        queueMicrotask(() => setEntrySearchLoading(false));
      });

    return () => {
      cancelled = true;
    };
  }, [index, file]);

  // Close on Escape.
  React.useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onPrev();
      if (e.key === "ArrowRight" && index < files.length - 1) onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, files.length, onClose, onPrev, onNext]);

  if (index === null || !file) return null;

  const filename = file.key.split("/").pop() || "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(file.url);
      setCopiedKey(file.url);
      toast.success("Direct link copied to clipboard");
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleDelete = async () => {
    setDeleting(file.key);
    try {
      const res = await deleteMediaFileAction(file.key);
      if (res.success) {
        onDeleted(file.key);
        toast.success("Memory removed from sanctuary");
      } else {
        toast.error(res.error || "Failed to delete file.");
      }
    } catch {
      toast.error("An unexpected error occurred during deletion.");
    } finally {
      setDeleting(null);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Close backdrop click */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      <div className="relative max-w-3xl w-full mx-4 bg-card border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col z-10 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-background/60 hover:bg-background text-foreground transition-all cursor-pointer backdrop-blur-sm shadow-sm border border-border/20"
          aria-label="Close preview"
        >
          <X size={16} />
        </button>

        {/* Image Preview Container */}
        <div className="relative w-full aspect-video bg-black/95 flex items-center justify-center">
          <Image
            src={file.url}
            alt={filename}
            fill
            priority
            sizes="100vw"
            className="object-contain p-2"
          />

          {/* Prev Button */}
          {index > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-background/50 hover:bg-background/80 text-foreground transition-all shadow-md border border-border/20"
              aria-label="Previous image"
            >
              <ArrowLeft size={16} />
            </button>
          )}

          {/* Next Button */}
          {index < files.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-background/50 hover:bg-background/80 text-foreground transition-all shadow-md border border-border/20"
              aria-label="Next image"
            >
              <ArrowRight size={16} />
            </button>
          )}
        </div>

        {/* Info details footer */}
        <div className="p-6 bg-card border-t border-border flex flex-col md:flex-row md:items-center justify-between gap-5 select-none">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-mono text-muted-foreground truncate max-w-sm sm:max-w-md">
              {filename}
            </p>
            <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
              <span>{(file.size / 1024).toFixed(1)} KB</span>
              <span>•</span>
              <span>
                {file.lastModified
                  ? new Date(file.lastModified).toLocaleDateString()
                  : "Unknown date"}
              </span>
              <span>•</span>
              {entrySearchLoading ? (
                <span className="flex items-center gap-1.5 text-accent font-medium">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Checking entries...
                </span>
              ) : entryDate ? (
                <span className="flex items-center gap-1 text-primary font-medium">
                  Woven on{" "}
                  <Link
                    href={`/entries/${entryDate}`}
                    className="underline hover:text-accent flex items-center gap-0.5 font-semibold"
                  >
                    {entryDate}
                    <ExternalLink className="h-3 w-3 inline" />
                  </Link>
                </span>
              ) : (
                <span className="text-muted-foreground/60 italic">Orphaned (Not in entries)</span>
              )}
            </div>
          </div>

          {/* Actions panel */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="h-9 px-3 gap-1.5 rounded-xl text-xs font-medium border-border/60 hover:bg-secondary"
            >
              {copiedKey === file.url ? (
                <>
                  <Check className="h-3.5 w-3.5 text-success" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy Link
                </>
              )}
            </Button>

            {showDeleteConfirm ? (
              <div className="flex items-center gap-1 bg-destructive/10 border border-destructive/20 p-1 rounded-xl animate-in slide-in-from-right-2 duration-200">
                <span className="text-[10px] text-destructive font-semibold px-2 shrink-0">
                  Delete from entries?
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting !== null}
                  className="h-7 px-2.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider"
                >
                  {deleting !== null ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Yes, Delete"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting !== null}
                  className="h-7 px-2.5 rounded-lg text-[10px] font-semibold text-muted-foreground hover:bg-secondary"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Delete memory"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
