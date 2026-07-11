"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";
import { ROUTES } from "@/constants/routes";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const res = await signOut();
      if (res?.error) {
        toast.error(res.error.message || "Failed to sign out.");
        return;
      }
      toast.success("Logged out of your sanctuary.");
      router.refresh();
      router.push(ROUTES.AUTH.LOGIN);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred during logout.";
      toast.error(message);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      className="text-[10px] h-7 px-2 cursor-pointer"
    >
      Log Out
    </Button>
  );
}
