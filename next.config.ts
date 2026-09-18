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
        ],
      },
    ];
  },
};

export default nextConfig;
