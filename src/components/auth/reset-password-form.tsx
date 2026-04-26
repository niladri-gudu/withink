/* eslint-disable react/jsx-no-comment-textnodes */
"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { resetPassword } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string;
    confirm?: string;
    global?: string;
  }>({});

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    if (!token) {
      setErrors({ global: "Invalid or expired session link" });
      return;
    }

    const newErrors: typeof errors = {};
    if (!password) newErrors.password = "Secret required";
    else if (password.length < 8) newErrors.password = "8+ characters needed";
    if (password !== confirmPassword) newErrors.confirm = "Keys do not match";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    const res = await resetPassword({
      token,
      newPassword: password,
    });
    setIsLoading(false);

    if (res.error) {
      setErrors({ global: res.error.message || "Failed to update secret" });
    } else {
      router.push("/signin");
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-12 px-8 antialiased">
      <div className="w-full max-w-sm mx-auto space-y-10">
        <div className="space-y-3">
          <h1 className="text-5xl font-black tracking-tighter leading-[0.85]">
            Reset <br />
            <span className="text-primary/60 italic font-serif font-light text-6xl">
              access.
            </span>
          </h1>
          <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.2em]">
            Restoring archives // Update security credentials
          </p>
        </div>

        {errors.global && (
          <div className="bg-destructive/5 border border-destructive/20 p-3 rounded-xl animate-in fade-in slide-in-from-top-2">
            <p className="text-[10px] font-mono text-destructive uppercase tracking-widest text-center">
              // Warning: {errors.global}
            </p>
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-6">
          <div className="space-y-2 relative group">
            <div className="flex justify-between items-end">
              <Label className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground/60 ml-1">
                New.Secret.Key
              </Label>
              {errors.password && (
                <span className="text-[9px] font-mono text-destructive uppercase tracking-tighter animate-in fade-in slide-in-from-right-1">
                  // {errors.password}
                </span>
              )}
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className={`h-12 bg-transparent border-0 border-b rounded-none px-0 pr-10 focus-visible:ring-0 transition-all placeholder:text-muted-foreground/30 text-lg ${errors.password ? "border-destructive/50" : "border-border/50 focus-visible:border-primary"}`}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password || errors.global) setErrors({});
                }}
              />
              <button
                type="button" // Prevent form submission on click
                onClick={() => setShowPassword(!showPassword)}
                className="absolute cursor-pointer right-0 top-1/2 -translate-y-1/2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 hover:text-primary transition-colors px-2 py-1"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="space-y-2 relative group">
            <div className="flex justify-between items-end">
              <Label className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground/60 ml-1">
                Confirm.Secret.Key
              </Label>
              {errors.confirm && (
                <span className="text-[9px] font-mono text-destructive uppercase tracking-tighter animate-in fade-in slide-in-from-right-1">
                  // {errors.confirm}
                </span>
              )}
            </div>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder="••••••••"
                className={`h-12 bg-transparent border-0 border-b rounded-none px-0 pr-10 focus-visible:ring-0 transition-all placeholder:text-muted-foreground/30 text-lg ${errors.confirm ? "border-destructive/50" : "border-border/50 focus-visible:border-primary"}`}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirm || errors.global) setErrors({});
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute cursor-pointer right-0 top-1/2 -translate-y-1/2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 hover:text-primary transition-colors px-2 py-1"
              >
                {showConfirm ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              className="w-full h-14 rounded-full font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-primary">
                  <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                  <span>Updating...</span>
                </div>
              ) : (
                "Update Secret"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
