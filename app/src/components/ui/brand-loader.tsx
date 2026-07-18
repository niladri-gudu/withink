import * as React from "react";

interface BrandLoaderProps {
  message?: string;
}

export function BrandLoader({ message }: BrandLoaderProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background select-none animate-in fade-in duration-500">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes loading-progress {
          0% { left: -100%; width: 100%; }
          50% { left: 0%; width: 40%; }
          100% { left: 100%; width: 100%; }
        }
        .animate-progress {
          animation: loading-progress 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}} />
      <div className="flex flex-col items-center gap-5 text-center px-6">
        <span className="font-serif text-4xl sm:text-5xl font-bold tracking-tight text-foreground select-none animate-pulse duration-[2500ms]">
          withink.
        </span>
        
        <div className="flex flex-col items-center gap-3">
          <div className="h-[2px] w-16 bg-muted-foreground/15 rounded-full overflow-hidden relative">
            <div className="absolute top-0 bottom-0 bg-primary/60 rounded-full animate-progress" />
          </div>
          
          {message && (
            <p className="text-sm font-serif italic text-muted-foreground/75 mt-1 animate-pulse duration-[2000ms]">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
