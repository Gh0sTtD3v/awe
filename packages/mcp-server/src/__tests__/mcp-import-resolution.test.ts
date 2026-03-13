import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

describe("asset optimizer import resolution", () => {
  it("uses compiled asset optimizer entrypoint in optimize tools", async () => {
    const optimizeModelPath = resolve(import.meta.dirname, "../tools/optimize-model.ts");
    const optimizeVrmPath = resolve(import.meta.dirname, "../tools/optimize-vrm.ts");

    const [optimizeModelSource, optimizeVrmSource] = await Promise.all([
      readFile(optimizeModelPath, "utf8"),
      readFile(optimizeVrmPath, "utf8"),
    ]);

    expect(optimizeModelSource).toContain("@oncyberio/asset-optimizer/dist/index.js");
    expect(optimizeVrmSource).toContain("@oncyberio/asset-optimizer/dist/index.js");
  });
});
