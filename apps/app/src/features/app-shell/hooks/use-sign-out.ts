"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ROUTES } from "@/constants/routes";
import { clearSessionCookies, signOut } from "@/lib/auth-client";
import { clearSwCaches } from "@/lib/sw-cache";
import { useEncryption } from "@/providers/encryption-provider";

/**
 * Sign out and tear the session down in order: auth cookie, then the
 * in-memory master key / decrypted caches, then the service-worker caches.
 *
 * No router.refresh() after signOut — the current route's session is gone
 * and a refresh would fire a server re-render that can race with the
 * navigation to the login page.
 */
export function useSignOut() {
  const router = useRouter();
  const { lock } = useEncryption();

  return React.useCallback(async () => {
    try {
      const res = await signOut();
      if (res?.error) {
        toast.error(res.error.message || "Failed to sign out.");
        return;
      }
      clearSessionCookies();
      lock();
      await clearSwCaches();
      toast.success("Logged out of your diary.");
      router.push(ROUTES.AUTH.LOGIN);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during logout.";
      toast.error(message);
    }
  }, [lock, router]);
}
