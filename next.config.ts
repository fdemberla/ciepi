import type { NextConfig } from "next";

const rawBasePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "")
  .trim()
  .replace(/^\/+|\/+$/g, "");
const basePath = rawBasePath ? `/${rawBasePath}` : "";

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  trailingSlash: true,
  // Archivos subidos después del build: Next no los sirve desde public/, así que
  // si no los encuentra, los entrega app/api/archivos (ver ese archivo).
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: ["banners", "attachments", "uploads"].map((carpeta) => ({
        source: `/${carpeta}/:ruta*`,
        destination: `/api/archivos/${carpeta}/:ruta*`,
      })),
    };
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' http://localhost:8000 https://api.iconify.design https://api.simplesvg.com https://api.unisvg.com https://challenges.cloudflare.com",
              "frame-src 'self' https://challenges.cloudflare.com",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
