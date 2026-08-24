"use client";

import * as React from "react";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@withink/ui/button";
import { Input } from "@withink/ui/input";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ROUTES } from "@/constants/routes";
import { resetPassword } from "@/lib/auth-client";

import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "../validation/auth";

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
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="bg-card border-border/80 animate-in fade-in mx-auto w-full max-w-md select-none space-y-6 rounded-xl border p-6 shadow-sm duration-300 sm:space-y-8 sm:p-8">
      <div className="space-y-1.5 text-center sm:text-left">
        <h1 className="text-h2 text-foreground font-serif font-bold">
          Reset access.
        </h1>
        <p className="text-caption font-serif uppercase tracking-[0.2em]">
          Set a new key for your notebook
        </p>
      </div>

      {globalError && (
        <div className="bg-destructive/5 border-destructive/20 animate-in fade-in slide-in-from-top-2 rounded-lg border p-3">
          <p className="text-destructive text-center font-serif text-[10px] uppercase tracking-widest">
            Warning: {globalError}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="group relative space-y-1.5">
          <div className="flex items-end justify-between">
            <label
              htmlFor="password"
              className="text-helper text-muted-foreground/80 ml-1 font-serif tracking-wider"
            >
              New Secret Key
            </label>
            {errors.password?.message && (
              <span
                id="password-error"
                className="text-destructive animate-in fade-in font-serif text-[10px] uppercase tracking-tight"
              >
                {errors.password.message}
              </span>
            )}
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              className={`h-11 px-4 pr-12 text-base ${
                errors.password
                  ? "border-destructive/60 focus-visible:ring-destructive/30"
                  : ""
              }`}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide secret key" : "Show secret key"}
              aria-pressed={showPassword}
              className="text-muted-foreground/60 hover:text-foreground focus-visible:ring-ring absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1 font-serif text-xs uppercase tracking-wider transition-colors focus-visible:rounded focus-visible:outline-none focus-visible:ring-2"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="group relative space-y-1.5">
          <div className="flex items-end justify-between">
            <label
              htmlFor="confirmPassword"
              className="text-helper text-muted-foreground/80 ml-1 font-serif tracking-wider"
            >
              Confirm Secret Key
            </label>
            {errors.confirmPassword?.message && (
              <span
                id="confirm-password-error"
                className="text-destructive animate-in fade-in font-serif text-[10px] uppercase tracking-tight"
              >
                {errors.confirmPassword.message}
              </span>
            )}
          </div>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={
                errors.confirmPassword ? "confirm-password-error" : undefined
              }
              className={`h-11 px-4 pr-12 text-base ${
                errors.confirmPassword
                  ? "border-destructive/60 focus-visible:ring-destructive/30"
                  : ""
              }`}
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              aria-label={
                showConfirm
                  ? "Hide confirm secret key"
                  : "Show confirm secret key"
              }
              aria-pressed={showConfirm}
              className="text-muted-foreground/60 hover:text-foreground focus-visible:ring-ring absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1 font-serif text-xs uppercase tracking-wider transition-colors focus-visible:rounded focus-visible:outline-none focus-visible:ring-2"
            >
              {showConfirm ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            className="relative h-11 w-full cursor-pointer overflow-hidden font-serif text-sm font-medium uppercase tracking-[0.15em] transition-transform hover:scale-[1.01] active:scale-[0.99]"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="bg-primary absolute inset-0 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                <span>Updating…</span>
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
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      }
    >
      <ResetPasswordFormContent />
    </Suspense>
  );
}
