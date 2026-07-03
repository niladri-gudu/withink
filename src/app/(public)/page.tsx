import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

export default function LandingPage() {
  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Navbar */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-serif text-xl font-bold tracking-tight text-foreground select-none">
            withink.
          </span>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <Link href={ROUTES.AUTH.LOGIN}>Sign In</Link>
            </Button>
            <Button variant="default" asChild>
              <Link href={ROUTES.AUTH.REGISTER}>Begin Rebuilding</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16 md:py-24 flex flex-col items-center justify-center text-center space-y-12">
        {/* Intro */}
        <div className="space-y-6 max-w-2xl">
          <span className="text-label text-muted-foreground block">
            A Digital Sanctuary
          </span>
          <h1 className="text-hero md:text-display text-foreground">
            Quiet space for your thoughts.
          </h1>
          <p className="text-subtitle max-w-lg mx-auto">
            A beautiful, encrypted, private journal constructed to encourage daily reflection and preserve your lifelong memories.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <Button size="lg" asChild className="w-full sm:w-auto">
            <Link href={ROUTES.AUTH.REGISTER}>Create Your Journal</Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
            <Link href={ROUTES.PUBLIC.PRIVACY}>Read Privacy Philosophy</Link>
          </Button>
        </div>

        {/* Tactile Mockup preview */}
        <div className="w-full aspect-[1.8/1] rounded-xl border border-border p-6 bg-card shadow-sm flex flex-col space-y-4 text-left max-w-3xl mx-auto">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center space-x-2">
              <span className="text-title font-serif">July 1, 2026</span>
              <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full font-medium">
                Rad 😀
              </span>
            </div>
            <span className="text-caption select-none">Saved to your sanctuary</span>
          </div>
          <div className="flex-1 space-y-3 py-2">
            <h2 className="text-h2">The beginning of V2 Rebuild</h2>
            <p className="text-body-small text-muted-foreground">
              Today we established the foundation. The cream-colored background feels warm, like turning the first page of a premium linen notebook. There are no distracting metrics, no notifications, and no urgency. Just the soft glow of letters on a clean surface...
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-8">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-xs text-muted-foreground space-y-4 md:space-y-0">
          <p>© 2026 withink. All rights reserved.</p>
          <div className="flex space-x-6">
            <Link href={ROUTES.PUBLIC.TERMS} className="hover:text-foreground">
              Terms of Service
            </Link>
            <Link href={ROUTES.PUBLIC.PRIVACY} className="hover:text-foreground">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
