"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

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
    <div className="flex h-screen w-full flex-col items-center justify-center p-6 text-center space-y-6 max-w-md mx-auto">
      <div className="space-y-2">
        <span className="text-4xl">🍃</span>
        <h2 className="text-2xl font-serif font-semibold tracking-tight text-foreground">
          Something went astray
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          The sanctuary encountered an unexpected ripple. Don&apos;t worry, your journal is safe. We can try loading it again.
        </p>
      </div>

      <div className="flex items-center space-x-4">
        <Button onClick={() => reset()} variant="default">
          Try Again
        </Button>
        <Button
          onClick={() => (window.location.href = "/")}
          variant="ghost"
        >
          Return Home
        </Button>
      </div>
    </div>
  );
}
