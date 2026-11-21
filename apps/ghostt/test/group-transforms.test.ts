import { describe, expect, it } from "vitest";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { worldTransformOf, withWorldTransforms } from "@oncyberio/world-config";
import { gateFromComponent, pointInGate } from "../shared/gates";

/** Engine-equivalent world matrix: three.js composes parent x local the same way the scene graph does. */
function threeWorld(id: string, all: Record<string, any>): Matrix4 {
  const c = all[id];
  const local = new Matrix4().compose(
    new Vector3(c.position.x, c.position.y, c.position.z),
    new Quaternion().setFromEuler(new Euler(c.rotation.x, c.rotation.y, c.rotation.z)),
    new Vector3(c.scale.x, c.scale.y, c.scale.z),
  );
  return c.parentId ? threeWorld(c.parentId, all).multiply(local) : local;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randTransform = (uniform: boolean) => {
  const s = rand(0.5, 2);
  return {
    position: { x: rand(-50, 50), y: rand(-5, 20), z: rand(-50, 50) },
    rotation: { x: rand(-Math.PI, Math.PI), y: rand(-Math.PI, Math.PI), z: rand(-Math.PI, Math.PI) },
    // Groups with non-uniform scale and rotation shear their children (not a
    // pure position/rotation/scale any more); test uniform-scaled groups.
    scale: uniform ? { x: s, y: s, z: s } : { x: rand(0.5, 2), y: rand(0.5, 2), z: rand(0.5, 2) },
  };
};

describe("groups: world transforms from saved data", () => {
  it("match three.js (what the engine shows) for nested groups", () => {
    for (let trial = 0; trial < 50; trial++) {
      const all: Record<string, any> = {
        g1: { id: "g1", type: "group", ...randTransform(true) },
        g2: { id: "g2", type: "group", parentId: "g1", ...randTransform(true) },
        leaf: { id: "leaf", type: "lift", parentId: "g2", ...randTransform(false) },
      };
      const ours = worldTransformOf(all.leaf, all);
      const p = new Vector3();
      const q = new Quaternion();
      const s = new Vector3();
      threeWorld("leaf", all).decompose(p, q, s);

      expect(ours.position.x).toBeCloseTo(p.x, 6);
      expect(ours.position.y).toBeCloseTo(p.y, 6);
      expect(ours.position.z).toBeCloseTo(p.z, 6);
      const oursQ = new Quaternion().setFromEuler(new Euler(ours.rotation.x, ours.rotation.y, ours.rotation.z));
      expect(Math.abs(oursQ.dot(q))).toBeCloseTo(1, 6);
    }
  });

  it("puts a token gate inside a group where the player actually is", () => {
    const all: Record<string, any> = {
      group: { id: "group", type: "group", position: { x: 100, y: 0, z: -40 }, rotation: { x: 0, y: Math.PI / 2, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
      gate: {
        id: "gate", type: "token-gate", parentId: "group",
        position: { x: 10, y: 1.5, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 4, y: 3, z: 4 },
        chain: "cosmos", requirementType: "cft20", ticker: "ROIDS", minAmount: "1",
      },
    };
    // Saved (group-relative) data would put the gate near (10, 1.5, 0): wrong.
    const naive = gateFromComponent(all.gate)!;
    const world = gateFromComponent(withWorldTransforms(all).gate)!;
    // Group turned 90° about y: local +x points to world -z. Gate centre: (100, 1.5, -50).
    const inside = { x: 100, y: 1, z: -50 };
    expect(pointInGate(world, inside)).toBe(true);
    expect(pointInGate(naive, inside)).toBe(false);
    expect(pointInGate(world, { x: 10, y: 1, z: 0 })).toBe(false);
  });
});
