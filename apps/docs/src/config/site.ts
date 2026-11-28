import type { Route } from "next";

// Shared static config for the docs surface: navigation and support inbox.
// Origin-dependent URLs (sitemap, robots, OG) live in env.ts.

/** Support inbox used by the contact and privacy pages. */
export const SUPPORT_EMAIL = "niladrigudu@gmail.com";

interface NavItem {
  href: Route;
  label: string;
}

// Explicitly typed as arrays of NavItem so `next/link`'s typed-routes overload
// resolves against the union instead of a single literal route.
export const PRIMARY_NAV: NavItem[] = [
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export const FOOTER_NAV: NavItem[] = [
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
];
