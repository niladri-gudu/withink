"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Global critical failure:", error);
  }, [error]);

  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-background text-foreground antialiased flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="max-w-md mx-auto space-y-2">
          <span className="text-4xl">🍂</span>
          <h2 className="text-2xl font-serif font-semibold tracking-tight">
            A critical error occurred
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            The sanctuary has encountered a critical system error. Please restart or try reloading the application.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <Button onClick={() => reset()} variant="default">
            Restore Connection
          </Button>
          <Button
            onClick={() => (window.location.href = "/")}
            variant="ghost"
          >
            Go Home
          </Button>
        </div>
      </body>
    </html>
  );
}
