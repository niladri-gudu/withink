import * as React from "react";

interface BrandLoaderProps {
  message?: string;
}

export function BrandLoader({ message }: BrandLoaderProps) {
  return (
    <div className="bg-background animate-in fade-in fixed inset-0 z-[9999] flex flex-col items-center justify-center duration-500 select-none">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes loading-progress {
          0% { left: -100%; width: 100%; }
          50% { left: 0%; width: 40%; }
          100% { left: 100%; width: 100%; }
        }
        .animate-progress {
          animation: loading-progress 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `,
        }}
      />
      <div className="flex flex-col items-center gap-5 px-6 text-center">
        <span className="text-foreground animate-pulse font-serif text-4xl font-bold tracking-tight duration-[2500ms] select-none sm:text-5xl">
          withink<span className="text-accent">.</span>
        </span>

        <div className="flex flex-col items-center gap-3">
          <div className="bg-muted-foreground/15 relative h-[2px] w-16 overflow-hidden rounded-full">
            <div className="bg-primary/60 animate-progress absolute top-0 bottom-0 rounded-full" />
          </div>

          {message && (
            <p className="text-muted-foreground/75 mt-1 animate-pulse font-serif text-sm italic duration-[2000ms]">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
