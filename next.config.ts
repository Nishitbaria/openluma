import type { NextConfig } from "next";

// Content Security Policy. Kept in report-only mode initially so we can watch
// the browser console / report endpoint for violations from the React Compiler
// runtime and the streaming chat before switching to enforcing. Flip the header
// name to "Content-Security-Policy" (drop "-Report-Only") once verified clean.
const isDev = process.env.NODE_ENV === "development";

const cspDirectives = [
  "default-src 'self'",
  // 'unsafe-inline' is required for Next.js's inline bootstrap. 'unsafe-eval'
  // is only needed in dev (React uses eval for debug stack reconstruction);
  // production omits it. Tighten with nonces in a later pass if needed.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://utfs.io https://*.ufs.sh https://*.uploadthing.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.uploadthing.com https://*.ufs.sh https://*.upstash.io https://accounts.google.com",
  "frame-src 'self' https://accounts.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy-Report-Only", value: cspDirectives },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["ladybug-ultimate-solely.ngrok-free.app"],
  async headers() {
    return [{ headers: securityHeaders, source: "/:path*" }];
  },
  images: {
    remotePatterns: [
      { hostname: "utfs.io", protocol: "https" },
      { hostname: "*.ufs.sh", protocol: "https" },
      { hostname: "*.uploadthing.com", protocol: "https" },
    ],
  },
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
