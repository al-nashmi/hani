import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Pledge/redeem/profile forms carry base64 image data URLs (photos, signatures,
      // stamps) up to ~2MB each and can combine several in one submission (e.g. the
      // shop profile's signature + stamp) — well above Next's 1MB default.
      bodySizeLimit: "8mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Declared statically (not just set at runtime from proxy.ts) so Vercel's
          // edge/CDN layer reads it at build time and never caches a page from this
          // app, regardless of whether the request even reaches the running function.
          { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
          { key: "CDN-Cache-Control", value: "no-store" },
          { key: "Vercel-CDN-Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
