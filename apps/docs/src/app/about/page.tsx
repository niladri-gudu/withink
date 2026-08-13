import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@withink/ui/button";

export const metadata: Metadata = {
  title: "About Us - withink.",
  description:
    "Learn about the mission, values, and story behind withink., your digital diary.",
};

export default function AboutPage() {
  return (
    <div className="animate-in fade-in mx-auto flex max-w-2xl flex-1 flex-col justify-center space-y-8 px-6 py-16 duration-300">
      <div className="space-y-4">
        <Link
          href="/"
          className="text-muted-foreground/80 hover:text-foreground focus-visible:ring-ring inline-flex items-center rounded p-0.5 font-mono text-xs tracking-widest uppercase transition-colors focus-visible:ring-1"
        >
          ← Back to Diary
        </Link>
        <h1 className="text-h1 text-foreground font-serif font-bold tracking-tight">
          Our Story
        </h1>
        <p className="text-subtitle text-muted-foreground font-sans leading-relaxed">
          Creating a quiet library in a world full of noise.
        </p>
      </div>

      <div className="text-body-small text-muted-foreground space-y-6 font-sans leading-relaxed">
        <p>
          At <strong>withink.</strong>, we believe your personal reflections
          deserve a diary. In an era dominated by instant notifications,
          data harvesting, and scrollable feeds, the simple act of taking a pen
          to paper (or fingers to keys) has been lost to the noise.
        </p>
        <p>
          We set out to recreate the peaceful atmosphere of a silent library—a
          digital journal constructed with warmth, intent, and complete privacy.
        </p>

        <h2 className="text-foreground pt-4 font-serif text-xl font-bold">
          The Three Pillars of withink.
        </h2>

        <div className="border-primary/20 space-y-4 border-l-2 py-1 pl-4">
          <div>
            <h3 className="text-foreground font-serif text-base font-bold">
              1. Absolute Privacy
            </h3>
            <p className="text-sm">
              We encrypt your entries server-side. Your thoughts are yours
              alone—free from trackers, ads, or data monetisation.
            </p>
          </div>
          <div>
            <h3 className="text-foreground font-serif text-base font-bold">
              2. Thoughtful Design
            </h3>
            <p className="text-sm">
              Inspired by Sand Light and Moon Dark themes, every element has
              been tailored to soothe the eyes and encourage the flow of
              thoughts.
            </p>
          </div>
          <div>
            <h3 className="text-foreground font-serif text-base font-bold">
              3. Gentle Reflections
            </h3>
            <p className="text-sm">
              We resurface flashbacks slowly and intentionally. There are no
              gamified streaks or social loops—just space to observe your
              growth.
            </p>
          </div>
        </div>

        <p className="pt-4">
          Thank you for choosing to write with us. Welcome to your digital
          diary.
        </p>
      </div>

      <div className="border-border flex items-center justify-between border-t pt-6">
        <Button
          variant="ghost"
          asChild
          className="focus-visible:ring-ring focus-visible:ring-2"
        >
          <Link href="/">Back to Diary</Link>
        </Button>
      </div>
    </div>
  );
}
