"use client";

import Link from "next/link";
import { Button } from "@withink/ui/button";
import { ArrowRight } from "lucide-react";

import { ROUTES } from "@/constants/routes";

export function VerifiedContent() {
  return (
    <div className="bg-card border-border/80 animate-in fade-in mx-auto w-full max-w-md space-y-6 rounded-xl border p-6 shadow-sm duration-300 select-none sm:space-y-8 sm:p-8">
      <div className="space-y-1.5 text-center sm:text-left">
        <h1 className="text-h2 text-foreground font-serif font-bold">
          Identity verified.
        </h1>
        <p className="text-caption font-serif tracking-[0.2em] uppercase">
          Your notebook is ready for its first page
        </p>
      </div>

      <div className="space-y-4 pt-2">
        <Button
          asChild
          className="relative h-11 w-full cursor-pointer overflow-hidden font-serif text-sm font-medium uppercase tracking-[0.15em] transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          <Link href={ROUTES.APP.DASHBOARD}>
            Go to Journal <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <div className="text-center">
          <Link
            href={ROUTES.PUBLIC.HOME}
            className="text-muted-foreground/60 hover:text-foreground border-muted-foreground/20 hover:border-foreground inline-block border-b pb-0.5 font-serif text-xs tracking-widest uppercase transition-all"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
