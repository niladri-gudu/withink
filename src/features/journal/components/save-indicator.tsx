import { Loader2, CheckCheck, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-2 text-xs px-3.5 py-1.5 rounded-full border shadow-sm transition-all duration-300 backdrop-blur-md animate-fade-in",
        status === "saving" && "bg-background/90 text-muted-foreground border-border",
        status === "saved" && "bg-background/90 text-emerald-600 dark:text-emerald-400 border-emerald-500/10",
        status === "error" && "bg-destructive/10 text-destructive border-destructive/20",
      )}
    >
      {status === "saving" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          <span>Saving...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <CheckCheck className="h-3 w-3" />
          <span>Saved</span>
        </>
      )}
      {status === "error" && (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Save failed</span>
        </>
      )}
    </div>
  );
}
