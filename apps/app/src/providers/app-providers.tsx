"use client";

import * as React from "react";
import { ThemeProvider } from "@withink/theme";
import { Toaster } from "sonner";

import { requestPersistentStorage } from "@/lib/persistent-storage";
import { useMediaQuery } from "@/hooks/use-media-query";

import { EncryptionProvider } from "./encryption-provider";
import QueryClientProvider from "./query-client-provider";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  // Phones: toasts land bottom-center, lifted above the tab bar and the
  // home indicator. Desktop keeps the classic top-right corner.
  const isMobileNav = useMediaQuery("(max-width: 767px)");

  // Keep the encrypted offline diary cache from being evicted under storage
  // pressure (notably iOS). Asked once per mount; the browser decides.
  React.useEffect(() => {
    void requestPersistentStorage();
  }, []);

  return (
    <QueryClientProvider>
      <EncryptionProvider>
        <ThemeProvider>
          {children}
          <Toaster
            position={isMobileNav ? "bottom-center" : "top-right"}
            offset={
              isMobileNav ? "calc(env(safe-area-inset-bottom) + 4.75rem)" : 32
            }
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
      </EncryptionProvider>
    </QueryClientProvider>
  );
}
