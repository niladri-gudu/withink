import { useSyncExternalStore } from "react";
import { cn } from "@withink/utils";
import {
  CheckCheck,
  Loader2,
  Lock,
  Save,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { SaveStatus } from "../hooks/use-auto-save";
import type { SyncState } from "../services/journal-sync-service";

// Online status via an external store: SSR snapshot is "online" so the first
// client render always matches the server HTML, then the real value syncs
// without a setState-in-effect round trip.
function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

interface SaveStateView {
  /** Stable identity for AnimatePresence cross-fades. */
  key: string;
  label: string;
  Icon: LucideIcon;
  iconClassName: string;
  spinning?: boolean;
}

/**
 * One source of truth for every save/sync presentation state. Both the
 * floating pill (desktop) and the quiet inline line (editor header on
 * phones) render from this — the states never drift between variants.
 */
function resolveSaveState(
  status: SaveStatus,
  syncState: SyncState,
  isOnline: boolean,
): SaveStateView | null {
  if (status === "saving") {
    return {
      key: "saving",
      label: "Saving…",
      Icon: Loader2,
      iconClassName: "text-muted-foreground",
      spinning: true,
    };
  }
  if (status === "saved") {
    return syncState === "synced"
      ? {
          key: "saved-synced",
          label: "Saved · Synced",
          Icon: CheckCheck,
          iconClassName: "text-accent",
        }
      : {
          key: "saved-pending",
          label: "Saved locally · Syncing",
          Icon: Save,
          iconClassName: "text-accent",
        };
  }
  if (status === "offline") {
    return {
      key: "offline-saved",
      label: "Saved locally · Will sync",
      Icon: Save,
      iconClassName: "text-accent",
    };
  }
  if (status === "locked") {
    return {
      key: "locked",
      label: "Session locked — pending save",
      Icon: Lock,
      iconClassName: "text-accent",
    };
  }
  if (status === "error") {
    return {
      key: "error",
      label: "Save failed",
      Icon: WifiOff,
      iconClassName: "text-destructive",
    };
  }
  if (!isOnline) {
    return {
      key: "offline-badge",
      label: "Working offline",
      Icon: WifiOff,
      iconClassName: "text-accent",
    };
  }
  return null;
}

const SPRING = { type: "spring", stiffness: 380, damping: 26 } as const;

export function SaveIndicator({
  status,
  syncState = "synced",
  variant = "pill",
}: {
  status: SaveStatus;
  syncState?: SyncState;
  variant?: "pill" | "inline";
}) {
  const isOnline = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  const reduceMotion = useReducedMotion();

  if (variant === "inline") {
    const state = resolveSaveState(status, syncState, isOnline);
    if (!state) return null;
    return (
      <span
        role="status"
        aria-live="polite"
        className="flex min-w-0 items-center justify-end gap-1.5 font-serif text-xs"
      >
        <state.Icon
          aria-hidden="true"
          className={cn(
            "h-3 w-3 shrink-0",
            state.iconClassName,
            state.spinning && "animate-spin",
          )}
        />
        <span className="text-muted-foreground truncate">{state.label}</span>
      </span>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {status !== "idle" ? (
        <motion.div
          key={`${status}:${syncState}`}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={reduceMotion ? { duration: 0 } : SPRING}
          className={cn(
            "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs shadow-sm backdrop-blur-md",
            status === "saving" &&
              "bg-background/90 text-muted-foreground border-border",
            status === "saved" &&
              "bg-background/90 border-accent/20 text-accent",
            status === "offline" &&
              "bg-background/90 border-accent/20 text-accent",
            status === "locked" &&
              "bg-background/90 border-accent/20 text-accent",
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
          {status === "saved" && syncState === "synced" && (
            <>
              <CheckCheck className="text-accent h-3 w-3" />
              <span>Saved · Synced</span>
            </>
          )}
          {status === "saved" && syncState === "pending" && (
            <>
              <Save className="text-accent h-3 w-3" />
              <span>Saved locally · Syncing</span>
            </>
          )}
          {status === "offline" && (
            <>
              <Save className="text-accent h-3 w-3" />
              <span>Saved locally · Will sync</span>
            </>
          )}
          {status === "locked" && (
            <>
              <Lock className="text-accent h-3 w-3" />
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
            transition={reduceMotion ? { duration: 0 } : SPRING}
            className="border-accent/20 bg-accent/5 text-accent flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium backdrop-blur-md"
          >
            <WifiOff className="h-3 w-3" />
            <span>Working offline</span>
          </motion.div>
        )
      )}
    </AnimatePresence>
  );
}
