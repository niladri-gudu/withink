"use client";

import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background select-none animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-4 text-center">
        {/* Premium Brand Logo */}
        <span className="font-serif text-4xl font-bold tracking-tight text-foreground select-none animate-pulse">
          withink.
        </span>
        
        {/* Loader Spinner & Feedback Message */}
        <div className="flex flex-col items-center gap-2.5 mt-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary/80" />
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em] select-none animate-pulse">
            opening your sanctuary...
          </span>
        </div>
      </div>
    </div>
  );
}
