import { describe, expect, it } from "vitest";
import { gravityZoneAt, gravityZoneFromComponent, targetSpeed, type GravityZoneDef } from "../shared/gravity-zones";

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
});
