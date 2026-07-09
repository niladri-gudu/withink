import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

export const metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto px-6 py-16 space-y-8">
      <div className="space-y-4">
        <h1 className="text-h1 text-foreground">
          Terms of Service
        </h1>
        <p className="text-caption text-muted-foreground">Last updated: July 1, 2026</p>
      </div>

      <div className="space-y-6 text-body-small text-muted-foreground leading-relaxed">
        <p>
          Welcome to <strong>withink.</strong>. By utilizing our website and services, you agree to comply with the terms defined below.
        </p>
        <h2 className="text-title font-serif text-foreground pt-4">
          1. Acceptable Use
        </h2>
        <p>
          You own your content and are solely responsible for keeping your login credentials secure. You agree to use the service in compliance with all applicable laws.
        </p>
        <h2 className="text-title font-serif text-foreground pt-4">
          2. Lifetime Data Portability
        </h2>
        <p>
          You retain full ownership of all text and media you upload. You can download or export your journal at any time. If you decide to close your account, we will permanently purge your data.
        </p>
      </div>

      <div className="pt-6 border-t border-border flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href={ROUTES.PUBLIC.HOME}>Back to Sanctuary</Link>
        </Button>
      </div>
    </div>
  );
}
