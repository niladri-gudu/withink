import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About Us - withink.",
  description: "Learn about the mission, values, and story behind withink., your digital sanctuary.",
};

export default function AboutPage() {
  return (
    <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto px-6 py-16 space-y-8 animate-in fade-in duration-300">
      <div className="space-y-4">
        <Link 
          href="/" 
          className="inline-flex items-center text-xs font-mono uppercase tracking-widest text-muted-foreground/80 hover:text-foreground transition-colors focus-visible:ring-1 focus-visible:ring-ring p-0.5 rounded"
        >
          ← Back to Sanctuary
        </Link>
        <h1 className="text-h1 text-foreground font-serif font-bold tracking-tight">
          Our Story
        </h1>
        <p className="text-subtitle font-sans text-muted-foreground leading-relaxed">
          Creating a quiet library in a world full of noise.
        </p>
      </div>

      <div className="space-y-6 text-body-small text-muted-foreground leading-relaxed font-sans">
        <p>
          At <strong>withink.</strong>, we believe your personal reflections deserve a sanctuary. In an era dominated by instant notifications, data harvesting, and scrollable feeds, the simple act of taking a pen to paper (or fingers to keys) has been lost to the noise.
        </p>
        <p>
          We set out to recreate the peaceful atmosphere of a silent library—a digital journal constructed with warmth, intent, and complete privacy.
        </p>

        <h2 className="text-xl font-serif font-bold text-foreground pt-4">
          The Three Pillars of withink.
        </h2>

        <div className="space-y-4 border-l-2 border-primary/20 pl-4 py-1">
          <div>
            <h3 className="text-base font-serif font-bold text-foreground">1. Absolute Privacy</h3>
            <p className="text-sm">
              We encrypt your entries server-side. Your thoughts are yours alone—free from trackers, ads, or data monetisation.
            </p>
          </div>
          <div>
            <h3 className="text-base font-serif font-bold text-foreground">2. Thoughtful Design</h3>
            <p className="text-sm">
              Inspired by Sand Light and Moon Dark themes, every element has been tailored to soothe the eyes and encourage the flow of thoughts.
            </p>
          </div>
          <div>
            <h3 className="text-base font-serif font-bold text-foreground">3. Gentle Reflections</h3>
            <p className="text-sm">
              We resurface flashbacks slowly and intentionally. There are no gamified streaks or social loops—just space to observe your growth.
            </p>
          </div>
        </div>

        <p className="pt-4">
          Thank you for choosing to write with us. Welcome to your digital sanctuary.
        </p>
      </div>

      <div className="pt-6 border-t border-border flex items-center justify-between">
        <Button variant="ghost" asChild className="focus-visible:ring-2 focus-visible:ring-ring">
          <Link href="/">Back to Sanctuary</Link>
        </Button>
      </div>
    </div>
  );
}
