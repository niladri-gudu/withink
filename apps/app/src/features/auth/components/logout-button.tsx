"use client";

import { useRouter } from "next/navigation";
import { Button } from "@withink/ui/button";
import { toast } from "sonner";

import { ROUTES } from "@/constants/routes";
import { signOut } from "@/lib/auth-client";
import { clearSwCaches } from "@/lib/sw-cache";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const res = await signOut();
      if (res?.error) {
        toast.error(res.error.message || "Failed to sign out.");
        return;
      }
      await clearSwCaches();
      toast.success("Logged out of your sanctuary.");
      router.refresh();
      router.push(ROUTES.AUTH.LOGIN);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during logout.";
      toast.error(message);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      className="h-7 cursor-pointer px-2 text-[10px]"
    >
      Log Out
    </Button>
  );
}
