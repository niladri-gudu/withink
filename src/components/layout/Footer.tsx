import Link from "next/link";
import { PenLine } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-background border-t border-border/40 pt-24 pb-12 antialiased">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8 mb-20">
          {/* Brand Section */}
          <div className="md:col-span-6 space-y-6">
            <div className="flex items-center gap-2">
              <PenLine className="h-5 w-5 text-primary" />
              <span className="text-2xl font-black tracking-tighter">
                journal
                <span className="text-primary/60 italic font-serif font-light text-3xl ml-0.5">
                  .
                </span>
              </span>
            </div>
            <p className="text-muted-foreground text-base leading-relaxed max-w-sm font-medium">
              An open-source sanctuary for digital thoughts. Encrypted by
              default, designed for the modern mind.
            </p>
          </div>

          {/* Metadata Column */}
          <div className="md:col-span-3 flex flex-col gap-5">
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary/40 font-bold">
              Metadata
            </span>
            <ul className="space-y-3.5">
              <FooterLink href="https://github.com/niladri-gudu/deardiary">
                Source Code
              </FooterLink>
              <FooterLink href="#">Changelog</FooterLink>
              <FooterLink href="#">Documentation</FooterLink>
            </ul>
          </div>

          {/* Connection Column */}
          <div className="md:col-span-3 flex flex-col gap-5">
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary/40 font-bold">
              Connection
            </span>
            <ul className="space-y-3.5">
              <FooterLink href="https://twitter.com/dev_niladri">
                Twitter / X
              </FooterLink>
              <FooterLink href="mailto:hello@deardiary.ai">Support</FooterLink>
              <FooterLink href="https://github.com/niladri-gudu">
                Developer
              </FooterLink>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border/40 pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-full border border-border/40 bg-muted/30">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60">
                Pulse Stable
              </span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground/30 uppercase tracking-tighter hidden sm:inline">
              Ping: 24ms
            </span>
          </div>

          <p className="text-muted-foreground text-[10px] font-mono uppercase tracking-[0.1em]">
            © {new Date().getFullYear()} Journal // Built by{" "}
            <span className="text-foreground font-bold border-b border-primary/20">
              Niladri
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group text-muted-foreground hover:text-foreground text-sm font-medium transition-all flex items-center gap-2"
      >
        <span className="text-primary/40 font-mono text-xs opacity-0 group-hover:opacity-100 transition-opacity -ml-4 group-hover:ml-0">
          //
        </span>
        {children}
      </Link>
    </li>
  );
}
