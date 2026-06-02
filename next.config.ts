import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // Allow server components to use Node.js APIs
  serverExternalPackages: ["pino", "pino-pretty"],
};

export default nextConfig;
