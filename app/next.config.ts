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
    const isProd = process.env.IS_PROD === "true";
    const R2_UPLOAD_HOST = process.env.R2_ACCOUNT_ID
      ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com https://*.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : "https://*.r2.cloudflarestorage.com";

    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"};
      script-src-attr 'none';
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      img-src 'self' blob: data: https://lh3.googleusercontent.com https://${R2_PUBLIC_HOST};
      font-src 'self' data: https://fonts.gstatic.com;
      connect-src 'self' ${isProd ? "" : "ws: wss:"} ${R2_UPLOAD_HOST} https://${R2_PUBLIC_HOST} https://fonts.googleapis.com https://fonts.gstatic.com;
      object-src 'none';
      worker-src 'self' blob:;
      child-src 'self' blob:;
      frame-ancestors 'none';
      form-action 'self' https://accounts.google.com;
      base-uri 'self';
    `.replace(/\s{2,}/g, " ").trim();

    const headers = [
      { key: "Content-Security-Policy", value: cspHeader },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-XSS-Protection", value: "1; mode=block" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ];

    if (isProd) {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
      });
    }

    return [
      {
        source: "/:path*",
        headers,
      },
    ];
  },
};

export default nextConfig;
