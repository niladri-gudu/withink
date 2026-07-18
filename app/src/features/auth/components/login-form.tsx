"use client";

import * as React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { signIn } from "@/lib/auth-client";
import { loginSchema, type LoginInput } from "../validation/auth";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleIcon } from "./google";

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);

    try {
      const res = await signIn.email({
        email: data.email,
        password: data.password,
      });

      setIsLoading(false);

      if (res.error) {
        if (res.error.status === 401) {
          setError("email", { message: "Invalid credentials" });
          setError("password", { message: "Check secret key" });
        } else {
          toast.error(res.error.message || "Authentication failed");
        }
        return;
      }

      router.refresh();
      router.push(ROUTES.APP.DASHBOARD);
    } catch (err: unknown) {
      setIsLoading(false);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(errorMessage);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signIn.social({
        provider: "google",
        callbackURL: ROUTES.APP.DASHBOARD,
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Google authentication failed.";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-card border border-border/80 shadow-md rounded-xl p-6 sm:p-8 space-y-6 sm:space-y-8 animate-in fade-in duration-300 select-none">
      <div className="space-y-1.5 text-center sm:text-left">
        <h1 className="text-h2 font-serif font-bold text-foreground">
          Welcome back.
        </h1>
        <p className="text-caption font-mono uppercase tracking-[0.16em]">
          Verification required • Accessing the archives
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5 relative">
          <div className="flex justify-between items-end">
            <label
              htmlFor="email"
              className="text-helper text-muted-foreground/80 font-mono tracking-wider ml-1"
            >
              Identity Email
            </label>
            {errors.email?.message && (
              <span id="email-error" className="text-[10px] font-mono text-destructive uppercase tracking-tight animate-in fade-in">
                {"// "}{errors.email.message}
              </span>
            )}
          </div>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={`h-11 px-4 text-base ${
              errors.email ? "border-destructive/60 focus-visible:ring-destructive/30" : ""
            }`}
            {...register("email")}
          />
        </div>

        <div className="space-y-1.5 relative">
          <div className="flex justify-between items-end">
            <label
              htmlFor="password"
              className="text-helper text-muted-foreground/80 font-mono tracking-wider ml-1"
            >
              Secret Key
            </label>
            {errors.password?.message && (
              <span id="password-error" className="text-[10px] font-mono text-destructive uppercase tracking-tight animate-in fade-in">
                {"// "}{errors.password.message}
              </span>
            )}
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              className={`h-11 px-4 pr-12 text-base ${
                errors.password ? "border-destructive/60 focus-visible:ring-destructive/30" : ""
              }`}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide secret key" : "Show secret key"}
              aria-pressed={showPassword}
              className="absolute cursor-pointer right-3 top-1/2 -translate-y-1/2 text-xs font-mono uppercase tracking-wider text-muted-foreground/60 hover:text-foreground transition-colors p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="pt-2 space-y-3">
          <Button
            type="submit"
            className="w-full h-11 rounded-lg font-medium text-base hover:scale-[1.01] active:scale-[0.99] transition-transform relative overflow-hidden cursor-pointer"
            disabled={isLoading}
          >
            <div className="flex items-center justify-center gap-2 w-full transition-all duration-200">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-primary">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  <span>Accessing...</span>
                </div>
              )}
              <div
                className={`flex items-center justify-center gap-2 transition-opacity duration-200 ${
                  isLoading ? "opacity-0" : "opacity-100"
                }`}
              >
                <span>Access Journal</span>
              </div>
            </div>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full h-11 rounded-lg font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:bg-muted/40 hover:text-foreground hover:scale-[1.01] active:scale-[0.99] transition-transform cursor-pointer"
            onClick={handleGoogleSignIn}
          >
            <GoogleIcon />
            Continue with Google
          </Button>
        </div>
      </form>

      <div className="flex flex-col items-center gap-3 pt-2">
        <Link
          href={ROUTES.AUTH.FORGOT_PASSWORD}
          className="text-xs font-mono uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors italic"
        >
          Forgot Password?
        </Link>
        <p className="text-center text-xs font-medium text-muted-foreground/75">
          New here?{" "}
          <Link
            href={ROUTES.AUTH.REGISTER}
            className="text-foreground font-semibold border-b border-accent/40 hover:border-accent transition-all pb-0.5 ml-1"
          >
            Begin Journey
          </Link>
        </p>
      </div>
    </div>
  );
}
