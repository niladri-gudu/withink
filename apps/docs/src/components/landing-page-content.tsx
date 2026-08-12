"use client";

import * as React from "react";
import Link from "next/link";
import {
  Angry,
  Archive,
  BarChart2,
  Bold,
  Check,
  ChevronRight,
  Download,
  EyeOff,
  Feather,
  Flame,
  Frown,
  Image as ImageIcon,
  Italic,
  Key,
  List,
  Loader2,
  Lock,
  Maximize2,
  Meh,
  Quote as QuoteIcon,
  Shield,
  Smile,
  SmilePlus,
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
  const [selectedMood, setSelectedMood] = React.useState<number>(4); // Default Happy
  const [editorText, setEditorText] = React.useState<string>(
    "Had a great conversation with an old friend. It's nice to reconnect and share laughs. Feeling peaceful tonight.",
  );
  const [isSaving, setIsSaving] = React.useState<boolean>(false);

  const moodData = [
    {
      level: 1,
      label: "Angry",
      Icon: Angry,
      colorClass: "mood-angry",
      bgClass: "bg-mood-1-bg border-mood-1-border text-mood-1",
      glowColor: "rgba(154, 36, 54, 0.08)",
      text: "Frustrated by the delays, but writing it down helps clear my head. Tomorrow is a new start to rebuild focus.",
    },
    {
      level: 2,
      label: "Sad",
      Icon: Frown,
      colorClass: "mood-sad",
      bgClass: "bg-mood-2-bg border-mood-2-border text-mood-2",
      glowColor: "rgba(156, 110, 42, 0.08)",
      text: "Feeling a bit tired and low energy today. Sometimes it's okay to just rest and let the thoughts pass without pressure.",
    },
    {
      level: 3,
      label: "Neutral",
      Icon: Meh,
      colorClass: "mood-neutral",
      bgClass: "bg-mood-3-bg border-mood-3-border text-mood-3",
      glowColor: "rgba(100, 116, 139, 0.08)",
      text: "A standard, quiet day. Did some reading, worked on the project, and drank hot coffee. Moving at a steady pace.",
    },
    {
      level: 4,
      label: "Happy",
      Icon: Smile,
      colorClass: "mood-happy",
      bgClass: "bg-mood-4-bg border-mood-4-border text-mood-4",
      glowColor: "rgba(34, 197, 94, 0.08)",
      text: "Had a great conversation with an old friend. It's nice to reconnect and share laughs. Feeling peaceful tonight.",
    },
    {
      level: 5,
      label: "Radiant",
      Icon: SmilePlus,
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
    hidden: { opacity: 0, y: prefersReduced ? 0 : 18 },
    visible: (custom: number = 0) => ({
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 90,
        damping: 18,
        delay: custom * 0.08,
      },
    }),
  };

  return (
    <div className="bg-background selection:bg-accent selection:text-accent-foreground relative flex min-h-screen flex-1 flex-col overflow-hidden">
      {/* Navbar */}
      <header className="border-border/70 bg-background/85 sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="text-foreground focus-visible:ring-ring select-none rounded p-0.5 font-serif text-2xl font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            withink.
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {hasSession ? (
              <Button
                variant="default"
                asChild
                className="focus-visible:ring-ring rounded-xl px-4 font-serif text-xs font-medium uppercase tracking-[0.2em] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <a href={APP_URL}>Open</a>
              </Button>
            ) : (
              <Button
                variant="default"
                asChild
                className="focus-visible:ring-ring rounded-xl px-4 font-serif text-xs font-medium uppercase tracking-[0.2em] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <a href={`${APP_URL}/login`}>Sign In</a>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero */}
        <section className="ledger-lamplight relative flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center px-6 py-16 md:py-20">
          <div
            aria-hidden="true"
            className="ledger-rules pointer-events-none absolute inset-0"
          />
          <motion.div
            initial="hidden"
            animate="visible"
            className="mx-auto flex max-w-3xl flex-col items-center text-center"
          >
            <motion.h1
              variants={fadeInVariants}
              custom={0}
              className="text-foreground sm:text-hero md:text-display mx-auto max-w-xl font-serif text-[2.5rem] leading-[1.12] tracking-tight"
            >
              Your ordinary days are{" "}
              <em className="font-normal italic">worth keeping.</em>
            </motion.h1>

            <motion.p
              variants={fadeInVariants}
              custom={1}
              className="font-hand text-muted-foreground mt-5 text-center text-2xl md:text-[1.7rem]"
            >
              the small days become the long story.
            </motion.p>

            <motion.p
              variants={fadeInVariants}
              custom={2}
              className="text-muted-foreground/85 mx-auto mt-7 max-w-md font-serif text-base leading-relaxed md:text-lg"
            >
              A private, encrypted journal — one page a day, saved offline and
              exported anytime. Yours forever.
            </motion.p>

            <motion.div
              variants={fadeInVariants}
              custom={3}
              className="mt-10 flex w-full flex-col items-center justify-center gap-3 sm:flex-row"
            >
              {hasSession ? (
                <Button
                  size="lg"
                  asChild
                  className="focus-visible:ring-ring w-full rounded-lg px-8 font-serif text-xs uppercase tracking-[0.2em] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto"
                >
                  <a href={APP_URL}>Open Sanctuary</a>
                </Button>
              ) : (
                <Button
                  size="lg"
                  asChild
                  className="focus-visible:ring-ring w-full rounded-lg px-8 font-serif text-xs uppercase tracking-[0.2em] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto"
                >
                  <a href={`${APP_URL}/register`}>Open Your Diary</a>
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-border/80 focus-visible:ring-ring w-full rounded-lg px-8 font-serif text-xs uppercase tracking-[0.2em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto"
              >
                <Link href="/privacy">Read Privacy Philosophy</Link>
              </Button>
            </motion.div>
          </motion.div>
        </section>

        {/* The Method */}
        <section className="border-border/70 mx-auto max-w-5xl border-t px-6 py-20 md:py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="space-y-14"
          >
            <motion.div
              variants={fadeInVariants}
              custom={0}
              className="mx-auto max-w-2xl space-y-4 text-center"
            >
              <h2 className="text-h2 text-foreground font-serif">
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
              className="grid gap-5 md:grid-cols-3"
            >
              <div className="border-border/80 bg-card hover:border-accent/50 rounded-xl border p-6 shadow-sm transition-all duration-200 hover:shadow-md">
                <div className="text-accent border-border/70 bg-secondary/40 mb-4 flex h-10 w-10 items-center justify-center rounded-xl border">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h3 className="text-foreground font-serif text-xl font-bold">
                  Grows with you
                </h3>
                <p className="text-muted-foreground/80 mt-2 font-sans text-sm leading-relaxed">
                  Streaks, heatmaps, and mood insights help you notice patterns
                  in your writing without ever leaving the page.
                </p>
              </div>
              <div className="border-border/80 bg-card hover:border-accent/50 rounded-xl border p-6 shadow-sm transition-all duration-200 hover:shadow-md">
                <div className="text-accent border-border/70 bg-secondary/40 mb-4 flex h-10 w-10 items-center justify-center rounded-xl border">
                  <Feather className="h-5 w-5" />
                </div>
                <h3 className="text-foreground font-serif text-xl font-bold">
                  Designed to focus
                </h3>
                <p className="text-muted-foreground/80 mt-2 font-sans text-sm leading-relaxed">
                  A warm, paper-like canvas with a distraction-free editor. No
                  notifications, no feeds, no noise.
                </p>
              </div>
              <div className="border-border/80 bg-card hover:border-accent/50 rounded-xl border p-6 shadow-sm transition-all duration-200 hover:shadow-md">
                <div className="text-accent border-border/70 bg-secondary/40 mb-4 flex h-10 w-10 items-center justify-center rounded-xl border">
                  <Archive className="h-5 w-5" />
                </div>
                <h3 className="text-foreground font-serif text-xl font-bold">
                  Yours, always
                </h3>
                <p className="text-muted-foreground/80 mt-2 font-sans text-sm leading-relaxed">
                  One-click ZIP export of your entire journal — HTML entries,
                  media, and metadata. Your data, your choice.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Your diary: live demos */}
        <section className="border-border/70 mx-auto max-w-5xl border-t px-6 py-20 md:py-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            className="space-y-12"
          >
            <motion.div
              variants={fadeInVariants}
              custom={0}
              className="mx-auto max-w-2xl space-y-4 text-center"
            >
              <h2 className="text-h2 text-foreground font-serif">
                A year in your diary.
              </h2>
              <p className="text-subtitle text-muted-foreground/80 mx-auto max-w-lg">
                Live, working previews of the journaling experience — write a
                mood, lock your page, revisit a year.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.12 }}
              className="grid grid-cols-1 gap-5 md:grid-cols-3"
            >
              {/* Page 1: Daily note + mood selector (spans 2 columns) */}
              <motion.div
                variants={fadeInVariants}
                custom={0}
                className="border-border/80 bg-card relative flex min-h-95 flex-col justify-between rounded-xl border shadow-sm md:col-span-2"
              >
                {/*<div className="from-accent/40 via-foreground/25 to-accent/40 absolute left-0 right-0 top-0 h-[2px] rounded-t-xl bg-gradient-to-r" />*/}

                <div className="p-6 md:p-7">
                  <div className="border-foreground/70 flex items-center justify-between border-b-2 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-foreground font-serif text-base font-bold">
                        12 July 2026
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors duration-300 ${
                          moodData.find((m) => m.level === selectedMood)
                            ?.bgClass
                        }`}
                      >
                        {moodData.find((m) => m.level === selectedMood)?.label}
                      </span>
                    </div>
                    <span className="text-muted-foreground flex items-center gap-1.5 font-serif text-[10px] uppercase tracking-[0.14em]">
                      {isSaving ? (
                        <>
                          <Loader2 className="text-accent h-3 w-3 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <span className="bg-accent h-1.5 w-1.5 rounded-full" />
                          Saved
                        </>
                      )}
                    </span>
                  </div>

                  <div className="border-border/60 mt-4 flex items-center space-x-1 border-b pb-2">
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
                    <div className="bg-border/50 mx-1 h-3.5 w-px" />
                    <span className="text-muted-foreground/40 font-serif text-[10px]">
                      rich-text editor
                    </span>
                  </div>

                  <h3 className="text-foreground mt-5 font-serif text-xl font-bold">
                    Today&rsquo;s field note
                  </h3>

                  <div className="relative mt-2 min-h-21">
                    <React.Suspense
                      fallback={
                        <p className="text-muted-foreground border-border/70 border-l py-1 pl-4 font-serif text-sm italic leading-relaxed">
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
                          className="text-muted-foreground border-border/70 border-l py-1 pl-4 font-serif text-sm italic leading-relaxed"
                        >
                          &ldquo;{editorText}&rdquo;
                        </motion.p>
                      </AnimatePresence>
                    </React.Suspense>
                  </div>
                </div>

                {/* Mood selector */}
                <div className="border-border/70 mt-4 border-t p-6 pt-4 md:px-7">
                  <span className="text-muted-foreground block font-serif text-[10px] uppercase tracking-[0.16em]">
                    How are you feeling today?
                  </span>
                  <div className="mt-3 grid grid-cols-5 gap-2">
                    {moodData.map((mood) => {
                      const MoodIcon = mood.Icon;
                      return (
                        <button
                          key={mood.level}
                          onClick={() => handleMoodSelect(mood.level)}
                          aria-label={`Select ${mood.label}`}
                          className={`focus-visible:ring-ring flex flex-col items-center justify-center gap-1 rounded-xl border p-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-95 ${
                            selectedMood === mood.level
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-secondary/30 border-border/60 text-muted-foreground/80 hover:bg-secondary/70 hover:text-foreground"
                          }`}
                        >
                          <MoodIcon className="h-4 w-4" />
                          <span className="font-serif text-[9px] font-medium uppercase tracking-widest">
                            {mood.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>

              {/* Plate 2: Sanctuary Lock (PIN) */}
              <motion.div
                variants={fadeInVariants}
                custom={1}
                className="border-border/80 bg-card relative flex min-h-95 flex-col justify-between rounded-xl border shadow-sm"
              >
                <div className="p-6 md:p-7">
                  <div className="border-border/70 flex items-center justify-between border-b pb-3">
                    <span className="text-muted-foreground flex items-center gap-1.5 font-serif text-[10px] uppercase tracking-[0.16em]">
                      <Lock className="h-3 w-3" /> Sanctuary Lock
                    </span>
                    <span className="bg-accent text-accent-foreground rounded-full border border-transparent px-2 py-0.5 font-serif text-[9px] uppercase tracking-[0.14em]">
                      Demo
                    </span>
                  </div>

                  <motion.div
                    animate={pinError ? { x: [-6, 6, -6, 6, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    className="my-auto flex flex-col items-center justify-center space-y-4 py-10"
                  >
                    <motion.div
                      key={isPinUnlocked ? "unlocked" : "locked"}
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      transition={springTransition}
                      className={`flex h-14 w-14 items-center justify-center rounded-full border shadow-inner transition-colors duration-300 ${
                        isPinUnlocked
                          ? "border-accent/40 bg-accent/10 text-accent"
                          : pinError
                            ? "bg-destructive/10 border-destructive/40 text-destructive"
                            : "bg-secondary/40 border-border/60 text-muted-foreground/70"
                      }`}
                    >
                      {isPinUnlocked ? (
                        <Unlock className="h-5 w-5" />
                      ) : (
                        <Lock className="h-5 w-5" />
                      )}
                    </motion.div>

                    <div className="flex items-center justify-center space-x-3">
                      {[0, 1, 2, 3].map((idx) => (
                        <div
                          key={idx}
                          className={`h-3 w-3 rounded-full border transition-all duration-200 ${
                            isPinUnlocked
                              ? "border-accent bg-accent scale-105"
                              : pinError
                                ? "bg-destructive border-destructive"
                                : pinDigits.length > idx
                                  ? "bg-foreground border-foreground scale-105"
                                  : "border-border/80 bg-transparent"
                          }`}
                        />
                      ))}
                    </div>

                    <span className="text-muted-foreground h-4 text-center font-serif text-[11px]">
                      {isPinUnlocked
                        ? "Unlocked · Welcome back"
                        : pinError
                          ? "Incorrect PIN · Resetting"
                          : pinDigits.length > 0
                            ? `PIN: ${pinDigits.length} of 4`
                            : "Enter your PIN"}
                    </span>
                  </motion.div>
                </div>

                <div className="border-border/70 grid grid-cols-3 gap-2 border-t p-6 pt-4 md:px-7">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                    <button
                      key={num}
                      onClick={() => handlePinPress(num)}
                      disabled={isPinUnlocked}
                      className="bg-secondary/20 hover:bg-secondary/55 text-foreground border-border/40 focus-visible:ring-ring flex h-9 items-center justify-center rounded-xl border font-serif text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-1 active:scale-95"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={handlePinClear}
                    className="bg-secondary/15 hover:bg-secondary/35 border-border/40 focus-visible:ring-ring flex h-9 items-center justify-center rounded-xl border font-serif text-[10px] font-bold uppercase tracking-wider transition-all focus-visible:outline-none focus-visible:ring-1 active:scale-95"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => handlePinPress("0")}
                    disabled={isPinUnlocked}
                    className="bg-secondary/20 hover:bg-secondary/55 text-foreground border-border/40 focus-visible:ring-ring flex h-9 items-center justify-center rounded-xl border font-serif text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-1 active:scale-95"
                  >
                    0
                  </button>
                  <div className="text-muted-foreground/30 flex h-9 select-none items-center justify-center font-serif text-[11px] italic">
                    Nº
                  </div>
                </div>
              </motion.div>

              {/* Plate 3: This date, one year past */}
              <motion.div
                variants={fadeInVariants}
                custom={2}
                className="border-border/80 bg-card flex min-h-80 flex-col justify-between rounded-xl border shadow-sm"
              >
                <div className="space-y-4 p-6">
                  <div className="text-muted-foreground border-border/70 flex items-center space-x-2 border-b pb-3 font-serif text-[10px] uppercase tracking-[0.16em]">
                    <Sparkles className="text-accent h-3 w-3" />
                    <span>This date · one year past</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-muted-foreground/50 font-serif text-xs">
                        12 July 2025
                      </span>
                      <span className="bg-mood-5-bg text-mood-5 border-mood-5-border rounded-full border px-1.5 py-0.5 text-[10px] font-medium">
                        Radiant
                      </span>
                    </div>
                    <h4 className="text-foreground font-serif text-base font-bold">
                      Watching the sunrise
                    </h4>
                    <p className="text-muted-foreground/80 border-border/70 border-l pl-3 font-serif text-sm italic leading-relaxed">
                      &ldquo;We watched the sunrise from the peak. The air was
                      crisp, and the entire city below was silent. I want to
                      remember this feeling of infinite possibility.&rdquo;
                    </p>
                  </div>
                </div>

                <div className="border-border/70 border-t p-6 pt-4">
                  {isReflectionSaved ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="border-accent/40 bg-accent/10 text-accent flex items-center justify-center gap-1.5 rounded-xl border py-2 text-center text-xs font-medium"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Note saved
                    </motion.div>
                  ) : (
                    <form
                      onSubmit={handleFlashbackSubmit}
                      className="space-y-2"
                    >
                      <input
                        type="text"
                        placeholder="Write a note on this memory…"
                        value={flashbackReflection}
                        onChange={(e) => setFlashbackReflection(e.target.value)}
                        className="bg-secondary/15 border-border/40 focus:border-border/80 focus:bg-secondary/30 text-foreground placeholder-muted-foreground/50 w-full rounded-xl border px-3 py-2.5 font-sans text-sm transition-colors focus-visible:outline-none"
                      />
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        className="border-border/60 hover:bg-secondary/40 w-full rounded-xl font-serif text-[10px] font-medium uppercase tracking-[0.14em]"
                      >
                        Keep the note
                      </Button>
                    </form>
                  )}
                </div>
              </motion.div>

              {/* Plate 4: Pressed keepsakes */}
              <motion.div
                variants={fadeInVariants}
                custom={3}
                className="border-border/80 bg-card flex min-h-80 flex-col justify-between rounded-xl border shadow-sm"
              >
                <div className="text-muted-foreground border-border/70 flex items-center space-x-2 border-b p-6 pb-3 font-serif text-[10px] uppercase tracking-[0.16em]">
                  <ImageIcon className="h-3 w-3" />
                  <span>Memory pages</span>
                </div>

                <div className="relative my-auto flex h-36 items-center justify-center px-6">
                  {polaroids.map((p, idx) => (
                    <motion.button
                      key={idx}
                      onClick={() => setLightboxImg(p.src)}
                      whileHover={
                        prefersReduced ? {} : { scale: 1.05, y: -8, zIndex: 10 }
                      }
                      style={{ left: `calc(50% - 60px + ${idx * 16 - 16}px)` }}
                      className={`bg-card border-border/40 absolute w-32 cursor-zoom-in rounded-xl border p-2 pb-3 shadow-md transition-shadow duration-300 hover:shadow-xl ${p.rotation} focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2`}
                    >
                      <div className="bg-secondary/20 relative aspect-4/3 w-full overflow-hidden rounded-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.src}
                          alt={p.caption}
                          className="h-full w-full object-cover grayscale-10 transition-all duration-300 hover:grayscale-0"
                        />
                        <div className="bg-primary/5 absolute inset-0 transition-colors hover:bg-transparent" />
                        <div className="absolute bottom-1 right-1 rounded bg-black/40 p-0.5 text-white backdrop-blur-[2px]">
                          <Maximize2 className="h-2 w-2" />
                        </div>
                      </div>
                      <span className="text-muted-foreground/60 font-hand mt-1.5 block truncate text-left text-base leading-none">
                        {p.caption}
                      </span>
                    </motion.button>
                  ))}
                </div>

                <div className="text-muted-foreground/50 border-border/70 border-t p-6 pt-3 text-center font-serif text-[10px] uppercase tracking-[0.12em]">
                  Hover to tilt · Click to enlarge
                </div>
              </motion.div>

              {/* Plate 6: Export anytime */}
              <motion.div
                variants={fadeInVariants}
                custom={4}
                className="border-border/80 bg-card flex min-h-80 flex-col justify-between rounded-xl border shadow-sm"
              >
                <div className="text-muted-foreground border-border/70 flex items-center space-x-2 border-b p-6 pb-3 font-serif text-[10px] uppercase tracking-[0.16em]">
                  <Archive className="h-3 w-3" />
                  <span>Export anytime</span>
                </div>

                <div className="my-auto flex flex-col items-center justify-center space-y-3 p-6 text-center">
                  <div className="bg-secondary/50 border-border/50 text-muted-foreground/70 flex h-12 w-12 items-center justify-center rounded-xl border shadow-inner">
                    {exportProgress === 100 ? (
                      <Check className="text-accent h-5 w-5" />
                    ) : (
                      <Archive
                        className={`h-5 w-5 ${exportProgress >= 0 ? "animate-pulse" : ""}`}
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-foreground font-serif text-lg font-bold">
                      Your diary, in your hands
                    </h4>
                    <p className="text-muted-foreground mx-auto max-w-[24ch] text-xs leading-normal">
                      Download everything — HTML text, media files, and metadata
                      ZIP. Leave anytime, take it all.
                    </p>
                  </div>
                </div>

                <div className="border-border/70 space-y-2 border-t p-6 pt-4">
                  {exportProgress >= 0 ? (
                    <div className="space-y-2">
                      <div className="bg-secondary/35 border-border/20 h-2.5 w-full overflow-hidden rounded-full border">
                        <motion.div
                          className="bg-primary h-full"
                          style={{ width: `${exportProgress}%` }}
                          transition={{ ease: "easeOut" }}
                        />
                      </div>
                      <div className="text-muted-foreground flex items-center justify-between font-serif text-[10px]">
                        <span>{exportStage}</span>
                        <span>{exportProgress}%</span>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={triggerExport}
                      className="focus-visible:ring-ring w-full gap-1.5 rounded-xl py-1 font-serif text-[10px] uppercase tracking-[0.16em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export My Diary
                    </Button>
                  )}
                </div>
              </motion.div>

              {/* Plate 5: Your year at a glance (full width) */}
              <motion.div
                variants={fadeInVariants}
                custom={5}
                className="border-border/80 bg-card relative flex min-h-75 flex-col justify-between rounded-xl border shadow-sm md:col-span-3"
              >
                <div className="border-border/70 border-b-2 p-6 pb-4 md:p-7 md:pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-muted-foreground flex items-center gap-1.5 font-serif text-[10px] uppercase tracking-[0.16em]">
                      <BarChart2 className="h-3.5 w-3.5" /> Your year at a
                      glance
                    </span>
                    <span className="text-muted-foreground flex items-center gap-1 font-serif text-[11px]">
                      <Flame className="fill-accent text-accent h-3.5 w-3.5 animate-pulse" />
                      Streak:{" "}
                      <strong className="text-foreground">
                        12 days writing
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 items-center gap-8 p-6 md:p-7 lg:grid-cols-3">
                  <div className="space-y-3 lg:col-span-2">
                    <div className="text-muted-foreground flex items-center justify-between font-serif text-[11px]">
                      <span>One page a day</span>
                      <span>July 2026</span>
                    </div>

                    <div className="border-border/30 bg-secondary/10 mx-auto grid w-fit grid-cols-7 gap-1.5 rounded-xl border p-3">
                      {Array.from({ length: 35 }).map((_, idx) => {
                        // Seeded coloring: active writing states based on index
                        let color =
                          "bg-secondary/15 hover:bg-secondary/40 border-border/20";
                        let tooltipLabel = "No entry logged";

                        const dayVal = idx - 4; // Start month offsets
                        const dayStr =
                          dayVal > 0 && dayVal <= 31 ? `July ${dayVal}` : null;

                        if (dayStr) {
                          if (idx % 6 === 0) {
                            color =
                              "bg-mood-1-bg border-mood-1-border hover:bg-mood-1/30 text-mood-1";
                            tooltipLabel = "Angry · 190 words";
                          } else if (idx % 5 === 0) {
                            color =
                              "bg-mood-4-bg border-mood-4-border hover:bg-mood-4/30 text-mood-4";
                            tooltipLabel = "Happy · 420 words";
                          } else if (idx % 3 === 0) {
                            color =
                              "bg-mood-5-bg border-mood-5-border hover:bg-mood-5/30 text-mood-5";
                            tooltipLabel = "Radiant · 530 words";
                          } else if (idx % 2 === 0) {
                            color =
                              "bg-mood-3-bg border-mood-3-border hover:bg-mood-3/20 text-mood-3";
                            tooltipLabel = "Neutral · 310 words";
                          } else {
                            color =
                              "bg-mood-2-bg border-mood-2-border hover:bg-mood-2/30 text-mood-2";
                            tooltipLabel = "Sad · 240 words";
                          }
                        }

                        return (
                          <div
                            key={idx}
                            title={
                              dayStr ? `${dayStr}: ${tooltipLabel}` : undefined
                            }
                            className={`group/cell relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border transition-all duration-200 ${color}`}
                          >
                            <span className="text-muted-foreground/45 pointer-events-none select-none font-serif text-[10px]">
                              {dayVal > 0 && dayVal <= 31 ? dayVal : ""}
                            </span>

                            {dayStr && (
                              <div className="bg-primary text-primary-foreground absolute bottom-full left-1/2 z-20 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md px-2 py-1 font-serif text-[10px] shadow-lg group-hover/cell:block">
                                {dayStr}: {tooltipLabel}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-muted-foreground flex items-center justify-end space-x-2 font-serif text-[10px]">
                      <span>Less</span>
                      <span className="bg-secondary/15 border-border/20 h-2 w-2 rounded border" />
                      <span className="bg-mood-2-bg border-mood-2-border h-2 w-2 rounded" />
                      <span className="bg-mood-3-bg border-mood-3-border h-2 w-2 rounded" />
                      <span className="bg-mood-4-bg border-mood-4-border h-2 w-2 rounded" />
                      <span className="bg-mood-5-bg border-mood-5-border h-2 w-2 rounded" />
                      <span>More</span>
                    </div>
                  </div>

                  <div className="lg:border-border/70 space-y-4 lg:border-l lg:pl-7">
                    <span className="text-muted-foreground block font-serif text-[11px]">
                      Moods · last 30 days
                    </span>

                    <div className="space-y-2.5">
                      {[
                        {
                          label: "Radiant",
                          Icon: SmilePlus,
                          pct: 45,
                          color: "bg-mood-5",
                          text: "text-mood-5",
                        },
                        {
                          label: "Happy",
                          Icon: Smile,
                          pct: 30,
                          color: "bg-mood-4",
                          text: "text-mood-4",
                        },
                        {
                          label: "Neutral",
                          Icon: Meh,
                          pct: 15,
                          color: "bg-mood-3",
                          text: "text-mood-3",
                        },
                        {
                          label: "Sad / Angry",
                          Icon: Frown,
                          pct: 10,
                          color: "bg-mood-2",
                          text: "text-mood-2",
                        },
                      ].map((item, i) => {
                        const BarIcon = item.Icon;
                        return (
                          <div key={i} className="space-y-1">
                            <div className="flex items-center justify-between font-serif text-[11px]">
                              <span
                                className={`${item.text} flex items-center gap-1.5`}
                              >
                                <BarIcon className="h-3 w-3" />
                                {item.label}
                              </span>
                              <span className="text-muted-foreground">
                                {item.pct}%
                              </span>
                            </div>
                            <div className="bg-secondary/40 border-border/20 h-1.5 w-full overflow-hidden rounded-full border">
                              <div
                                className={`h-full ${item.color}`}
                                style={{ width: `${item.pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="text-muted-foreground border-border/70 flex items-center justify-between border-t pt-2 font-serif text-[11px]">
                      <span>Mean entry length:</span>
                      <strong className="text-foreground flex items-center gap-0.5">
                        <TrendingUp className="text-accent h-3 w-3" /> 410 words
                      </strong>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* The Lock & Key */}
        <section className="border-border/70 bg-secondary/40 border-y py-20 md:py-24">
          <div className="mx-auto max-w-5xl space-y-8 px-6 text-center">
            <div className="mx-auto max-w-2xl space-y-4">
              <h2 className="text-h2 text-foreground font-serif">
                Your data stays yours. Always.
              </h2>
              <p className="text-subtitle text-muted-foreground/80 mx-auto max-w-xl">
                Zero cloud tracking. No advertising. No telemetry. Encrypt
                locally, write anywhere, export anytime — your journal, yours
                from day one.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 pt-2 md:grid-cols-3">
              <div className="border-border/80 bg-card rounded-xl border p-6 shadow-sm">
                <div className="border-border/60 text-accent bg-secondary/40 mx-auto flex h-11 w-11 items-center justify-center rounded-xl border">
                  <Shield className="h-5 w-5" />
                </div>
                <h3 className="text-foreground mt-4 font-serif text-xl font-bold">
                  Zero Cloud Trackers
                </h3>
                <p className="text-muted-foreground/80 mt-2 font-sans text-sm leading-relaxed">
                  No tracking scripts, advertising trackers, or telemetry. Your
                  sanctuary belongs only to you.
                </p>
              </div>
              <div className="border-border/80 bg-card rounded-xl border p-6 shadow-sm">
                <div className="border-border/60 text-accent bg-secondary/40 mx-auto flex h-11 w-11 items-center justify-center rounded-xl border">
                  <Key className="h-5 w-5" />
                </div>
                <h3 className="text-foreground mt-4 font-serif text-xl font-bold">
                  Sanctuary Encryption
                </h3>
                <p className="text-muted-foreground/80 mt-2 font-sans text-sm leading-relaxed">
                  Optional double lock with a tactile PIN. Even on a shared
                  device, your entries stay unreadable.
                </p>
              </div>
              <div className="border-border/80 bg-card rounded-xl border p-6 shadow-sm">
                <div className="border-border/60 text-accent bg-secondary/40 mx-auto flex h-11 w-11 items-center justify-center rounded-xl border">
                  <EyeOff className="h-5 w-5" />
                </div>
                <h3 className="text-foreground mt-4 font-serif text-xl font-bold">
                  Local Sovereign Data
                </h3>
                <p className="text-muted-foreground/80 mt-2 font-sans text-sm leading-relaxed">
                  One-click ZIP of plain HTML entries, media, and JSON metadata.
                  Leave anytime, take it all.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-border/70 border-t py-20 md:py-24">
          <div className="mx-auto max-w-4xl space-y-6 px-6 text-center">
            <h2 className="text-h2 text-foreground mx-auto max-w-2xl font-serif">
              Build your private diary.
            </h2>
            <div className="flex items-center justify-center">
              <Button
                size="lg"
                asChild
                className="focus-visible:ring-ring gap-1.5 rounded-xl px-8 font-serif text-xs uppercase tracking-[0.2em] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <a href={`${APP_URL}/register`}>
                  Open Your Diary <ChevronRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
            <p className="text-muted-foreground/70 font-serif text-[11px]">
              No credit card. No trackers. No upsells. Free to start.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-border/70 bg-background/60 border-t py-8">
        <div className="text-muted-foreground mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 text-xs sm:flex-row sm:gap-0">
          <p className="order-2 text-center sm:order-1 sm:text-left">
            © 2026 withink. All rights reserved.
          </p>
          <div className="order-1 flex flex-wrap justify-center gap-x-6 gap-y-3 sm:order-2 sm:gap-y-0">
            <Link
              href="/about"
              className="hover:text-foreground focus-visible:ring-ring rounded p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              About Us
            </Link>
            <Link
              href="/contact"
              className="hover:text-foreground focus-visible:ring-ring rounded p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              Contact Us
            </Link>
            <Link
              href="/terms"
              className="hover:text-foreground focus-visible:ring-ring rounded p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="hover:text-foreground focus-visible:ring-ring rounded p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
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
                className="bg-card border-border relative w-full max-w-2xl rounded-xl border p-3 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setLightboxImg(null)}
                  aria-label="Close Lightbox"
                  className="bg-secondary/80 border-border hover:bg-secondary text-foreground focus-visible:ring-ring absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 active:scale-95"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="bg-secondary/20 relative aspect-4/3 w-full overflow-hidden rounded-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={lightboxImg}
                    alt="Enlarged gallery preview"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="text-muted-foreground font-hand px-2 pb-2 pt-4 text-center text-xl">
                  {polaroids.find((p) => p.src === lightboxImg)?.caption ??
                    "Pressed keepsake"}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </React.Suspense>
    </div>
  );
}
