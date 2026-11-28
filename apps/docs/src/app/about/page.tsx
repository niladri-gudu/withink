import type { Metadata } from "next";

import { ReadingPage } from "@/components/reading-shell";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "About",
  description:
    "The mission behind withink.: a private, client-side encrypted daily journal, built for the quiet habit of showing up.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <ReadingPage
        eyebrow="The Field Ledger"
        title="Our story"
        intro={<p>Creating a quiet library in a world full of noise.</p>}
      >
        <p>
          At <strong className="text-foreground">withink.</strong>, we believe
          your personal reflections deserve a diary. In an era of instant
          notifications, data harvesting, and scrollable feeds, the simple act
          of taking a pen to paper (or fingers to keys) gets lost in the noise.
        </p>
        <p>
          We set out to recreate the peaceful atmosphere of a quiet desk — a
          digital journal built with warmth, intent, and privacy that is
          structural rather than a promise.
        </p>

        <h2>The three pillars of withink.</h2>

        <div className="border-accent/60 space-y-4 border-l-2 py-1 pl-4">
          <div>
            <h3>1. Absolute privacy</h3>
            <p className="mt-1">
              Entries are encrypted in your browser, before anything leaves your
              device. Your Diary Password derives the key; the server only ever
              stores ciphertext and cannot read your pages.
            </p>
          </div>
          <div>
            <h3>2. Thoughtful design</h3>
            <p className="mt-1">
              Inspired by Sand Light and Moon Dark themes, every element is
              tuned to soothe the eyes and let the words flow.
            </p>
          </div>
          <div>
            <h3>3. Gentle reflections</h3>
            <p className="mt-1">
              Flashbacks resurface slowly and intentionally. There are no social
              loops — just space to observe your growth.
            </p>
          </div>
        </div>

        <p>Thank you for choosing to write with us. Welcome to your diary.</p>
      </ReadingPage>
      <SiteFooter />
    </div>
  );
}
