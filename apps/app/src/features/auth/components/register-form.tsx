"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@withink/ui/button";
import { Input } from "@withink/ui/input";
import { Loader2, Mail, PenLine } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ROUTES } from "@/constants/routes";
import { authClient, signUp } from "@/lib/auth-client";

import { checkIdentityExists } from "../actions/auth";
import { registerSchema, type RegisterInput } from "../validation/auth";
import { GoogleOAuthButton } from "./google";

// Survives a refresh of the "Check your ink." pending card. Session-scoped so
// it disappears when the tab closes.
const PENDING_EMAIL_KEY = "withink.pendingVerificationEmail";

function readPendingEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(PENDING_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

function writePendingEmail(email: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (email) sessionStorage.setItem(PENDING_EMAIL_KEY, email);
    else sessionStorage.removeItem(PENDING_EMAIL_KEY);
  } catch {
    // Private mode / storage disabled — the card just won't survive refresh.
  }
}

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Seeded from sessionStorage so the "Check your ink." card survives a
  // refresh. sessionStorage is empty on the server, so the first client render
  // matches the server and the pending card appears after hydration.
  const [pendingEmail, setPendingEmail] = useState(readPendingEmail);
  const [verifyPending, setVerifyPending] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendNote, setResendNote] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const showVerifyPending = verifyPending || pendingEmail !== "";

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

      setPendingEmail(data.email);
      writePendingEmail(data.email);
      setResendNote(null);
      setVerifyPending(true);
      toast.success("diary pending. Check your ink.");
    } catch (err: unknown) {
      setIsLoading(false);
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(errorMessage);
    }
  };

  /**
   * Resend the verification email.
   *
   * Better Auth's `sendVerificationEmail({ email })` needs an active session
   * for the same address (`src/lib/auth.ts` -> `emailVerification`), which a
   * brand-new sign-up does not have (`autoSignIn: false`). Rather than guess
   * at an unauthenticated endpoint, the control is only offered once the
   * session is known and matches the pending email; otherwise we explain that
   * the user has to sign in first.
   */
  const sessionEmail = session?.user?.email?.toLowerCase() ?? null;
  const canResend =
    !isSessionPending &&
    sessionEmail !== null &&
    sessionEmail === pendingEmail.toLowerCase();

  const handleResend = async () => {
    if (isResending || !canResend) return;
    setIsResending(true);
    setResendNote(null);
    try {
      const res = await authClient.sendVerificationEmail({
        email: pendingEmail,
        callbackURL: ROUTES.AUTH.VERIFIED,
      });

      if (res.error) {
        setResendNote({
          tone: "error",
          message:
            res.error.message ||
            "Could not resend the email. Please try again shortly.",
        });
        return;
      }
      setResendNote({
        tone: "success",
        message: "A fresh verification link is on its way.",
      });
    } catch (err: unknown) {
      setResendNote({
        tone: "error",
        message:
          err instanceof Error
            ? err.message
            : "Could not resend the email. Please try again shortly.",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleStartOver = () => {
    writePendingEmail(null);
    setPendingEmail("");
    setVerifyPending(false);
    setResendNote(null);
  };

  return (
    <div className="bg-card border-border/80 animate-in fade-in mx-auto w-full max-w-md space-y-6 rounded-xl border p-6 shadow-sm duration-300 select-none sm:space-y-8 sm:p-8">
      {showVerifyPending ? (
        <div className="animate-in fade-in zoom-in space-y-6 text-center duration-500 sm:text-left">
          <div className="space-y-1.5">
            <h2 className="text-h2 text-foreground font-serif font-bold">
              Check your ink.
            </h2>
            <p className="text-running-head text-muted-foreground">
              Identity pending • Action required
            </p>
          </div>
          <p className="text-muted-foreground font-serif text-sm leading-relaxed">
            A verification link has been dispatched to:
            <span className="text-foreground decoration-accent/40 mt-2 block font-serif text-xs break-all underline underline-offset-4">
              {pendingEmail}
            </span>
          </p>

          <p className="text-muted-foreground flex items-start justify-center gap-2 text-xs leading-relaxed sm:justify-start">
            <Mail
              aria-hidden="true"
              className="text-muted-foreground/60 mt-0.5 h-3.5 w-3.5 shrink-0"
            />
            <span>
              Open your inbox and click the link to activate your notebook. It
              can take a minute to arrive — check spam if it doesn&apos;t.
            </span>
          </p>

          {canResend ? (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleResend}
                disabled={isResending}
                className="h-10 w-full cursor-pointer font-serif text-xs uppercase"
              >
                {isResending ? (
                  <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" />
                ) : null}
                {isResending ? "Sending…" : "Resend email"}
              </Button>
              {resendNote && (
                <p
                  role="status"
                  aria-live="polite"
                  className={`font-serif text-[10px] tracking-tight uppercase ${
                    resendNote.tone === "success"
                      ? "text-muted-foreground"
                      : "text-destructive"
                  }`}
                >
                  {resendNote.message}
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground/70 font-serif text-[10px] leading-relaxed tracking-tight">
              {/* Resend needs an active session for this email; new sign-ups
                  have none (autoSignIn is off). */}
              To resend the link, sign in with this email first.
            </p>
          )}

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <Button
              variant="ghost"
              onClick={handleStartOver}
              className="text-muted-foreground/60 hover:text-foreground h-auto cursor-pointer p-0 font-serif text-xs tracking-wider uppercase"
            >
              <span className="border-muted-foreground/20 hover:border-foreground border-b pb-0.5">
                Edit Identity
              </span>
            </Button>
            <Link
              href={ROUTES.AUTH.LOGIN}
              onClick={() => writePendingEmail(null)}
              className="text-muted-foreground/60 hover:text-foreground border-muted-foreground/20 hover:border-foreground border-b pb-0.5 font-serif text-xs tracking-widest uppercase italic transition-colors"
            >
              Wrong email? Start over
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-1.5 text-center sm:text-left">
            <h1 className="text-h2 text-foreground font-serif font-bold">
              New journey.
            </h1>
            <p className="text-running-head text-muted-foreground">
              A fresh notebook, ready for your first page
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <div className="flex items-end justify-between">
                <label
                  htmlFor="name"
                  className="text-helper text-muted-foreground/80 ml-1 font-serif tracking-wider"
                >
                  Name
                </label>
                {errors.name?.message && (
                  <span
                    id="name-error"
                    role="alert"
                    className="text-destructive animate-in fade-in font-serif text-[10px] tracking-tight uppercase"
                  >
                    {errors.name.message}
                  </span>
                )}
              </div>
              <Input
                id="name"
                autoComplete="name"
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
                  className="text-helper text-muted-foreground/80 ml-1 font-serif tracking-wider"
                >
                  Email
                </label>
                {errors.email?.message && (
                  <span
                    id="email-error"
                    role="alert"
                    className="text-destructive animate-in fade-in font-serif text-[10px] tracking-tight uppercase"
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

            <div className="space-y-1.5">
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
                    role="alert"
                    className="text-destructive animate-in fade-in font-serif text-[10px] tracking-tight uppercase"
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
                  className="text-muted-foreground/60 hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-1.5 flex h-11 w-11 -translate-y-1/2 items-center justify-center self-center font-serif text-xs tracking-wider uppercase transition-colors focus-visible:rounded focus-visible:ring-2 focus-visible:outline-none"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                type="submit"
                className="relative h-11 w-full cursor-pointer overflow-hidden font-serif text-sm font-medium tracking-[0.15em] uppercase transition-transform hover:scale-[1.01] active:scale-[0.99]"
                disabled={isLoading}
              >
                <div className="flex w-full items-center justify-center gap-2 transition-all duration-200">
                  {isLoading && (
                    <div className="bg-primary absolute inset-0 flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                      <span>Inking…</span>
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

              <GoogleOAuthButton
                callbackURL={ROUTES.APP.DASHBOARD}
                formDisabled={isLoading}
              />
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
