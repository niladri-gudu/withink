"use client";

import * as React from "react";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { resetPassword } from "@/lib/auth-client";
import { resetPasswordSchema, type ResetPasswordInput } from "../validation/auth";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function ResetPasswordFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setGlobalError(null);

    if (!token) {
      setGlobalError("Invalid or expired session link");
      toast.error("Invalid reset token.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await resetPassword({
        token,
        newPassword: data.password,
      });

      setIsLoading(false);

      if (res.error) {
        setGlobalError(res.error.message || "Failed to update secret");
        toast.error(res.error.message || "Reset password failed.");
        return;
      }

      toast.success("Security credentials updated. Please sign in.");
      router.push(ROUTES.AUTH.LOGIN);
    } catch (err: unknown) {
      setIsLoading(false);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-card border border-border/80 shadow-md rounded-xl p-6 sm:p-8 space-y-6 sm:space-y-8 animate-in fade-in duration-300 select-none">
      <div className="space-y-1.5 text-center sm:text-left">
        <h1 className="text-h2 font-serif font-bold text-foreground">
          Reset access.
        </h1>
        <p className="text-caption font-mono uppercase tracking-[0.2em]">
          Restoring archives • Update security credentials
        </p>
      </div>

      {globalError && (
        <div className="bg-destructive/5 border border-destructive/20 p-3 rounded-lg animate-in fade-in slide-in-from-top-2">
          <p className="text-[10px] font-mono text-destructive uppercase tracking-widest text-center">
            Warning: {globalError}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5 relative group">
          <div className="flex justify-between items-end">
            <label
              htmlFor="password"
              className="text-helper text-muted-foreground/80 font-mono tracking-wider ml-1"
            >
              New Secret Key
            </label>
            {errors.password?.message && (
              <span className="text-[10px] font-mono text-destructive uppercase tracking-tight animate-in fade-in">
                {"// "}{errors.password.message}
              </span>
            )}
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className={`h-11 px-4 pr-12 text-base ${
                errors.password ? "border-destructive/60 focus-visible:ring-destructive/30" : ""
              }`}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute cursor-pointer right-3 top-1/2 -translate-y-1/2 text-xs font-mono uppercase tracking-wider text-muted-foreground/60 hover:text-foreground transition-colors p-1"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="space-y-1.5 relative group">
          <div className="flex justify-between items-end">
            <label
              htmlFor="confirmPassword"
              className="text-helper text-muted-foreground/80 font-mono tracking-wider ml-1"
            >
              Confirm Secret Key
            </label>
            {errors.confirmPassword?.message && (
              <span className="text-[10px] font-mono text-destructive uppercase tracking-tight animate-in fade-in">
                {"// "}{errors.confirmPassword.message}
              </span>
            )}
          </div>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="••••••••"
              className={`h-11 px-4 pr-12 text-base ${
                errors.confirmPassword ? "border-destructive/60 focus-visible:ring-destructive/30" : ""
              }`}
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute cursor-pointer right-3 top-1/2 -translate-y-1/2 text-xs font-mono uppercase tracking-wider text-muted-foreground/60 hover:text-foreground transition-colors p-1"
            >
              {showConfirm ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            className="w-full h-11 rounded-lg font-medium text-base hover:scale-[1.01] active:scale-[0.99] transition-transform relative overflow-hidden cursor-pointer"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-primary">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span>Updating...</span>
              </div>
            ) : (
              "Update Secret"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense fallback={
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <ResetPasswordFormContent />
    </Suspense>
  );
}
