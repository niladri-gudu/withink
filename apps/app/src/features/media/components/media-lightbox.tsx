"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@withink/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import { encryptText, safeDecryptText } from "@/lib/crypto-client";
import { getLocalDateString } from "@/lib/utils/date";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useEncryption } from "@/providers/encryption-provider";
import {
  getAllEntriesAction,
  saveEntryAction,
} from "@/features/journal/actions/entry-actions";
import type { DecryptedEntry } from "@/features/journal/services/journal-service";

import {
  deleteMediaFileAction,
  findEntryForMediaAction,
  type MediaFile,
} from "../actions/media-actions";

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
  const lightboxRef = useFocusTrap(index !== null);

  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [entryDate, setEntryDate] = React.useState<string | null>(null);
  const [entrySearchLoading, setEntrySearchLoading] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const { isClientEncrypted, masterKey } = useEncryption();
  const [cachedEntries, setCachedEntries] = React.useState<
    DecryptedEntry[] | null
  >(null);

  // Load entries once per open/close transition, resetting on each change.
  const isOpen = index !== null;
  const [prevOpen, setPrevOpen] = React.useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    setCachedEntries(null);
  }

  React.useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const loadEntries = async () => {
      try {
        const res = await getAllEntriesAction();
        if (res.success && res.data && !cancelled) {
          setCachedEntries(res.data);
        }
      } catch (err) {
        console.error("Failed to load entries for media search:", err);
      }
    };

    loadEntries();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

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

    const searchForMedia = async () => {
      try {
        if (isClientEncrypted && masterKey) {
          if (!cachedEntries) {
            // Wait for cached entries to load
            return;
          }
          let foundDate: string | null = null;
          for (const entry of cachedEntries) {
            const decryptedHtml = await safeDecryptText(
              entry.contentHtml || "",
              masterKey,
            );
            if (decryptedHtml.includes(file.url)) {
              foundDate = entry.date;
              break;
            }
          }
          if (!cancelled) {
            queueMicrotask(() => {
              setEntrySearchLoading(false);
              setEntryDate(foundDate);
            });
          }
        } else {
          // Fallback to server-side search if client-side encryption is disabled
          const res = await findEntryForMediaAction(file.url);
          if (!cancelled) {
            queueMicrotask(() => {
              setEntrySearchLoading(false);
              setEntryDate(res.success && res.date ? res.date : null);
            });
          }
        }
      } catch (err) {
        console.error("Failed to search entry for media:", err);
        if (!cancelled) {
          queueMicrotask(() => setEntrySearchLoading(false));
        }
      }
    };

    searchForMedia();

    return () => {
      cancelled = true;
    };
  }, [index, file, cachedEntries, isClientEncrypted, masterKey]);

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

  const filename = file ? file.key.split("/").pop() || "" : "";

  const handleCopyLink = async () => {
    if (!file) return;
    try {
      await navigator.clipboard.writeText(file.url);
      setCopiedKey(file.url);
      toast.success("Direct link copied to clipboard");
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  /**
   * Removes a media URL from a single entry and re-saves it client-side.
   * Returns true when the entry changed, false when it did not reference the
   * media, and "error" when it could not be updated.
   */
  const scrubEntryFromMedia = async (
    entry: {
      date: string;
      title: string;
      contentHtml: string;
      contentText: string;
      contentJson: unknown;
      mood: number | null;
    },
    mediaUrl: string,
  ): Promise<boolean | "error"> => {
    if (!masterKey) return "error";
    try {
      const contentHtml =
        (await safeDecryptText(entry.contentHtml || "", masterKey)) || "";
      const contentText =
        (await safeDecryptText(entry.contentText || "", masterKey)) || "";
      const contentJsonRaw = await safeDecryptText(
        typeof entry.contentJson === "string"
          ? entry.contentJson
          : JSON.stringify(entry.contentJson),
        masterKey,
      );

      const escapedUrl = mediaUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const newHtml = contentHtml.replace(
        new RegExp(`<img[^>]*src="${escapedUrl}"[^>]*/?>`, "g"),
        "",
      );

      let newJson = contentJsonRaw;
      try {
        const doc = JSON.parse(contentJsonRaw);
        const scrub = (
          node: {
            type?: string;
            attrs?: { src?: string };
            content?: unknown[];
          } | null,
        ): unknown => {
          if (!node) return null;
          if (node.type === "image" && node.attrs?.src === mediaUrl)
            return null;
          if (Array.isArray(node.content)) {
            node.content = node.content
              .map((n) =>
                scrub(
                  n as {
                    type?: string;
                    attrs?: { src?: string };
                    content?: unknown[];
                  },
                ),
              )
              .filter(Boolean);
          }
          return node;
        };
        newJson = JSON.stringify(scrub(doc));
      } catch {
        // malformed JSON / ciphertext: keep as-is (HTML scrub still applies)
      }

      if (newHtml === contentHtml && newJson === contentJsonRaw) return false;

      const wordCount = contentText.split(/\s+/).filter(Boolean).length;
      const [encTitle, encHtml, encText, encJson] = await Promise.all([
        encryptText(entry.title || "", masterKey),
        encryptText(newHtml, masterKey),
        encryptText(contentText, masterKey),
        encryptText(newJson, masterKey),
      ]);

      const res = await saveEntryAction(
        {
          date: entry.date,
          title: encTitle,
          mood: entry.mood ?? null,
          contentHtml: encHtml,
          contentText: encText,
          contentJson: encJson,
          wordCount,
        },
        getLocalDateString(),
      );

      return res.success ? true : "error";
    } catch {
      return "error";
    }
  };

  const handleDelete = async () => {
    if (!file) return;
    setDeleting(file.key);
    try {
      // Zero-knowledge: scrub affected entries BEFORE removing the file, since
      // the server cannot decrypt client-encrypted content.
      if (isClientEncrypted && masterKey && cachedEntries) {
        for (const entry of cachedEntries) {
          const outcome = await scrubEntryFromMedia(entry, file.url);
          if (outcome === "error") {
            toast.error("Could not update entries. The file was not deleted.");
            return;
          }
        }
      }

      const res = await deleteMediaFileAction(file.key);
      if (res.success) {
        onDeleted(file.key);
        toast.success("Memory removed from diary");
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
    <AnimatePresence>
      {index !== null && file && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
        >
          {/* Close backdrop click */}
          <div className="absolute inset-0 cursor-default" onClick={onClose} />

          <motion.div
            ref={lightboxRef as React.RefObject<HTMLDivElement>}
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 350, damping: 26 }}
            className="bg-card border-border relative z-10 mx-4 flex w-full max-w-3xl flex-col overflow-hidden rounded-xl border shadow-2xl"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="bg-background/60 hover:bg-background text-foreground border-border/20 focus-visible:ring-ring absolute top-4 right-4 z-50 cursor-pointer rounded-full border p-2 shadow-sm backdrop-blur-sm transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              aria-label="Close preview"
            >
              <X size={16} />
            </button>

            {/* Image Preview Container */}
            <div className="relative flex aspect-video w-full items-center justify-center bg-black/95">
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
                  className="bg-background/50 hover:bg-background/80 text-foreground border-border/20 focus-visible:ring-ring absolute top-1/2 left-4 -translate-y-1/2 rounded-full border p-2.5 shadow-md transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
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
                  className="bg-background/50 hover:bg-background/80 text-foreground border-border/20 focus-visible:ring-ring absolute top-1/2 right-4 -translate-y-1/2 rounded-full border p-2.5 shadow-md transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  aria-label="Next image"
                >
                  <ArrowRight size={16} />
                </button>
              )}
            </div>

            {/* Info details footer */}
            <div className="bg-card border-border flex flex-col justify-between gap-5 border-t p-6 select-none md:flex-row md:items-center">
              <div className="min-w-0 space-y-1">
                <p className="text-muted-foreground max-w-sm truncate font-serif text-xs sm:max-w-md">
                  {filename}
                </p>
                <div className="text-muted-foreground flex items-center gap-2.5 text-xs">
                  <span>{(file.size / 1024).toFixed(1)} KB</span>
                  <span>•</span>
                  <span>
                    {file.lastModified
                      ? new Date(file.lastModified).toLocaleDateString()
                      : "Unknown date"}
                  </span>
                  <span>•</span>
                  {entrySearchLoading ? (
                    <span className="text-accent flex items-center gap-1.5 font-medium">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Checking entries…
                    </span>
                  ) : entryDate ? (
                    <span className="text-primary flex items-center gap-1 font-medium">
                      Woven on{" "}
                      <Link
                        href={`/entries/${entryDate}`}
                        className="hover:text-accent flex items-center gap-0.5 font-semibold underline"
                      >
                        {entryDate}
                        <ExternalLink className="inline h-3 w-3" />
                      </Link>
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60 italic">
                      Orphaned (Not in entries)
                    </span>
                  )}
                </div>
              </div>

              {/* Actions panel */}
              <div className="flex shrink-0 items-center gap-2 self-end md:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="border-border/60 hover:bg-secondary focus-visible:ring-ring h-9 gap-1.5 rounded-xl px-3 text-xs font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  {copiedKey === file.url ? (
                    <>
                      <Check className="text-accent h-3.5 w-3.5" />
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
                  <div className="bg-destructive/10 border-destructive/20 animate-in slide-in-from-right-2 flex items-center gap-1 rounded-xl border p-1 duration-200">
                    <span className="text-destructive shrink-0 px-2 text-[10px] font-semibold">
                      Delete from entries?
                    </span>                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={deleting !== null}
                      className="h-7 rounded-lg px-2.5 text-[10px] font-semibold tracking-wider uppercase"
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
                      className="text-muted-foreground hover:bg-secondary h-7 rounded-lg px-2.5 text-[10px] font-semibold"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 focus-visible:ring-ring h-9 w-9 rounded-xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    title="Delete memory"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
