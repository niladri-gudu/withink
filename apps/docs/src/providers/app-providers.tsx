"use client";

import * as React from "react";
import { Toaster } from "sonner";

import { ThemeProvider } from "@withink/theme";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
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
  );
}
