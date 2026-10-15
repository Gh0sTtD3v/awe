import { describe, expect, it } from "vitest";
import { ChunkManager } from "../src/space/chunk-manager";

/**
 * A stand-in for a preset singleton. Mirrors `setData`'s shallow-merge
 * semantics, which is what the override format is built around.
 */
class FakeComponent {
	data: Record<string, any>;

	constructor(public id: string, public type: string, data: Record<string, any>) {
		this.data = { id, type, ...data };
	}

	setData(patch: Record<string, any>) {
		Object.assign(this.data, patch);
	}
}

function makeManager(components: FakeComponent[]) {
	const manager = new ChunkManager() as any;

	manager._space = {
		components: {
			byId: (id: string) => components.find((c) => c.id === id) ?? null,
			byType: (type: string) => components.filter((c) => c.type === type),
		},
	};

	return manager;
}

/** Simulates entering a chunk whose file carries the given preset overrides. */
function enterChunk(manager: any, presets: Record<string, any>) {
	manager._applyPresetOverrides(presets);
}

describe("ChunkManager preset overrides", () => {
	it("applies a chunk's overrides over the world defaults", () => {
		const fog = new FakeComponent("fog", "fog", { far: 2059, near: 1 });
		const manager = makeManager([fog]);

		enterChunk(manager, { fog: { type: "fog", far: 400 } });

		expect(fog.data.far).toBe(400);
		// Untouched keys keep the world default
		expect(fog.data.near).toBe(1);
	});

	it("restores the world default when the next chunk drops the override", () => {
		const fog = new FakeComponent("fog", "fog", { far: 2059 });
		const manager = makeManager([fog]);

		enterChunk(manager, { fog: { type: "fog", far: 400 } });
		expect(fog.data.far).toBe(400);

		// A chunk with no fog override at all
		enterChunk(manager, {});

		expect(fog.data.far).toBe(2059);
	});

	it("replaces one chunk's override with the next chunk's", () => {
		const fog = new FakeComponent("fog", "fog", { far: 2059 });
		const manager = makeManager([fog]);

		enterChunk(manager, { fog: { type: "fog", far: 400 } });
		enterChunk(manager, { fog: { type: "fog", far: 800 } });

		expect(fog.data.far).toBe(800);

		// And still restores all the way back to the world default
		enterChunk(manager, {});
		expect(fog.data.far).toBe(2059);
	});

	it("restores only the keys the previous chunk overrode", () => {
		const water = new FakeComponent("water", "water", {
			color: "#0000ff",
			opacity: 0.5,
		});
		const manager = makeManager([water]);

		enterChunk(manager, {
			water: { type: "water", color: "#0a2a4a", opacity: 0.9 },
		});
		enterChunk(manager, { water: { type: "water", color: "#111111" } });

		expect(water.data.color).toBe("#111111");
		// opacity was overridden by the previous chunk but not this one
		expect(water.data.opacity).toBe(0.5);
	});

	it("resolves a preset by id, not by the map key's type", () => {
		// Two components of the same type; only the id disambiguates them.
		const a = new FakeComponent("fog_a", "fog", { far: 100 });
		const b = new FakeComponent("fog_b", "fog", { far: 200 });
		const manager = makeManager([a, b]);

		enterChunk(manager, { fog_b: { type: "fog", far: 999 } });

		expect(b.data.far).toBe(999);
		expect(a.data.far).toBe(100);
	});

	it("falls back to a type lookup for legacy type-keyed chunk files", () => {
		// Older files keyed presets by type and relied on id === type.
		const fog = new FakeComponent("some-generated-id", "fog", { far: 2059 });
		const manager = makeManager([fog]);

		enterChunk(manager, { fog: { type: "fog", far: 400 } });

		expect(fog.data.far).toBe(400);
	});

	it("ignores overrides for components that aren't in the space", () => {
		const manager = makeManager([]);

		expect(() =>
			enterChunk(manager, { water: { type: "water", color: "#fff" } }),
		).not.toThrow();
	});
});
