import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["ladybug-ultimate-solely.ngrok-free.app"],
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
