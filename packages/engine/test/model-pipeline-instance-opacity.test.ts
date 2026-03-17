import { BufferGeometry, Mesh, MeshStandardMaterial } from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ModelPipeline from "../src/internal/pipeline/model.js";

describe("ModelPipeline instance opacity plugin", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("does not mutate a shared plugins array across instanced mesh builds", () => {
    const geometry = new BufferGeometry();
    geometry.setIndex([0, 1, 2]);

    const sharedPlugins: unknown[] = [];

    const opts = {
      instance: true,
      renderMode: "default",
      useTransparency: true,
      plugins: sharedPlugins,
      pipelineOptions: {
        visibleOnDiffuse: true,
        visibleOnOcclusion: true,
        visibleOnMirror: true,
      },
    };

    ModelPipeline.get(
      new Mesh(geometry, new MeshStandardMaterial()),
      geometry,
      new MeshStandardMaterial(),
      opts,
    );

    ModelPipeline.get(
      new Mesh(geometry, new MeshStandardMaterial()),
      geometry,
      new MeshStandardMaterial(),
      opts,
    );

    expect(sharedPlugins).toHaveLength(0);
  });
});
