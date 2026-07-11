"use client";

import * as React from "react";
import { Archive, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * "Your data" section for the Settings page. Downloads a complete ZIP backup
 * of the user's journal from the export API. Self-contained so the export
 * feature owns its own UI while visually matching the settings section cards.
 */
export function DataExportCard() {
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    const toastId = toast.loading("Preparing your archive…");

    try {
      const res = await fetch("/api/export");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to prepare your archive");
      }

      const blob = await res.blob();
      const filename =
        parseFilename(res.headers.get("Content-Disposition")) ??
        `withink-export-${new Date().toLocaleDateString("en-CA")}.zip`;

      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Your archive is ready", { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary/60 text-muted-foreground">
          <Archive className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-h3">Your data</h2>
          <p className="text-body-small text-muted-foreground">
            Download a complete backup of your journal — plain text, formatted entries, images, and
            a metadata file.
          </p>
        </div>
      </div>

      <div className="mt-7 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-body-small text-muted-foreground">
          Everything you&apos;ve written, packaged into a single ZIP you own forever.
        </p>
        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="rounded-full gap-2 shrink-0"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparing…
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download archive
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

/** Extracts the filename from a Content-Disposition header, if present. */
function parseFilename(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? null;
}
