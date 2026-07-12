import { Loader2, CheckCheck, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function SaveIndicator({ status }: { status: SaveStatus }) {
  return (
    <AnimatePresence mode="wait">
      {status !== "idle" && (
        <motion.div
          key={status}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
          className={cn(
            "flex items-center gap-2 text-xs px-3.5 py-1.5 rounded-full border shadow-sm backdrop-blur-md",
            status === "saving" && "bg-background/90 text-muted-foreground border-border",
            status === "saved" && "bg-background/90 text-emerald-600 dark:text-emerald-400 border-emerald-500/10",
            status === "error" && "bg-destructive/10 text-destructive border-destructive/20",
          )}
        >
          {status === "saving" && (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              <span>Saving…</span>
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
