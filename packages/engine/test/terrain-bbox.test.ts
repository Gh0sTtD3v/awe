import { Box3 } from "three";
import { EngineHeadless } from "../src/engine-headless";

const sceneData = {
  "terrain-bbox": {
    type: "terrain",
    id: "terrain-bbox",
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
  "mesh-bbox": {
    type: "mesh",
    id: "mesh-bbox",
    kit: "cyber",
    position: { x: 0, y: 8, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    geometry: {
      type: "box",
      boxParams: {
        width: 2,
        height: 2,
        depth: 2,
      },
      sphereParams: {
        radius: 1,
        widthSegments: 16,
        heightSegments: 16,
      },
      cylinderParams: {
        radiusTop: 1,
        radiusBottom: 1,
        height: 2,
        radialSegments: 16,
        heightSegments: 1,
        openEnded: false,
      },
    },
    collider: {
      enabled: true,
      rigidbodyType: "FIXED",
      type: "MESH",
    },
  },
};

function makeGame(components: Record<string, any>) {
  return {
    id: "terrain-bbox-test",
    creatorId: "test",
    editors: ["test"],
    components,
  };
}

function expectBoxClose(actual: Box3, expected: Box3) {
  expect(actual.min.x).toBeCloseTo(expected.min.x, 10);
  expect(actual.min.y).toBeCloseTo(expected.min.y, 10);
  expect(actual.min.z).toBeCloseTo(expected.min.z, 10);
  expect(actual.max.x).toBeCloseTo(expected.max.x, 10);
  expect(actual.max.y).toBeCloseTo(expected.max.y, 10);
  expect(actual.max.z).toBeCloseTo(expected.max.z, 10);
}

describe("Terrain bbox", () => {
  let engine: EngineHeadless;

  beforeEach(() => {
    engine = EngineHeadless.getInstance();
  });

  afterEach(async () => {
    for (let i = 0; i < 20 && engine.sessionState !== "void"; i++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  });

  it("resets a reused target box before expanding terrain bounds", async () => {
    const { space } = await engine.createSpace({
      runtime: "headless",
      game: makeGame(sceneData),
    });

    const terrain = space.components.byType("terrain")[0];
    const mesh = space.components.byType("mesh")[0];

    expect(terrain).toBeTruthy();
    expect(mesh).toBeTruthy();

    const expected = terrain.getBBox(new Box3()).clone();
    const shared = new Box3();

    mesh.getBBox(shared);
    const actual = terrain.getBBox(shared).clone();

    expectBoxClose(actual, expected);

    space.destroy();
  });
});
