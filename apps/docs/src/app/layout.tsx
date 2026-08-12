import type { Metadata } from "next";
import { Alegreya, Caveat } from "next/font/google";

import { cn } from "@withink/utils";

import { AppProviders } from "@/providers/app-providers";

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
    default: "withink. - your private journal",
    template: "%s | withink.",
  },
  description:
    "A private, encrypted journal. One entry a day, saved offline and exported anytime as plain text - no trackers, no noise.",
  keywords: [
    "journal",
    "encrypted journal",
    "private writing",
    "daily reflection",
    "digital journal",
    "memory keeping",
    "plain-text export",
    "calm writing",
  ],
  authors: [{ name: "withink. team", url: "https://withink.me" }],
  creator: "withink.",
  publisher: "withink.",
  applicationName: "withink.",
  metadataBase: new URL(
    process.env.IS_PROD === "true"
      ? "https://withink.me"
      : "http://localhost:3001",
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
    title: "withink. - your private journal",
    description:
      "A private, encrypted journal. One entry a day, saved offline and exported anytime as plain text - no trackers, no noise.",
    url: "https://withink.me",
    siteName: "withink.",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "withink. - your private journal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "withink. - your private journal",
    description:
      "A private, encrypted journal. One entry a day, saved offline and exported anytime as plain text - no trackers, no noise.",
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
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
            __html: `<!-- withink docs world · The Field Ledger, kept as a diary
THESIS: A private journal as a warm field notebook — your ordinary days are worth keeping. Warm old-paper gold accent, no collect-everything framing, no reading-room cliché.
OWN-WORLD: manila kraft ground, iron-gall sepia ink, one warm old-paper gold accent (oklch 0.70 0.10 75); rounded corners matching the app (0.75rem), hairline borders over soft shadows; two type voices only — Alegreya serif for everything printed, Caveat hand for field notes.
STORY: A visitor believes their ordinary days deserve keeping, understands the diary is private and encrypted, and opens it.
FIRST VIEWPORT: Words on the open desk — one-line promise set in serif with an italic accent, a hand-written note, the promise explained, and two imprints (Open Your Diary / Read Privacy Philosophy).
FORM: Field Ledger refined by user feedback (plate removed, 2 fonts, gold accent, nav CTA); seed ea00c61c retained.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md -->`,
          }}
        />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
