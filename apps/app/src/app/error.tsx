"use client";

import { useEffect } from "react";
import { Button } from "@withink/ui/button";
import { Waves } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to console and send to server telemetry
    console.error("Root boundary caught error:", error);

    const payload = {
      message: error.message || "Unknown error",
      stack: error.stack,
      digest: error.digest,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    };

    fetch("/api/monitoring/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.error("Failed to send error log:", err);
    });
  }, [error]);

  return (
    <div className="mx-auto flex h-screen w-full max-w-md flex-col items-center justify-center space-y-6 p-6 text-center">
      <div className="space-y-2">
        <span className="border-border bg-secondary/50 text-muted-foreground mx-auto flex h-16 w-16 items-center justify-center rounded-full border">
          <Waves className="h-7 w-7" />
        </span>
        <h1 className="text-foreground font-serif text-2xl font-semibold tracking-tight">
          Something went astray
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          The diary encountered an unexpected ripple. Don&apos;t worry, your
          journal is safe. We can try loading it again.
        </p>
      </div>

      <div className="flex items-center space-x-4">
        <Button onClick={() => reset()} variant="default">
          Try Again
        </Button>
        <Button onClick={() => (window.location.href = "/")} variant="ghost">
          Return Home
        </Button>
      </div>
    </div>
  );
}
