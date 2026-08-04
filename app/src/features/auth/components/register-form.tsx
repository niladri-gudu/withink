"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Loader2, PenLine } from "lucide-react";
import { toast } from "sonner";

import { signUp, signIn } from "@/lib/auth-client";
import { registerSchema, type RegisterInput } from "../validation/auth";
import { checkIdentityExists } from "../actions/auth";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleIcon } from "./google";

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [verifyPending, setVerifyPending] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);

    try {
      // 1. Verify if email exists
      const exists = await checkIdentityExists(data.email);
      if (exists) {
        setIsLoading(false);
        setError("email", { message: "Identity already established" });
        return;
      }

      // 2. Perform signUp
      const res = await signUp.email({
        name: data.name,
        email: data.email,
        password: data.password,
      });

      setIsLoading(false);

      if (res.error) {
        toast.error(res.error.message || "Failed to initialize identity.");
        return;
      }

      setRegisteredEmail(data.email);
      setVerifyPending(true);
      toast.success("sanctuary pending. Check your ink.");
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
      {verifyPending ? (
        <div className="space-y-6 animate-in fade-in zoom-in duration-500 text-center sm:text-left">
          <div className="space-y-1.5">
            <h2 className="text-h2 font-serif font-bold text-foreground">
              Check your ink.
            </h2>
            <p className="text-caption font-mono uppercase tracking-[0.16em]">
              Identity pending • Action required
            </p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed font-serif">
            A verification link has been dispatched to:
            <span className="text-foreground block mt-2 font-mono text-xs underline decoration-accent/40 underline-offset-4 break-all">
              {registeredEmail}
            </span>
          </p>
          <Button
            variant="ghost"
            onClick={() => setVerifyPending(false)}
            className="text-xs font-mono uppercase tracking-wider text-muted-foreground/60 hover:text-foreground p-0 h-auto cursor-pointer"
          >
            <span className="border-b border-muted-foreground/20 hover:border-foreground pb-0.5">
              Edit Identity
            </span>
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-1.5 text-center sm:text-left">
            <h1 className="text-h2 font-serif font-bold text-foreground">
              New journey.
            </h1>
            <p className="text-caption font-mono uppercase tracking-[0.16em]">
              Trace your mind • Encrypted by default
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <div className="flex justify-between items-end">
                <label
                  htmlFor="name"
                  className="text-helper text-muted-foreground/80 font-mono tracking-wider ml-1"
                >
                  Identity Name
                </label>
                {errors.name?.message && (
                  <span id="name-error" className="text-[10px] font-mono text-destructive uppercase tracking-tight animate-in fade-in">
                    {"// "}{errors.name.message}
                  </span>
                )}
              </div>
              <Input
                id="name"
                placeholder="How should we address you?"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
                className={`h-11 px-4 text-base ${
                  errors.name ? "border-destructive/60 focus-visible:ring-destructive/30" : ""
                }`}
                {...register("name")}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-end">
                <label
                  htmlFor="email"
                  className="text-helper text-muted-foreground/80 font-mono tracking-wider ml-1"
                >
                  Secure Email
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

            <div className="space-y-1.5">
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
                      <span>Inking...</span>
                    </div>
                  )}
                  <div
                    className={`flex items-center justify-center gap-2 transition-opacity duration-200 ${
                      isLoading ? "opacity-0" : "opacity-100"
                    }`}
                  >
                    <span>Start Writing</span>
                    <PenLine className="h-4 w-4 shrink-0" />
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

          <p className="text-center text-xs font-medium text-muted-foreground/75">
            Already have an account?{" "}
            <Link
              href={ROUTES.AUTH.LOGIN}
              className="text-foreground font-semibold border-b border-accent/40 hover:border-accent transition-all pb-0.5 ml-1"
            >
              Sign In
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
