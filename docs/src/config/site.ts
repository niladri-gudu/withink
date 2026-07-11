export const siteConfig = {
  name: "withink.",
  description: "A private, encrypted digital sanctuary for your thoughts and reflections. Built for focus and calmness.",
  url: process.env.IS_PROD === "true" ? "https://app.withink.me" : "http://localhost:3000",
  ogImage: "https://withink.me/og.png", // Fallback static OG image URL
  links: {
    twitter: "https://twitter.com/withinkme",
    github: "https://github.com/withinkme",
  },
  contactEmail: "niladrigudu@gmail.com",
};

export type SiteConfig = typeof siteConfig;
