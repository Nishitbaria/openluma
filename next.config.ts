import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: ["ladybug-ultimate-solely.ngrok-free.app"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "*.ufs.sh" },
      { protocol: "https", hostname: "*.uploadthing.com" },
    ],
  },
};

export default nextConfig;
