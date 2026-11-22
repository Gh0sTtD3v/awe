import { describe, expect, it } from "vitest";
import { chunkKeyOf, parentFirstLevels, topAncestor, withWorldTransforms, worldTransformOf } from "../src/scene-groups";

const scene: Record<string, any> = {
	outer: { id: "outer", type: "group", position: { x: 0, y: 0, z: -20000 }, rotation: { x: 0, y: Math.PI / 2, z: 0 }, scale: { x: 2, y: 2, z: 2 } },
	inner: { id: "inner", type: "group", parentId: "outer", position: { x: 1, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
	statue: { id: "statue", type: "model", parentId: "inner", position: { x: 0, y: 1, z: 2 }, rotation: { x: 0.3, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } },
	loose: { id: "loose", type: "model", position: { x: 3, y: 0, z: 4 } },
	orphan: { id: "orphan", type: "model", parentId: "missing", position: { x: 7, y: 0, z: 0 } },
};

describe("groups in saved scene data", () => {
	it("finds the top-level group", () => {
		expect(topAncestor(scene.statue, scene).id).toBe("outer");
		expect(topAncestor(scene.loose, scene).id).toBe("loose");
		expect(topAncestor(scene.orphan, scene).id).toBe("orphan");
	});

	it("saves children in the chunk of their top-level group, not by their local position", () => {
		// The statue's own position is near 0,0,0 (lobby chunk) but its group is in chunk 0_0_-2.
		expect(chunkKeyOf(scene.statue, scene)).toBe("0_0_-2");
		expect(chunkKeyOf(scene.inner, scene)).toBe("0_0_-2");
		expect(chunkKeyOf(scene.loose, scene)).toBe("0_0_0");
		expect(chunkKeyOf({ id: "sky", type: "background" }, scene)).toBeNull();
	});

	it("composes position, rotation and scale through the parent chain", () => {
		// outer: turned 90° about y and doubled. inner: 1 m along outer's x.
		// statue local (0,1,2) in inner -> in outer: (1,1,2) -> doubled (2,2,4)
		// -> turned 90° about y: (x,z) -> (z, -x) = (4, 2, -2) -> + (0,0,-20000)
		const t = worldTransformOf(scene.statue, scene);
		expect(t.position.x).toBeCloseTo(4);
		expect(t.position.y).toBeCloseTo(2);
		expect(t.position.z).toBeCloseTo(-20002);
		expect(t.scale).toEqual({ x: 2, y: 2, z: 2 });
		// Rotation: 90° about y, then the statue's own 0.3 about its x.
		// Check by rotating a vector both ways would need three.js; compare a known case instead:
		const simple = worldTransformOf(scene.inner, scene);
		expect(simple.rotation.x).toBeCloseTo(0);
		expect(simple.rotation.y).toBeCloseTo(Math.PI / 2);
		expect(simple.rotation.z).toBeCloseTo(0);
	});

	it("orders creation parents first, children after", () => {
		const entries = [scene.statue, scene.loose, scene.inner, scene.orphan, scene.outer];
		const levels = parentFirstLevels(entries).map((level) => level.map((e) => e.id).sort());
		expect(levels).toEqual([["loose", "orphan", "outer"], ["inner"], ["statue"]]);
		// A loop never hangs: the stuck ones come last.
		const a = { id: "a", parentId: "b" };
		const b = { id: "b", parentId: "a" };
		expect(parentFirstLevels([a, b]).map((l) => l.map((e) => e.id))).toEqual([["a", "b"]]);
	});

	it("leaves top-level components untouched and rewrites grouped ones", () => {
		const world = withWorldTransforms(scene);
		expect(world.loose).toBe(scene.loose);
		expect(world.orphan).toBe(scene.orphan);
		expect(world.statue.position.z).toBeCloseTo(-20002);
		expect(world.statue.parentId).toBe("inner");
		expect(world.statue.type).toBe("model");
	});
});
