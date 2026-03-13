import { HeadlessLoop } from "../src/internal/headless-loop";
import Emitter from "../src/internal/engine-emitter";
import { EngineEvents } from "../src/internal/engine-events";

describe("HeadlessLoop", () => {
  let loop: HeadlessLoop;

  beforeEach(() => {
    loop = new HeadlessLoop();
  });

  afterEach(() => {
    loop.dispose();
    Emitter.removeAllListeners();
  });

  // ── Event order ──────────────────────────────────────────────────────

  it("should emit simulation events in the correct order per tick", () => {
    const order: string[] = [];

    Emitter.on(EngineEvents.INPUT_PROCESS, () => order.push("INPUT_PROCESS"));
    Emitter.on(EngineEvents.PHYSICS_UPDATE, () =>
      order.push("PHYSICS_UPDATE"),
    );
    Emitter.on(EngineEvents.AFTER_PHYSICS_UPDATE, () =>
      order.push("AFTER_PHYSICS_UPDATE"),
    );
    Emitter.on(EngineEvents.UPDATE, () => order.push("UPDATE"));
    Emitter.on(EngineEvents.LATE_UPDATE, () => order.push("LATE_UPDATE"));

    loop.tick(1 / 60);

    expect(order).toEqual([
      "INPUT_PROCESS",
      "PHYSICS_UPDATE",
      "AFTER_PHYSICS_UPDATE",
      "UPDATE",
      "LATE_UPDATE",
    ]);
  });

  it("should NOT emit render-phase events", () => {
    const renderEvents: string[] = [];

    Emitter.on(EngineEvents.PRE_RENDER, () => renderEvents.push("PRE_RENDER"));
    Emitter.on(EngineEvents.RENDER, () => renderEvents.push("RENDER"));
    Emitter.on(EngineEvents.POST_RENDER, () =>
      renderEvents.push("POST_RENDER"),
    );

    loop.tick(1 / 60);

    expect(renderEvents).toEqual([]);
  });

  // ── Delta & absolute time ────────────────────────────────────────────

  it("should pass correct dt and accumulate absTimer", () => {
    const deltas: number[] = [];
    const absTimes: number[] = [];

    Emitter.on(EngineEvents.UPDATE, (dt: number, abs: number) => {
      deltas.push(dt);
      absTimes.push(abs);
    });

    const dt = 1 / 60;
    loop.tick(dt);
    loop.tick(dt);
    loop.tick(dt);

    expect(deltas).toEqual([dt, dt, dt]);
    expect(absTimes[0]).toBeCloseTo(dt, 10);
    expect(absTimes[1]).toBeCloseTo(dt * 2, 10);
    expect(absTimes[2]).toBeCloseTo(dt * 3, 10);
    expect(loop.absTimer).toBeCloseTo(dt * 3, 10);
  });

  // ── N ticks produce N event cycles ───────────────────────────────────

  it("should produce N complete event cycles for N ticks", () => {
    let updateCount = 0;
    let physicsCount = 0;

    Emitter.on(EngineEvents.UPDATE, () => updateCount++);
    Emitter.on(EngineEvents.PHYSICS_UPDATE, () => physicsCount++);

    const N = 100;
    for (let i = 0; i < N; i++) {
      loop.tick(1 / 60);
    }

    expect(updateCount).toBe(N);
    expect(physicsCount).toBe(N);
  });

  // ── run / stop lifecycle ─────────────────────────────────────────────

  it("should emit PLAY on run() and PAUSE on stop()", () => {
    let playCount = 0;
    let pauseCount = 0;

    Emitter.on(EngineEvents.PLAY, () => playCount++);
    Emitter.on(EngineEvents.PAUSE, () => pauseCount++);

    loop.run({ hz: 60 });
    expect(loop.isRunning).toBe(true);
    expect(playCount).toBe(1);

    loop.stop();
    expect(loop.isRunning).toBe(false);
    expect(pauseCount).toBe(1);
  });

  it("should not start twice when run() is called while already running", () => {
    let playCount = 0;
    Emitter.on(EngineEvents.PLAY, () => playCount++);

    loop.run({ hz: 60 });
    loop.run({ hz: 60 });

    expect(playCount).toBe(1);

    loop.stop();
  });

  it("run() should produce ticks via setInterval", () => {
    return new Promise<void>((resolve) => {
      let tickCount = 0;
      Emitter.on(EngineEvents.UPDATE, () => tickCount++);

      loop.run({ hz: 100 }); // 10ms interval

      setTimeout(() => {
        loop.stop();
        // At 100Hz for ~60ms, we expect at least 3 ticks
        expect(tickCount).toBeGreaterThanOrEqual(3);
        resolve();
      }, 60);
    });
  });

  // ── dispose ──────────────────────────────────────────────────────────

  it("should reset absTimer and stop on dispose()", () => {
    loop.tick(1 / 60);
    loop.tick(1 / 60);
    expect(loop.absTimer).toBeGreaterThan(0);

    loop.dispose();
    expect(loop.absTimer).toBe(0);
    expect(loop.isRunning).toBe(false);
  });

  // ── Event args are consistent across all simulation events ───────────

  it("should pass identical dt and absTimer to all simulation events in one tick", () => {
    const args: Array<{ event: string; dt: number; abs: number }> = [];
    const events = [
      EngineEvents.INPUT_PROCESS,
      EngineEvents.PHYSICS_UPDATE,
      EngineEvents.AFTER_PHYSICS_UPDATE,
      EngineEvents.UPDATE,
      EngineEvents.LATE_UPDATE,
    ];

    events.forEach((evt) => {
      Emitter.on(evt, (dt: number, abs: number) => {
        args.push({ event: evt, dt, abs });
      });
    });

    const dt = 1 / 30;
    loop.tick(dt);

    expect(args.length).toBe(5);
    for (const a of args) {
      expect(a.dt).toBe(dt);
      expect(a.abs).toBeCloseTo(dt, 10);
    }
  });
});
