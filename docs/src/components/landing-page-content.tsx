"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Lock,
  Unlock,
  Sparkles,
  Flame,
  Image as ImageIcon,
  Maximize2,
  Download,
  Archive,
  Check,
  Loader2,
  Bold,
  Italic,
  List,
  Quote as QuoteIcon,
  TrendingUp,
  BarChart2,
  Shield,
  Key,
  EyeOff,
  ChevronRight,
  X
} from "lucide-react";

interface LandingPageContentProps {
  APP_URL: string;
  hasSession?: boolean;
}

export function LandingPageContent({ APP_URL, hasSession = false }: LandingPageContentProps) {
  const prefersReduced = useReducedMotion();

  // --- Tile 1: Live Editor & Mood Selector State ---
  const [selectedMood, setSelectedMood] = React.useState<number>(5); // Default Radiant
  const [editorText, setEditorText] = React.useState<string>(
    "Everything clicked today. Walking through the forest path felt so inspiring. I feel incredibly grateful for these quiet moments."
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
      text: "Frustrated by the delays, but writing it down helps clear my head. Tomorrow is a new start to rebuild focus."
    },
    {
      level: 2,
      label: "Sad",
      emoji: "😔",
      colorClass: "mood-sad",
      bgClass: "bg-mood-2-bg border-mood-2-border text-mood-2",
      glowColor: "rgba(156, 110, 42, 0.08)",
      text: "Feeling a bit tired and low energy today. Sometimes it's okay to just rest and let the thoughts pass without pressure."
    },
    {
      level: 3,
      label: "Neutral",
      emoji: "😐",
      colorClass: "mood-neutral",
      bgClass: "bg-mood-3-bg border-mood-3-border text-mood-3",
      glowColor: "rgba(100, 116, 139, 0.08)",
      text: "A standard, quiet day. Did some reading, worked on the project, and drank hot coffee. Moving at a steady pace."
    },
    {
      level: 4,
      label: "Happy",
      emoji: "🙂",
      colorClass: "mood-happy",
      bgClass: "bg-mood-4-bg border-mood-4-border text-mood-4",
      glowColor: "rgba(34, 197, 94, 0.08)",
      text: "Had a great conversation with an old friend. It's nice to reconnect and share laughs. Feeling peaceful tonight."
    },
    {
      level: 5,
      label: "Radiant",
      emoji: "🌟",
      colorClass: "mood-radiant",
      bgClass: "bg-mood-5-bg border-mood-5-border text-mood-5",
      glowColor: "rgba(220, 175, 40, 0.08)",
      text: "Everything clicked today. Walking through the forest path felt so inspiring. I feel incredibly grateful for these quiet moments."
    }
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
  const [flashbackReflection, setFlashbackReflection] = React.useState<string>("");
  const [isReflectionSaved, setIsReflectionSaved] = React.useState<boolean>(false);

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
      rotation: "-rotate-6 hover:-rotate-1"
    },
    {
      src: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=600&q=80",
      caption: "Rain hitting the study glass window",
      rotation: "rotate-3 hover:rotate-6"
    },
    {
      src: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80",
      caption: "A quiet path in the redwoods",
      rotation: "-rotate-2 hover:rotate-2"
    }
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
        delay: custom * 0.1
      }
    })
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen relative overflow-hidden bg-background selection:bg-accent selection:text-accent-foreground">
      {/* Navbar */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="font-serif text-xl font-bold tracking-tight text-foreground select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 p-0.5 rounded"
          >
            withink.
          </Link>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            {hasSession ? (
              <Button
                variant="default"
                asChild
                className="rounded-full shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <a href={APP_URL}>Open Sanctuary</a>
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  asChild
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <a href={`${APP_URL}/login`}>Sign In</a>
                </Button>
                <Button
                  variant="default"
                  asChild
                  className="rounded-full shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
        <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 md:pt-24 md:pb-20 text-center flex flex-col items-center justify-center">
          <motion.div
            initial="hidden"
            animate="visible"
            className="space-y-8 flex flex-col items-center"
          >
            <div className="space-y-4 max-w-2xl">
              <motion.span
                variants={fadeInVariants}
                custom={0}
                className="text-xs uppercase tracking-[0.2em] font-mono text-muted-foreground/80 block"
              >
                A Digital Sanctuary
              </motion.span>
              <motion.h1
                variants={fadeInVariants}
                custom={1}
                className="text-hero md:text-display text-foreground font-serif leading-tight tracking-tight max-w-xl mx-auto"
              >
                Quiet space for your thoughts.
              </motion.h1>
              <motion.p
                variants={fadeInVariants}
                custom={2}
                className="text-subtitle max-w-lg mx-auto text-muted-foreground/90 leading-relaxed font-sans"
              >
                A beautiful, private, and encrypted journal built to encourage daily reflection and preserve your lifelong memories.
              </motion.p>
            </div>

            {/* Hero CTAs */}
            <motion.div
              variants={fadeInVariants}
              custom={3}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
            >
              {hasSession ? (
                <motion.div whileHover={prefersReduced ? {} : { scale: 1.02 }} whileTap={prefersReduced ? {} : { scale: 0.98 }}>
                  <Button
                    size="lg"
                    asChild
                    className="w-full sm:w-auto shadow-sm rounded-full px-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <a href={APP_URL}>Open Sanctuary</a>
                  </Button>
                </motion.div>
              ) : (
                <motion.div whileHover={prefersReduced ? {} : { scale: 1.02 }} whileTap={prefersReduced ? {} : { scale: 0.98 }}>
                  <Button
                    size="lg"
                    asChild
                    className="w-full sm:w-auto shadow-sm rounded-full px-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <a href={`${APP_URL}/register`}>Create Your Sanctuary</a>
                  </Button>
                </motion.div>
              )}
              <motion.div whileHover={prefersReduced ? {} : { scale: 1.02 }} whileTap={prefersReduced ? {} : { scale: 0.98 }}>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="w-full sm:w-auto rounded-full px-8 border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Link href="/privacy">Read Privacy Philosophy</Link>
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* Feature Bento Showcase Grid */}
        <section className="max-w-4xl mx-auto px-6 py-16 border-t border-border/30">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Tile 1: Rich Text Editor & Live Mood Selector Glow (Spans 2 columns) */}
            <motion.div
              variants={fadeInVariants}
              custom={0}
              style={{
                background: `radial-gradient(circle at top right, ${
                  moodData.find((m) => m.level === selectedMood)?.glowColor
                }, transparent 55%)`
              }}
              className="md:col-span-2 rounded-2xl border border-border/40 p-6 bg-card/40 backdrop-blur-[2px] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden relative group min-h-[360px]"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent/20 via-primary/20 to-accent/20" />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/20 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-serif font-bold text-foreground">July 12, 2026</span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium border capitalize transition-colors duration-300 ${
                        moodData.find((m) => m.level === selectedMood)?.bgClass
                      }`}
                    >
                      {moodData.find((m) => m.level === selectedMood)?.label}{" "}
                      {moodData.find((m) => m.level === selectedMood)?.emoji}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-muted-foreground/60 font-mono flex items-center gap-1.5">
                      {isSaving ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin text-accent" />
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
                  <div className="flex items-center space-x-1 border-b border-border/10 pb-2">
                    <button disabled className="p-1 text-muted-foreground/40 rounded hover:bg-secondary/30"><Bold className="h-3.5 w-3.5" /></button>
                    <button disabled className="p-1 text-muted-foreground/40 rounded hover:bg-secondary/30"><Italic className="h-3.5 w-3.5" /></button>
                    <button disabled className="p-1 text-muted-foreground/40 rounded hover:bg-secondary/30"><List className="h-3.5 w-3.5" /></button>
                    <button disabled className="p-1 text-muted-foreground/40 rounded hover:bg-secondary/30"><QuoteIcon className="h-3.5 w-3.5" /></button>
                    <div className="w-[1px] h-3.5 bg-border/20 mx-1" />
                    <span className="text-[10px] text-muted-foreground/40 font-mono">Tiptap Rich-Text Editor</span>
                  </div>
                  <h3 className="text-lg font-serif font-bold text-foreground">Sanctuary reflection</h3>
                  
                  {/* Styled blockquote with custom quote marker */}
                  <div className="relative min-h-[90px]">
                    <React.Suspense fallback={
                      <p className="text-sm font-serif text-muted-foreground leading-relaxed italic border-l-2 border-primary/20 pl-4 py-1">
                        &ldquo;{editorText}&rdquo;
                      </p>
                    }>
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={selectedMood}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          transition={quickSpring}
                          className="text-sm font-serif text-muted-foreground leading-relaxed italic border-l-2 border-primary/20 pl-4 py-1"
                        >
                          &ldquo;{editorText}&rdquo;
                        </motion.p>
                      </AnimatePresence>
                    </React.Suspense>
                  </div>
                </div>
              </div>

              {/* Mood Selector Buttons */}
              <div className="mt-6 border-t border-border/20 pt-4 flex flex-col gap-3">
                <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground/70">
                  How are you feeling right now? (Click to write)
                </span>
                <div className="flex items-center gap-2">
                  {moodData.map((mood) => (
                    <button
                      key={mood.level}
                      onClick={() => handleMoodSelect(mood.level)}
                      aria-label={`Select ${mood.label}`}
                      className={`flex-1 flex flex-col items-center justify-center p-2 rounded-xl border text-sm font-serif transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        selectedMood === mood.level
                          ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                          : "bg-secondary/25 border-border/50 text-muted-foreground/80 hover:bg-secondary/60 hover:text-foreground"
                      }`}
                    >
                      <span className="text-lg mb-0.5">{mood.emoji}</span>
                      <span className="text-[9px] uppercase tracking-wider font-mono opacity-80">{mood.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Tile 2: Sanctuary Passcode Security PIN lock (Spans 1 column) */}
            <motion.div
              variants={fadeInVariants}
              custom={1}
              className="rounded-2xl border border-border/40 p-6 bg-card/40 backdrop-blur-[2px] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden relative min-h-[360px]"
            >
              <div className="flex items-center justify-between border-b border-border/20 pb-3">
                <span className="text-xs uppercase tracking-wider font-mono text-muted-foreground/80 flex items-center gap-1.5">
                  <Lock className="h-3 w-3" /> Encrypted Sanctuary
                </span>
                <span className="text-[9px] font-mono bg-accent/25 border border-accent/20 px-2 py-0.5 rounded text-accent-foreground">
                  PIN: 1234
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
                  className={`h-12 w-12 rounded-full border flex items-center justify-center shadow-inner transition-colors duration-300 ${
                    isPinUnlocked
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : pinError
                      ? "bg-destructive/10 border-destructive/30 text-destructive"
                      : "bg-secondary/40 border-border/60 text-muted-foreground/70"
                  }`}
                >
                  {isPinUnlocked ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                </motion.div>

                {/* Display dots */}
                <div className="flex items-center justify-center space-x-3">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className={`h-3 w-3 rounded-full border transition-all duration-200 ${
                        isPinUnlocked
                          ? "bg-emerald-500 border-emerald-500 scale-105"
                          : pinError
                          ? "bg-destructive border-destructive"
                          : pinDigits.length > idx
                          ? "bg-foreground border-foreground scale-105"
                          : "bg-transparent border-border/80"
                      }`}
                    />
                  ))}
                </div>
                
                <span className="text-[10px] text-center font-mono text-muted-foreground/60 h-4">
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
              <div className="grid grid-cols-3 gap-2 border-t border-border/20 pt-4">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    onClick={() => handlePinPress(num)}
                    disabled={isPinUnlocked}
                    className="h-8 rounded-lg bg-secondary/20 hover:bg-secondary/55 text-foreground text-xs font-mono font-bold flex items-center justify-center border border-border/30 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={handlePinClear}
                  className="h-8 rounded-lg bg-secondary/15 hover:bg-secondary/35 text-[9px] uppercase tracking-wider font-mono font-bold flex items-center justify-center border border-border/20 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  Clear
                </button>
                <button
                  onClick={() => handlePinPress("0")}
                  disabled={isPinUnlocked}
                  className="h-8 rounded-lg bg-secondary/20 hover:bg-secondary/55 text-foreground text-xs font-mono font-bold flex items-center justify-center border border-border/30 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  0
                </button>
                <div className="h-8 flex items-center justify-center text-[10px] text-muted-foreground/30 font-serif italic select-none">
                  Ink
                </div>
              </div>
            </motion.div>

            {/* Tile 3: Nostalgic Flashbacks Memory (Spans 1 column) */}
            <motion.div
              variants={fadeInVariants}
              custom={2}
              className="rounded-2xl border border-border/40 p-6 bg-card/40 backdrop-blur-[2px] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden min-h-[300px]"
            >
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-xs uppercase tracking-wider font-mono text-muted-foreground/80 border-b border-border/20 pb-3">
                  <Sparkles className="h-3 w-3 text-accent" />
                  <span>Nostalgic Flashback</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-mono text-muted-foreground/50">July 12, 2025</span>
                    <span className="text-[10px] bg-mood-5-bg text-mood-5 border border-mood-5-border px-1.5 py-0.2 rounded-full font-medium">
                      Radiant 🌟
                    </span>
                  </div>
                  <h4 className="text-sm font-serif font-bold text-foreground">Watching the sunrise</h4>
                  <p className="text-xs font-serif text-muted-foreground/80 leading-relaxed italic border-l border-primary/20 pl-3">
                    &ldquo;We watched the sunrise from the peak. The air was crisp, and the entire city below was silent. I want to remember this feeling of infinite possibility.&rdquo;
                  </p>
                </div>
              </div>

              <div className="mt-6 border-t border-border/20 pt-4">
                {isReflectionSaved ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Saved to flashback log!
                  </motion.div>
                ) : (
                  <form onSubmit={handleFlashbackSubmit} className="space-y-2">
                    <input
                      type="text"
                      placeholder="Write a reflection on this memory…"
                      value={flashbackReflection}
                      onChange={(e) => setFlashbackReflection(e.target.value)}
                      className="w-full text-xs bg-secondary/15 border border-border/40 focus:border-border/80 focus:bg-secondary/30 rounded-lg px-3 py-2 text-foreground font-sans focus-visible:outline-none placeholder-muted-foreground/50 transition-colors"
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      className="w-full text-[10px] uppercase tracking-wider font-mono rounded-lg border-border/60 hover:bg-secondary/40"
                    >
                      Write Reflection
                    </Button>
                  </form>
                )}
              </div>
            </motion.div>

            {/* Tile 4: Polaroid Media Gallery & Lightbox (Spans 1 column) */}
            <motion.div
              variants={fadeInVariants}
              custom={3}
              className="rounded-2xl border border-border/40 p-6 bg-card/40 backdrop-blur-[2px] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden min-h-[300px] relative group"
            >
              <div className="flex items-center space-x-2 text-xs uppercase tracking-wider font-mono text-muted-foreground/80 border-b border-border/20 pb-3">
                <ImageIcon className="h-3 w-3" />
                <span>Media Attachments</span>
              </div>

              {/* Stacked Polaroids display */}
              <div className="my-auto relative h-36 flex items-center justify-center">
                {polaroids.map((p, idx) => (
                  <motion.button
                    key={idx}
                    onClick={() => setLightboxImg(p.src)}
                    whileHover={prefersReduced ? {} : { scale: 1.05, y: -8, zIndex: 10 }}
                    style={{ left: `calc(50% - 60px + ${idx * 16 - 16}px)` }}
                    className={`absolute w-32 bg-card p-2 pb-4 border border-border/30 rounded shadow-md cursor-zoom-in transition-shadow duration-300 hover:shadow-xl ${p.rotation} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                  >
                    <div className="aspect-[4/3] w-full bg-secondary/20 relative overflow-hidden rounded-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.src}
                        alt={p.caption}
                        className="object-cover w-full h-full grayscale-[10%] hover:grayscale-0 transition-all duration-300"
                      />
                      <div className="absolute inset-0 bg-primary/5 hover:bg-transparent transition-colors" />
                      <div className="absolute bottom-1 right-1 p-0.5 rounded bg-black/40 text-white backdrop-blur-[2px]">
                        <Maximize2 className="h-2 w-2" />
                      </div>
                    </div>
                    <span className="text-[7px] text-muted-foreground/60 font-serif leading-tight mt-1.5 block truncate text-left">
                      {p.caption}
                    </span>
                  </motion.button>
                ))}
              </div>

              <div className="border-t border-border/20 pt-3 text-[10px] text-center font-mono text-muted-foreground/50">
                Hover to rotate · Click to expand lightbox
              </div>
            </motion.div>

            {/* Tile 6: One-click Export ZIP (Spans 1 column) */}
            <motion.div
              variants={fadeInVariants}
              custom={4}
              className="rounded-2xl border border-border/40 p-6 bg-card/40 backdrop-blur-[2px] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden min-h-[300px]"
            >
              <div className="flex items-center space-x-2 text-xs uppercase tracking-wider font-mono text-muted-foreground/80 border-b border-border/20 pb-3">
                <Archive className="h-3 w-3" />
                <span>True Portability</span>
              </div>

              <div className="my-auto flex flex-col items-center justify-center space-y-3 text-center">
                <div className="h-10 w-10 rounded-xl bg-secondary/50 border border-border/50 text-muted-foreground/60 flex items-center justify-center shadow-inner">
                  {exportProgress === 100 ? (
                    <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Archive className={`h-5 w-5 ${exportProgress >= 0 ? "animate-pulse" : ""}`} />
                  )}
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-serif font-bold text-foreground">ZIP Data Export</h4>
                  <p className="text-[10px] text-muted-foreground max-w-[18ch] mx-auto leading-normal">
                    Download everything — HTML text, media files, and metadata ZIP.
                  </p>
                </div>
              </div>

              <div className="border-t border-border/20 pt-4 space-y-2">
                {exportProgress >= 0 ? (
                  <div className="space-y-2">
                    <div className="w-full bg-secondary/35 border border-border/10 h-2.5 rounded-full overflow-hidden">
                      <motion.div
                        className="bg-primary h-full"
                        style={{ width: `${exportProgress}%` }}
                        transition={{ ease: "easeOut" }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[8px] font-mono text-muted-foreground">
                      <span>{exportStage}</span>
                      <span>{exportProgress}%</span>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={triggerExport}
                    className="w-full rounded-xl gap-1.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Archive ZIP
                  </Button>
                )}
              </div>
            </motion.div>

            {/* Tile 5: Insights Heatmap & Monthly Stats Dashboard (Spans 3 columns / full width on desktop) */}
            <motion.div
              variants={fadeInVariants}
              custom={5}
              className="md:col-span-3 rounded-2xl border border-border/40 p-6 bg-card/40 backdrop-blur-[2px] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden relative min-h-[350px]"
            >
              <div className="flex items-center justify-between border-b border-border/20 pb-4 mb-4">
                <span className="text-xs uppercase tracking-wider font-mono text-muted-foreground/80 flex items-center gap-1.5">
                  <BarChart2 className="h-3.5 w-3.5" /> Streaks & Monthly Insights
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/60 flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 text-orange-500 fill-orange-500 animate-pulse" />
                  Streak: <strong className="text-foreground">12 Days Writing</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                {/* Heatmap Grid (2/3 width on wide desktop layout) */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                    <span>Writing Frequency Heatmap</span>
                    <span>July 2026</span>
                  </div>

                  {/* Calendar Heatmap Representation */}
                  <div className="grid grid-cols-7 gap-1.5 p-3 rounded-xl border border-border/20 bg-secondary/10">
                    {Array.from({ length: 35 }).map((_, idx) => {
                      // Seeded coloring: active writing states based on index
                      let color = "bg-secondary/15 hover:bg-secondary/40 border-border/10";
                      let tooltipLabel = "No entries logged";
                      
                      const dayVal = idx - 4; // Start month offsets
                      const dayStr = dayVal > 0 && dayVal <= 31 ? `July ${dayVal}` : null;

                      if (dayStr) {
                        if (idx % 6 === 0) {
                          color = "bg-mood-1-bg border-mood-1-border hover:bg-mood-1/30 text-mood-1";
                          tooltipLabel = "Angry 😠 · 190 words";
                        } else if (idx % 5 === 0) {
                          color = "bg-mood-4-bg border-mood-4-border hover:bg-mood-4/30 text-mood-4";
                          tooltipLabel = "Happy 🙂 · 420 words";
                        } else if (idx % 3 === 0) {
                          color = "bg-mood-5-bg border-mood-5-border hover:bg-mood-5/30 text-mood-5";
                          tooltipLabel = "Radiant 🌟 · 530 words";
                        } else if (idx % 2 === 0) {
                          color = "bg-mood-3-bg border-mood-3-border hover:bg-mood-3/20 text-mood-3";
                          tooltipLabel = "Neutral 😐 · 310 words";
                        } else {
                          color = "bg-mood-2-bg border-mood-2-border hover:bg-mood-2/30 text-mood-2";
                          tooltipLabel = "Sad 😔 · 240 words";
                        }
                      }

                      return (
                        <div
                          key={idx}
                          title={dayStr ? `${dayStr}: ${tooltipLabel}` : undefined}
                          className={`aspect-square rounded-md border flex items-center justify-center transition-all duration-200 cursor-pointer relative group/cell ${color}`}
                        >
                          <span className="text-[8px] font-mono text-muted-foreground/45 pointer-events-none select-none">
                            {dayVal > 0 && dayVal <= 31 ? dayVal : ""}
                          </span>
                          
                          {dayStr && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/cell:block z-20 px-2 py-1 bg-primary text-primary-foreground text-[8px] font-mono rounded shadow-lg whitespace-nowrap">
                              {dayStr}: {tooltipLabel}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-end space-x-2 text-[8px] font-mono text-muted-foreground">
                    <span>Less</span>
                    <span className="h-2 w-2 rounded bg-secondary/15 border border-border/10" />
                    <span className="h-2 w-2 rounded bg-mood-2-bg border-mood-2-border" />
                    <span className="h-2 w-2 rounded bg-mood-3-bg border-mood-3-border" />
                    <span className="h-2 w-2 rounded bg-mood-4-bg border-mood-4-border" />
                    <span className="h-2 w-2 rounded bg-mood-5-bg border-mood-5-border" />
                    <span>More</span>
                  </div>
                </div>

                {/* Mood insights breakdown display */}
                <div className="space-y-4 lg:border-l lg:border-border/20 lg:pl-6">
                  <span className="text-[10px] font-mono text-muted-foreground block">
                    Mood Distribution (Last 30 Days)
                  </span>
                  
                  {/* Custom progress bars */}
                  <div className="space-y-2">
                    {[
                      { label: "Radiant 🌟", pct: 45, color: "bg-mood-5", text: "text-mood-5" },
                      { label: "Happy 🙂", pct: 30, color: "bg-mood-4", text: "text-mood-4" },
                      { label: "Neutral 😐", pct: 15, color: "bg-mood-3", text: "text-mood-3" },
                      { label: "Sad/Angry 😔", pct: 10, color: "bg-mood-2", text: "text-mood-2" }
                    ].map((item, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-[9px] font-mono">
                          <span className={item.text}>{item.label}</span>
                          <span className="text-muted-foreground">{item.pct}%</span>
                        </div>
                        <div className="w-full bg-secondary/40 border border-border/10 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-border/10 text-[9px] font-mono text-muted-foreground">
                    <span>Average Daily Words:</span>
                    <strong className="text-foreground flex items-center gap-0.5">
                      <TrendingUp className="h-3 w-3 text-emerald-500" /> 410 words
                    </strong>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Security & Local First Privacy Philosophy Section */}
        <section className="bg-secondary/20 border-t border-b border-border/30 py-16 md:py-20">
          <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-xl bg-card border border-border/40 text-primary flex items-center justify-center shadow-sm">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-serif font-bold text-foreground">Zero Cloud Trackers</h3>
              <p className="text-xs font-sans text-muted-foreground/80 leading-relaxed max-w-[28ch]">
                We embed no tracking scripts, advertising trackers, or telemetry. Your private sanctuary belongs to you alone.
              </p>
            </div>
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-xl bg-card border border-border/40 text-primary flex items-center justify-center shadow-sm">
                <Key className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-serif font-bold text-foreground">Sanctuary Encryption</h3>
              <p className="text-xs font-sans text-muted-foreground/80 leading-relaxed max-w-[28ch]">
                Double lock options: secure your journal database using a tactile PIN keypad, protecting content from local devices.
              </p>
            </div>
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-xl bg-card border border-border/40 text-primary flex items-center justify-center shadow-sm">
                <EyeOff className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-serif font-bold text-foreground">Local Sovereign Data</h3>
              <p className="text-xs font-sans text-muted-foreground/80 leading-relaxed max-w-[28ch]">
                Export your diary in an open structure ZIP backup, containing plain HTML entries, attachments, and JSON metadata.
              </p>
            </div>
          </div>
        </section>

        {/* User Testimonial & Quote Section */}
        <section className="max-w-4xl mx-auto px-6 py-16 md:py-24 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="space-y-6 max-w-xl mx-auto"
          >
            <QuoteIcon className="h-8 w-8 mx-auto text-accent opacity-50" />
            <blockquote className="text-base sm:text-lg font-serif italic text-foreground leading-relaxed">
              &ldquo;Writing here feels like stepping into a quiet library. No notifications, no noise, just my thoughts and a blank warm paper. It has completely transformed my evening reflection routine.&rdquo;
            </blockquote>
            <cite className="block text-xs uppercase tracking-wider font-mono text-muted-foreground/75 not-italic">
              — Marcus A., Longtime Writer
            </cite>
          </motion.div>
        </section>

        {/* CTA Footer Section */}
        <section className="border-t border-border/30 bg-secondary/15 py-12 md:py-16 text-center">
          <div className="max-w-4xl mx-auto px-6 space-y-6">
            <h2 className="text-h2 font-serif text-foreground">Build your private digital sanctuary.</h2>
            <div className="flex items-center justify-center">
              <motion.div whileHover={prefersReduced ? {} : { scale: 1.02 }} whileTap={prefersReduced ? {} : { scale: 0.98 }}>
                <Button
                  size="lg"
                  asChild
                  className="rounded-full shadow-sm px-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 gap-1.5"
                >
                  <a href={`${APP_URL}/register`}>
                    Get Started Free <ChevronRight className="h-4 w-4" />
                  </a>
                </Button>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-background/50 py-8">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-4 sm:gap-0">
          <p className="order-2 sm:order-1 text-center sm:text-left">© 2026 withink. All rights reserved.</p>
          <div className="order-1 sm:order-2 flex flex-wrap justify-center gap-x-6 gap-y-3 sm:gap-y-0">
            <Link
              href="/about"
              className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 p-0.5 rounded"
            >
              About Us
            </Link>
            <Link
              href="/contact"
              className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 p-0.5 rounded"
            >
              Contact Us
            </Link>
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 p-0.5 rounded"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 p-0.5 rounded"
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
              className="fixed inset-0 bg-background/95 backdrop-blur-md z-50 flex items-center justify-center p-6"
              onClick={() => setLightboxImg(null)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                transition={springTransition}
                className="relative max-w-2xl w-full bg-card rounded-2xl border border-border p-3 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={() => setLightboxImg(null)}
                  aria-label="Close Lightbox"
                  className="absolute top-4 right-4 h-8 w-8 rounded-full bg-secondary/80 border border-border hover:bg-secondary text-foreground flex items-center justify-center active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="aspect-[4/3] w-full bg-secondary/20 relative overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={lightboxImg} alt="Enlarged gallery preview" className="object-cover w-full h-full" />
                </div>
                <div className="pt-4 pb-2 px-2 text-center text-sm font-serif text-muted-foreground">
                  {polaroids.find((p) => p.src === lightboxImg)?.caption ?? "Sanctuary memory image"}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </React.Suspense>
    </div>
  );
}
