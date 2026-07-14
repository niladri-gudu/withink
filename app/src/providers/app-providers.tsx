"use client";

import * as React from "react";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "sonner";
import QueryClientProvider from "./query-client-provider";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider>
      <ThemeProvider>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--card)",
              color: "var(--card-foreground)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              fontFamily: "var(--font-sans)",
            },
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

