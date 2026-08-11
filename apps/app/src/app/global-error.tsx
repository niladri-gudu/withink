"use client";

import { useEffect } from "react";
import { Button } from "@withink/ui/button";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Global critical failure:", error);

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
      console.error("Failed to send global error log:", err);
    });
  }, [error]);

  return (
    <html lang="en" className="h-full">
      <body className="bg-background text-foreground flex h-full flex-col items-center justify-center space-y-6 p-6 text-center antialiased">
        <div className="mx-auto max-w-md space-y-2">
          <span className="text-4xl">🍂</span>
          <h2 className="font-serif text-2xl font-semibold tracking-tight">
            A critical error occurred
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            The sanctuary has encountered a critical system error. Please
            restart or try reloading the application.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <Button onClick={() => reset()} variant="default">
            Restore Connection
          </Button>
          <Button onClick={() => (window.location.href = "/")} variant="ghost">
            Go Home
          </Button>
        </div>
      </body>
    </html>
  );
}
