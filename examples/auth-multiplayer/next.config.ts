/** @type {import('next').NextConfig} */

const path = require("path");

let removeConsoleConf = {};

if (process.env.NODE_ENV === "production") {
  removeConsoleConf = {
    removeConsole: {
      exclude: ["error", "warn"],
    },
  };
}

const nextConfig = {
  transpilePackages: ["@oncyberio/engine", "@oncyberio/engine-edit"],
  serverExternalPackages: ["draco3dgltf", "sharp"],
  compiler: {
    ...removeConsoleConf,
  },
};

module.exports = nextConfig;
