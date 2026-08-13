import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@withink/ui/button";

export const metadata: Metadata = {
  title: "Privacy Philosophy",
  description:
    "How withink. protects your journal: AES-256-GCM encryption at rest, no ad tracking, and no third-party sharing of your data.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col justify-center space-y-8 px-6 py-16">
      <div className="space-y-4">
        <h1 className="text-h1 text-foreground">Privacy Philosophy</h1>
        <p className="text-caption text-muted-foreground">
          Last updated: July 1, 2026
        </p>
      </div>

      <div className="text-body-small text-muted-foreground space-y-6 leading-relaxed">
        <p>
          At <strong>withink.</strong>, privacy is not a compliance check box.
          It is the cornerstone of why we built this diary. Your journal
          entries are your private thoughts, dreams, and reflections. They
          belong entirely to you.
        </p>
        <h2 className="text-title text-foreground pt-4 font-serif">
          1. Data Encryption
        </h2>
        <p>
          All journal content is encrypted server-side using industry-standard
          AES-256-GCM. We ensure your reflections are protected from
          unauthorized access at rest and in transit.
        </p>
        <h2 className="text-title text-foreground pt-4 font-serif">
          2. No Ad Tracking or Sharing
        </h2>
        <p>
          We do not sell, rent, or share your journal entries or personal data
          with any third-party advertising networks. Your diary remains free
          of trackers and visual noise.
        </p>
      </div>

      <div className="border-border flex items-center justify-between border-t pt-6">
        <Button variant="ghost" asChild>
          <Link href="/">Back to Diary</Link>
        </Button>
      </div>
    </div>
  );
}
