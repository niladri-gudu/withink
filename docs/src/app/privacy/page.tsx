import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Privacy Philosophy",
};

export default function PrivacyPage() {
  return (
    <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto px-6 py-16 space-y-8">
      <div className="space-y-4">
        <h1 className="text-h1 text-foreground">
          Privacy Philosophy
        </h1>
        <p className="text-caption text-muted-foreground">Last updated: July 1, 2026</p>
      </div>

      <div className="space-y-6 text-body-small text-muted-foreground leading-relaxed">
        <p>
          At <strong>withink.</strong>, privacy is not a compliance check box. It is the cornerstone of why we built this sanctuary. Your journal entries are your private thoughts, dreams, and reflections. They belong entirely to you.
        </p>
        <h2 className="text-title font-serif text-foreground pt-4">
          1. Data Encryption
        </h2>
        <p>
          All journal content is encrypted server-side using industry-standard AES-256-GCM. We ensure your reflections are protected from unauthorized access at rest and in transit.
        </p>
        <h2 className="text-title font-serif text-foreground pt-4">
          2. No Ad Tracking or Sharing
        </h2>
        <p>
          We do not sell, rent, or share your journal entries or personal data with any third-party advertising networks. Your sanctuary remains free of trackers and visual noise.
        </p>
      </div>

      <div className="pt-6 border-t border-border flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/">Back to Sanctuary</Link>
        </Button>
      </div>
    </div>
  );
}
