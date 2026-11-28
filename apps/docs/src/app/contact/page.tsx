"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Copy, Mail, MessageSquare } from "lucide-react";

import { Button } from "@withink/ui/button";
import { IconButton } from "@withink/ui/icon-button";

import { appUrl } from "@/config/env";
import { SUPPORT_EMAIL } from "@/config/site";
import { ReadingPage } from "@/components/reading-shell";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const inputClass =
  "border-border bg-background text-foreground focus-visible:ring-ring h-11 w-full rounded-lg border px-3 font-serif text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

export default function ContactPage() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "opening">("idle");
  const [copied, setCopied] = React.useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be unavailable (insecure context); the address stays visible.
    }
  };

  // No fake network call: hand the message to the visitor's own mail app.
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    const subject = `withink. contact — ${name.trim()}`;
    const body = [
      `From: ${name.trim()} <${email.trim()}>`,
      "",
      message.trim(),
    ].join("\n");
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;

    setStatus("opening");
    window.location.href = mailto;
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <ReadingPage
        eyebrow="Reach out"
        title="Say hello."
        intro={
          <p>
            Feedback, a bug, a question — send it over. Prefer writing your own
            email? Just write to us directly.
          </p>
        }
      >
        <div className="grid gap-8 md:grid-cols-5">
          {/* Contact form (opens the visitor's mail app) */}
          <form onSubmit={handleSubmit} className="space-y-4 md:col-span-3">
            <div className="space-y-1.5">
              <label
                className="text-muted-foreground font-serif text-xs tracking-wider uppercase"
                htmlFor="name"
              >
                Your name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className={inputClass}
                placeholder="Your name"
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="text-muted-foreground font-serif text-xs tracking-wider uppercase"
                htmlFor="email"
              >
                Your email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                spellCheck="false"
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label
                className="text-muted-foreground font-serif text-xs tracking-wider uppercase"
                htmlFor="message"
              >
                Your message
              </label>
              <textarea
                id="message"
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                autoComplete="off"
                className={`${inputClass} h-auto resize-none p-3`}
                placeholder="How can we help?"
              />
            </div>

            <Button
              type="submit"
              className="focus-visible:ring-ring flex h-11 w-full items-center justify-center gap-2 rounded-xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <Mail className="h-4 w-4" />
              Open in email app
            </Button>

            <p
              role="status"
              aria-live="polite"
              className="text-muted-foreground min-h-5 font-serif text-xs"
            >
              {status === "opening" ? (
                <>
                  Opening your mail app… If nothing happens, email{" "}
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="text-accent underline-offset-4 hover:underline"
                  >
                    {SUPPORT_EMAIL}
                  </a>{" "}
                  directly.
                </>
              ) : (
                "This opens a draft in your own email app — nothing is sent from this page."
              )}
            </p>
          </form>

          {/* Direct contacts */}
          <div className="space-y-6 md:col-span-2">
            <div className="border-border space-y-4 rounded-xl border p-5">
              <h2 className="text-foreground flex items-center gap-1.5 font-serif text-sm tracking-wider uppercase">
                <Mail className="text-muted-foreground h-4 w-4" /> Direct
                support
              </h2>
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs">
                  Email us directly anytime:
                </p>
                <div className="border-border bg-card flex items-center justify-between gap-2 rounded-lg border py-1 pr-1 pl-3">
                  <span className="text-foreground truncate font-serif text-xs select-all">
                    {SUPPORT_EMAIL}
                  </span>
                  <IconButton
                    type="button"
                    variant="ghost"
                    size="lg"
                    onClick={handleCopyEmail}
                    aria-label="Copy support email address"
                    className="text-muted-foreground hover:text-foreground shrink-0"
                  >
                    {copied ? (
                      <Check className="text-accent h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </IconButton>
                </div>
                <p aria-live="polite" className="sr-only">
                  {copied ? "Support email copied to clipboard" : ""}
                </p>
              </div>
            </div>

            <div className="border-border space-y-3 rounded-xl border p-5">
              <h2 className="text-foreground flex items-center gap-1.5 font-serif text-sm tracking-wider uppercase">
                <MessageSquare className="text-muted-foreground h-4 w-4" />{" "}
                Already a member?
              </h2>
              <p className="text-muted-foreground font-serif text-xs leading-relaxed">
                Signed in? The in-app feedback form is the fastest way to reach
                us from inside your diary.
              </p>
              <a
                href={`${appUrl()}/feedback`}
                className="text-accent focus-visible:ring-ring inline-flex min-h-11 items-center rounded font-serif text-xs underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Open in-app feedback →
              </a>
            </div>

            <div className="border-border space-y-3 rounded-xl border p-5">
              <h2 className="text-foreground font-serif text-sm tracking-wider uppercase">
                Social
              </h2>
              <div className="flex flex-col">
                <a
                  href="https://twitter.com/withinkme"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center rounded font-serif text-xs transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  Twitter / X: @withinkme
                </a>
                <a
                  href="https://github.com/withinkme"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center rounded font-serif text-xs transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  GitHub: @withinkme
                </a>
                <Link
                  href="/faq"
                  className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center rounded font-serif text-xs transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  Read the FAQ
                </Link>
              </div>
            </div>
          </div>
        </div>
      </ReadingPage>
      <SiteFooter />
    </div>
  );
}
