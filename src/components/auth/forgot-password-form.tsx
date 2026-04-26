/* eslint-disable react/jsx-no-comment-textnodes */
"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) {
      setError("Identity required");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Invalid structure");
      return;
    }

    setIsLoading(true);
    setError(undefined);

    const res = await requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });

    setIsLoading(false);

    if (res.error) {
      setError(res.error.message || "Recovery failed");
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-12 px-8 antialiased">
      <div className="w-full max-w-sm mx-auto">
        {sent ? (
          <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500">
            <h2 className="text-5xl font-black tracking-tighter leading-[0.85]">
              Check your <br />
              <span className="text-primary/60 italic font-serif font-light text-6xl">
                inbox.
              </span>
            </h2>
            <p className="text-muted-foreground font-mono text-xs tracking-widest leading-relaxed">
              Recovery instructions dispatched to <br />
              <span className="text-foreground block mt-2 underline decoration-primary/40 underline-offset-4">
                {email}
              </span>
            </p>
            <Link
              href="/signin"
              className="inline-block text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 hover:text-primary transition-colors italic"
            >
              // Return_to_SignIn
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            <div className="space-y-3">
              <h1 className="text-5xl font-black tracking-tighter leading-[0.85]">
                Forgot <br />
                <span className="text-primary/60 italic font-serif font-light text-6xl">
                  secret.
                </span>
              </h1>
              <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.2em]">
                Initiating recovery // Identity verification
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground/60 ml-1">
                    Registered.Email
                  </Label>
                  {error && (
                    <span className="text-[9px] font-mono text-destructive uppercase tracking-tighter animate-in fade-in slide-in-from-right-1">
                      // {error}
                    </span>
                  )}
                </div>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  className={`h-12 bg-transparent border-0 border-b rounded-none px-0 focus-visible:ring-0 transition-all placeholder:text-muted-foreground/30 text-lg ${
                    error
                      ? "border-destructive/50"
                      : "border-border/50 focus-visible:border-primary"
                  }`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(undefined);
                  }}
                />
              </div>

              <div className="pt-4 space-y-4 text-center">
                <Button
                  type="submit"
                  className="w-full h-14 rounded-full font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-primary">
                      <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                      <span>Dispatching...</span>
                    </div>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>

                <Link
                  href="/signin"
                  className="inline-block text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 hover:text-primary transition-colors italic"
                >
                  Back_to_SignIn
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
