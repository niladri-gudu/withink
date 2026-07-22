import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { AppProviders } from "@/providers/app-providers";
import { WebVitals } from "@/components/web-vitals";
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
    process.env.IS_PROD === "true" ? "https://app.withink.me" : "http://localhost:3000"
  ),
  icons: {
    icon: "/favicon.ico",
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
    description: "A private, encrypted, and minimal space for your digital thoughts. Built for focus.",
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
    description: "A private, encrypted, and minimal space for your digital thoughts. Built for focus.",
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
      className={cn(
        geistSans.variable,
        geistMono.variable,
        newsreader.variable,
        "h-full"
      )}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..800;1,400..800&family=Outfit:wght@100..900&display=swap" rel="stylesheet" />
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
      <body className="h-full bg-background text-foreground antialiased selection:bg-accent selection:text-accent-foreground">
        <WebVitals />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
