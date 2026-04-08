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

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!token) {
      alert("Invalid or missing token. Please request a new reset link.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setLoading(true);

    const res = await authClient.resetPassword({
      token,
      newPassword: password,
    });

    setLoading(false);

    if (res.error) {
      alert(res.error.message);
      return;
    }

    alert("Password reset successful!");
    router.push("/signin");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      {/* Background depth effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(24,24,27,1),rgba(9,9,11,1))]" />

      <Card className="w-full max-w-md bg-zinc-950 border-zinc-800/50 shadow-2xl backdrop-blur-sm relative overflow-hidden">
        {/* Subtle top accent line */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-500/50 to-transparent" />

        <CardHeader className="space-y-2 pb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800">
            <ShieldCheck className="h-6 w-6 text-zinc-400" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-zinc-100">
            Reset Password
          </CardTitle>
          <CardDescription className="text-zinc-500 text-base">
            Secure your account with a new password.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-zinc-400 font-medium ml-1">
                New Password
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-zinc-600 group-focus-within:text-zinc-300 transition-colors" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="bg-zinc-900/40 border-zinc-800 pl-10 h-11 text-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-400 transition-all placeholder:text-zinc-700"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirm-password" className="text-zinc-400 font-medium ml-1">
                Confirm New Password
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-zinc-600 group-focus-within:text-zinc-300 transition-colors" />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  className="bg-zinc-900/40 border-zinc-800 pl-10 h-11 text-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-400 transition-all placeholder:text-zinc-700"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Button
            className="w-full h-11 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl transition-all active:scale-[0.98]"
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
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
              <p className="text-xs text-red-400">
                Invalid reset link. Please check your email for the correct URL.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}