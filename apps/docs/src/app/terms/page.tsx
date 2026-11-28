import type { Metadata } from "next";
import Link from "next/link";

import { SUPPORT_EMAIL } from "@/config/site";
import { ReadingPage } from "@/components/reading-shell";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "The terms that govern your use of withink., including data ownership, portability, encryption responsibility, and acceptable use.",
  alternates: {
    canonical: "/terms",
  },
};

const LAST_UPDATED = "November 28, 2026";

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <ReadingPage
        eyebrow="Terms of service"
        title="The agreement between us."
        intro={
          <p>
            Plain language, kept short. By using withink. you agree to the terms
            below.
          </p>
        }
      >
        <p className="text-caption !mt-0">Last updated: {LAST_UPDATED}</p>

        <h2>1. Your account</h2>
        <p>
          You need an account to keep a diary. Keep your login credentials and
          your Diary Password secure — you are responsible for activity under
          your account. You must be at least 13 years old to use withink.
        </p>

        <h2>2. Your content</h2>
        <p>
          Everything you write and upload is yours. You keep full ownership of
          all text and media you create. You grant us only the narrow permission
          needed to store and sync your encrypted content so the service can
          work.
        </p>

        <h2>3. Encryption and your password</h2>
        <p>
          Your journal is encrypted in your browser with a key derived from your
          Diary Password. We never receive that password or the key.{" "}
          <strong className="text-foreground">
            If you forget your Diary Password, we cannot recover your entries.
          </strong>{" "}
          Please keep a safe record of it.
        </p>

        <h2>4. Export and closing your account</h2>
        <p>
          You can export your journal at any time as plain text files in a ZIP
          archive, and you can delete entries or close your account whenever you
          like. When you close your account we permanently delete your content.
        </p>

        <h2>5. Plans and billing</h2>
        <p>
          Writing, reading, and editing your past entries are free. Paid plans
          add memory, storage, and devices. Subscriptions renew until cancelled;
          payments are processed by our merchant of record. Downgrading never
          locks away content you already created — only new actions follow the
          new plan&apos;s limits.
        </p>

        <h2>6. Acceptable use</h2>
        <p>
          Use withink. lawfully and for its intended purpose. Do not attempt to
          break the service, access other people&apos;s accounts, or abuse the
          infrastructure. We may suspend accounts that put other users or the
          service at risk.
        </p>

        <h2>7. Availability</h2>
        <p>
          We work to keep the service available and your data safe, but it is
          provided &ldquo;as is&rdquo; without warranties. Keep your own exports
          of anything you could not bear to lose.
        </p>

        <h2>8. Changes and contact</h2>
        <p>
          We may update these terms; material changes will appear here with a
          new date. Questions? Email{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-accent underline-offset-4 hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>{" "}
          or see our{" "}
          <Link
            href="/privacy"
            className="text-accent underline-offset-4 hover:underline"
          >
            privacy policy
          </Link>
          .
        </p>
      </ReadingPage>
      <SiteFooter />
    </div>
  );
}
