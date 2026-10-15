import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import {
	GLOBAL_TYPES,
	PRESET_TYPES,
	filterGlobalComponents,
	isGlobalComponent,
} from "../src/component-types";

const COMPONENTS_DIR = path.resolve(
	__dirname,
	"../../engine/src/space/components",
);

/**
 * Reads the `type` and `singleton` flags declared in a component's registry
 * entry. Deliberately a regex over the source rather than an import — the
 * engine's component modules pull in Three.js and can't load under node.
 */
function readComponentInfo(dir: string) {
	const file = path.join(COMPONENTS_DIR, dir, "index.ts");
	if (!fs.existsSync(file)) return null;
	const src = fs.readFileSync(file, "utf-8");
	const type = src.match(/\btype:\s*["']([^"']+)["']/)?.[1] ?? null;
	const singleton = /\bsingleton:\s*true\b/.test(src);
	return { type, singleton };
}

function allComponentInfos() {
	return fs
		.readdirSync(COMPONENTS_DIR, { withFileTypes: true })
		.filter((e) => e.isDirectory())
		.map((e) => readComponentInfo(e.name))
		.filter((i): i is { type: string; singleton: boolean } => !!i?.type);
}

describe("preset types", () => {
	it("are all declared as engine singletons", () => {
		const singletonTypes = new Set(
			allComponentInfos().filter((i) => i.singleton).map((i) => i.type),
		);

		// A preset overrides one shared instance per chunk, so a type that can
		// exist more than once has no well-defined instance to configure.
		const notSingleton = [...PRESET_TYPES].filter(
			(t) => !singletonTypes.has(t),
		);

		expect(notSingleton).toEqual([]);
	});

	it("do not overlap with global types", () => {
		const overlap = [...PRESET_TYPES].filter((t) => GLOBAL_TYPES.has(t));
		expect(overlap).toEqual([]);
	});
});

describe("isGlobalComponent", () => {
	it("keeps globals, presets and unpositioned components out of chunks", () => {
		expect(isGlobalComponent({ type: "avatar" })).toBe(true);
		expect(isGlobalComponent({ type: "fog" })).toBe(true);
		expect(isGlobalComponent({ type: "model" })).toBe(true);
	});

	it("assigns positioned non-preset components to a chunk", () => {
		expect(
			isGlobalComponent({ type: "model", position: { x: 0, y: 0, z: 0 } }),
		).toBe(false);
	});

	it("filters a component map down to the initial load set", () => {
		const globals = filterGlobalComponents({
			sky: { type: "background" },
			rock: { type: "model", position: { x: 12, y: 0, z: 4 } },
			me: { type: "avatar" },
		});

		expect(Object.keys(globals).sort()).toEqual(["me", "sky"]);
	});
});
