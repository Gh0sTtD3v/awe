import { describe, expect, it } from "vitest";
import { gravityZoneAt, gravityZoneFromComponent, nextSpeed, targetSpeed, type GravityZoneDef } from "../shared/gravity-zones";

/** Simulate `seconds` of a player at `speed` (m/s) in a zone wanting `target`, at 60 steps/s. */
function simulate(speed: number, target: number, seconds: number, from = 0) {
  let y = from;
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) {
    speed = nextSpeed(speed, target, dt);
    y += speed * dt;
  }
  return { speed, y };
}

function zone(id: string, data: Record<string, unknown> = {}): GravityZoneDef {
  const def = gravityZoneFromComponent({ id, type: "gravity-zone", scale: { x: 3, y: 1, z: 3 }, height: 6, strength: 4, ...data });
  if (!def) throw new Error("not a gravity zone");
  return def;
}

describe("gravity zones", () => {
  it("builds a box from the floor square up to the height", () => {
    const def = zone("a", { position: { x: 10, y: 2, z: -4 }, scale: { x: 4, y: 7, z: 2 }, height: 8, strength: -3 });
    expect(def).toMatchObject({
      id: "a",
      strength: -3,
      top: 10,
      center: { x: 10, y: 6, z: -4 },
      halfSize: { x: 2, y: 4, z: 1 },
    });
  });

  it("ignores other components and fixes bad values", () => {
    expect(gravityZoneFromComponent({ id: "z", type: "lift" })).toBeNull();
    expect(gravityZoneFromComponent({ type: "gravity-zone" })).toBeNull();
    expect(zone("b", { height: -1, strength: "x" })).toMatchObject({ strength: 0, halfSize: { y: 0.05 } });
  });

  it("finds the zone a player is in, rotated ones included", () => {
    const flat = zone("flat");
    const turned = zone("turned", {
      position: { x: 50, y: 0, z: 0 },
      scale: { x: 6, y: 1, z: 1 },
      rotation: { x: 0, y: Math.PI / 2, z: 0 },
    });
    const zones = [flat, turned];

    expect(gravityZoneAt(zones, { x: 1, y: 0, z: -1 })?.id).toBe("flat");
    expect(gravityZoneAt(zones, { x: 0, y: 6.5, z: 0 })).toBeNull();
    expect(gravityZoneAt(zones, { x: 0, y: 2, z: 2 })).toBeNull();
    // Turned 90°: long along z now.
    expect(gravityZoneAt(zones, { x: 50, y: 1, z: 2.5 })?.id).toBe("turned");
    expect(gravityZoneAt(zones, { x: 52.5, y: 1, z: 0 })).toBeNull();
  });

  it("rises at full strength, then slows to a stop at the top", () => {
    const up = zone("up", { strength: 4 });
    expect(targetSpeed(up, 0)).toBe(4);
    expect(targetSpeed(up, 5.25)).toBeCloseTo(2);
    expect(targetSpeed(up, 6)).toBe(0);
    expect(targetSpeed(zone("down", { strength: -5 }), 3)).toBe(-5);
    expect(targetSpeed(zone("float", { strength: 0 }), 3)).toBe(0);
  });

  it("negative strength is a slow fall: a fast fall is braked within a few metres", () => {
    // Falling in at 56 m/s (a long drop) into a -2 zone.
    const { speed, y } = simulate(-56, -2, 0.5);
    expect(speed).toBeGreaterThan(-2.2);
    expect(y).toBeGreaterThan(-6);
  });

  it("negative strength never pushes down faster than its speed", () => {
    // Stepping off a ledge (or the top of a jump) into a -2 zone: speeds up gently, caps at 2 m/s.
    expect(simulate(0, -2, 0.05).speed).toBeGreaterThan(-2);
    expect(simulate(0, -2, 3).speed).toBeCloseTo(-2, 5);
    expect(simulate(3, -2, 3).speed).toBeCloseTo(-2, 5);
  });

  it("rising zones start quickly and float players that fall in", () => {
    expect(simulate(0, 4, 0.3).speed).toBeGreaterThan(3.9);
    expect(simulate(-56, 0, 0.6).speed).toBeCloseTo(0, 1);
  });
});
