import { useEffect, useState } from "react";
import { cn } from "@withink/utils";
import { CheckCheck, Loader2, Lock, Save, WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type { SaveStatus } from "../hooks/use-auto-save";

export function SaveIndicator({ status }: { status: SaveStatus }) {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <AnimatePresence mode="wait">
      {status !== "idle" ? (
        <motion.div
          key={status}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
          className={cn(
            "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs shadow-sm backdrop-blur-md",
            status === "saving" &&
              "bg-background/90 text-muted-foreground border-border",
            status === "saved" &&
              "bg-background/90 border-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            status === "offline" &&
              "bg-background/90 border-amber-500/10 text-amber-600 dark:text-amber-400",
            status === "locked" &&
              "bg-background/90 border-amber-500/10 text-amber-600 dark:text-amber-400",
            status === "error" &&
              "bg-destructive/10 text-destructive border-destructive/20",
          )}
        >
          {status === "saving" && (
            <>
              <Loader2 className="text-muted-foreground h-3 w-3 animate-spin" />
              <span>Saving…</span>
            </>
          )}
          {status === "saved" && (
            <>
              <CheckCheck className="h-3 w-3 text-emerald-500" />
              <span>Saved & synced</span>
            </>
          )}
          {status === "offline" && (
            <>
              <Save className="h-3 w-3 text-amber-500" />
              <span>Saved locally — will sync</span>
            </>
          )}
          {status === "locked" && (
            <>
              <Lock className="h-3 w-3 text-amber-500" />
              <span>Session locked — pending save</span>
            </>
          )}
          {status === "error" && (
            <>
              <WifiOff className="h-3 w-3" />
              <span>Save failed</span>
            </>
          )}
        </motion.div>
      ) : (
        !isOnline && (
          <motion.div
            key="offline-badge"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-3.5 py-1.5 text-xs font-medium text-amber-500 backdrop-blur-md"
          >
            <WifiOff className="h-3 w-3" />
            <span>Working offline</span>
          </motion.div>
        )
      )}
    </AnimatePresence>
  );
}
