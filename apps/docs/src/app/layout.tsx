import type { Metadata, Viewport } from "next";
import { Alegreya, Caveat } from "next/font/google";

import { cn } from "@withink/utils";

import { siteUrl } from "@/config/env";
import { AppProviders } from "@/providers/app-providers";

import "./globals.css";

const alegreya = Alegreya({
  variable: "--font-alegreya",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

/* Resolved per build so previews and local dev do not advertise the
   production URL in Open Graph tags. */
const siteOrigin = siteUrl();

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "withink. — your private journal",
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
  metadataBase: new URL(siteOrigin),
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
    title: "withink. — your private journal",
    description:
      "A private, encrypted journal. One entry a day, saved offline and exported anytime as plain text - no trackers, no noise.",
    url: siteOrigin,
    siteName: "withink.",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "withink. — your private journal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "withink. — your private journal",
    description:
      "A private, encrypted journal. One entry a day, saved offline and exported anytime as plain text - no trackers, no noise.",
    creator: "@withinkme",
    images: ["/og-image.png"],
  },
};

/* Safe-area-aware viewport (notch devices) + theme-colored browser chrome
   matching the docs tokens: manila oklch(0.925 0.022 82) / umber oklch(0.21 0.018 70). */
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eee5d6" },
    { media: "(prefers-color-scheme: dark)", color: "#1e170f" },
  ],
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
        <a
          href="#content"
          className="bg-card text-foreground border-border sr-only rounded-lg border px-4 py-2 font-serif text-sm shadow-sm focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Skip to content
        </a>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
