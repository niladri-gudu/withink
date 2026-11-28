import type { Metadata } from "next";
import Link from "next/link";

import { SUPPORT_EMAIL } from "@/config/site";
import { ReadingPage } from "@/components/reading-shell";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "How withink. protects your journal: zero-knowledge, client-side encryption, no ad tracking, and a plain-spoken list of what we do collect.",
  alternates: {
    canonical: "/privacy",
  },
};

const LAST_UPDATED = "November 28, 2026";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <ReadingPage
        eyebrow="Privacy philosophy"
        title="Your pages are yours alone."
        intro={
          <p>
            Privacy is not a compliance checkbox here — it is why we built this
            diary. This page says plainly what we collect, what we don&apos;t,
            and who helps us run the service.
          </p>
        }
      >
        <p className="text-caption !mt-0">Last updated: {LAST_UPDATED}</p>

        <h2>1. How your journal is protected</h2>
        <p>
          withink. uses{" "}
          <strong className="text-foreground">
            client-side, zero-knowledge encryption
          </strong>
          . Your entries are encrypted in your browser using a key derived from
          your Diary Password. That key never leaves your device, and the server
          only ever receives ciphertext — it cannot decrypt or read your pages.
        </p>
        <p>
          In plain terms: we do not have a master key, a recovery key, or a way
          to read your journal. That protects you from us, from a breach of our
          database, and from anyone who gains access to your account.{" "}
          <Link
            href="/faq"
            className="text-accent underline-offset-4 hover:underline"
          >
            See what happens if you forget your password
          </Link>
          .
        </p>

        <h2>2. What we collect</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Account details</strong> — your
            email address, plus your display name and password hash (or a signed
            Google identity if you sign in with Google).
          </li>
          <li>
            <strong className="text-foreground">
              Encrypted journal content
            </strong>{" "}
            — ciphertext for your entries, letters, and photos, plus the
            non-secret metadata needed to sync them (dates, sizes, sync
            timestamps).
          </li>
          <li>
            <strong className="text-foreground">Billing status</strong> —
            whether your plan is Free, Plus, or Pro. Card details are handled
            entirely by our payment provider; they never reach our servers.
          </li>
          <li>
            <strong className="text-foreground">Essential cookies</strong> — a
            session cookie that keeps you signed in and a theme cookie that
            remembers light or dark. Neither is used for advertising.
          </li>
        </ul>
        <p>
          We do <strong className="text-foreground">not</strong> run analytics
          or ad-tracking scripts on this site or in the app, and we do not sell
          or rent your data.
        </p>

        <h2>3. Who helps us run the service</h2>
        <p>
          We use a small set of service providers (subprocessors) to operate
          withink. Each is bound to use data only on our behalf:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Hosting and database</strong> —
            our cloud host runs the application and a MongoDB database that
            stores your account and encrypted content.
          </li>
          <li>
            <strong className="text-foreground">Cloudflare R2</strong> — object
            storage for encrypted photos and attachments.
          </li>
          <li>
            <strong className="text-foreground">Better Auth</strong> — the open
            source authentication library that manages sign-in sessions.
          </li>
          <li>
            <strong className="text-foreground">Google Sign-In</strong> — only
            if you choose to sign in with Google; we then receive your email and
            basic profile.
          </li>
          <li>
            <strong className="text-foreground">Payment processor</strong> — our
            merchant of record handles billing when you subscribe.
          </li>
        </ul>

        <h2>4. Cookies</h2>
        <p>
          We set only functional cookies: a session cookie that keeps you signed
          in, and a theme cookie that remembers your light or dark preference.
          You can clear them any time in your browser; clearing the session
          cookie signs you out.
        </p>

        <h2>5. Retention</h2>
        <p>
          We keep your account and encrypted content for as long as your account
          is active. Deleting an entry removes it from the active database
          promptly, and routine backups roll off on a short cycle. When you
          close your account, we permanently delete your content.
        </p>

        <h2>6. Export and deletion</h2>
        <p>
          You can export your whole journal at any time as plain text files in a
          ZIP archive. You can also delete individual entries, or close your
          account entirely. Because encryption keys live only on your devices,
          the service side holds nothing but ciphertext to delete.
        </p>

        <h2>7. Children</h2>
        <p>
          withink. is not directed at children under 13, and we do not knowingly
          collect their data.
        </p>

        <h2>8. Changes and contact</h2>
        <p>
          If this policy changes materially we will note it here with a new
          date. Questions or concerns? Email us at{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-accent underline-offset-4 hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>{" "}
          or use the{" "}
          <Link
            href="/contact"
            className="text-accent underline-offset-4 hover:underline"
          >
            contact page
          </Link>
          .
        </p>
      </ReadingPage>
      <SiteFooter />
    </div>
  );
}
