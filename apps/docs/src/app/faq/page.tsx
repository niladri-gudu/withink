import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@withink/ui/button";

import { registerUrl } from "@/config/env";
import { JsonLd } from "@/components/json-ld";
import { ReadingPage } from "@/components/reading-shell";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Straight answers about withink.: encryption and privacy, what happens if you forget your Diary Password, exporting your journal, pricing, offline use, and more.",
  alternates: {
    canonical: "/faq",
  },
};

interface FaqItem {
  question: string;
  /** Plain-text answer for JSON-LD (no JSX). */
  answer: string;
  body: React.ReactNode;
}

const FAQS: FaqItem[] = [
  {
    question: "Can withink read my entries?",
    answer:
      "No. Your journal is encrypted in your browser with a key derived from your Diary Password, and that key never leaves your device. The server stores only ciphertext, so withink — and anyone who might breach its database — cannot read your entries.",
    body: (
      <>
        No. Your journal is encrypted in your browser with a key derived from
        your Diary Password, and that key never leaves your device. The server
        stores only ciphertext — so withink, and anyone who broke into our
        database, cannot read your entries.
      </>
    ),
  },
  {
    question: "What happens if I forget my Diary Password?",
    answer:
      "Your entries cannot be recovered. Because the encryption key is derived from your Diary Password and is never stored on our servers, there is no reset, backup, or recovery key. Only you can unlock your pages, so please keep a safe record of your password.",
    body: (
      <>
        Your entries cannot be recovered. The encryption key is derived from
        your Diary Password and is never stored on our servers, so there is no
        reset, backup, or recovery key. Only you can unlock your pages — please
        keep a safe record of your password.
      </>
    ),
  },
  {
    question: "Can I export my journal?",
    answer:
      "Yes. You can export your whole journal at any time as plain text files in a ZIP archive, along with your photos and letters. There is no lock-in and no export fee.",
    body: (
      <>
        Yes. Export your whole journal at any time as plain text files in a ZIP
        archive, along with your photos and letters. No lock-in, no export fee.
      </>
    ),
  },
  {
    question: "Is withink free?",
    answer:
      "Writing, reading, and editing your past entries are free forever. Paid plans add longer memory, more photo storage, and more devices, but they never lock away what you already created.",
    body: (
      <>
        Writing, reading, and editing your past entries are free forever. Paid
        plans add longer memory, more photo storage, and more devices — but they
        never lock away what you already created. See{" "}
        <Link
          href="/pricing"
          className="text-accent underline-offset-4 hover:underline"
        >
          pricing
        </Link>
        .
      </>
    ),
  },
  {
    question: "How does one-entry-a-day work?",
    answer:
      "Each day has one page. You write your entry for the day, and recent days can be filled in up to your plan's backfill window. The limit is there to keep the habit gentle rather than to hide anything — every page stays yours to read and edit.",
    body: (
      <>
        Each day has one page. You write the entry for today, and recent days
        can be filled in up to your plan&apos;s backfill window. The limit keeps
        the habit gentle rather than a backlog to clear — every page stays yours
        to read and edit.
      </>
    ),
  },
  {
    question: "Does it work offline?",
    answer:
      "Yes. Your recent journal is kept on your device, so you can read and write without a connection. Changes sync back once you are online again.",
    body: (
      <>
        Yes. Your recent journal is kept on your device, so you can read and
        write without a connection. Changes sync back once you&apos;re online
        again.
      </>
    ),
  },
  {
    question: "Do you track me or show ads?",
    answer:
      "No. There are no analytics scripts, ad trackers, or advertising networks on withink. We set only a sign-in session cookie and a theme preference cookie.",
    body: (
      <>
        No. There are no analytics scripts, ad trackers, or advertising
        networks. We set only a sign-in session cookie and a theme preference
        cookie. Read the{" "}
        <Link
          href="/privacy"
          className="text-accent underline-offset-4 hover:underline"
        >
          privacy page
        </Link>{" "}
        for the full list.
      </>
    ),
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function FaqPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <JsonLd data={faqJsonLd} />
      <SiteHeader />
      <ReadingPage
        eyebrow="Field notes"
        title="Questions, answered honestly."
        intro={
          <p>
            The short version, without marketing gloss. Anything unclear?{" "}
            <Link
              href="/contact"
              className="text-accent underline-offset-4 hover:underline"
            >
              Write to us
            </Link>
            .
          </p>
        }
      >
        <dl className="space-y-6">
          {FAQS.map((item) => (
            <div
              key={item.question}
              className="border-border/70 space-y-2 border-b pb-6 last:border-0 last:pb-0"
            >
              <dt className="text-foreground font-serif text-lg font-bold">
                {item.question}
              </dt>
              <dd>{item.body}</dd>
            </div>
          ))}
        </dl>

        <div className="border-border/70 flex flex-col items-start gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            Ready when you are — your first page is free.
          </p>
          <Button asChild className="h-11 rounded-xl px-5">
            <a href={registerUrl()}>
              <span className="tracking-[0.16em] uppercase">
                Open your diary
              </span>
            </a>
          </Button>
        </div>
      </ReadingPage>
      <SiteFooter />
    </div>
  );
}
