import type { Metadata } from "next";
import { Alegreya, Caveat } from "next/font/google";
import { cn } from "@withink/utils";

import { AppProviders } from "@/providers/app-providers";
import { WebVitals } from "@/components/web-vitals";

import "./globals.css";

const alegreya = Alegreya({
  variable: "--font-alegreya",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "withink. - Your Digital Sanctuary",
    template: "%s | withink.",
  },
  description:
    "A private, encrypted, and minimal space for your digital thoughts. Built for focus.",
  keywords: [
    "journal",
    "digital sanctuary",
    "encrypted journal",
    "private writing",
    "calm writing",
    "mindfulness journal",
    "minimalist journal",
    "reflection",
  ],
  authors: [{ name: "withink. team", url: "https://withink.me" }],
  creator: "withink.",
  publisher: "withink.",
  applicationName: "withink.",
  metadataBase: new URL(
    process.env.IS_PROD === "true"
      ? "https://app.withink.me"
      : "http://localhost:3000",
  ),
  icons: {
    icon: [
      { rel: "icon", url: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
      {
        rel: "icon",
        url: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        rel: "icon",
        url: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
    ],
    apple: [
      {
        rel: "apple-touch-icon",
        url: "/apple-touch-icon.png",
        sizes: "180x180",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "withink. - Your Digital Sanctuary",
    description:
      "A private, encrypted, and minimal space for your digital thoughts. Built for focus.",
    url: "https://withink.me",
    siteName: "withink.",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "withink. - Your Digital Sanctuary",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "withink. - Your Digital Sanctuary",
    description:
      "A private, encrypted, and minimal space for your digital thoughts. Built for focus.",
    creator: "@withinkme",
    images: ["/og-image.png"],
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      className={cn(alegreya.variable, caveat.variable, "h-full")}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#EADFC7" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.error('Service worker registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var scale = localStorage.getItem('withink-paper-scale');
                  if (scale) {
                    document.documentElement.style.setProperty('--withink-paper-scale', scale);
                  }
                  var match = document.cookie.match(/(^|;)\\s*theme\\s*=\\s*([^;]+)/);
                  var theme = match ? match[2] : null;
                  if (theme) {
                    localStorage.setItem('theme', theme);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-background text-foreground selection:bg-accent selection:text-accent-foreground h-full antialiased">
        <div
          aria-hidden="true"
          dangerouslySetInnerHTML={{
            __html: `<!-- withink app world · The Field Ledger, kept as a diary
THESIS: The app is the inside of the notebook the docs invite you into — a private field ledger you write in daily, one page at a time. Calm over productivity, marginalia instead of dashboards.
OWN-WORLD: manila kraft desk, ledger-paper pages, iron-gall sepia ink, one old-paper gold accent (oklch 0.70 0.10 75); rounded 0.75rem corners, hairline borders over soft shadows; two type voices only — Alegreya for everything printed, Caveat for field-note annotations. Margin Rail navigation: the sidebar is the book's margin.
STORY: A writer opens their diary, writes today's page, and trusts it is private, durable, and theirs. The interface is a calm desk, not a productivity suite.
FIRST VIEWPORT: The open page — today's greeting set in serif with an italic accent, today's date as a margin note, and the writing surface leading; the section index sits in the left margin.
FORM: Margin Rail structural candidate (roll 4, seed 8ae8057f) inside the inherited Field Ledger world.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md -->`,
          }}
        />
        <WebVitals />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
