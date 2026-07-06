import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { AppProviders } from "@/providers/app-providers";
import { cn } from "@/lib/utils";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "withink. - Your Digital Sanctuary",
    template: "%s | withink.",
  },
  description:
    "A private, encrypted, and minimal space for your digital thoughts. Built for focus.",
  metadataBase: new URL(
    process.env.IS_PROD === "true" ? "https://withink.me" : "http://localhost:3000"
  ),
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "withink.",
    description: "A private, encrypted, and minimal space for your thoughts.",
    type: "website",
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      className={cn(
        geistSans.variable,
        geistMono.variable,
        newsreader.variable,
        "h-full"
      )}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var scale = localStorage.getItem('withink-paper-scale');
                  if (scale) {
                    document.documentElement.style.setProperty('--withink-paper-scale', scale);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="h-full bg-background text-foreground antialiased selection:bg-accent selection:text-accent-foreground">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
