"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { PenLine } from "lucide-react";
import { ThemePicker } from "../ui/theme-picker";
import { useEffect, useState } from "react";
import { getGithubStars } from "@/app/actions/github";

export function Navbar() {
  const [starCount, setStarCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchStars = async () => {
      const stars = await getGithubStars();
      setStarCount(stars);
    };

    fetchStars();
  }, []);

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/60 backdrop-blur-xl border-b border-border/40 transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-7 h-7 flex items-center justify-center">
              <div className="absolute inset-0 bg-primary/20 rounded-lg blur-sm group-hover:blur-md transition-all" />
              <PenLine className="relative h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold tracking-tight text-foreground">
              journal
            </span>
          </Link>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            <ThemePicker />

            <div className="w-px h-4 bg-border/60 mx-2" />

            {/* GitHub Star Button */}
            <Link
              href="https://github.com/niladri-gudu/deardiary"
              target="_blank"
              rel="noreferrer"
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-9 rounded-full px-3 gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all border border-transparent hover:border-border/40"
              >
                <GithubIcon className="h-4 w-4" />
                <div className="w-px h-3 bg-muted-foreground/30" />
                <span className="text-xs font-bold font-mono tracking-tighter">
                  {starCount ?? "..."}
                </span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

const GithubIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);
