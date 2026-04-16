/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ArrowRight,
  Leaf,
  ShieldCheck,
  PenLine,
  Sparkles,
  ImageIcon,
  LinkIcon,
  List,
  Italic,
  Underline,
  Bold,
  Undo,
  Redo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/Footer";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 overflow-x-hidden">
      {/* Background Artifacts */}
      <div className="absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-[size:32px_32px] opacity-10 -z-20" />
      <div className="absolute inset-0 bg-noise opacity-[0.02] -z-10 pointer-events-none" />

      {/* --- HEADER --- */}
      <header className="relative max-w-6xl mx-auto pt-40 md:pt-48 pb-20 px-6 grid lg:grid-cols-2 gap-12 items-center">
        <div className="absolute top-20 md:top-40 left-0 w-72 h-72 bg-primary/10 blur-[100px] rounded-full -z-10" />
        <div className="text-left space-y-6 md:space-y-8">
          <div className="inline-flex items-center gap-3 px-3 py-1 rounded-lg border border-border bg-muted/50 text-muted-foreground text-[10px] font-mono uppercase tracking-tight">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            v1.0.0 — Open Source
          </div>
          {/* Mobile Typography: 5xl -> 8xl on desktop */}
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.85]">
            Think in <br />
            <span className="text-muted-foreground/30 italic font-serif font-light">
              ink.
            </span>
          </h1>
          <p className="text-base md:text-xl text-muted-foreground max-w-lg leading-relaxed font-medium">
            A sanctuary for your digital thoughts. No distractions, no tracking,
            just a clean slate for your mind to breathe.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full rounded-xl px-8 h-14 font-bold text-base shadow-2xl shadow-primary/20 hover:-translate-y-0.5 transition-all"
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a
              href="https://github.com/niladri-gudu/deardiary"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto"
            >
              <Button
                variant="outline"
                size="lg"
                className="w-full rounded-xl px-8 h-14 font-mono text-sm border-border/60"
              >
                <GithubIcon className="mr-2 h-4 w-4" />
                view_source
              </Button>
            </a>
          </div>
        </div>
        {/* Keeping Artifact Hidden on Mobile */}
        <div className="relative hidden lg:block">
          <div className="absolute -inset-4 bg-linear-to-tr from-primary/10 to-transparent blur-2xl opacity-50" />
          <div className="relative border border-border/40 bg-card/60 backdrop-blur-xl rounded-3xl p-10 shadow-2xl rotate-2 hover:rotate-0 transition-all duration-700 group">
            <div className="space-y-2 mb-10">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-tighter opacity-50">
                  Saved
                </span>
              </div>
              <h2 className="text-3xl font-black tracking-tight font-sans">
                on finding focus.
              </h2>
              <p className="text-xs font-medium opacity-40">
                Wednesday, April 15, 2026
              </p>
            </div>
            <div className="space-y-6 font-serif text-lg leading-relaxed opacity-80 text-left">
              <p>
                Some days, the goal isn&apos;t to be productive—it&apos;s just
                to be{" "}
                <span className="bg-primary/10 px-1 rounded text-primary font-mono text-sm mx-1">
                  present
                </span>
                . Writing things down helps pull the signal from the noise.
              </p>
              <p>
                There is a certain clarity that only comes when you stop moving
                and start reflecting.
              </p>
              <p className="border-l-2 border-primary/20 pl-4 italic opacity-60">
                Focus on the process, not the record.
              </p>
            </div>
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[85%] h-14 bg-background/80 backdrop-blur-md border border-border/40 rounded-2xl shadow-2xl flex items-center justify-between px-6 transition-all group-hover:scale-105 group-hover:-bottom-8 duration-500">
              <div className="flex items-center gap-3">
                <Undo className="h-3.5 w-3.5 text-muted-foreground/40" />
                <Redo className="h-3.5 w-3.5 text-muted-foreground/40" />
              </div>
              <div className="w-px h-4 bg-border/40" />
              <div className="flex items-center gap-4">
                {["H1", "H2", "H3"].map((h) => (
                  <span
                    key={h}
                    className="text-[10px] font-bold text-muted-foreground/60"
                  >
                    {h}
                  </span>
                ))}
              </div>
              <div className="w-px h-4 bg-border/40" />
              <div className="flex items-center gap-4">
                <Bold className="h-3.5 w-3.5 text-muted-foreground/60" />
                <Italic className="h-3.5 w-3.5 text-muted-foreground/60" />
                <Underline className="h-3.5 w-3.5 text-muted-foreground/60" />
              </div>
              <div className="w-px h-4 bg-border/40" />
              <div className="flex items-center gap-4">
                <List className="h-3.5 w-3.5 text-muted-foreground/40" />
                <LinkIcon className="h-3.5 w-3.5 text-muted-foreground/40" />
                <ImageIcon className="h-3.5 w-3.5 text-muted-foreground/40" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. STATS - Centered with a minimal header */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        {/* Added Section Header */}
        <div className="flex flex-col items-center text-center space-y-4 mb-12 md:mb-16">
          <p className="text-muted-foreground font-mono text-[10px] md:text-xs uppercase tracking-[0.3em]">
            System Specifications
          </p>
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter">
            Built for{" "}
            <span className="text-muted-foreground/40 italic font-serif font-light">
              longevity.
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-2 md:flex md:flex-row md:items-center justify-between border-y border-border/40 py-10 gap-x-4 gap-y-10">
          <StatItem label="Storage" value="Unlimited" />
          <div className="hidden md:block h-10 w-px bg-border/20" />
          <StatItem label="Cloud" value="Synced" />
          <div className="hidden md:block h-10 w-px bg-border/20" />
          <StatItem label="Media" value="Image Support" />{" "}
          <div className="hidden md:block h-10 w-px bg-border/20" />
          <StatItem label="Status" value="MIT License" />
        </div>
      </section>

      {/* 3. FEATURES - Adjusted spacing for phone scrolling */}
      <section className="max-w-5xl mx-auto px-6 py-20 md:py-32 space-y-24 md:space-y-32">
        <div className="flex flex-col items-center text-center space-y-4 mb-16 md:mb-24">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-balance">
            Purposefully{" "}
            <span className="text-muted-foreground/40 italic font-serif font-light">
              minimal.
            </span>
          </h2>
          <p className="text-muted-foreground font-mono text-[10px] md:text-xs uppercase tracking-[0.3em]">
            Built for the modern mind
          </p>
        </div>

        <div className="grid grid-cols-1 gap-20 md:gap-32">
          <FeatureRow
            num="01"
            title="Focus Mode"
            desc="The editor fades into the background. Your words are the only thing that matters."
            icon={<PenLine className="w-full h-full" />}
          />
          <FeatureRow
            num="02"
            title="Dark Mode"
            desc="Themes inspired by your favorite IDEs. Optimized for late-night reflection."
            icon={<Leaf className="w-full h-full" />}
            reverse
          />
          <FeatureRow
            num="03"
            title="Seamless Sync"
            desc="Sign in once and write everywhere. Your entries are tied to your account and synced across all your devices in real-time."
            icon={<LinkIcon className="w-full h-full" />}
          />
          <FeatureRow
            num="04"
            title="Visual Memories"
            desc="A picture is worth a thousand words. Effortlessly drag and drop images into your entries to capture the moments that matter most."
            icon={<ImageIcon className="w-full h-full" />}
            reverse
          />
        </div>
      </section>

      {/* 4. FINAL CTA - Scaled padding for mobile */}
      <section className="max-w-4xl mx-auto px-6 py-24 md:py-48 text-center">
        <div className="bg-card/30 border border-border/40 rounded-4xl md:rounded-[40px] p-10 md:p-24 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 md:w-64 md:h-64 bg-primary/5 blur-[80px] md:blur-[100px] -z-10" />
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-8 text-balance">
            Ready to write?
          </h2>
          <Link href="/signup">
            <Button
              size="lg"
              className="rounded-full px-8 md:px-10 h-14 md:h-16 font-bold text-base md:text-lg w-full sm:w-auto"
            >
              Open your diary
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function StatItem({
  label,
  value,
  isLink,
}: {
  label: string;
  value: string;
  isLink?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 md:gap-2 group">
      <span className="text-[9px] md:text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/40 group-hover:text-primary transition-colors">
        {label}
      </span>
      <span
        className={cn(
          "text-lg md:text-2xl font-black tracking-tight",
          isLink &&
            "underline underline-offset-8 decoration-primary/20 hover:decoration-primary transition-all cursor-pointer",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function FeatureRow({
  num,
  title,
  desc,
  icon,
  reverse,
}: {
  num: string;
  title: string;
  desc: string;
  icon: any;
  reverse?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row gap-8 md:gap-12 items-center",
        reverse && "md:flex-row-reverse",
      )}
    >
      <div className="flex-1 space-y-4 md:space-y-6 text-center md:text-left">
        {/* Mobile: 5xl, Desktop: 8xl */}
        <span className="text-5xl md:text-8xl font-serif italic text-muted-foreground/10 select-none block">
          {num}
        </span>
        <h3 className="text-2xl md:text-4xl font-black tracking-tighter">
          {title}
        </h3>
        <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-md mx-auto md:mx-0">
          {desc}
        </p>
      </div>
      <div className="flex-1 w-full flex justify-center items-center">
        {/* Smaller container on mobile (48 -> 80) */}
        <div className="relative w-48 h-48 md:w-80 md:h-80">
          <div className="absolute inset-0 bg-primary/5 rounded-full blur-2xl md:blur-3xl" />
          <div className="relative w-full h-full border border-border/40 bg-card/40 backdrop-blur-sm rounded-[40px] md:rounded-[60px] flex items-center justify-center p-12 md:p-16 shadow-inner group transition-all duration-500 hover:rotate-3">
            <div className="w-full h-full text-primary/40 group-hover:text-primary transition-colors duration-500">
              {icon}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
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
