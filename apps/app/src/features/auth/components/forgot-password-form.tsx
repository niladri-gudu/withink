"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@withink/ui/button";
import { Input } from "@withink/ui/input";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ROUTES } from "@/constants/routes";
import { requestPasswordReset } from "@/lib/auth-client";

import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "../validation/auth";

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true);

    try {
      const res = await requestPasswordReset({
        email: data.email,
        redirectTo: ROUTES.AUTH.RESET_PASSWORD,
      });

      setIsLoading(false);

      if (res.error) {
        setError("email", { message: res.error.message || "Recovery failed" });
        toast.error(res.error.message || "Failed to request password reset.");
        return;
      }

      setRegisteredEmail(data.email);
      setSent(true);
      toast.success("Instructions dispatched. Check your inbox.");
    } catch (err: unknown) {
      setIsLoading(false);
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="bg-card border-border/80 animate-in fade-in mx-auto w-full max-w-md space-y-6 rounded-xl border p-6 shadow-sm duration-300 select-none sm:space-y-8 sm:p-8">
      {sent ? (
        <div className="animate-in fade-in zoom-in space-y-5 text-center duration-500">
          <div className="space-y-1.5">
            <h2 className="text-h2 text-foreground font-serif font-bold">
              Check your inbox.
            </h2>
            <p className="text-caption font-serif tracking-[0.16em] uppercase">
              Instructions dispatched • Action required
            </p>
          </div>
          <p className="text-muted-foreground font-serif text-sm leading-relaxed">
            Recovery instructions have been sent to:
            <span className="text-foreground decoration-accent/40 mt-2 block font-serif text-xs break-all underline underline-offset-4">
              {registeredEmail}
            </span>
          </p>
          <div className="pt-2">
            <Link
              href={ROUTES.AUTH.LOGIN}
              className="text-muted-foreground/60 hover:text-foreground border-muted-foreground/20 hover:border-foreground border-b pb-0.5 font-serif text-xs tracking-widest uppercase italic transition-colors"
            >
              Return to Sign In
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-1.5 text-center sm:text-left">
            <h1 className="text-h2 text-foreground font-serif font-bold">
              Forgot secret.
            </h1>
            <p className="text-caption font-serif tracking-[0.16em] uppercase">
              We&apos;ll send recovery instructions to your email
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                    className="text-destructive animate-in fade-in font-serif text-[10px] tracking-tight uppercase"
                  >
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

            <div className="space-y-3 pt-2 text-center">
              <Button
                type="submit"
                className="relative h-11 w-full cursor-pointer overflow-hidden font-serif text-sm font-medium uppercase tracking-[0.15em] transition-transform hover:scale-[1.01] active:scale-[0.99]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="bg-primary absolute inset-0 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    <span>Dispatching…</span>
                  </div>
                ) : (
                  "Send Reset Link"
                )}
              </Button>

              <Link
                href={ROUTES.AUTH.LOGIN}
                className="text-muted-foreground/60 hover:text-foreground border-muted-foreground/20 hover:border-foreground inline-block border-b pt-2 pb-0.5 font-serif text-xs tracking-widest uppercase italic transition-colors"
              >
                Back to Sign In
              </Link>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
