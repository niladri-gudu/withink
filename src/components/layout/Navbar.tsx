"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSession, signOut } from "@/lib/auth-client";
import { LogOut, BookOpen, Loader2 } from "lucide-react";

export function Navbar() {
  const { data: session, isPending } = useSession();

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-zinc-800/50 bg-zinc-950/70 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center group-hover:rotate-6 transition-transform">
              <span className="text-zinc-950 font-black text-xl">J</span>
            </div>
            <span className="text-zinc-100 font-bold tracking-tighter text-xl">
              JOURNAL<span className="text-zinc-500">.AI</span>
            </span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Features</Link>
            <Link href="#pricing" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Pricing</Link>
            <Link href="#about" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Our Philosophy</Link>
          </div>

          {/* Auth Actions */}
          <div className="flex items-center gap-3">
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
            ) : session ? (
              <>
                <Link href="/journal">
                  <Button variant="ghost" className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-all gap-2">
                    <BookOpen className="h-4 w-4" />
                    My Journal
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/" } } })}
                  className="text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition-all gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link href="/signin">
                  <Button variant="ghost" className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-all">
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-zinc-100 hover:bg-white text-zinc-950 font-bold px-5 rounded-full transition-all">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}