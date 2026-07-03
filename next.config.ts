import type { NextConfig } from "next";

const R2_PUBLIC_HOST = process.env.R2_PUBLIC_URL
  ? new URL(process.env.R2_PUBLIC_URL).hostname
  : "assets.withink.me";

const nextConfig: NextConfig = {
  // React Compiler: automatic memoization, fewer manual re-render guards.
  reactCompiler: true,

  // Cache Components (PPR): mix static, cached (`use cache`), and dynamic
  // (Suspense) content per route. Foundational — adopted from day one.
  cacheComponents: true,

  typedRoutes: true,

  experimental: {
    serverMinification: false,
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: R2_PUBLIC_HOST },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
