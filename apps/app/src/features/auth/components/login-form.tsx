"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@withink/ui/button";
import { Input } from "@withink/ui/input";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ROUTES } from "@/constants/routes";
import { signIn } from "@/lib/auth-client";

import { loginSchema, type LoginInput } from "../validation/auth";
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
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred.";
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
      const errorMessage =
        err instanceof Error ? err.message : "Google authentication failed.";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="bg-card border-border/80 animate-in fade-in mx-auto w-full max-w-md select-none space-y-6 rounded-xl border p-6 shadow-sm duration-300 sm:space-y-8 sm:p-8">
      <div className="space-y-1.5 text-center sm:text-left">
        <h1 className="text-h2 text-foreground font-serif font-bold">
          Welcome back.
        </h1>
        <p className="text-caption font-serif uppercase tracking-[0.16em]">
          Open your private notebook
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="relative space-y-1.5">
          <div className="flex items-end justify-between">
            <label
              htmlFor="email"
              className="text-helper text-muted-foreground/80 ml-1 font-serif tracking-wider"
            >
              Email
            </label>
            {errors.email?.message && (
              <span
                id="email-error"
                className="text-destructive animate-in fade-in font-serif text-[10px] uppercase tracking-tight"
              >
                {errors.email.message}
              </span>
            )}
          </div>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={`h-11 px-4 text-base ${
              errors.email
                ? "border-destructive/60 focus-visible:ring-destructive/30"
                : ""
            }`}
            {...register("email")}
          />
        </div>

        <div className="relative space-y-1.5">
          <div className="flex items-end justify-between">
            <label
              htmlFor="password"
              className="text-helper text-muted-foreground/80 ml-1 font-serif tracking-wider"
            >
              Secret Key
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
              autoComplete="current-password"
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

        <div className="space-y-3 pt-2">
          <Button
            type="submit"
            className="relative h-11 w-full cursor-pointer overflow-hidden font-serif text-sm font-medium uppercase tracking-[0.15em] transition-transform hover:scale-[1.01] active:scale-[0.99]"
            disabled={isLoading}
          >
            <div className="flex w-full items-center justify-center gap-2 transition-all duration-200">
              {isLoading && (
                <div className="bg-primary absolute inset-0 flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  <span>Opening…</span>
                </div>
              )}
              <div
                className={`flex items-center justify-center gap-2 transition-opacity duration-200 ${
                  isLoading ? "opacity-0" : "opacity-100"
                }`}
              >
                <span>Open Your Journal</span>
              </div>
            </div>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="text-muted-foreground hover:bg-muted/40 hover:text-foreground h-11 w-full cursor-pointer font-serif text-xs uppercase transition-transform hover:scale-[1.01] active:scale-[0.99]"
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
          className="text-muted-foreground/60 hover:text-foreground font-serif text-xs uppercase italic tracking-widest transition-colors"
        >
          Forgot Password?
        </Link>
        <p className="text-muted-foreground/75 text-center text-xs font-medium">
          New here?{" "}
          <Link
            href={ROUTES.AUTH.REGISTER}
            className="text-foreground border-accent/40 hover:border-accent ml-1 border-b pb-0.5 font-semibold transition-all"
          >
            Begin Journey
          </Link>
        </p>
      </div>
    </div>
  );
}
