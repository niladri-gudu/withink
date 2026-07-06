"use client";

import * as React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { requestPasswordReset } from "@/lib/auth-client";
import { forgotPasswordSchema, type ForgotPasswordInput } from "../validation/auth";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-card border border-border/80 shadow-md rounded-xl p-6 sm:p-8 space-y-6 sm:space-y-8 animate-in fade-in duration-300 select-none">
      {sent ? (
        <div className="text-center space-y-5 animate-in fade-in zoom-in duration-500">
          <div className="space-y-1.5">
            <h2 className="text-h2 font-serif font-bold text-foreground">
              Check your inbox.
            </h2>
            <p className="text-caption font-mono uppercase tracking-[0.16em]">
              Instructions dispatched • Action required
            </p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed font-serif">
            Recovery instructions have been sent to:
            <span className="text-foreground block mt-2 font-mono text-xs underline decoration-accent/40 underline-offset-4 break-all">
              {registeredEmail}
            </span>
          </p>
          <div className="pt-2">
            <Link
              href={ROUTES.AUTH.LOGIN}
              className="text-xs font-mono uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors italic border-b border-muted-foreground/20 hover:border-foreground pb-0.5"
            >
              Return to Sign In
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-1.5 text-center sm:text-left">
            <h1 className="text-h2 font-serif font-bold text-foreground">
              Forgot secret.
            </h1>
            <p className="text-caption font-mono uppercase tracking-[0.16em]">
              Initiating recovery • Identity verification
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <div className="flex justify-between items-end">
                <label
                  htmlFor="email"
                  className="text-helper text-muted-foreground/80 font-mono tracking-wider ml-1"
                >
                  Registered Email
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

            <div className="pt-2 space-y-3 text-center">
              <Button
                type="submit"
                className="w-full h-11 rounded-lg font-medium text-base hover:scale-[1.01] active:scale-[0.99] transition-transform relative overflow-hidden cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-primary">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>Dispatching...</span>
                  </div>
                ) : (
                  "Send Reset Link"
                )}
              </Button>

              <Link
                href={ROUTES.AUTH.LOGIN}
                className="inline-block text-xs font-mono uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors italic border-b border-muted-foreground/20 hover:border-foreground pb-0.5 pt-2"
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
