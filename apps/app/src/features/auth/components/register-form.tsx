"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@withink/ui/button";
import { Input } from "@withink/ui/input";
import { Loader2, PenLine } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ROUTES } from "@/constants/routes";
import { signIn, signUp } from "@/lib/auth-client";

import { checkIdentityExists } from "../actions/auth";
import { registerSchema, type RegisterInput } from "../validation/auth";
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
    <div className="bg-card border-border/80 animate-in fade-in mx-auto w-full max-w-md space-y-6 rounded-xl border p-6 shadow-md duration-300 select-none sm:space-y-8 sm:p-8">
      {verifyPending ? (
        <div className="animate-in fade-in zoom-in space-y-6 text-center duration-500 sm:text-left">
          <div className="space-y-1.5">
            <h2 className="text-h2 text-foreground font-serif font-bold">
              Check your ink.
            </h2>
            <p className="text-caption font-mono tracking-[0.16em] uppercase">
              Identity pending • Action required
            </p>
          </div>
          <p className="text-muted-foreground font-serif text-sm leading-relaxed">
            A verification link has been dispatched to:
            <span className="text-foreground decoration-accent/40 mt-2 block font-mono text-xs break-all underline underline-offset-4">
              {registeredEmail}
            </span>
          </p>
          <Button
            variant="ghost"
            onClick={() => setVerifyPending(false)}
            className="text-muted-foreground/60 hover:text-foreground h-auto cursor-pointer p-0 font-mono text-xs tracking-wider uppercase"
          >
            <span className="border-muted-foreground/20 hover:border-foreground border-b pb-0.5">
              Edit Identity
            </span>
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-1.5 text-center sm:text-left">
            <h1 className="text-h2 text-foreground font-serif font-bold">
              New journey.
            </h1>
            <p className="text-caption font-mono tracking-[0.16em] uppercase">
              Trace your mind • Encrypted by default
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <div className="flex items-end justify-between">
                <label
                  htmlFor="name"
                  className="text-helper text-muted-foreground/80 ml-1 font-mono tracking-wider"
                >
                  Identity Name
                </label>
                {errors.name?.message && (
                  <span
                    id="name-error"
                    className="text-destructive animate-in fade-in font-mono text-[10px] tracking-tight uppercase"
                  >
                    {"// "}
                    {errors.name.message}
                  </span>
                )}
              </div>
              <Input
                id="name"
                placeholder="How should we address you?"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
                className={`h-11 px-4 text-base ${
                  errors.name
                    ? "border-destructive/60 focus-visible:ring-destructive/30"
                    : ""
                }`}
                {...register("name")}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-end justify-between">
                <label
                  htmlFor="email"
                  className="text-helper text-muted-foreground/80 ml-1 font-mono tracking-wider"
                >
                  Secure Email
                </label>
                {errors.email?.message && (
                  <span
                    id="email-error"
                    className="text-destructive animate-in fade-in font-mono text-[10px] tracking-tight uppercase"
                  >
                    {"// "}
                    {errors.email.message}
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
                  errors.email
                    ? "border-destructive/60 focus-visible:ring-destructive/30"
                    : ""
                }`}
                {...register("email")}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-end justify-between">
                <label
                  htmlFor="password"
                  className="text-helper text-muted-foreground/80 ml-1 font-mono tracking-wider"
                >
                  Secret Key
                </label>
                {errors.password?.message && (
                  <span
                    id="password-error"
                    className="text-destructive animate-in fade-in font-mono text-[10px] tracking-tight uppercase"
                  >
                    {"// "}
                    {errors.password.message}
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
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
                  aria-label={
                    showPassword ? "Hide secret key" : "Show secret key"
                  }
                  aria-pressed={showPassword}
                  className="text-muted-foreground/60 hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer p-1 font-mono text-xs tracking-wider uppercase transition-colors focus-visible:rounded focus-visible:ring-2 focus-visible:outline-none"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                type="submit"
                className="relative h-11 w-full cursor-pointer overflow-hidden rounded-lg text-base font-medium transition-transform hover:scale-[1.01] active:scale-[0.99]"
                disabled={isLoading}
              >
                <div className="flex w-full items-center justify-center gap-2 transition-all duration-200">
                  {isLoading && (
                    <div className="bg-primary absolute inset-0 flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
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
                className="text-muted-foreground hover:bg-muted/40 hover:text-foreground h-11 w-full cursor-pointer rounded-lg font-mono text-[10px] tracking-widest uppercase transition-transform hover:scale-[1.01] active:scale-[0.99]"
                onClick={handleGoogleSignIn}
              >
                <GoogleIcon />
                Continue with Google
              </Button>
            </div>
          </form>

          <p className="text-muted-foreground/75 text-center text-xs font-medium">
            Already have an account?{" "}
            <Link
              href={ROUTES.AUTH.LOGIN}
              className="text-foreground border-accent/40 hover:border-accent ml-1 border-b pb-0.5 font-semibold transition-all"
            >
              Sign In
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
