import { Loader2, CheckCheck, WifiOff } from "lucide-react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;

  return (
    <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-muted border border-border tabular-nums">
      {status === "saving" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Saving</span>
        </>
      )}
      {status === "saved" && (
        <>
          <CheckCheck className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">Saved</span>
        </>
      )}
      {status === "error" && (
        <>
          <WifiOff className="h-3 w-3 text-destructive" />
          <span className="text-destructive">Save failed</span>
        </>
      )}
    </div>
  );
}