"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Trash2,
  X,
  Loader2,
  ImageIcon,
  ArrowLeft,
  ArrowRight,
  Search,
  Grid,
  List,
  Copy,
  Check,
  Calendar,
  HardDrive,
  ExternalLink,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  getFullMediaLibraryAction,
  getStorageStatsAction,
  deleteMediaFileAction,
  findEntryForMediaAction,
  type MediaFile,
  type StorageStats,
} from "../actions/media-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function MediaGallery() {
  const [files, setFiles] = React.useState<MediaFile[]>([]);
  const [stats, setStats] = React.useState<StorageStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [statsLoading, setStatsLoading] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState<"date-desc" | "date-asc" | "size-desc" | "size-asc">("date-desc");
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);
  
  // Lightbox details
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [entryDate, setEntryDate] = React.useState<string | null>(null);
  const [entrySearchLoading, setEntrySearchLoading] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const fetchLibrary = React.useCallback(async () => {
    setLoading(true);
    const res = await getFullMediaLibraryAction();
    if (res.success && res.data) {
      setFiles(res.data);
    } else {
      toast.error(res.error || "Failed to load media files.");
    }
    setLoading(false);
  }, []);

  const fetchStats = React.useCallback(async () => {
    setStatsLoading(true);
    const res = await getStorageStatsAction();
    if (res.success && res.data) {
      setStats(res.data);
    }
    setStatsLoading(false);
  }, []);

  React.useEffect(() => {
    queueMicrotask(() => {
      fetchLibrary();
      fetchStats();
    });
  }, [fetchLibrary, fetchStats]);

  // When lightbox image changes, search which entry it belongs to
  React.useEffect(() => {
    if (lightboxIndex === null) {
      queueMicrotask(() => {
        setEntryDate(null);
        setShowDeleteConfirm(false);
      });
      return;
    }

    const currentFile = files[lightboxIndex];
    if (!currentFile) return;

    queueMicrotask(() => {
      setEntryDate(null);
      setShowDeleteConfirm(false);
      setEntrySearchLoading(true);
    });

    findEntryForMediaAction(currentFile.url)
      .then((res) => {
        queueMicrotask(() => {
          if (res.success && res.date) {
            setEntryDate(res.date);
          } else {
            setEntryDate(null);
          }
        });
      })
      .finally(() => {
        queueMicrotask(() => {
          setEntrySearchLoading(false);
        });
      });
  }, [lightboxIndex, files]);

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(url);
      toast.success("Direct link copied to clipboard");
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleDelete = async (file: MediaFile) => {
    setDeleting(file.key);
    try {
      const res = await deleteMediaFileAction(file.key);
      if (res.success) {
        setFiles((prev) => prev.filter((f) => f.key !== file.key));
        setLightboxIndex(null);
        fetchStats();
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

  const handlePrev = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    }
  };

  const handleNext = () => {
    if (lightboxIndex !== null && lightboxIndex < filteredFiles.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  // Filter & Sort logic computed inline to let React Compiler handle optimization
  let filteredFiles = [...files];

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredFiles = filteredFiles.filter((file) => {
      const filename = file.key.split("/").pop() || "";
      return filename.toLowerCase().includes(query);
    });
  }

  filteredFiles.sort((a, b) => {
    if (sortBy === "date-desc") {
      const timeA = a.lastModified ? new Date(a.lastModified).getTime() : 0;
      const timeB = b.lastModified ? new Date(b.lastModified).getTime() : 0;
      return timeB - timeA;
    }
    if (sortBy === "date-asc") {
      const timeA = a.lastModified ? new Date(a.lastModified).getTime() : 0;
      const timeB = b.lastModified ? new Date(b.lastModified).getTime() : 0;
      return timeA - timeB;
    }
    if (sortBy === "size-desc") {
      return b.size - a.size;
    }
    if (sortBy === "size-asc") {
      return a.size - b.size;
    }
    return 0;
  });

  const lightboxFile = lightboxIndex !== null ? filteredFiles[lightboxIndex] : null;

  return (
    <div className="space-y-6">
      {/* Storage stats card */}
      <Card className="border border-border/60 bg-card/40 backdrop-blur-md rounded-2xl overflow-hidden shadow-sm">
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 select-none">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-secondary rounded-xl text-primary mt-1 md:mt-0">
              <HardDrive className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Sanctuary Archives
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight">
                  {statsLoading ? "..." : `${stats?.usedMB || 0} MB`}
                </span>
                <span className="text-sm text-muted-foreground">
                  of {stats?.limitMB || 50} MB used
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 md:max-w-md space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{statsLoading ? "Loading storage..." : `${stats?.fileCount || 0} objects`}</span>
              <span>{statsLoading ? "0%" : `${stats?.percentUsed || 0}%`}</span>
            </div>
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-500 ease-out"
                style={{ width: `${statsLoading ? 0 : stats?.percentUsed || 0}%` }}
              />
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              fetchLibrary();
              fetchStats();
              toast.success("Refreshed gallery");
            }}
            disabled={loading || statsLoading}
            className="self-end md:self-auto h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
            title="Refresh gallery"
          >
            <RefreshCw className={`h-4 w-4 ${loading || statsLoading ? "animate-spin" : ""}`} />
          </Button>
        </CardContent>
      </Card>

      {/* Filter and Control Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search filenames..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 h-10 rounded-xl bg-card/60 border-border/60 focus:bg-background focus-visible:ring-ring"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-secondary text-muted-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <select
            value={sortBy}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as "date-desc" | "date-asc" | "size-desc" | "size-asc")}
            className="h-10 px-3 rounded-xl border border-border/60 bg-card/60 text-sm focus:outline-none focus:border-border-hover text-foreground/80 cursor-pointer"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="size-desc">Largest Size</option>
            <option value="size-asc">Smallest Size</option>
          </select>

          <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl border border-border/30">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("grid")}
              className={`h-8 w-8 rounded-lg p-0 ${
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("list")}
              className={`h-8 w-8 rounded-lg p-0 ${
                viewMode === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-body-small text-muted-foreground">Reading archives...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <Card className="border border-dashed border-border/60 bg-card/20 py-20 rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-4 max-w-sm mx-auto">
            <div className="p-4 bg-secondary/65 rounded-full text-muted-foreground/60 shadow-inner">
              <ImageIcon className="h-8 w-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-title font-semibold">No memories found</h3>
              <p className="text-body-small text-muted-foreground">
                {searchQuery
                  ? "We couldn&apos;t find any objects matching your search query."
                  : "Photos or images you drag and drop into your journal editor will appear here."}
              </p>
            </div>
            {!searchQuery && (
              <Button asChild className="rounded-xl mt-2">
                <Link href="/dashboard">Write Today&apos;s Entry</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        /* Grid Layout */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-in fade-in duration-300">
          {filteredFiles.map((file, index) => {
            const filename = file.key.split("/").pop() || "";
            return (
              <div
                key={file.key}
                onClick={() => setLightboxIndex(index)}
                className="group relative aspect-square rounded-2xl overflow-hidden border border-border/60 bg-card shadow-sm cursor-pointer"
              >
                <Image
                  src={file.url}
                  alt={filename}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-300 ease-out group-hover:scale-103 group-hover:brightness-95"
                />
                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                  <span className="text-[10px] text-white font-bold uppercase tracking-widest bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm shadow-sm flex items-center gap-1.5">
                    View Memory <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List Layout */
        <div className="space-y-2.5 animate-in fade-in duration-300">
          {filteredFiles.map((file, index) => {
            const filename = file.key.split("/").pop() || "";
            const sizeKB = (file.size / 1024).toFixed(1);
            const dateStr = file.lastModified
              ? new Date(file.lastModified).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "Unknown date";

            return (
              <div
                key={file.key}
                onClick={() => setLightboxIndex(index)}
                className="flex items-center justify-between p-3.5 rounded-xl border border-border/50 bg-card/40 hover:bg-card hover:border-border transition-all cursor-pointer group shadow-sm select-none"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-border/40 shrink-0 bg-secondary">
                    <Image
                      src={file.url}
                      alt={filename}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                      {filename}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      {dateStr}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs shrink-0 text-muted-foreground">
                  <span className="font-mono bg-secondary/65 px-2 py-1 rounded-md text-[10px] text-foreground/80">
                    {sizeKB} KB
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / View Modal */}
      {lightboxIndex !== null && lightboxFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Close backdrop click */}
          <div className="absolute inset-0 cursor-default" onClick={() => setLightboxIndex(null)} />

          <div className="relative max-w-3xl w-full mx-4 bg-card border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col z-10 animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute top-4 right-4 z-50 p-2 rounded-full bg-background/60 hover:bg-background text-foreground transition-all cursor-pointer backdrop-blur-sm shadow-sm border border-border/20"
              aria-label="Close preview"
            >
              <X size={16} />
            </button>

            {/* Image Preview Container */}
            <div className="relative w-full aspect-video bg-black/95 flex items-center justify-center">
              <Image
                src={lightboxFile.url}
                alt="Preview"
                fill
                priority
                sizes="100vw"
                className="object-contain p-2"
              />

              {/* Prev Button */}
              {lightboxIndex > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-background/50 hover:bg-background/80 text-foreground transition-all shadow-md border border-border/20"
                  aria-label="Previous image"
                >
                  <ArrowLeft size={16} />
                </button>
              )}

              {/* Next Button */}
              {lightboxIndex < filteredFiles.length - 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
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
                  {lightboxFile.key.split("/").pop()}
                </p>
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <span>{(lightboxFile.size / 1024).toFixed(1)} KB</span>
                  <span>•</span>
                  <span>
                    {lightboxFile.lastModified
                      ? new Date(lightboxFile.lastModified).toLocaleDateString()
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
                  onClick={() => handleCopyLink(lightboxFile.url)}
                  className="h-9 px-3 gap-1.5 rounded-xl text-xs font-medium border-border/60 hover:bg-secondary"
                >
                  {copiedKey === lightboxFile.url ? (
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
                      onClick={() => handleDelete(lightboxFile)}
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
      )}
    </div>
  );
}
