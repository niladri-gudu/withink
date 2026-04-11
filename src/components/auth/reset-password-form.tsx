"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!token) {
      toast.error("Invalid or missing token. Please request a new reset link.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    const res = await authClient.resetPassword({
      token,
      newPassword: password,
    });
    setLoading(false);

    if (res.error) {
      toast.error(res.error.message);
      return;
    }

    toast.success("Password updated successfully.");
    setTimeout(() => router.push("/signin"), 1500);
  };

  return (
    <Card className="w-full max-w-md border-border shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-border to-transparent" />

      <CardHeader className="space-y-2 pb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted border border-border">
          <ShieldCheck className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
          Reset Password
        </CardTitle>
        <CardDescription className="text-muted-foreground text-base">
          Secure your account with a new password.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-6">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label
              htmlFor="password"
              className="text-muted-foreground font-medium ml-1"
            >
              New Password
            </Label>
            <div className="relative group">
              <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/50 group-focus-within:text-foreground transition-colors" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="pl-10 h-11 bg-foreground/5"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label
              htmlFor="confirm-password"
              className="text-muted-foreground font-medium ml-1"
            >
              Confirm New Password
            </Label>
            <div className="relative group">
              <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground/50 group-focus-within:text-foreground transition-colors" />
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                className="pl-10 h-11 bg-foreground/5"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
        </div>

        <Button
          className="w-full h-11 rounded-xl font-semibold"
          onClick={handleReset}
          disabled={loading || !password || password !== confirmPassword}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetting...
            </>
          ) : (
            "Update Password"
          )}
        </Button>

        {!token && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
            <p className="text-xs text-destructive">
              Invalid reset link. Please check your email for the correct URL.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
