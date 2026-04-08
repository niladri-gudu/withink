"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Mail, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export function SigninForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignin = async () => {
    setIsLoading(true);
    const res = await signIn.email({ email, password });
    setIsLoading(false);

    if (res.error) {
      alert(res.error.message);
      return;
    }

    router.refresh();
    router.push("/journal");
  };

  return (
    <Card className="w-full max-w-md bg-zinc-950 border-zinc-800/50 shadow-2xl backdrop-blur-sm">
      <CardHeader className="space-y-2 pb-8">
        <CardTitle className="text-3xl font-bold tracking-tight text-zinc-100">
          Welcome back
        </CardTitle>
        <CardDescription className="text-zinc-500 text-base">
          Your thoughts are waiting for you.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-6">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-zinc-400 font-medium ml-1">
              Email
            </Label>
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

          <div className="grid gap-2">
            <Label
              htmlFor="password"
              className="text-zinc-400 font-medium ml-1"
            >
              Password
            </Label>
            <div className="relative group">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-600 group-focus-within:text-zinc-300 transition-colors" />
              <Input
                id="password"
                type="password"
                className="bg-zinc-900/50 border-zinc-800 pl-10 h-11 text-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-500 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label
                htmlFor="password"
                className="text-zinc-400 font-medium ml-1"
              >
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          </div>
        </div>

        <Button
          className="w-full h-11 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl transition-all active:scale-[0.98]"
          onClick={handleSignin}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-zinc-950 px-3 text-zinc-600 tracking-widest">
              Or
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full h-11 border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-white transition-all rounded-xl"
          onClick={() =>
            signIn.social({ provider: "google", callbackURL: "/journal" })
          }
        >
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
          Continue with Google
        </Button>

        <p className="text-center text-sm text-zinc-500 mt-2">
          New here?{" "}
          <Link
            href="/signup"
            className="text-zinc-300 hover:text-white underline-offset-4 hover:underline transition-colors"
          >
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
