"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSession, signOut } from "@/lib/auth-client";
import { LogOut, BookOpen, Loader2 } from "lucide-react";
import { ThemePicker } from "../theme-picker";

export function Navbar() {
  const { data: session, isPending } = useSession();

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-border bg-background/70 backdrop-blur-md transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo Section */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center group-hover:rotate-6 transition-all duration-300 shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-black text-xl">J</span>
            </div>
            <span className="text-foreground font-bold tracking-tighter text-xl">
              JOURNAL
            </span>
          </Link>

          {/* Right Section: Theme + Auth */}
          <div className="flex items-center gap-3">
            <ThemePicker />
            
            <div className="h-6 w-px bg-border mx-1" />

            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : session ? (
              <div className="flex items-center gap-2">
                <Link href="/journal">
                  <Button
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all gap-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>My Journal</span>
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  onClick={() =>
                    signOut({
                      fetchOptions: {
                        onSuccess: () => {
                          window.location.href = "/";
                        },
                      },
                    })
                  }
                  className="text-muted-foreground hover:text-destructive transition-all"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/signin">
                  <Button
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground transition-all"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-primary text-primary-foreground hover:opacity-90 font-bold px-5 rounded-full transition-all shadow-md shadow-primary/10">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}