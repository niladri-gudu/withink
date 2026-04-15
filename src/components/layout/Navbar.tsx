"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSession, signOut } from "@/lib/auth-client";
import { LogOut, BookOpen, Loader2, PenLine } from "lucide-react";
import { ThemePicker } from "../ui/theme-picker";

export function Navbar() {
  const { data: session, isPending } = useSession();

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/60 backdrop-blur-xl border-b border-border/40 transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-7 h-7 flex items-center justify-center">
              <div className="absolute inset-0 bg-primary/20 rounded-lg blur-sm group-hover:blur-md transition-all" />
              <PenLine className="relative h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold tracking-tight text-foreground">
              journal
            </span>
          </Link>

          {/* Right */}
          <div className="flex items-center gap-2">
            <ThemePicker />

            <div className="w-px h-4 bg-border/60 mx-1" />

            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : session ? (
              <>
                <Link href="/journal">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground hover:bg-accent/40 gap-1.5 text-sm"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Journal
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    signOut({
                      fetchOptions: {
                        onSuccess: () => { window.location.href = "/"; },
                      },
                    })
                  }
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <>
                <Link href="/signin">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground text-sm"
                  >
                    Sign in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button
                    size="sm"
                    className="rounded-full px-4 text-sm font-medium shadow-sm"
                  >
                    Get started
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