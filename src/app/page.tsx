/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import {
  ArrowRight,
  Leaf,
  PenLine,
  ImageIcon,
  List,
  Italic,
  Underline,
  Bold,
  Undo,
  Redo,
  Flame,
  Hash,
  ShieldCheck,
  Zap,
  Sparkles,
  Palette,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/Footer";
import Link from "next/link";

// Utility for tailwind class merging
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 overflow-x-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-[size:32px_32px] opacity-10 -z-20" />

      {/* HERO SECTION */}
      <header className="relative max-w-6xl mx-auto pt-28 md:pt-40 pb-16 md:pb-20 px-6 grid lg:grid-cols-2 gap-10 md:gap-12 items-center">
        <div className="absolute top-10 left-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -z-10" />

        <div className="text-left space-y-5 md:space-y-8">
          <div className="inline-flex items-center gap-3 px-3 py-1 rounded-lg border border-border bg-muted/50 text-muted-foreground text-[10px] font-mono uppercase tracking-tight">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            v1.0.0 — Now Public & Open Source
          </div>

          <h1 className="text-[clamp(3.5rem,12vw,7rem)] font-black tracking-tighter leading-[0.85]">
            Think in <br />
            <span className="text-muted-foreground/30 italic font-serif font-light">
              ink.
            </span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground max-w-md leading-relaxed font-medium">
            A sanctuary for your digital thoughts. No distractions, no tracking,
            just a clean slate for your mind to breathe.
          </p>

          {/* ACTION AREA */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full rounded-xl px-8 h-12 md:h-14 font-bold text-base shadow-xl shadow-primary/20 hover:-translate-y-0.5 transition-all"
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
                  className="w-full rounded-xl px-8 h-12 md:h-14 font-mono text-sm border-border/60"
                >
                  <GithubIcon className="mr-2 h-4 w-4" />
                  view_source
                </Button>
              </a>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground/50">
              <div className="h-px w-8 bg-border/50" />
              <span>Returning to your sanctuary?</span>
              <Link
                href="/signin"
                className="text-foreground hover:text-primary transition-colors hover:underline underline-offset-4 decoration-primary/30"
              >
                Sign in here
              </Link>
            </div>
          </div>
        </div>

        {/* Editor mockup */}
        <div className="relative hidden lg:block">
          <div className="absolute -inset-4 bg-linear-to-tr from-primary/10 to-transparent blur-2xl opacity-50" />
          <div className="relative border border-border/40 bg-card/60 backdrop-blur-xl rounded-3xl p-10 shadow-2xl rotate-2 hover:rotate-0 transition-all duration-700 group">
            <div className="space-y-2 mb-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] font-mono uppercase tracking-tighter opacity-50">
                    Secure / AES-256
                  </span>
                </div>
                <div className="flex gap-1">
                  <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">
                    #reflection
                  </span>
                  <span className="bg-orange-500/10 text-orange-500 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Flame className="w-2.5 h-2.5" /> 12 day streak
                  </span>
                </div>
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

            {/* MINIMALIST MOCK TOOLBAR */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[70%] h-12 bg-background/80 backdrop-blur-md border border-border/40 rounded-xl shadow-2xl flex items-center justify-center gap-8 px-6 transition-all group-hover:scale-105 group-hover:-bottom-8 duration-500">
              <div className="flex items-center gap-4">
                <Undo className="h-3.5 w-3.5 text-muted-foreground/30" />
                <Redo className="h-3.5 w-3.5 text-muted-foreground/30" />
              </div>

              <div className="flex items-center gap-5">
                <Type className="h-3.5 w-3.5 text-muted-foreground/60" />
                <Bold className="h-3.5 w-3.5 text-muted-foreground/60" />
                <Italic className="h-3.5 w-3.5 text-muted-foreground/60" />
              </div>

              <div className="flex items-center gap-5">
                <List className="h-3.5 w-3.5 text-muted-foreground/30" />
                <Hash className="h-3.5 w-3.5 text-primary" />
                <ImageIcon className="h-3.5 w-3.5 text-muted-foreground/30" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* STATS SECTION */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <div className="flex flex-col items-center text-center space-y-3 mb-10 md:mb-16">
          <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.3em]">
            System Specifications
          </p>
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter">
            Built for{" "}
            <span className="text-muted-foreground/40 italic font-serif font-light">
              longevity.
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 border border-border/40 rounded-2xl md:rounded-3xl overflow-hidden">
          {[
            { label: "Security", value: "AES-256" },
            { label: "Habits", value: "Streaks" },
            { label: "Media", value: "R2 Hosted" },
            { label: "Themes", value: "4 Varieties" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={cn(
                "flex flex-col gap-1 p-6 md:p-8 group",
                i % 2 === 0 ? "border-r border-border/40" : "",
                i < 2 ? "border-b md:border-b-0 border-border/40" : "",
                i === 1 ? "md:border-r border-border/40" : "",
                i === 2 ? "md:border-r border-border/40" : "",
              )}
            >
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground/40 group-hover:text-primary transition-colors">
                {stat.label}
              </span>
              <span className="text-xl md:text-2xl font-black tracking-tight">
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="max-w-5xl mx-auto px-6 py-16 md:py-32 space-y-16 md:space-y-32">
        <div className="flex flex-col items-center text-center space-y-3 mb-10 md:mb-24">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-balance">
            Purposefully{" "}
            <span className="text-muted-foreground/40 italic font-serif font-light">
              minimal.
            </span>
          </h2>
          <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.3em]">
            The complete toolkit
          </p>
        </div>

        <div className="grid grid-cols-1 gap-16 md:gap-32">
          <FeatureRow
            num="01"
            title="Focus & Habit"
            desc="Keep the momentum alive with built-in streak tracking and reminder notifications. Consistency is the only metric that matters."
            icon={<Flame className="w-full h-full" />}
          />
          <FeatureRow
            num="02"
            title="Aesthetic Variety"
            desc="Personalize your writing environment with 4 custom themes. Switch between modes that complement your focus and environment."
            icon={<Palette className="w-full h-full" />}
            reverse
          />
          <FeatureRow
            num="03"
            title="Military-Grade Privacy"
            desc="AES-256 client-side encryption ensures your deepest thoughts remain yours. Private by default, secure by design."
            icon={<ShieldCheck className="w-full h-full" />}
          />
          <FeatureRow
            num="04"
            title="Seamless Media"
            desc="Effortlessly integrate images into your narrative. Hosted securely on Cloudflare R2 for lightning-fast, persistent memories."
            icon={<ImageIcon className="w-full h-full" />}
            reverse
          />
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-4xl mx-auto px-6 py-16 md:py-40 text-center">
        <div className="bg-card/30 border border-border/40 rounded-3xl md:rounded-[40px] p-10 md:p-24 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 blur-[80px] -z-10" />
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 md:mb-8 text-balance">
            Ready to write?
          </h2>
          <div className="flex flex-col items-center gap-4">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="rounded-full px-8 md:px-10 h-12 md:h-16 font-bold text-base md:text-lg w-full sm:w-auto"
              >
                Open your diary
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link
              href="/signin"
              className="text-sm font-medium opacity-50 hover:opacity-100 transition-opacity"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* --- COMPONENTS --- */

interface FeatureRowProps {
  num: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  reverse?: boolean;
}

function FeatureRow({ num, title, desc, icon, reverse }: FeatureRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row gap-8 md:gap-12 items-center",
        reverse && "md:flex-row-reverse",
      )}
    >
      <div className="flex-1 space-y-4 text-center md:text-left">
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
        <div className="relative w-40 h-40 md:w-80 md:h-80">
          <div className="absolute inset-0 bg-primary/5 rounded-full blur-2xl md:blur-3xl" />
          <div className="relative w-full h-full border border-border/40 bg-card/40 backdrop-blur-sm rounded-[32px] md:rounded-[60px] flex items-center justify-center p-10 md:p-16 shadow-inner group transition-all duration-500 hover:rotate-3">
            <div className="w-full h-full text-primary/40 group-hover:text-primary transition-colors duration-500">
              {icon}
            </div>
          </div>
        </div>
      </div>
    </div>
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
