"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@withink/ui/button";
import { IconButton } from "@withink/ui/icon-button";
import { Calendar, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { ROUTES } from "@/constants/routes";
import { safeStorage } from "@/lib/safe-storage";

interface YesterdayBannerProps {
  yesterday: string;
  today: string;
}

/** Session-scoped dismissal, keyed by the missed date so a different missed
 *  day asks again tomorrow. */
function dismissalKey(yesterday: string) {
  return `withink-yesterday-banner-dismissed:${yesterday}`;
}

/**
 * The quiet "you still have time to write yesterday" note. A hairline card,
 * dismissible for the session — it informs once and never nags.
 */
export function YesterdayBanner({ yesterday, today }: YesterdayBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    // Synced after mount so SSR and the first client render agree; reading
    // sessionStorage during render would mismatch hydration.
    if (safeStorage.getSessionItem(dismissalKey(yesterday)) === "true") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissed(true);
    }
  }, [yesterday]);

  const dismiss = () => {
    safeStorage.setSessionItem(dismissalKey(yesterday), "true");
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          key="yesterday-banner"
          initial={reduceMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
          className="border-border bg-card flex flex-col justify-between gap-4 rounded-xl border p-5 sm:flex-row sm:items-center"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-foreground text-sm font-bold">
                Write Yesterday&apos;s Reflection
              </h4>
              <p className="text-muted-foreground text-xs leading-relaxed">
                It looks like you missed writing yesterday. You still have
                time to capture your thoughts before the archive seals.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-1 self-end sm:self-center">
            <Button asChild className="h-11 w-full cursor-pointer px-5 sm:h-10 sm:w-auto">
              <Link
                href={`${ROUTES.APP.ENTRY(yesterday)}?today=${today}` as Route}
              >
                Write Yesterday
              </Link>
            </Button>
            <IconButton
              variant="ghost"
              aria-label="Dismiss this reminder"
              onClick={dismiss}
              className="-mr-1 shrink-0"
            >
              <X className="h-4 w-4" />
            </IconButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
