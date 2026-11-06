"use client";

import { useEffect } from "react";
import { Button } from "@withink/ui/button";

import { reportClientError } from "@/lib/monitoring/report-client-error";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Global critical failure:", error);
    reportClientError(error, "global");
  }, [error]);

  return (
    <html lang="en" className="h-full">
      <body className="bg-background text-foreground flex h-full flex-col items-center justify-center space-y-6 p-6 text-center antialiased">
        <div className="mx-auto max-w-md space-y-2">
          <span className="text-4xl">🍂</span>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">
            A critical error occurred
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            The diary has encountered a critical system error. Please restart or
            try reloading the application.
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
