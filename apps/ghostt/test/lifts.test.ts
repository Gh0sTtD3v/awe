import { describe, expect, it } from "vitest";
import { floorName, floorsOf, liftAt, liftFromComponent, type LiftDef } from "../shared/lifts";

function lift(id: string, data: Record<string, unknown> = {}): LiftDef {
  const def = liftFromComponent({ id, type: "lift", scale: { x: 3, y: 3, z: 3 }, ...data });
  if (!def) throw new Error("not a lift");
  return def;
}

describe("lifts", () => {
  it("builds a stop from a lift component, arriving at the box's bottom centre", () => {
    const def = lift("a", { position: { x: 10, y: 21.5, z: -4 }, group: " Tower ", floor: 2.2, floorLabel: "Rooftop" });
    expect(def).toMatchObject({
      id: "a",
      group: "Tower",
      floor: 2,
      label: "Rooftop",
      halfSize: { x: 1.5, y: 1.5, z: 1.5 },
      arrival: { x: 10, y: 20, z: -4 },
    });
  });

  it("defaults the lift name and floor, and ignores other components", () => {
    expect(lift("a")).toMatchObject({ group: "Lift", floor: 0, label: "" });
    expect(liftFromComponent({ id: "z", type: "chat-zone" })).toBeNull();
    expect(liftFromComponent({ type: "lift" })).toBeNull();
  });

  it("finds the box a player stands in, rotated ones included", () => {
    const flat = lift("flat", { position: { x: 0, y: 1.5, z: 0 } });
    const turned = lift("turned", {
      position: { x: 50, y: 1.5, z: 0 },
      scale: { x: 6, y: 3, z: 1 },
      rotation: { x: 0, y: Math.PI / 2, z: 0 },
    });
    const lifts = [flat, turned];

    expect(liftAt(lifts, { x: 1, y: 0.5, z: -1 })?.id).toBe("flat");
    expect(liftAt(lifts, { x: 0, y: 0.5, z: 5 })).toBeNull();
    // Turned 90°: long along z now.
    expect(liftAt(lifts, { x: 50, y: 1, z: 2.5 })?.id).toBe("turned");
    expect(liftAt(lifts, { x: 52.5, y: 1, z: 0 })).toBeNull();
  });

  it("lists one lift's floors highest first, one box per floor", () => {
    const lifts = [
      lift("g", { floor: 0 }),
      lift("r", { floor: 2, floorLabel: "Rooftop" }),
      lift("one", { floor: 1 }),
      lift("dup", { floor: 1 }),
      lift("other", { floor: 5, group: "Tower B" }),
    ];
    expect(floorsOf(lifts, "Lift").map((l) => l.id)).toEqual(["r", "one", "g"]);
    expect(floorsOf(lifts, "Tower B").map((l) => l.id)).toEqual(["other"]);
    expect(floorName(lifts[1])).toBe("Rooftop");
    expect(floorName(lifts[0])).toBe("Floor 0");
  });
});
