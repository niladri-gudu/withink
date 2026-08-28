import type { Metadata, Viewport } from "next";
import {
  Alegreya,
  Caveat,
  Cormorant_Garamond,
  Geist,
  Geist_Mono,
  JetBrains_Mono,
  Literata,
  Shadows_Into_Light_Two,
} from "next/font/google";
import Script from "next/script";
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

/* Pro typography pairings (features/settings/appearance/catalog.ts). Loaded
   without preload so Free users never pay the bytes; the browser fetches a
   face only when a [data-font] swap actually puts it on rendered text. */
const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
  style: ["normal", "italic"],
  preload: false,
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  preload: false,
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
  preload: false,
});

const shadows = Shadows_Into_Light_Two({
  variable: "--font-shadows",
  subsets: ["latin"],
  weight: "400",
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "withink. - Your Digital Diary",
    template: "%s | withink.",
  },
  description:
    "A private, encrypted, and minimal space for your digital thoughts. Built for focus.",
  keywords: [
    "journal",
    "digital diary",
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
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      "max-video-preview": -1,
      "max-image-preview": "none",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "withink. - Your Digital Diary",
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
        alt: "withink. - Your Digital Diary",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "withink. - Your Digital Diary",
    description:
      "A private, encrypted, and minimal space for your digital thoughts. Built for focus.",
    creator: "@withinkme",
    images: ["/og-image.png"],
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

/* viewport-fit=cover lets env(safe-area-inset-*) report the iOS home
   indicator / notch, which the bottom tab bar and its content clearance
   respect. */
export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      className={cn(
        alegreya.variable,
        caveat.variable,
        literata.variable,
        geist.variable,
        geistMono.variable,
        jetbrainsMono.variable,
        cormorant.variable,
        shadows.variable,
        "h-full",
      )}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta
          name="theme-color"
          content="#eee5d6"
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content="#1e170f"
          media="(prefers-color-scheme: dark)"
        />
        {/* Service worker: register in production, self-unregister in dev.
            The branch is resolved at SSR — inline scripts can't reference
            `process` (undefined in the browser; threw a ReferenceError on
            every production load before this was hoisted server-side). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              process.env.NODE_ENV === "production"
                ? `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.error('Service worker registration failed:', err);
                  });
                });
              }
            `
                : `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.getRegistrations().then(function(regs) {
                    regs.forEach(function(r) { r.unregister(); });
                  });
                  if (window.caches && caches.keys) {
                    caches.keys().then(function(keys) {
                      keys.forEach(function(k) { caches.delete(k); });
                    });
                  }
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
                  /* Curated appearance (features/settings/appearance/catalog.ts —
                     keep allowlists in sync). Applied pre-paint so a premium
                     palette/font never flashes the Desk default. */
                  var palettes = ['vellum', 'indigo-nook', 'rosewood'];
                  var fonts = ['literata', 'editorial', 'codex', 'quill'];
                  var accents = ['oxblood', 'indigo-ink', 'moss'];
                  var root = document.documentElement;
                  function apply(key, attr, allowed) {
                    var v = localStorage.getItem(key);
                    if (v && allowed.indexOf(v) !== -1) {
                      root.setAttribute(attr, v);
                    }
                  }
                  apply('withink-palette', 'data-palette', palettes);
                  apply('withink-font', 'data-font', fonts);
                  apply('withink-accent', 'data-accent', accents);
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
            __html: `<!-- withink app world · The Annotated Codex (surface redesign, Field Ledger theming intact)
THESIS: The journal is one open manuscript page; chrome becomes marginalia. This surface refuses the sidebar-panel + breadcrumb-bar + card-grid app shell the Field Ledger world was dressed in.
OWN-WORLD: Same manila/umber desk, ledger-paper sheets, iron-gall ink, one old-paper gold accent; Alegreya for all printed text, Caveat for margin notes. A 1px hairline rules a narrow left margin (the folio index: 01 Today … 07 Feedback, tracked uppercase) from the text block; a printed running head (folio name + hand date) rules the top of every page; cards rest flat on hairlines.
STORY: A writer opens their diary and finds the index in the margin, the day's page open before them, and every control either marginalia or a printed rule. The interface is a book, not a dashboard.
FIRST VIEWPORT: The margin rail (wordmark + folio index + colophon) at left; the open page centered at a manuscript measure — running head ruled above, hand note + serif title with italic gold accent, then the writing surface with its 2px gold hairline.
FORM: The Annotated Codex, candidate 4 of the grounded surface list (seed be2a53bd), assigned by the surface roll.
MOBILE-FIRST REVISION (2026-08-23): phones become the primary desk — navigation moves to a native-style bottom tab bar (Today · Entries · Insights · More, with More as a bottom sheet) while the desktop margin rail stands unchanged; the editor route stays chrome-minimal. Same world, same identity, thumb-reach hierarchy.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md -->`,
          }}
        />
        <WebVitals />
        <AppProviders>{children}</AppProviders>
        {process.env.IS_PROD === "true" ? (
          <>
            <Script
              strategy="afterInteractive"
              src="https://www.googletagmanager.com/gtag/js?id=G-P4ZY1SLYJD"
            />
            <Script id="gtag-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-P4ZY1SLYJD');
              `}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
