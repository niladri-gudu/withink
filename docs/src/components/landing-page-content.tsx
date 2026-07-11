"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

interface LandingPageContentProps {
  APP_URL: string;
  hasSession?: boolean;
}

export function LandingPageContent({ APP_URL, hasSession = false }: LandingPageContentProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 18,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.98, y: 30 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 80,
        damping: 16,
        delay: 0.4,
      },
    },
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Navbar */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <motion.span 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 15 }}
            className="font-serif text-xl font-bold tracking-tight text-foreground select-none"
          >
            withink.
          </motion.span>
          <motion.div 
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 15 }}
            className="flex items-center space-x-4"
          >
            <ThemeToggle />
            {hasSession ? (
              <Button variant="default" asChild className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <a href={APP_URL}>Open Sanctuary</a>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <a href={`${APP_URL}/login`}>Sign In</a>
                </Button>
                <Button variant="default" asChild className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <a href={`${APP_URL}/register`}>Get Started</a>
                </Button>
              </>
            )}
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16 md:py-24 flex flex-col items-center justify-center text-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-12 flex flex-col items-center"
        >
          {/* Intro */}
          <div className="space-y-6 max-w-2xl">
            <motion.span 
              variants={itemVariants}
              className="text-xs uppercase tracking-[0.2em] font-mono text-muted-foreground/60 block"
            >
              A Digital Sanctuary
            </motion.span>
            <motion.h1 
              variants={itemVariants}
              className="text-hero md:text-display text-foreground font-serif leading-tight tracking-tight"
            >
              Quiet space for your thoughts.
            </motion.h1>
            <motion.p 
              variants={itemVariants}
              className="text-subtitle max-w-lg mx-auto text-muted-foreground/80 leading-relaxed font-sans"
            >
              A beautiful, encrypted, private journal constructed to encourage daily reflection and preserve your lifelong memories.
            </motion.p>
          </div>

          {/* CTA Buttons */}
          <motion.div 
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
          >
            {hasSession ? (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button size="lg" asChild className="w-full sm:w-auto shadow-sm rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <a href={APP_URL}>Open Sanctuary</a>
                </Button>
              </motion.div>
            ) : (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button size="lg" asChild className="w-full sm:w-auto shadow-sm rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <a href={`${APP_URL}/register`}>Create Your Journal</a>
                </Button>
              </motion.div>
            )}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button size="lg" variant="outline" asChild className="w-full sm:w-auto rounded-xl border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <Link href="/privacy">Read Privacy Philosophy</Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* Tactile Mockup preview */}
          <motion.div 
            variants={cardVariants}
            whileHover={{ scale: 1.005, y: -2 }}
            className="w-full aspect-[1.8/1] rounded-2xl border border-border/40 p-6 sm:p-8 bg-card/60 backdrop-blur-[2px] shadow-lg hover:shadow-xl transition-shadow flex flex-col space-y-4 text-left max-w-3xl mx-auto relative overflow-hidden select-none"
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-accent/30 via-primary/30 to-accent/30" />
            <div className="flex items-center justify-between border-b border-border/30 pb-4">
              <div className="flex items-center space-x-2">
                <span className="text-lg font-serif font-bold text-foreground">July 1, 2026</span>
                <span className="text-xs bg-accent/20 text-accent-foreground border border-accent/20 px-2.5 py-0.5 rounded-full font-medium">
                  Calm 😌
                </span>
              </div>
              <span className="text-xs text-muted-foreground/60 font-mono">Saved to your sanctuary</span>
            </div>
            <div className="flex-1 space-y-3 py-2">
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-foreground">A quiet evening of reflection</h2>
              <p className="text-sm sm:text-base font-serif text-muted-foreground leading-relaxed italic border-l-2 border-primary/20 pl-4 py-1">
                &ldquo;Today has been gentle. I sat by the window watching the rain fall against the glass, holding a warm cup of tea. There is a certain peace in taking five minutes to just sit with my thoughts, without notifications, without noise. Writing here feels like stepping into a quiet library, where the only sound is the ink flowing onto premium paper…&rdquo;
              </p>
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-background/50 py-8">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-xs text-muted-foreground space-y-4 md:space-y-0">
          <p>© 2026 withink. All rights reserved.</p>
          <div className="flex space-x-6">
            <Link href={"/about" as any} className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 p-0.5 rounded">
              About Us
            </Link>
            <Link href="/contact" className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 p-0.5 rounded">
              Contact Us
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 p-0.5 rounded">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 p-0.5 rounded">
              Privacy Philosophy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
