"use client";

import { useState } from "react";
import { signUp, signIn } from "@/lib/auth-client";
import Link from "next/link";
import { Loader2, User, Mail, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [verifyPending, setVerifyPending] = useState(false);

  const handleSignup = async () => {
    setIsLoading(true);
    const res = await signUp.email({ name, email, password });
    setIsLoading(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    setVerifyPending(true);
  };

  return (
    <div className="relative group">
      {/* Decorative Background Glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-[2rem] blur-xl opacity-50 group-hover:opacity-75 transition duration-1000" />
      
      <Card className="relative w-full max-w-md border-border/50 bg-background/80 backdrop-blur-xl shadow-2xl rounded-[1.5rem] overflow-hidden">
        <AnimatePresence mode="wait">
          {verifyPending ? (
            <motion.div 
              key="pending"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <CardContent className="flex flex-col items-center gap-6 py-16 text-center">
                <div className="relative">
                   <div className="absolute -inset-4 bg-primary/10 rounded-full animate-pulse" />
                   <div className="relative h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                     <Mail className="h-8 w-8 text-primary" />
                   </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight">Verify your ink</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed px-8">
                    We sent a magic link to <span className="font-medium text-foreground">{email}</span>. 
                    Check your inbox to start writing.
                  </p>
                </div>
              </CardContent>
            </motion.div>
          ) : (
            <motion.div 
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <CardHeader className="space-y-1.5 pb-6">
                <div className="flex items-center gap-2 mb-2">
                   <span className="px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/20">
                    Join the Collective
                   </span>
                </div>
                <CardTitle className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Create your space.
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  A minimal home for your evolving thoughts.
                </CardDescription>
              </CardHeader>

              <CardContent className="grid gap-5">
                <div className="grid gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">
                      Identity
                    </Label>
                    <div className="relative group/input">
                      <User className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/40 group-focus-within/input:text-primary transition-colors" />
                      <Input
                        id="name"
                        placeholder="John Doe"
                        className="pl-11 h-12 bg-muted/30 border-none ring-1 ring-border focus-visible:ring-2 focus-visible:ring-primary/50 transition-all rounded-xl"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">
                      Email Address
                    </Label>
                    <div className="relative group/input">
                      <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/40 group-focus-within/input:text-primary transition-colors" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="hello@journal.com"
                        className="pl-11 h-12 bg-muted/30 border-none ring-1 ring-border focus-visible:ring-2 focus-visible:ring-primary/50 transition-all rounded-xl"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground ml-1">
                      Security
                    </Label>
                    <div className="relative group/input">
                      <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground/40 group-focus-within/input:text-primary transition-colors" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-11 h-12 bg-muted/30 border-none ring-1 ring-border focus-visible:ring-2 focus-visible:ring-primary/50 transition-all rounded-xl"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full h-12 rounded-xl font-bold text-sm bg-primary hover:bg-primary/90 shadow-[0_4px_20px_-4px_rgba(var(--primary),0.4)] transition-all active:scale-[0.98]"
                  onClick={handleSignup}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-2">
                      Get Started <Sparkles className="h-4 w-4" />
                    </span>
                  )}
                </Button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/50" /></div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground/60">
                    <span className="bg-background px-4">or</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full h-12 rounded-xl border-border/60 hover:bg-muted/50 font-medium transition-all"
                  onClick={() => signIn.social({ provider: "google", callbackURL: "/journal" })}
                >
                  <GoogleIcon />
                  <span className="text-sm">Sign up with Google</span>
                </Button>

                <p className="text-center text-xs text-muted-foreground mt-2">
                  Already have an account?{" "}
                  <Link href="/signin" className="text-foreground font-semibold hover:underline underline-offset-4 transition-colors">
                    Sign in
                  </Link>
                </p>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}