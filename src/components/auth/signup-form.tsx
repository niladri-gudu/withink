/* eslint-disable react/jsx-no-comment-textnodes */
"use client";

import { useState } from "react";
import { signUp, signIn } from "@/lib/auth-client";
import Link from "next/link";
import { Loader2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { checkIdentityExists } from "@/app/actions/auth";

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [verifyPending, setVerifyPending] = useState(false);

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = "Identity.Name required";
    if (!email) newErrors.email = "Secure.Email required";
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Invalid structure";
    if (!password) newErrors.password = "Secret.Key required";
    else if (password.length < 8) newErrors.password = "8+ characters needed";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    setErrors({});
    if (!validate()) return;

    setIsLoading(true);

    try {
      const exists = await checkIdentityExists(email);
      if (exists) {
        setIsLoading(false);
        setErrors({ email: "Identity already established" });
        return;
      }

      const { data, error } = await signUp.email({ name, email, password });
      setIsLoading(false);

      if (error) {
        toast.error(error.message || "Failed to initialize identity.");
        return;
      }

      setVerifyPending(true);
    } catch (e) {
      setIsLoading(false);
      console.error("Signup process failed", e);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-12 px-8 md:px-0 antialiased">
      <div className="w-full max-w-sm mx-auto">
        {verifyPending ? (
          <div className="space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="space-y-3">
              <h2 className="text-5xl font-black tracking-tighter leading-[0.85]">
                Check your <br />
                <span className="text-primary/60 italic font-serif font-light text-6xl">
                  ink.
                </span>
              </h2>
              <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.2em]">
                Identity pending // Action required
              </p>
            </div>
            <p className="text-muted-foreground font-mono text-xs tracking-widest leading-relaxed">
              A verification link has been dispatched to <br />
              <span className="text-foreground block mt-2 underline decoration-primary/40 underline-offset-4">
                {email}
              </span>
            </p>
            <Button
              variant="ghost"
              onClick={() => setVerifyPending(false)}
              className="group text-[10px] font-mono uppercase tracking-widest text-muted-foreground/40 hover:text-primary transition-all mt-4 block p-0 h-auto"
            >
              <span className="border-b border-transparent group-hover:border-primary/40 pb-0.5">
                // Edit_Identity
              </span>
            </Button>
          </div>
        ) : (
          <div className="space-y-10">
            <div className="space-y-3">
              <h1 className="text-5xl font-black tracking-tighter leading-[0.85]">
                New <br />
                <span className="text-primary/60 italic font-serif font-light text-6xl">
                  journey.
                </span>
              </h1>
              <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.2em]">
                Trace your mind // Encrypted by default
              </p>
            </div>

            <div className="space-y-6">
              {/* Name Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground/60 ml-1">
                    Identity.Name
                  </Label>
                  {errors.name && (
                    <span className="text-[9px] font-mono text-destructive uppercase tracking-tighter animate-in fade-in slide-in-from-right-1">
                      // {errors.name}
                    </span>
                  )}
                </div>
                <Input
                  placeholder="How should we address you?"
                  className={`h-12 bg-transparent border-0 border-b rounded-none px-0 focus-visible:ring-0 transition-all placeholder:text-muted-foreground/30 text-lg ${
                    errors.name
                      ? "border-destructive/50"
                      : "border-border/50 focus-visible:border-primary"
                  }`}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name)
                      setErrors((p) => ({ ...p, name: undefined }));
                  }}
                />
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground/60 ml-1">
                    Secure.Email
                  </Label>
                  {errors.email && (
                    <span className="text-[9px] font-mono text-destructive uppercase tracking-tighter animate-in fade-in slide-in-from-right-1">
                      // {errors.email}
                    </span>
                  )}
                </div>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  className={`h-12 bg-transparent border-0 border-b rounded-none px-0 focus-visible:ring-0 transition-all placeholder:text-muted-foreground/30 text-lg ${
                    errors.email
                      ? "border-destructive/50"
                      : "border-border/50 focus-visible:border-primary"
                  }`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email)
                      setErrors((p) => ({ ...p, email: undefined }));
                  }}
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground/60 ml-1">
                    Secret.Key
                  </Label>
                  {errors.password && (
                    <span className="text-[9px] font-mono text-destructive uppercase tracking-tighter animate-in fade-in slide-in-from-right-1">
                      // {errors.password}
                    </span>
                  )}
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  className={`h-12 bg-transparent border-0 border-b rounded-none px-0 focus-visible:ring-0 transition-all placeholder:text-muted-foreground/30 text-lg ${
                    errors.password
                      ? "border-destructive/50"
                      : "border-border/50 focus-visible:border-primary"
                  }`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password)
                      setErrors((p) => ({ ...p, password: undefined }));
                  }}
                />
              </div>

              <div className="pt-4 space-y-4">
                <Button
                  className="w-full h-14 rounded-full font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden"
                  onClick={handleSignup}
                  disabled={isLoading}
                >
                  <div className="flex items-center justify-center gap-2 w-full transition-all duration-200">
                    {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-primary">
                        <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                        <span>Inking...</span>
                      </div>
                    )}
                    <div
                      className={`flex items-center justify-center gap-2 transition-opacity duration-200 ${isLoading ? "opacity-0" : "opacity-100"}`}
                    >
                      <span>Start Writing</span>
                      <PenLine className="h-5 w-5 shrink-0" />
                    </div>
                  </div>
                </Button>

                <Button
                  variant="ghost"
                  className="w-full h-12 rounded-full font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    signIn.social({
                      provider: "google",
                      callbackURL: "/journal",
                    })
                  }
                >
                  <GoogleIcon />
                  Continue with Google
                </Button>
              </div>
            </div>

            <p className="text-center text-[11px] font-medium text-muted-foreground/60 pb-8">
              Already have an account?{" "}
              <Link
                href="/signin"
                className="text-foreground font-bold border-b border-primary/40 hover:border-primary transition-all pb-0.5"
              >
                Sign_In
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
