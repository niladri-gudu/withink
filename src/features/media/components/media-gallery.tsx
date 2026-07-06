"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  X,
  Loader2,
  ImageIcon,
  Search,
  Grid,
  List,
  Calendar,
  HardDrive,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  getFullMediaLibraryAction,
  getStorageStatsAction,
  type MediaFile,
  type StorageStats,
} from "../actions/media-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// The full-screen lightbox only opens on user click. Load it lazily and skip
// SSR so it never lands in the gallery's initial client bundle.
const MediaLightbox = dynamic(
  () => import("./media-lightbox").then((m) => ({ default: m.MediaLightbox })),
  { ssr: false },
);

export function MediaGallery() {
  const [files, setFiles] = React.useState<MediaFile[]>([]);
  const [stats, setStats] = React.useState<StorageStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [statsLoading, setStatsLoading] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState<"date-desc" | "date-asc" | "size-desc" | "size-asc">("date-desc");
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

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
    fetchStats();
  };

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
