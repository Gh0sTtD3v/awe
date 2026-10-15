import type { NextConfig } from "next";

const compiler: NextConfig["compiler"] =
  process.env.NODE_ENV === "production"
    ? {
        removeConsole: {
          exclude: ["error", "warn"],
        },
      }
    : undefined;

const nextConfig: NextConfig = {
  transpilePackages: [
    "@oncyberio/engine",
    "@oncyberio/engine-edit",
    "@oncyberio/world-config",
  ],
  serverExternalPackages: ["draco3dgltf", "sharp", "@privy-io/node"],
  compiler,
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
