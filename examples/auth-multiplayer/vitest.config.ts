import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath, URL } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const engineRoot = path.resolve(__dirname, "../../packages/engine");

export default defineConfig({
  resolve: {
    alias: {
      "@oncyberio/engine/controls": path.resolve(
        engineRoot,
        "src/controls/index.ts",
      ),
      "@oncyberio/engine/input": path.resolve(
        engineRoot,
        "src/input/index.ts",
      ),
      "@oncyberio/engine": path.resolve(engineRoot, "src/index.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts"],
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
    alias: {
      "@dimforge/rapier3d": path.resolve(
        engineRoot,
        "test/support/__mocks__/rapier3d.js",
      ),
    },
  },
});
