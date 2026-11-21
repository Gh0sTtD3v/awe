import { describe, expect, it } from "vitest";
import { seatFromComponent, seatNear, type SeatDef } from "../shared/seats";

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
});
