"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@withink/ui/button";
import { Card, CardContent } from "@withink/ui/card";
import { IconButton } from "@withink/ui/icon-button";
import { Input } from "@withink/ui/input";
import { Select } from "@withink/ui/select";
import {
  Calendar,
  ChevronRight,
  Grid,
  HardDrive,
  ImageIcon,
  List,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { ROUTES } from "@/constants/routes";

import {
  getMediaLibraryAndStatsAction,
  type MediaFile,
  type StorageStats,
} from "../actions/media-actions";

// The full-screen lightbox only opens on user click. Load it lazily and skip
// SSR so it never lands in the gallery's initial client bundle.
const MediaLightbox = dynamic(
  () => import("./media-lightbox").then((m) => ({ default: m.MediaLightbox })),
  { ssr: false },
);

interface MediaGalleryProps {
  /** Server-fetched library so the page doesn't wait on client round trips. */
  initialFiles: MediaFile[];
  initialStats: StorageStats;
}

/** Quota display: MB below a gigabyte, GB above (Free 100MB · Plus 10GB · Pro 50GB). */
function formatStorageLimit(limitMB: number): string {
  return limitMB >= 1024
    ? `${Number((limitMB / 1024).toFixed(1))} GB`
    : `${limitMB} MB`;
}

export function MediaGallery({
  initialFiles,
  initialStats,
}: MediaGalleryProps) {
  const [files, setFiles] = React.useState<MediaFile[]>(initialFiles);
  const [stats, setStats] = React.useState<StorageStats>(initialStats);
  const [loading, setLoading] = React.useState(false);
  const [statsLoading, setStatsLoading] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState<
    "date-desc" | "date-asc" | "size-desc" | "size-asc"
  >("date-desc");
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setStatsLoading(true);
    const res = await getMediaLibraryAndStatsAction();
    if (res.success && res.data) {
      setFiles(res.data.files);
      setStats(res.data.stats);
    } else {
      toast.error(res.error || "Failed to refresh media files.");
    }
    setLoading(false);
    setStatsLoading(false);
  }, []);

  // Filter & Sort, memoized so typing in the search box doesn't re-sort the
  // whole library on every keystroke for the entire component.
  const filteredFiles = React.useMemo(() => {
    let list = files;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter((file) => {
        const filename = file.key.split("/").pop() || "";
        return filename.toLowerCase().includes(query);
      });
    }

    return [...list].sort((a, b) => {
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
  }, [files, searchQuery, sortBy]);

  // Lightbox navigation callbacks. Defined after `filteredFiles` is computed so
  // they close over the live, sorted/filtered list.
  const handlePrev = () => {
    setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
  };
  const handleNext = () => {
    setLightboxIndex((prev) =>
      prev !== null && prev < filteredFiles.length - 1 ? prev + 1 : prev,
    );
  };
  const handleLightboxDeleted = (key: string) => {
    setFiles((prev) => prev.filter((f) => f.key !== key));
    setLightboxIndex(null); // matches the original close-on-delete behavior
    void refresh();
  };

  return (
    <div className="space-y-6">
      {/* Storage stats card — compact single row on phones, two-part on md+ */}
      <Card className="border-border overflow-hidden rounded-xl border">
        <CardContent className="flex flex-col gap-3 p-4 select-none sm:p-5 md:flex-row md:items-center md:gap-5">
          <div className="flex min-w-0 flex-1 items-center gap-3.5">
            <span className="bg-accent/10 text-accent hidden shrink-0 rounded-xl p-3 md:block">
              <HardDrive className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-running-head text-muted-foreground">
                  Diary Archives
                </p>
                <p className="text-muted-foreground shrink-0 text-xs">
                  {statsLoading ? "…" : `${stats?.fileCount || 0} objects`}
                </p>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-semibold tracking-tight sm:text-2xl">
                  {statsLoading ? "…" : `${stats?.usedMB || 0} MB`}
                </span>
                <span className="text-muted-foreground text-sm">
                  of {formatStorageLimit(stats?.limitMB ?? 100)}
                </span>
              </div>
              <div className="bg-secondary mt-2 h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-accent h-full transition-all duration-500 ease-out"
                  style={{
                    width: `${statsLoading ? 0 : stats?.percentUsed || 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <IconButton
            variant="ghost"
            onClick={() => {
              void refresh();
              toast.success("Refreshed gallery");
            }}
            disabled={loading || statsLoading}
            aria-label="Refresh gallery"
            title="Refresh gallery"
            className="text-muted-foreground hover:text-foreground self-end md:self-auto"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading || statsLoading ? "animate-spin" : ""}`}
            />
          </IconButton>
        </CardContent>
      </Card>

      {/* Filter and Control Toolbar */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search filenames..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-card/60 border-border/60 focus:bg-background focus-visible:ring-ring h-10 rounded-xl pr-4 pl-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="hover:bg-secondary text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={sortBy}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setSortBy(
                e.target.value as
                  | "date-desc"
                  | "date-asc"
                  | "size-desc"
                  | "size-asc",
              )
            }
            aria-label="Sort files"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="size-desc">Largest Size</option>
            <option value="size-asc">Smallest Size</option>
          </Select>

          <div className="bg-secondary/50 border-border/30 flex items-center gap-1 rounded-xl border p-1">
            <IconButton
              variant="ghost"
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
              className={
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }
            >
              <Grid className="h-4 w-4" />
            </IconButton>
            <IconButton
              variant="ghost"
              onClick={() => setViewMode("list")}
              aria-label="List view"
              aria-pressed={viewMode === "list"}
              className={
                viewMode === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }
            >
              <List className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      </div>

      {/* Main content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center space-y-3 py-24">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          <p className="text-body-small text-muted-foreground">
            Reading archives…
          </p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <Card className="border-border/60 rounded-xl border border-dashed py-20">
          <CardContent className="mx-auto flex max-w-sm flex-col items-center justify-center space-y-4 text-center">
            <div className="bg-secondary/65 text-muted-foreground/60 rounded-full p-4 shadow-inner">
              <ImageIcon className="h-8 w-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-title font-semibold">No memories found</h3>
              <p className="text-body-small text-muted-foreground">
                {searchQuery
                  ? "We couldn’t find any objects matching your search query."
                  : "Photos or images you drag and drop into your journal editor will appear here."}
              </p>
            </div>
            {!searchQuery && (
              <Button asChild className="mt-2 rounded-xl">
                <Link href={ROUTES.APP.DASHBOARD}>
                  Write Today&apos;s Entry
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        /* Grid Layout — captions always visible (no hover-only overlay) */
        <div className="animate-in fade-in grid grid-cols-2 gap-3 duration-300 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
          {filteredFiles.map((file, index) => {
            const filename = file.key.split("/").pop() || "";
            const dateStr = file.lastModified
              ? new Date(file.lastModified).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "Unknown date";

            return (
              <button
                key={file.key}
                type="button"
                onClick={() => setLightboxIndex(index)}
                aria-label={`View memory: ${filename}, ${dateStr}`}
                className="border-border/60 bg-card focus-visible:ring-ring group relative aspect-square cursor-pointer overflow-hidden rounded-xl border text-left shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <Image
                  src={file.url}
                  alt={filename}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-300 ease-out group-hover:scale-103 group-hover:brightness-95"
                />
                {/* Caption scrim: readable at rest on every breakpoint */}
                <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-black/75 via-black/45 to-transparent px-2.5 pt-6 pb-2">
                  <span className="truncate text-[11px] font-medium text-white">
                    {filename}
                  </span>
                  <span className="text-[10px] tracking-wide text-white/70">
                    {dateStr}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        /* List Layout */
        <div className="animate-in fade-in space-y-2.5 duration-300">
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
              <button
                key={file.key}
                type="button"
                onClick={() => setLightboxIndex(index)}
                aria-label={`View memory: ${filename}`}
                className="border-border/50 bg-card/40 hover:bg-card hover:border-border focus-visible:ring-ring group flex w-full cursor-pointer items-center justify-between rounded-xl border p-3.5 text-left shadow-sm transition-all select-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="border-border/40 bg-secondary relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border">
                    <Image
                      src={file.url}
                      alt={filename}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground max-w-[200px] truncate text-sm font-medium sm:max-w-xs md:max-w-md">
                      {filename}
                    </p>
                    <p className="text-muted-foreground flex items-center gap-1 text-xs">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      {dateStr}
                    </p>
                  </div>
                </div>

                <div className="text-muted-foreground flex shrink-0 items-center gap-4 text-xs">
                  <span className="bg-secondary/65 text-foreground/80 rounded-md px-2 py-1 font-serif text-[10px]">
                    {sizeKB} KB
                  </span>
                  <ChevronRight className="text-muted-foreground h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Lightbox / View Modal — lazy-loaded; only mounts when an image is opened. */}
      <MediaLightbox
        files={filteredFiles}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onPrev={handlePrev}
        onNext={handleNext}
        onDeleted={handleLightboxDeleted}
      />
    </div>
  );
}
