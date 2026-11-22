import { describe, expect, it } from "vitest";
import { Document } from "@gltf-transform/core";
import { simplifyErrorFor } from "../src/gltf/optimize-gltf";
import { OPTIMIZER_VERSION, isCurrentOptimization } from "../src/optimize-service";

/** A primitive whose positions span `size` metres along x. */
function primitiveOfSize(size: number) {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const position = doc
    .createAccessor()
    .setType("VEC3")
    .setArray(new Float32Array([0, 0, 0, size, 0, 0, 0, 0.01, 0]))
    .setBuffer(buffer);
  return doc.createPrimitive().setAttribute("POSITION", position);
}

describe("upload optimiser tolerances", () => {
  it("limits simplification to about 1 mm on big merged meshes", () => {
    // A 100 m primitive (all the sign text of an area merged together):
    // error is a fraction of the radius (~50 m), so 1 mm -> 0.00002.
    const error = simplifyErrorFor(primitiveOfSize(100));
    expect(error * 50).toBeCloseTo(0.001, 4);
  });

  it("keeps the old relative limit on small meshes", () => {
    expect(simplifyErrorFor(primitiveOfSize(0.5))).toBe(0.001);
  });

  it("skips primitives without positions", () => {
    const doc = new Document();
    expect(simplifyErrorFor(doc.createPrimitive())).toBe(0);
  });

  it("recognises optimised files from the current optimiser version only", () => {
    expect(OPTIMIZER_VERSION).toBe("v1");
    expect(isCurrentOptimization({ high: "/assets/optimized/abc_v1_high.glb" })).toBe(true);
    expect(isCurrentOptimization({ high: "/assets/optimized/abc_v1_ndraco_high.glb" })).toBe(true);
    expect(isCurrentOptimization({ high: "/assets/optimized/abc_v0_high.glb" })).toBe(false);
    expect(isCurrentOptimization(null)).toBe(false);
    expect(isCurrentOptimization({})).toBe(false);
  });
});
