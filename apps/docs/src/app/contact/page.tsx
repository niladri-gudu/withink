"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  Mail,
  MessageSquare,
  Send,
} from "lucide-react";

import { Button } from "@withink/ui/button";
import { IconButton } from "@withink/ui/icon-button";

export default function ContactPage() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const supportEmail = "niladrigudu@gmail.com";

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(supportEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;

    // Simulate submission and show success feedback
    setSubmitted(true);
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col space-y-8 px-6 py-10 md:py-16">
      <div className="space-y-4">
        <Link
          href="/"
          className="text-muted-foreground/80 hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center gap-1.5 rounded p-0.5 px-2 -ml-2 font-mono text-xs tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Diary
        </Link>
        <h1 className="text-h1 text-foreground">Reach Out to Us</h1>
        <p className="text-subtitle">
          We are here. Share your feedback, report an issue, or ask a question.
          Your thoughts are always welcome.
        </p>
      </div>

      <div className="grid gap-8 pt-4 md:grid-cols-5">
        {/* Contact Form */}
        <div className="md:col-span-3">
          {submitted ? (
            <div className="border-border bg-card animate-in fade-in space-y-4 rounded-xl border p-6 text-center duration-300">
              <div className="bg-accent/10 text-accent mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                <Check className="h-6 w-6" />
              </div>
              <h2 className="text-title font-serif">Message Received</h2>
              <p className="text-body-small text-muted-foreground">
                Thank you, {name.split(" ")[0]}. Your message has been sent to
                our team. We will respond to {email} as soon as possible.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSubmitted(false);
                  setName("");
                  setEmail("");
                  setMessage("");
                }}
                className="h-11 sm:h-9"
              >
                Send Another Message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  className="text-muted-foreground font-mono text-xs tracking-wider uppercase"
                  htmlFor="name"
                >
                  Your Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="border-border bg-card text-foreground focus-visible:ring-ring h-11 w-full rounded-lg border px-3 text-sm transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-muted-foreground font-mono text-xs tracking-wider uppercase"
                  htmlFor="email"
                >
                  Your Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  spellCheck="false"
                  className="border-border bg-card text-foreground focus-visible:ring-ring h-11 w-full rounded-lg border px-3 text-sm transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  placeholder="john@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  className="text-muted-foreground font-mono text-xs tracking-wider uppercase"
                  htmlFor="message"
                >
                  Your Message
                </label>
                <textarea
                  id="message"
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  autoComplete="off"
                  className="border-border bg-card text-foreground focus-visible:ring-ring w-full resize-none rounded-lg border p-3 text-sm transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  placeholder="How can we help you?"
                />
              </div>

              <Button
                type="submit"
                className="focus-visible:ring-ring flex h-11 w-full items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <Send className="h-4 w-4" /> Send Message
              </Button>
            </form>
          )}
        </div>

        {/* Direct Contacts */}
        <div className="space-y-6 md:col-span-2">
          <div className="border-border bg-card space-y-4 rounded-xl border p-5">
            <h2 className="text-foreground flex items-center gap-1.5 font-mono text-sm tracking-wider uppercase">
              <Mail className="text-muted-foreground h-4 w-4" /> Direct Support
            </h2>
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs">
                Email us directly anytime:
              </p>
              <div className="bg-background border-border flex items-center justify-between gap-2 rounded-lg border py-1 pl-3 pr-1 text-xs">
                <span className="text-foreground truncate font-mono select-all">
                  {supportEmail}
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
            </div>
          </div>

          <div className="border-border bg-card space-y-4 rounded-xl border p-5">
            <h2 className="text-foreground flex items-center gap-1.5 font-mono text-sm tracking-wider uppercase">
              <MessageSquare className="text-muted-foreground h-4 w-4" /> Social
              Channels
            </h2>
            <div className="flex flex-col gap-1 text-xs">
              <a
                href="https://twitter.com/withinkme"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center rounded transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Twitter / X: @withinkme
              </a>
              <a
                href="https://github.com/withinkme"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center rounded transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                GitHub: @withinkme
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
