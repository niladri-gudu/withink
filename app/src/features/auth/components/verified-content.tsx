"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

export function VerifiedContent() {
  return (
    <div className="w-full max-w-md mx-auto bg-card border border-border/80 shadow-md rounded-xl p-6 sm:p-8 space-y-6 sm:space-y-8 animate-in fade-in duration-300 select-none">
      <div className="space-y-1.5 text-center sm:text-left">
        <h1 className="text-h2 font-serif font-bold text-foreground">
          Identity verified.
        </h1>
        <p className="text-caption font-mono uppercase tracking-[0.2em]">
          Verification successful • Entry permitted
        </p>
      </div>
      
      <div className="pt-2 space-y-4">
        <Button asChild className="w-full h-11 rounded-lg font-medium text-base hover:scale-[1.01] active:scale-[0.99] transition-transform relative overflow-hidden cursor-pointer">
          <Link href={ROUTES.APP.DASHBOARD}>
            Go to Journal <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <div className="text-center">
          <Link
            href={ROUTES.PUBLIC.HOME}
            className="inline-block text-xs font-mono uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-all border-b border-muted-foreground/20 hover:border-foreground pb-0.5"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
