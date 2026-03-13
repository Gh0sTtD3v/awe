/**
 * Headless smoke test — boots the engine in headless mode,
 * loads a static scene (shooter), steps a few ticks, and
 * verifies the pipeline works end-to-end in Node.
 */

import { EngineHeadless } from "../src/engine-headless";
import Emitter from "../src/internal/engine-emitter";
import { EngineEvents } from "../src/internal/engine-events";

// ── Scene data ──────────────────────────────────────────────────────
// Minimal subset of the shooter scene with only headless-safe components.
// We strip URLs to avoid network calls — headless loaders should handle
// missing/empty URLs gracefully or produce stub geometry.
const sceneData = {
  "terrain-smoke": {
    type: "terrain",
    id: "terrain-smoke",
    kit: "cyber",
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 100, y: 10, z: 100 },
    color: "#bbbbbb",
    noiseEnabled: false,
    definition: 10,
    shape: "plane",
    collider: {
      enabled: true,
      rigidbodyType: "FIXED",
      type: "MESH",
    },
  },
  "group-smoke": {
    type: "group",
    id: "group-smoke",
    kit: "cyber",
    position: { x: 0, y: 0, z: 0 },
  },
  "object-smoke": {
    type: "object",
    id: "object-smoke",
    kit: "cyber",
    position: { x: 5, y: 1, z: 0 },
    parentId: "group-smoke",
    collider: {
      enabled: true,
      rigidbodyType: "FIXED",
      colliderType: "CUBOID",
    },
  },
};

// Also test with a scene containing component types unknown to headless.
// These should be silently skipped (no crash).
const sceneWithWebComponents = {
  ...sceneData,
  fog: {
    type: "fog",
    id: "fog",
    kit: "cyber",
    near: 50,
    far: 2000,
    enabled: true,
  },
  lighting: {
    type: "lighting",
    id: "lighting",
    kit: "cyber",
    intensity: 1,
  },
  background: {
    type: "background",
    id: "background",
    kit: "cyber",
    options: { type: "color", color: "#87CEEB" },
  },
};

// ── Helpers ──────────────────────────────────────────────────────────

function makeGame(components: Record<string, any>) {
  return {
    id: "smoke-test",
    creatorId: "test",
    editors: ["test"],
    components,
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe("Headless smoke test", () => {
  let engine: EngineHeadless;

  beforeEach(() => {
    // Engine is a singleton — grab the shared instance
    engine = EngineHeadless.getInstance();
  });

  afterEach(async () => {
    // Wait for async destroy chain to finish resetting sessionState
    for (let i = 0; i < 20 && engine.sessionState !== "void"; i++) {
      await new Promise((r) => setTimeout(r, 50));
    }
  });

  it("creates a headless space with basic components and ticks without error", async () => {
    const { space } = await engine.createSpace({
      runtime: "headless",
      game: makeGame(sceneData),
    });

    expect(space).toBeTruthy();

    // Verify components were loaded
    const terrains = space.components.byType("terrain");
    expect(terrains.length).toBe(1);

    const groups = space.components.byType("group");
    expect(groups.length).toBe(1);

    const objects = space.components.byType("object");
    expect(objects.length).toBe(1);

    // Object should be parented to group
    const obj = objects[0];
    expect(obj.data.parentId).toBe("group-smoke");

    // Start simulation and tick
    space.start();

    const updates: number[] = [];
    Emitter.on(EngineEvents.UPDATE, (dt: number) => updates.push(dt));

    // Step 10 frames at 60Hz
    for (let i = 0; i < 10; i++) {
      engine.tick(1 / 60);
    }

    expect(updates.length).toBe(10);

    // Clean up
    space.destroy();
  });

  it("gracefully skips web-only component types in headless", async () => {
    const warnings: string[] = [];
    const origWarn = console.warn;
    console.warn = (...args: any[]) => {
      warnings.push(args.join(" "));
    };

    try {
      const { space } = await engine.createSpace({
        runtime: "headless",
        game: makeGame(sceneWithWebComponents),
      });

      expect(space).toBeTruthy();

      // Headless-safe components should load
      expect(space.components.byType("terrain").length).toBe(1);
      expect(space.components.byType("group").length).toBe(1);

      // Web-only components should NOT load (no factory registered)
      expect(space.components.byType("fog").length).toBe(0);
      expect(space.components.byType("lighting").length).toBe(0);
      expect(space.components.byType("background").length).toBe(0);

      // Tick should still work
      space.start();
      engine.tick(1 / 60);

      space.destroy();
    } finally {
      console.warn = origWarn;
    }
  });

  it("emits simulation events in correct order per tick", async () => {
    const { space } = await engine.createSpace({
      runtime: "headless",
      game: makeGame(sceneData),
    });

    space.start();

    const order: string[] = [];
    Emitter.on(EngineEvents.INPUT_PROCESS, () =>
      order.push("INPUT_PROCESS"),
    );
    Emitter.on(EngineEvents.PHYSICS_UPDATE, () =>
      order.push("PHYSICS_UPDATE"),
    );
    Emitter.on(EngineEvents.AFTER_PHYSICS_UPDATE, () =>
      order.push("AFTER_PHYSICS_UPDATE"),
    );
    Emitter.on(EngineEvents.UPDATE, () => order.push("UPDATE"));
    Emitter.on(EngineEvents.LATE_UPDATE, () => order.push("LATE_UPDATE"));

    engine.tick(1 / 60);

    expect(order).toEqual([
      "INPUT_PROCESS",
      "PHYSICS_UPDATE",
      "AFTER_PHYSICS_UPDATE",
      "UPDATE",
      "LATE_UPDATE",
    ]);

    space.destroy();
  });
});
