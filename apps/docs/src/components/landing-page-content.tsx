"use client";

import * as React from "react";
import Link from "next/link";
import {
  Archive,
  BarChart2,
  Bold,
  Check,
  ChevronRight,
  Download,
  EyeOff,
  Flame,
  Image as ImageIcon,
  Italic,
  Key,
  List,
  Loader2,
  Lock,
  Maximize2,
  Quote as QuoteIcon,
  Shield,
  Sparkles,
  TrendingUp,
  Unlock,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { Button } from "@withink/ui/button";
import { ThemeToggle } from "@withink/ui/theme-toggle";

interface LandingPageContentProps {
  APP_URL: string;
  hasSession?: boolean;
}

export function LandingPageContent({
  APP_URL,
  hasSession = false,
}: LandingPageContentProps) {
  const prefersReduced = useReducedMotion();

  // --- Tile 1: Live Editor & Mood Selector State ---
  const [selectedMood, setSelectedMood] = React.useState<number>(5); // Default Radiant
  const [editorText, setEditorText] = React.useState<string>(
    "Everything clicked today. Walking through the forest path felt so inspiring. I feel incredibly grateful for these quiet moments.",
  );
  const [isSaving, setIsSaving] = React.useState<boolean>(false);

  const moodData = [
    {
      level: 1,
      label: "Angry",
      emoji: "😠",
      colorClass: "mood-angry",
      bgClass: "bg-mood-1-bg border-mood-1-border text-mood-1",
      glowColor: "rgba(154, 36, 54, 0.08)",
      text: "Frustrated by the delays, but writing it down helps clear my head. Tomorrow is a new start to rebuild focus.",
    },
    {
      level: 2,
      label: "Sad",
      emoji: "😔",
      colorClass: "mood-sad",
      bgClass: "bg-mood-2-bg border-mood-2-border text-mood-2",
      glowColor: "rgba(156, 110, 42, 0.08)",
      text: "Feeling a bit tired and low energy today. Sometimes it's okay to just rest and let the thoughts pass without pressure.",
    },
    {
      level: 3,
      label: "Neutral",
      emoji: "😐",
      colorClass: "mood-neutral",
      bgClass: "bg-mood-3-bg border-mood-3-border text-mood-3",
      glowColor: "rgba(100, 116, 139, 0.08)",
      text: "A standard, quiet day. Did some reading, worked on the project, and drank hot coffee. Moving at a steady pace.",
    },
    {
      level: 4,
      label: "Happy",
      emoji: "🙂",
      colorClass: "mood-happy",
      bgClass: "bg-mood-4-bg border-mood-4-border text-mood-4",
      glowColor: "rgba(34, 197, 94, 0.08)",
      text: "Had a great conversation with an old friend. It's nice to reconnect and share laughs. Feeling peaceful tonight.",
    },
    {
      level: 5,
      label: "Radiant",
      emoji: "🌟",
      colorClass: "mood-radiant",
      bgClass: "bg-mood-5-bg border-mood-5-border text-mood-5",
      glowColor: "rgba(220, 175, 40, 0.08)",
      text: "Everything clicked today. Walking through the forest path felt so inspiring. I feel incredibly grateful for these quiet moments.",
    },
  ];

  const handleMoodSelect = (level: number) => {
    const matched = moodData.find((m) => m.level === level);
    if (!matched) return;
    setSelectedMood(level);
    setIsSaving(true);
    // Simulate typewriter / update
    setEditorText(matched.text);
    setTimeout(() => {
      setIsSaving(false);
    }, 800);
  };

  // --- Tile 2: Security PIN Pad State ---
  const [pinDigits, setPinDigits] = React.useState<string[]>([]);
  const [isPinUnlocked, setIsPinUnlocked] = React.useState<boolean>(false);
  const [pinError, setPinError] = React.useState<boolean>(false);
  const correctPin = "1234";

  const handlePinPress = (digit: string) => {
    if (isPinUnlocked || pinDigits.length >= 4) return;
    const newDigits = [...pinDigits, digit];
    setPinDigits(newDigits);

    if (newDigits.length === 4) {
      const pinStr = newDigits.join("");
      if (pinStr === correctPin) {
        setTimeout(() => {
          setIsPinUnlocked(true);
        }, 300);
      } else {
        setTimeout(() => {
          setPinError(true);
          // Shake and reset after delay
          setTimeout(() => {
            setPinError(false);
            setPinDigits([]);
          }, 650);
        }, 200);
      }
    }
  };

  const handlePinClear = () => {
    setPinDigits([]);
    setIsPinUnlocked(false);
    setPinError(false);
  };

  // --- Tile 3: Flashbacks Reflect Input ---
  const [flashbackReflection, setFlashbackReflection] =
    React.useState<string>("");
  const [isReflectionSaved, setIsReflectionSaved] =
    React.useState<boolean>(false);

  const handleFlashbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flashbackReflection.trim()) return;
    setIsReflectionSaved(true);
  };

  // --- Tile 4: Polaroid Lightbox State ---
  const [lightboxImg, setLightboxImg] = React.useState<string | null>(null);

  const polaroids = [
    {
      src: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80",
      caption: "Misty morning reflection and tea",
      rotation: "-rotate-6 hover:-rotate-1",
    },
    {
      src: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=600&q=80",
      caption: "Rain hitting the study glass window",
      rotation: "rotate-3 hover:rotate-6",
    },
    {
      src: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80",
      caption: "A quiet path in the redwoods",
      rotation: "-rotate-2 hover:rotate-2",
    },
  ];

  // --- Tile 6: Zip Export Simulation ---
  const [exportProgress, setExportProgress] = React.useState<number>(-1); // -1 = idle
  const [exportStage, setExportStage] = React.useState<string>("");

  const triggerExport = () => {
    if (exportProgress >= 0) return;
    setExportProgress(0);
    setExportStage("Preparing archive…");

    const interval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setExportStage("Ready!");
          setTimeout(() => {
            setExportProgress(-1);
          }, 3000);
          return 100;
        }
        const next = prev + 5;
        if (next === 25) setExportStage("Bundling media assets…");
        if (next === 55) setExportStage("Compressing rich-text entries…");
        if (next === 85) setExportStage("Structuring JSON metadata…");
        return next;
      });
    }, 150);
  };

  // Spring animations configs
  const springTransition = { type: "spring", stiffness: 100, damping: 20 };
  const quickSpring = { type: "spring", stiffness: 180, damping: 15 };

  // Scroll animations variants
  const fadeInVariants = {
    hidden: { opacity: 0, y: prefersReduced ? 0 : 20 },
    visible: (custom: number = 0) => ({
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 90,
        damping: 18,
        delay: custom * 0.1,
      },
    }),
  };

  return (
    <div className="bg-background selection:bg-accent selection:text-accent-foreground relative flex min-h-screen flex-1 flex-col overflow-hidden">
      {/* Navbar */}
      <header className="border-border/40 bg-background/80 sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Link
            href="/"
            className="text-foreground focus-visible:ring-ring rounded p-0.5 font-serif text-xl font-bold tracking-tight select-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            withink.
          </Link>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {hasSession ? (
              <Button
                variant="default"
                asChild
                className="focus-visible:ring-ring rounded-full shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <a href={APP_URL}>Open Sanctuary</a>
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  asChild
                  className="focus-visible:ring-ring rounded-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <a href={`${APP_URL}/login`}>Sign In</a>
                </Button>
                <Button
                  variant="default"
                  asChild
                  className="focus-visible:ring-ring rounded-full shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <a href={`${APP_URL}/register`}>Get Started</a>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="mx-auto flex max-w-4xl flex-col items-center justify-center px-6 pt-20 pb-16 text-center md:pt-24 md:pb-20">
          <motion.div
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center space-y-8"
          >
            <div className="max-w-2xl space-y-4">
              <motion.span
                variants={fadeInVariants}
                custom={0}
                className="text-muted-foreground/80 block font-mono text-xs tracking-[0.2em] uppercase"
              >
                A Digital Sanctuary
              </motion.span>
              <motion.h1
                variants={fadeInVariants}
                custom={1}
                className="text-hero md:text-display text-foreground mx-auto max-w-xl font-serif leading-tight tracking-tight"
              >
                Quiet space for your thoughts. Protected always.
              </motion.h1>
              <motion.p
                variants={fadeInVariants}
                custom={2}
                className="text-subtitle text-muted-foreground/90 mx-auto max-w-lg font-sans leading-relaxed"
              >
                An encrypted journal with zero cloud tracking. Write daily
                reflections, capture memories, and keep everything yours —
                offline first, always encrypted.
              </motion.p>
            </div>

            {/* Hero CTAs */}
            <motion.div
              variants={fadeInVariants}
              custom={3}
              className="flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row"
            >
              {hasSession ? (
                <motion.div
                  whileHover={prefersReduced ? {} : { scale: 1.02 }}
                  whileTap={prefersReduced ? {} : { scale: 0.98 }}
                >
                  <Button
                    size="lg"
                    asChild
                    className="focus-visible:ring-ring w-full rounded-full px-8 shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:w-auto"
                  >
                    <a href={APP_URL}>Open Sanctuary</a>
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  whileHover={prefersReduced ? {} : { scale: 1.02 }}
                  whileTap={prefersReduced ? {} : { scale: 0.98 }}
                >
                  <Button
                    size="lg"
                    asChild
                    className="focus-visible:ring-ring w-full rounded-full px-8 shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:w-auto"
                  >
                    <a href={`${APP_URL}/register`}>Create Your Sanctuary</a>
                  </Button>
                </motion.div>
              )}
              <motion.div
                whileHover={prefersReduced ? {} : { scale: 1.02 }}
                whileTap={prefersReduced ? {} : { scale: 0.98 }}
              >
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="border-border/60 focus-visible:ring-ring w-full rounded-full px-8 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:w-auto"
                >
                  <Link href="/privacy">Read Privacy Philosophy</Link>
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* Why withink */}
        <section className="border-border/30 mx-auto max-w-4xl border-t px-6 py-16">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="space-y-12"
          >
            <motion.div
              variants={fadeInVariants}
              custom={0}
              className="space-y-4 text-center"
            >
              <h2 className="text-h2 text-foreground mx-auto max-w-xl font-serif">
                Built for the quiet habit of showing up.
              </h2>
              <p className="text-subtitle text-muted-foreground/80 mx-auto max-w-lg">
                withink. turns daily reflection into something you look forward
                to — not another app you check off.
              </p>
            </motion.div>

            <motion.div
              variants={fadeInVariants}
              custom={1}
              className="grid gap-6 text-center md:grid-cols-3"
            >
              <div className="border-border/40 bg-card/40 space-y-3 rounded-2xl border p-6">
                <div className="bg-secondary/15 text-accent border-border/20 mx-auto flex h-10 w-10 items-center justify-center rounded-xl border">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h3 className="text-foreground font-serif text-sm font-bold">
                  Grows with you
                </h3>
                <p className="text-muted-foreground/75 font-sans text-[11px] leading-relaxed">
                  Streaks, heatmaps, and mood insights help you notice patterns
                  in your writing without ever leaving the page.
                </p>
              </div>
              <div className="border-border/40 bg-card/40 space-y-3 rounded-2xl border p-6">
                <div className="bg-secondary/15 text-accent border-border/20 mx-auto flex h-10 w-10 items-center justify-center rounded-xl border">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-foreground font-serif text-sm font-bold">
                  Designed to focus
                </h3>
                <p className="text-muted-foreground/75 font-sans text-[11px] leading-relaxed">
                  A warm, paper-like canvas with a distraction-free editor. No
                  notifications, no feeds, no noise.
                </p>
              </div>
              <div className="border-border/40 bg-card/40 space-y-3 rounded-2xl border p-6">
                <div className="bg-secondary/15 text-accent border-border/20 mx-auto flex h-10 w-10 items-center justify-center rounded-xl border">
                  <Archive className="h-5 w-5" />
                </div>
                <h3 className="text-foreground font-serif text-sm font-bold">
                  Yours, always
                </h3>
                <p className="text-muted-foreground/75 font-sans text-[11px] leading-relaxed">
                  One-click ZIP export of your entire journal — HTML entries,
                  media, and metadata. Your data, your choice.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Feature Bento Showcase Grid */}
        <section className="border-border/30 mx-auto max-w-4xl border-t px-6 py-16">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="space-y-10"
          >
            <motion.div
              variants={fadeInVariants}
              custom={0}
              className="text-center"
            >
              <span className="text-muted-foreground/70 block font-mono text-xs tracking-[0.2em] uppercase">
                See your sanctuary in action
              </span>
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              className="grid grid-cols-1 gap-6 md:grid-cols-3"
            >
              {/* Tile 1: Rich Text Editor & Live Mood Selector Glow (Spans 2 columns) */}
              <motion.div
                variants={fadeInVariants}
                custom={0}
                style={{
                  background: `radial-gradient(circle at top right, ${
                    moodData.find((m) => m.level === selectedMood)?.glowColor
                  }, transparent 55%)`,
                }}
                className="border-border/40 bg-card/40 group relative flex min-h-[360px] flex-col justify-between overflow-hidden rounded-2xl border p-6 shadow-sm backdrop-blur-[2px] transition-shadow hover:shadow-md md:col-span-2"
              >
                <div className="from-accent/20 via-primary/20 to-accent/20 absolute top-0 right-0 left-0 h-[2px] bg-gradient-to-r" />

                <div className="space-y-4">
                  <div className="border-border/20 flex items-center justify-between border-b pb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-foreground font-serif text-sm font-bold">
                        July 12, 2026
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize transition-colors duration-300 ${
                          moodData.find((m) => m.level === selectedMood)
                            ?.bgClass
                        }`}
                      >
                        {moodData.find((m) => m.level === selectedMood)?.label}{" "}
                        {moodData.find((m) => m.level === selectedMood)?.emoji}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-muted-foreground/60 flex items-center gap-1.5 font-mono text-[10px]">
                        {isSaving ? (
                          <>
                            <Loader2 className="text-accent h-3 w-3 animate-spin" />
                            Saving…
                          </>
                        ) : (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Sanctuary updated
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Editor Content Area */}
                  <div className="space-y-2">
                    <div className="border-border/10 flex items-center space-x-1 border-b pb-2">
                      <button
                        disabled
                        className="text-muted-foreground/40 hover:bg-secondary/30 rounded p-1"
                      >
                        <Bold className="h-3.5 w-3.5" />
                      </button>
                      <button
                        disabled
                        className="text-muted-foreground/40 hover:bg-secondary/30 rounded p-1"
                      >
                        <Italic className="h-3.5 w-3.5" />
                      </button>
                      <button
                        disabled
                        className="text-muted-foreground/40 hover:bg-secondary/30 rounded p-1"
                      >
                        <List className="h-3.5 w-3.5" />
                      </button>
                      <button
                        disabled
                        className="text-muted-foreground/40 hover:bg-secondary/30 rounded p-1"
                      >
                        <QuoteIcon className="h-3.5 w-3.5" />
                      </button>
                      <div className="bg-border/20 mx-1 h-3.5 w-[1px]" />
                      <span className="text-muted-foreground/40 font-mono text-[10px]">
                        Tiptap Rich-Text Editor
                      </span>
                    </div>
                    <h3 className="text-foreground font-serif text-lg font-bold">
                      Sanctuary reflection
                    </h3>

                    {/* Styled blockquote with custom quote marker */}
                    <div className="relative min-h-[90px]">
                      <React.Suspense
                        fallback={
                          <p className="text-muted-foreground border-primary/20 border-l-2 py-1 pl-4 font-serif text-sm leading-relaxed italic">
                            &ldquo;{editorText}&rdquo;
                          </p>
                        }
                      >
                        <AnimatePresence mode="wait">
                          <motion.p
                            key={selectedMood}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={quickSpring}
                            className="text-muted-foreground border-primary/20 border-l-2 py-1 pl-4 font-serif text-sm leading-relaxed italic"
                          >
                            &ldquo;{editorText}&rdquo;
                          </motion.p>
                        </AnimatePresence>
                      </React.Suspense>
                    </div>
                  </div>
                </div>

                {/* Mood Selector Buttons */}
                <div className="border-border/20 mt-6 flex flex-col gap-3 border-t pt-4">
                  <span className="text-muted-foreground/70 font-mono text-[10px] tracking-wider uppercase">
                    How are you feeling right now? (Click to write)
                  </span>
                  <div className="flex items-center gap-2">
                    {moodData.map((mood) => (
                      <button
                        key={mood.level}
                        onClick={() => handleMoodSelect(mood.level)}
                        aria-label={`Select ${mood.label}`}
                        className={`focus-visible:ring-ring flex flex-1 flex-col items-center justify-center rounded-xl border p-2 font-serif text-sm transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
                          selectedMood === mood.level
                            ? "bg-primary text-primary-foreground border-primary scale-105 shadow-sm"
                            : "bg-secondary/25 border-border/50 text-muted-foreground/80 hover:bg-secondary/60 hover:text-foreground"
                        }`}
                      >
                        <span className="mb-0.5 text-lg">{mood.emoji}</span>
                        <span className="font-mono text-[9px] tracking-wider uppercase opacity-80">
                          {mood.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Tile 2: Encrypted Sanctuary PIN lock */}
              <motion.div
                variants={fadeInVariants}
                custom={1}
                className="border-border/40 bg-card/40 relative flex min-h-[360px] flex-col justify-between overflow-hidden rounded-2xl border p-6 shadow-sm backdrop-blur-[2px] transition-shadow hover:shadow-md"
              >
                <div className="border-border/20 flex items-center justify-between border-b pb-3">
                  <span className="text-muted-foreground/80 flex items-center gap-1.5 font-mono text-xs tracking-wider uppercase">
                    <Lock className="h-3 w-3" /> Encrypted Sanctuary
                  </span>
                  <span className="bg-accent/25 border-accent/20 text-accent-foreground rounded border px-2 py-0.5 font-mono text-[9px]">
                    Demo mode
                  </span>
                </div>

                {/* PIN Code Interactive Display */}
                <motion.div
                  animate={pinError ? { x: [-6, 6, -6, 6, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  className="my-auto flex flex-col items-center justify-center space-y-4"
                >
                  <motion.div
                    key={isPinUnlocked ? "unlocked" : "locked"}
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={springTransition}
                    className={`flex h-12 w-12 items-center justify-center rounded-full border shadow-inner transition-colors duration-300 ${
                      isPinUnlocked
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : pinError
                          ? "bg-destructive/10 border-destructive/30 text-destructive"
                          : "bg-secondary/40 border-border/60 text-muted-foreground/70"
                    }`}
                  >
                    {isPinUnlocked ? (
                      <Unlock className="h-5 w-5" />
                    ) : (
                      <Lock className="h-5 w-5" />
                    )}
                  </motion.div>

                  {/* Display dots */}
                  <div className="flex items-center justify-center space-x-3">
                    {[0, 1, 2, 3].map((idx) => (
                      <div
                        key={idx}
                        className={`h-3 w-3 rounded-full border transition-all duration-200 ${
                          isPinUnlocked
                            ? "scale-105 border-emerald-500 bg-emerald-500"
                            : pinError
                              ? "bg-destructive border-destructive"
                              : pinDigits.length > idx
                                ? "bg-foreground border-foreground scale-105"
                                : "border-border/80 bg-transparent"
                        }`}
                      />
                    ))}
                  </div>

                  <span className="text-muted-foreground/60 h-4 text-center font-mono text-[10px]">
                    {isPinUnlocked
                      ? "Access Granted · Welcomed back"
                      : pinError
                        ? "Passcode incorrect · Resetting"
                        : pinDigits.length > 0
                          ? `Passcode: ${pinDigits.length} of 4 digits`
                          : "Enter security PIN code"}
                  </span>
                </motion.div>

                {/* Keypad Interface */}
                <div className="border-border/20 grid grid-cols-3 gap-2 border-t pt-4">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <button
                      key={num}
                      onClick={() => handlePinPress(num)}
                      disabled={isPinUnlocked}
                      className="bg-secondary/20 hover:bg-secondary/55 text-foreground border-border/30 focus-visible:ring-ring flex h-8 items-center justify-center rounded-lg border font-mono text-xs font-bold transition-all focus-visible:ring-1 focus-visible:outline-none active:scale-95"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={handlePinClear}
                    className="bg-secondary/15 hover:bg-secondary/35 border-border/20 focus-visible:ring-ring flex h-8 items-center justify-center rounded-lg border font-mono text-[9px] font-bold tracking-wider uppercase transition-all focus-visible:ring-1 focus-visible:outline-none active:scale-95"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => handlePinPress("0")}
                    disabled={isPinUnlocked}
                    className="bg-secondary/20 hover:bg-secondary/55 text-foreground border-border/30 focus-visible:ring-ring flex h-8 items-center justify-center rounded-lg border font-mono text-xs font-bold transition-all focus-visible:ring-1 focus-visible:outline-none active:scale-95"
                  >
                    0
                  </button>
                  <div className="text-muted-foreground/30 flex h-8 items-center justify-center font-serif text-[10px] italic select-none">
                    Ink
                  </div>
                </div>
              </motion.div>

              {/* Tile 3: Nostalgic Flashback with reflection input */}
              <motion.div
                variants={fadeInVariants}
                custom={2}
                className="border-border/40 bg-card/40 flex min-h-[300px] flex-col justify-between overflow-hidden rounded-2xl border p-6 shadow-sm backdrop-blur-[2px] transition-shadow hover:shadow-md"
              >
                <div className="space-y-4">
                  <div className="text-muted-foreground/80 border-border/20 flex items-center space-x-2 border-b pb-3 font-mono text-xs tracking-wider uppercase">
                    <Sparkles className="text-accent h-3 w-3" />
                    <span>Nostalgic Flashback</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-muted-foreground/50 font-mono text-xs">
                        July 12, 2025
                      </span>
                      <span className="bg-mood-5-bg text-mood-5 border-mood-5-border py-0.2 rounded-full border px-1.5 text-[10px] font-medium">
                        Radiant 🌟
                      </span>
                    </div>
                    <h4 className="text-foreground font-serif text-sm font-bold">
                      Watching the sunrise
                    </h4>
                    <p className="text-muted-foreground/80 border-primary/20 border-l pl-3 font-serif text-xs leading-relaxed italic">
                      &ldquo;We watched the sunrise from the peak. The air was
                      crisp, and the entire city below was silent. I want to
                      remember this feeling of infinite possibility.&rdquo;
                    </p>
                  </div>
                </div>

                <div className="border-border/20 mt-6 border-t pt-4">
                  {isReflectionSaved ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 py-2 text-center text-xs font-medium text-emerald-700 dark:text-emerald-300"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Saved to flashback log!
                    </motion.div>
                  ) : (
                    <form
                      onSubmit={handleFlashbackSubmit}
                      className="space-y-2"
                    >
                      <input
                        type="text"
                        placeholder="Write a reflection on this memory…"
                        value={flashbackReflection}
                        onChange={(e) => setFlashbackReflection(e.target.value)}
                        className="bg-secondary/15 border-border/40 focus:border-border/80 focus:bg-secondary/30 text-foreground placeholder-muted-foreground/50 w-full rounded-lg border px-3 py-2 font-sans text-xs transition-colors focus-visible:outline-none"
                      />
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        className="border-border/60 hover:bg-secondary/40 w-full rounded-lg font-mono text-[10px] tracking-wider uppercase"
                      >
                        Write Reflection
                      </Button>
                    </form>
                  )}
                </div>
              </motion.div>

              {/* Tile 4: Media gallery with polaroid lightbox */}
              <motion.div
                variants={fadeInVariants}
                custom={3}
                className="border-border/40 bg-card/40 group relative flex min-h-[300px] flex-col justify-between overflow-hidden rounded-2xl border p-6 shadow-sm backdrop-blur-[2px] transition-shadow hover:shadow-md"
              >
                <div className="text-muted-foreground/80 border-border/20 flex items-center space-x-2 border-b pb-3 font-mono text-xs tracking-wider uppercase">
                  <ImageIcon className="h-3 w-3" />
                  <span>Media Attachments</span>
                </div>

                {/* Stacked Polaroids display */}
                <div className="relative my-auto flex h-36 items-center justify-center">
                  {polaroids.map((p, idx) => (
                    <motion.button
                      key={idx}
                      onClick={() => setLightboxImg(p.src)}
                      whileHover={
                        prefersReduced ? {} : { scale: 1.05, y: -8, zIndex: 10 }
                      }
                      style={{ left: `calc(50% - 60px + ${idx * 16 - 16}px)` }}
                      className={`bg-card border-border/30 absolute w-32 cursor-zoom-in rounded border p-2 pb-4 shadow-md transition-shadow duration-300 hover:shadow-xl ${p.rotation} focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none`}
                    >
                      <div className="bg-secondary/20 relative aspect-[4/3] w-full overflow-hidden rounded-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.src}
                          alt={p.caption}
                          className="h-full w-full object-cover grayscale-[10%] transition-all duration-300 hover:grayscale-0"
                        />
                        <div className="bg-primary/5 absolute inset-0 transition-colors hover:bg-transparent" />
                        <div className="absolute right-1 bottom-1 rounded bg-black/40 p-0.5 text-white backdrop-blur-[2px]">
                          <Maximize2 className="h-2 w-2" />
                        </div>
                      </div>
                      <span className="text-muted-foreground/60 mt-1.5 block truncate text-left font-serif text-[7px] leading-tight">
                        {p.caption}
                      </span>
                    </motion.button>
                  ))}
                </div>

                <div className="border-border/20 text-muted-foreground/50 border-t pt-3 text-center font-mono text-[10px]">
                  Hover to rotate · Click to expand lightbox
                </div>
              </motion.div>

              {/* Tile 6: One-click ZIP export with progress */}
              <motion.div
                variants={fadeInVariants}
                custom={4}
                className="border-border/40 bg-card/40 flex min-h-[300px] flex-col justify-between overflow-hidden rounded-2xl border p-6 shadow-sm backdrop-blur-[2px] transition-shadow hover:shadow-md"
              >
                <div className="text-muted-foreground/80 border-border/20 flex items-center space-x-2 border-b pb-3 font-mono text-xs tracking-wider uppercase">
                  <Archive className="h-3 w-3" />
                  <span>True Portability</span>
                </div>

                <div className="my-auto flex flex-col items-center justify-center space-y-3 text-center">
                  <div className="bg-secondary/50 border-border/50 text-muted-foreground/60 flex h-10 w-10 items-center justify-center rounded-xl border shadow-inner">
                    {exportProgress === 100 ? (
                      <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Archive
                        className={`h-5 w-5 ${exportProgress >= 0 ? "animate-pulse" : ""}`}
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-foreground font-serif text-sm font-bold">
                      ZIP Data Export
                    </h4>
                    <p className="text-muted-foreground mx-auto max-w-[18ch] text-[10px] leading-normal">
                      Download everything — HTML text, media files, and metadata
                      ZIP.
                    </p>
                  </div>
                </div>

                <div className="border-border/20 space-y-2 border-t pt-4">
                  {exportProgress >= 0 ? (
                    <div className="space-y-2">
                      <div className="bg-secondary/35 border-border/10 h-2.5 w-full overflow-hidden rounded-full border">
                        <motion.div
                          className="bg-primary h-full"
                          style={{ width: `${exportProgress}%` }}
                          transition={{ ease: "easeOut" }}
                        />
                      </div>
                      <div className="text-muted-foreground flex items-center justify-between font-mono text-[8px]">
                        <span>{exportStage}</span>
                        <span>{exportProgress}%</span>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={triggerExport}
                      className="focus-visible:ring-ring w-full gap-1.5 rounded-xl py-1 text-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Archive ZIP
                    </Button>
                  )}
                </div>
              </motion.div>

              {/* Tile 5: Writing frequency heatmap & mood insights (full width) */}
              <motion.div
                variants={fadeInVariants}
                custom={5}
                className="border-border/40 bg-card/40 relative flex min-h-[350px] flex-col justify-between overflow-hidden rounded-2xl border p-6 shadow-sm backdrop-blur-[2px] transition-shadow hover:shadow-md md:col-span-3"
              >
                <div className="border-border/20 mb-4 flex items-center justify-between border-b pb-4">
                  <span className="text-muted-foreground/80 flex items-center gap-1.5 font-mono text-xs tracking-wider uppercase">
                    <BarChart2 className="h-3.5 w-3.5" /> Streaks & Monthly
                    Insights
                  </span>
                  <span className="text-muted-foreground/60 flex items-center gap-1 font-mono text-[10px]">
                    <Flame className="h-3.5 w-3.5 animate-pulse fill-orange-500 text-orange-500" />
                    Streak:{" "}
                    <strong className="text-foreground">12 Days Writing</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-3">
                  {/* Heatmap Grid (2/3 width on wide desktop layout) */}
                  <div className="space-y-3 lg:col-span-2">
                    <div className="text-muted-foreground flex items-center justify-between font-mono text-[10px]">
                      <span>Writing Frequency Heatmap</span>
                      <span>July 2026</span>
                    </div>

                    {/* Calendar Heatmap Representation */}
                    <div className="border-border/20 bg-secondary/10 grid grid-cols-7 gap-1.5 rounded-xl border p-3">
                      {Array.from({ length: 35 }).map((_, idx) => {
                        // Seeded coloring: active writing states based on index
                        let color =
                          "bg-secondary/15 hover:bg-secondary/40 border-border/10";
                        let tooltipLabel = "No entries logged";

                        const dayVal = idx - 4; // Start month offsets
                        const dayStr =
                          dayVal > 0 && dayVal <= 31 ? `July ${dayVal}` : null;

                        if (dayStr) {
                          if (idx % 6 === 0) {
                            color =
                              "bg-mood-1-bg border-mood-1-border hover:bg-mood-1/30 text-mood-1";
                            tooltipLabel = "Angry 😠 · 190 words";
                          } else if (idx % 5 === 0) {
                            color =
                              "bg-mood-4-bg border-mood-4-border hover:bg-mood-4/30 text-mood-4";
                            tooltipLabel = "Happy 🙂 · 420 words";
                          } else if (idx % 3 === 0) {
                            color =
                              "bg-mood-5-bg border-mood-5-border hover:bg-mood-5/30 text-mood-5";
                            tooltipLabel = "Radiant 🌟 · 530 words";
                          } else if (idx % 2 === 0) {
                            color =
                              "bg-mood-3-bg border-mood-3-border hover:bg-mood-3/20 text-mood-3";
                            tooltipLabel = "Neutral 😐 · 310 words";
                          } else {
                            color =
                              "bg-mood-2-bg border-mood-2-border hover:bg-mood-2/30 text-mood-2";
                            tooltipLabel = "Sad 😔 · 240 words";
                          }
                        }

                        return (
                          <div
                            key={idx}
                            title={
                              dayStr ? `${dayStr}: ${tooltipLabel}` : undefined
                            }
                            className={`group/cell relative flex aspect-square cursor-pointer items-center justify-center rounded-md border transition-all duration-200 ${color}`}
                          >
                            <span className="text-muted-foreground/45 pointer-events-none font-mono text-[8px] select-none">
                              {dayVal > 0 && dayVal <= 31 ? dayVal : ""}
                            </span>

                            {dayStr && (
                              <div className="bg-primary text-primary-foreground absolute bottom-full left-1/2 z-20 mb-1.5 hidden -translate-x-1/2 rounded px-2 py-1 font-mono text-[8px] whitespace-nowrap shadow-lg group-hover/cell:block">
                                {dayStr}: {tooltipLabel}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-muted-foreground flex items-center justify-end space-x-2 font-mono text-[8px]">
                      <span>Less</span>
                      <span className="bg-secondary/15 border-border/10 h-2 w-2 rounded border" />
                      <span className="bg-mood-2-bg border-mood-2-border h-2 w-2 rounded" />
                      <span className="bg-mood-3-bg border-mood-3-border h-2 w-2 rounded" />
                      <span className="bg-mood-4-bg border-mood-4-border h-2 w-2 rounded" />
                      <span className="bg-mood-5-bg border-mood-5-border h-2 w-2 rounded" />
                      <span>More</span>
                    </div>
                  </div>

                  {/* Mood insights breakdown display */}
                  <div className="lg:border-border/20 space-y-4 lg:border-l lg:pl-6">
                    <span className="text-muted-foreground block font-mono text-[10px]">
                      Mood Distribution (Last 30 Days)
                    </span>

                    {/* Custom progress bars */}
                    <div className="space-y-2">
                      {[
                        {
                          label: "Radiant 🌟",
                          pct: 45,
                          color: "bg-mood-5",
                          text: "text-mood-5",
                        },
                        {
                          label: "Happy 🙂",
                          pct: 30,
                          color: "bg-mood-4",
                          text: "text-mood-4",
                        },
                        {
                          label: "Neutral 😐",
                          pct: 15,
                          color: "bg-mood-3",
                          text: "text-mood-3",
                        },
                        {
                          label: "Sad/Angry 😔",
                          pct: 10,
                          color: "bg-mood-2",
                          text: "text-mood-2",
                        },
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex items-center justify-between font-mono text-[9px]">
                            <span className={item.text}>{item.label}</span>
                            <span className="text-muted-foreground">
                              {item.pct}%
                            </span>
                          </div>
                          <div className="bg-secondary/40 border-border/10 h-1.5 w-full overflow-hidden rounded-full border">
                            <div
                              className={`h-full ${item.color}`}
                              style={{ width: `${item.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-border/10 text-muted-foreground flex items-center justify-between border-t pt-2 font-mono text-[9px]">
                      <span>Average Daily Words:</span>
                      <strong className="text-foreground flex items-center gap-0.5">
                        <TrendingUp className="h-3 w-3 text-emerald-500" /> 410
                        words
                      </strong>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* Trust & Privacy Philosophy Section */}
        <section className="bg-secondary/20 border-border/30 border-t border-b py-16 md:py-20">
          <div className="mx-auto max-w-4xl space-y-6 px-6 text-center">
            <h2 className="text-h2 text-foreground mx-auto max-w-2xl font-serif">
              Your data stays yours. Always.
            </h2>
            <p className="text-subtitle text-muted-foreground/80 mx-auto max-w-xl">
              Zero cloud tracking. No advertising. No telemetry. Encrypt
              locally, write anywhere, export anytime — your journal, yours from
              day one.
            </p>
            <div className="grid grid-cols-1 gap-8 pt-4 md:grid-cols-3">
              <div className="space-y-3">
                <div className="bg-card border-border/40 text-primary mx-auto flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm">
                  <Shield className="h-5 w-5" />
                </div>
                <h3 className="text-foreground font-serif text-lg font-bold">
                  Zero Cloud Trackers
                </h3>
                <p className="text-muted-foreground/80 font-sans text-xs leading-relaxed">
                  No tracking scripts, advertising trackers, or telemetry. Your
                  sanctuary belongs only to you.
                </p>
              </div>
              <div className="space-y-3">
                <div className="bg-card border-border/40 text-primary mx-auto flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm">
                  <Key className="h-5 w-5" />
                </div>
                <h3 className="text-foreground font-serif text-lg font-bold">
                  Sanctuary Encryption
                </h3>
                <p className="text-muted-foreground/80 font-sans text-xs leading-relaxed">
                  Optional double lock with a tactile PIN. Even on a shared
                  device, your entries stay unreadable.
                </p>
              </div>
              <div className="space-y-3">
                <div className="bg-card border-border/40 text-primary mx-auto flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm">
                  <EyeOff className="h-5 w-5" />
                </div>
                <h3 className="text-foreground font-serif text-lg font-bold">
                  Local Sovereign Data
                </h3>
                <p className="text-muted-foreground/80 font-sans text-xs leading-relaxed">
                  One-click ZIP of plain HTML entries, media, and JSON metadata.
                  Leave anytime, take it all.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Footer Section */}
        <section className="border-border/30 bg-secondary/15 border-t py-12 text-center md:py-16">
          <div className="mx-auto max-w-4xl space-y-6 px-6">
            <h2 className="text-h2 text-foreground font-serif">
              Build your private digital sanctuary.
            </h2>
            <motion.div
              whileHover={prefersReduced ? {} : { scale: 1.02 }}
              whileTap={prefersReduced ? {} : { scale: 0.98 }}
              className="flex items-center justify-center"
            >
              <Button
                size="lg"
                asChild
                className="focus-visible:ring-ring gap-1.5 rounded-full px-8 shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <a href={`${APP_URL}/register`}>
                  Create Your Sanctuary <ChevronRight className="h-4 w-4" />
                </a>
              </Button>
            </motion.div>
            <p className="text-muted-foreground/70 font-mono text-[11px]">
              No credit card. No trackers. No upsells. Free for 30 days, then
              $5/month.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-border/40 bg-background/50 border-t py-8">
        <div className="text-muted-foreground mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 px-6 text-xs sm:flex-row sm:gap-0">
          <p className="order-2 text-center sm:order-1 sm:text-left">
            © 2026 withink. All rights reserved.
          </p>
          <div className="order-1 flex flex-wrap justify-center gap-x-6 gap-y-3 sm:order-2 sm:gap-y-0">
            <Link
              href="/about"
              className="hover:text-foreground focus-visible:ring-ring rounded p-0.5 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              About Us
            </Link>
            <Link
              href="/contact"
              className="hover:text-foreground focus-visible:ring-ring rounded p-0.5 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Contact Us
            </Link>
            <Link
              href="/terms"
              className="hover:text-foreground focus-visible:ring-ring rounded p-0.5 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="hover:text-foreground focus-visible:ring-ring rounded p-0.5 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Privacy Philosophy
            </Link>
          </div>
        </div>
      </footer>

      {/* Lightbox Portal Overlay */}
      <React.Suspense fallback={null}>
        <AnimatePresence>
          {lightboxImg && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-background/95 fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md"
              onClick={() => setLightboxImg(null)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                transition={springTransition}
                className="bg-card border-border relative w-full max-w-2xl rounded-2xl border p-3 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={() => setLightboxImg(null)}
                  aria-label="Close Lightbox"
                  className="bg-secondary/80 border-border hover:bg-secondary text-foreground focus-visible:ring-ring absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border transition-all focus-visible:ring-2 focus-visible:outline-none active:scale-95"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="bg-secondary/20 relative aspect-[4/3] w-full overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={lightboxImg}
                    alt="Enlarged gallery preview"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="text-muted-foreground px-2 pt-4 pb-2 text-center font-serif text-sm">
                  {polaroids.find((p) => p.src === lightboxImg)?.caption ??
                    "Sanctuary memory image"}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </React.Suspense>
    </div>
  );
}
