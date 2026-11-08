"use client";

import * as React from "react";
import { Button } from "@withink/ui/button";
import { Check, Download, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

/**
 * Quiet home-screen install affordance for Settings.
 *
 * Chrome/Edge fire `beforeinstallprompt`; iOS Safari has no install prompt and
 * requires the Share → Add to Home Screen path, so those users get instructions
 * instead of a dead button.
 */
export function InstallAppCard() {
  const [deferredPrompt, setDeferredPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);
  const [installing, setInstalling] = React.useState(false);

  React.useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    // Browser capabilities are only known after mount (SSR has no window);
    // syncing them here is exactly what this effect is for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInstalled(standalone);
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));

    const onBeforeInstall = (event: Event) => {
      // Stop the browser's mini-infobar; Settings owns the invitation.
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="border-border bg-secondary/30 space-y-4 rounded-xl border p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-body-small text-foreground font-medium">
            Withink on your home screen
          </p>
          <p className="text-body-small text-muted-foreground">
            Opens full-screen and keeps your encrypted diary available offline.
          </p>
        </div>

        {installed ? (
          <span className="text-body-small text-accent flex items-center gap-1.5 font-medium">
            <Check className="h-4 w-4" aria-hidden="true" />
            Installed
          </span>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={install}
            disabled={!deferredPrompt || installing}
            className="shrink-0"
          >
            <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {installing ? "Installing…" : "Install app"}
          </Button>
        )}
      </div>

      {!installed && isIOS && (
        <p className="text-caption text-muted-foreground">
          On iPhone or iPad, open this page in Safari, tap{" "}
          <Share className="inline h-3.5 w-3.5" aria-hidden="true" /> Share,
          then choose “Add to Home Screen”.
        </p>
      )}

      {!installed && !isIOS && !deferredPrompt && (
        <p className="text-caption text-muted-foreground">
          Open your browser menu and choose “Install app” or “Add to Home
          screen”.
        </p>
      )}
    </div>
  );
}
