"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);

    await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    
    setIsLoading(false);
    setSent(true);
  };

  if (sent) {
    return (
      <Card className="w-full max-w-md bg-zinc-950 border-zinc-800/50 shadow-2xl">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="h-12 w-12 rounded-full bg-zinc-900 flex items-center justify-center">
            <Mail className="h-5 w-5 text-zinc-400" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-100">Check your email</h2>
          <p className="text-sm text-zinc-500 max-w-xs">
            If an account exists for <span className="text-zinc-300">{email}</span>, you&apos;ll receive a reset link shortly.
          </p>
          <Link href="/signin" className="text-sm text-zinc-400 hover:text-white transition-colors mt-2">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md bg-zinc-950 border-zinc-800/50 shadow-2xl">
      <CardHeader className="space-y-2 pb-8">
        <CardTitle className="text-3xl font-bold tracking-tight text-zinc-100">
          Forgot password?
        </CardTitle>
        <CardDescription className="text-zinc-500 text-base">
          Enter your email and we&apos;ll send you a reset link.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-6">
        <div className="grid gap-2">
          <Label htmlFor="email" className="text-zinc-400 font-medium ml-1">Email</Label>
          <div className="relative group">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-600 group-focus-within:text-zinc-300 transition-colors" />
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              className="bg-zinc-900/50 border-zinc-800 pl-10 h-11 text-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-500 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <Button
          className="w-full h-11 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl transition-all active:scale-[0.98]"
          onClick={handleSubmit}
          disabled={isLoading || !email}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
        </Button>

        <Link
          href="/signin"
          className="flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  );
}