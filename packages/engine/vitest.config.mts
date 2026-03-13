import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "url";
import path from "path";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "engine/": path.resolve(__dirname, "src") + "/",
      "web3/": path.resolve(__dirname, "../web3/src") + "/",
    },
  },
  test: {
    globals: true,
    include: ["test/**/*.test.ts"],
    testTimeout: 150_000,
    alias: {
      "@dimforge/rapier3d": path.resolve(
        __dirname,
        "test/support/__mocks__/rapier3d.js",
      ),
    },
    setupFiles: ["test/support/setup.ts"],
  },
});
