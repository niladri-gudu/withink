"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {
  QueryClientProvider as BaseQueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";

// Devtools is dev-only; a dynamic (ssr:false) import ensures the chunk never
// ships in production builds (where the NODE_ENV guard below is eliminated).
const ReactQueryDevtools = dynamic(
  () =>
    import("@tanstack/react-query-devtools").then(
      (m) => m.ReactQueryDevtools,
    ),
  { ssr: false },
);

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes cache freshness
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export default function QueryClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = getQueryClient();
  return (
    <BaseQueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </BaseQueryClientProvider>
  );
}
