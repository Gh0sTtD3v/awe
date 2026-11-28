import { describe, expect, it } from "vitest";
import { Euler, Vector3 } from "three";
import { seatFromComponent, seatNear, seatYaw, type SeatDef } from "../shared/seats";

function seat(id: string, data: Record<string, unknown> = {}): SeatDef {
  const def = seatFromComponent({ id, type: "seat", ...data });
  if (!def) throw new Error("not a seat");
  return def;
}

describe("seats", () => {
  it("builds a seat from a seat component, applying the height offset", () => {
    const def = seat("a", {
      position: { x: 4, y: 0.5, z: -2 },
      rotation: { x: 0, y: Math.PI, z: 0 },
      heightOffset: -0.1,
      range: 2,
      prompt: " Sit on the bench ",
    });
    expect(def.sitAt.x).toBe(4);
    expect(def.sitAt.y).toBeCloseTo(0.4);
    expect(def.sitAt.z).toBe(-2);
    expect(def).toMatchObject({ id: "a", rotY: Math.PI, range: 2, prompt: "Sit on the bench" });
  });

  it("defaults range and prompt, and ignores other components", () => {
    expect(seat("a")).toMatchObject({ range: 1.5, prompt: "Sit", sitAt: { x: 0, y: 0, z: 0 } });
    expect(seat("b", { range: -3, heightOffset: "x" })).toMatchObject({ range: 1.5, sitAt: { y: 0 } });
    expect(seatFromComponent({ id: "z", type: "lift" })).toBeNull();
    expect(seatFromComponent({ type: "seat" })).toBeNull();
  });

  it("finds the closest seat in range, ignoring seats on other floors", () => {
    const seats = [
      seat("left", { position: { x: -1, y: 0.5, z: 0 } }),
      seat("right", { position: { x: 1, y: 0.5, z: 0 } }),
      seat("upstairs", { position: { x: 0, y: 6, z: 0 } }),
    ];

    expect(seatNear(seats, { x: 0.8, y: 0, z: 0.5 })?.id).toBe("right");
    expect(seatNear(seats, { x: -0.5, y: 0, z: 0 })?.id).toBe("left");
    expect(seatNear(seats, { x: 0, y: 0, z: 3 })).toBeNull();
    expect(seatNear(seats, { x: 0, y: 5.5, z: 0 })?.id).toBe("upstairs");
  });

  // Stored rotations from the live world (degrees): past 90 degrees three.js
  // keeps the turn as (±180, 180 - yaw, ±180).
  const deg = Math.PI / 180;
  const cases: [number, number, number, number][] = [
    [0, 60.6, 0, 60.6],
    [180, -60, 180, -120],
    [180, -87.5, 180, -92.5],
    [-180, 29.2, -180, 150.8],
    [180, -66.8, 180, -113.2],
    [-180, 35.5, 180, 144.5],
  ];

  it("faces the seat's arrow for any stored rotation, not just its y angle", () => {
    for (const [x, y, z, yaw] of cases) {
      const def = seat("a", { rotation: { x: x * deg, y: y * deg, z: z * deg } });
      expect(def.rotY / deg).toBeCloseTo(yaw, 6);
    }
  });

  it("matches where three.js points the arrow after the full rotation", () => {
    for (const [x, y, z] of [...cases, [30, 20, 10], [-45, 120, 70], [90, 10, -90]] as number[][]) {
      const arrow = new Vector3(0, 0, 1).applyEuler(new Euler(x * deg, y * deg, z * deg, "XYZ"));
      const yaw = seatYaw({ x: x * deg, y: y * deg, z: z * deg });
      // Same flat direction: rotating +Z by the yaw around Y lands on the arrow's flat heading.
      const flat = Math.hypot(arrow.x, arrow.z);
      if (flat < 1e-6) continue; // arrow pointing straight up or down: no heading
      expect(Math.sin(yaw)).toBeCloseTo(arrow.x / flat, 6);
      expect(Math.cos(yaw)).toBeCloseTo(arrow.z / flat, 6);
    }
  });
});
