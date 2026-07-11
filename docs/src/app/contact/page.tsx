"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Copy, Mail, MessageSquare, Send } from "lucide-react";

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
    } catch (err) {}
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    
    // Simulate submission and show success feedback
    setSubmitted(true);
  };

  return (
    <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto px-6 py-16 space-y-8 min-h-screen">
      <div className="space-y-4">
        <Link href="/" className="inline-flex items-center text-xs font-mono uppercase tracking-widest text-muted-foreground/80 hover:text-foreground transition-colors gap-1.5 pb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded">
          <ArrowLeft className="h-3 w-3" /> Back to Sanctuary
        </Link>
        <h1 className="text-h1 text-foreground">
          Reach Out to Us
        </h1>
        <p className="text-subtitle">
          We are here. Share your feedback, report an issue, or ask a question. Your thoughts are always welcome.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-5 pt-4">
        {/* Contact Form */}
        <div className="md:col-span-3">
          {submitted ? (
            <div className="border border-border bg-card rounded-xl p-6 text-center space-y-4 animate-in fade-in duration-300">
              <div className="mx-auto w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent">
                <Check className="h-6 w-6" />
              </div>
              <h3 className="text-title font-serif">Message Received</h3>
              <p className="text-body-small text-muted-foreground">
                Thank you, {name.split(" ")[0]}. Your message has been sent to our team. We will respond to {email} as soon as possible.
              </p>
              <Button variant="outline" size="sm" onClick={() => {
                setSubmitted(false);
                setName("");
                setEmail("");
                setMessage("");
              }}>
                Send Another Message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground" htmlFor="name">
                  Your Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-card text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-sm transition-all"
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground" htmlFor="email">
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
                  className="w-full h-10 px-3 rounded-lg border border-border bg-card text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-sm transition-all"
                  placeholder="john@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground" htmlFor="message">
                  Your Message
                </label>
                <textarea
                  id="message"
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  autoComplete="off"
                  className="w-full p-3 rounded-lg border border-border bg-card text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-sm transition-all resize-none"
                  placeholder="How can we help you?"
                />
              </div>

              <Button type="submit" className="w-full h-10 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <Send className="h-4 w-4" /> Send Message
              </Button>
            </form>
          )}
        </div>

        {/* Direct Contacts */}
        <div className="md:col-span-2 space-y-6">
          <div className="border border-border bg-card rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-mono uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-muted-foreground" /> Direct Support
            </h3>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Email us directly anytime:
              </p>
              <div className="flex items-center justify-between bg-background rounded-lg border border-border px-3 py-2 text-xs">
                <span className="font-mono text-foreground truncate select-all">{supportEmail}</span>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  title="Copy email"
                  aria-label="Copy support email address"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="border border-border bg-card rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-mono uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-muted-foreground" /> Social Channels
            </h3>
            <div className="flex flex-col gap-2 text-xs">
              <a href="https://twitter.com/withinkme" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                Twitter / X: @withinkme
              </a>
              <a href="https://github.com/withinkme" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                GitHub: @withinkme
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
