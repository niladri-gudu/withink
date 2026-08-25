import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@withink/ui/button";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of withink., including data ownership, portability, and acceptable use.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col space-y-8 px-6 py-10 md:py-16">
      <div className="space-y-4">
        <h1 className="text-h1 text-foreground">Terms of Service</h1>
        <p className="text-caption text-muted-foreground">
          Last updated: July 1, 2026
        </p>
      </div>

      <div className="text-body-small text-muted-foreground space-y-6 leading-relaxed">
        <p>
          Welcome to <strong>withink.</strong>. By utilizing our website and
          services, you agree to comply with the terms defined below.
        </p>
        <h2 className="text-title text-foreground pt-4 font-serif">
          1. Acceptable Use
        </h2>
        <p>
          You own your content and are solely responsible for keeping your login
          credentials secure. You agree to use the service in compliance with
          all applicable laws.
        </p>
        <h2 className="text-title text-foreground pt-4 font-serif">
          2. Lifetime Data Portability
        </h2>
        <p>
          You retain full ownership of all text and media you upload. You can
          download or export your journal at any time. If you decide to close
          your account, we will permanently purge your data.
        </p>
      </div>

      <div className="border-border flex items-center justify-between border-t pt-6">
        <Button
          variant="ghost"
          asChild
          className="h-11 md:h-10"
        >
          <Link href="/">Back to Diary</Link>
        </Button>
      </div>
    </div>
  );
}
