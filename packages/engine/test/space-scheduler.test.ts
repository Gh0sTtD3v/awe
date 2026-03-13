import { EngineHeadless } from "../src/engine-headless";

const sceneData = {
  root: {
    type: "group",
    id: "root",
    kit: "cyber",
    position: { x: 0, y: 0, z: 0 },
  },
};

function makeGame() {
  return {
    id: "space-scheduler-test",
    creatorId: "test",
    editors: ["test"],
    components: sceneData,
  };
}

describe("Space.schedule", () => {
  let engine: EngineHeadless;

  beforeEach(() => {
    engine = EngineHeadless.getInstance();
  });

  afterEach(async () => {
    for (let i = 0; i < 20 && engine.sessionState !== "void"; i++) {
      await new Promise((r) => setTimeout(r, 50));
    }
  });

  it("runs callbacks after accumulated running time", async () => {
    const { space } = await engine.createSpace({
      runtime: "headless",
      game: makeGame(),
    });

    const calls: string[] = [];
    const handle = space.schedule(2.5, () => calls.push("done"));

    space.start();

    engine.tick(1);
    engine.tick(1);
    engine.tick(0.49);

    expect(calls).toEqual([]);
    expect(handle.active).toBe(true);

    engine.tick(0.01);

    expect(calls).toEqual(["done"]);
    expect(handle.active).toBe(false);

    space.destroy();
  });

  it("pauses scheduled callbacks while the space is stopped", async () => {
    const { space } = await engine.createSpace({
      runtime: "headless",
      game: makeGame(),
    });

    const calls: string[] = [];
    space.schedule(2, () => calls.push("done"));

    space.start();
    engine.tick(1);

    space.stop();
    engine.tick(5);

    expect(calls).toEqual([]);

    space.start();
    engine.tick(0.99);
    expect(calls).toEqual([]);

    engine.tick(0.01);
    expect(calls).toEqual(["done"]);

    space.destroy();
  });

  it("supports canceling scheduled callbacks", async () => {
    const { space } = await engine.createSpace({
      runtime: "headless",
      game: makeGame(),
    });

    const calls: string[] = [];
    const handle = space.schedule(1, () => calls.push("done"));

    handle.cancel();
    space.start();
    engine.tick(5);

    expect(calls).toEqual([]);
    expect(handle.active).toBe(false);

    space.destroy();
  });

  it("cancels pending callbacks when the space is destroyed", async () => {
    const { space } = await engine.createSpace({
      runtime: "headless",
      game: makeGame(),
    });

    const calls: string[] = [];
    const handle = space.schedule(1, () => calls.push("done"));

    space.start();
    space.destroy();
    engine.tick(5);

    expect(calls).toEqual([]);
    expect(handle.active).toBe(false);
  });
});
