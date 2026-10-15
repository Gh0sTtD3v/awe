import { describe, expect, it } from "vitest";
import { migrateChunkConfigMap, migrateWorldConfig } from "../src/migrate";
import { resolvePermissions } from "../src/resolve";
import { WORLD_CONFIG_VERSION } from "../src/types";

/** The literal contents of apps/ghostt/public/data/chunk-config.json today. */
const CURRENT_ON_DISK = {
	"0_0_0": {
		info: { title: "Info", image: "/assets/banner_gbcutout.png" },
		auth: [] as string[],
	},
};

describe("chunk config migration", () => {
	it("migrates the config currently on disk to a public chunk", () => {
		const migrated = migrateChunkConfigMap(CURRENT_ON_DISK);
		const chunk = migrated["0_0_0"];

		expect(chunk.info.title).toBe("Info");
		expect(chunk.info.image).toBe("/assets/banner_gbcutout.png");
		expect(chunk.overwrites).toEqual({});
		expect(chunk.ownerId).toBeNull();
		expect(chunk.presets).toEqual({});
	});

	it("preserves the meaning of a non-empty legacy allowlist", () => {
		const migrated = migrateChunkConfigMap({
			"0_0_1": { info: { title: "Private" }, auth: ["r_a", "r_b"] },
		});

		const world = {
			version: WORLD_CONFIG_VERSION,
			ownerId: null,
			everyone: { color: "#fff", allow: ["view"] },
			roles: [
				{ id: "r_a", name: "a", color: "#fff", allow: [] },
				{ id: "r_b", name: "b", color: "#fff", allow: [] },
			],
			members: { alice: ["r_a"] },
			updatedAt: 0,
		};

		const chunk = migrated["0_0_1"];

		// Was: "only these roles may enter". Must still be exactly that.
		expect(resolvePermissions({ world, chunk, userId: "alice" }).has("view")).toBe(true);
		expect(resolvePermissions({ world, chunk, userId: "bob" }).has("view")).toBe(false);
	});

	it("is idempotent — re-running on migrated output changes nothing", () => {
		const once = migrateChunkConfigMap(CURRENT_ON_DISK);
		const twice = migrateChunkConfigMap(once);

		expect(twice).toEqual(once);
	});

	it("never imports presets from legacy input", () => {
		// Old chunk files carried a full copy of the world defaults; importing
		// them would pin every default into every chunk forever.
		const migrated = migrateChunkConfigMap({
			"0_0_0": { info: {}, auth: [] },
		});

		expect(migrated["0_0_0"].presets).toEqual({});
	});

	it("tolerates junk input", () => {
		expect(migrateChunkConfigMap(null)).toEqual({});
		expect(migrateChunkConfigMap("nope")).toEqual({});
	});
});

describe("world config migration", () => {
	it("maps legacy role flags onto permission slugs, order intact", () => {
		const world = migrateWorldConfig({
			legacyRoles: [
				{ id: "r1", name: "admin", color: "#e74c3c", permissions: { administrator: true } },
				{ id: "r2", name: "builder", color: "#3498db", permissions: { build: true, speak: true } },
			],
		});

		expect(world.roles.map((r) => r.id)).toEqual(["r1", "r2"]);
		expect(world.roles[0].allow).toEqual(["administrator"]);
		// The old "build" implied being able to see the chunk you build in.
		expect(world.roles[1].allow).toContain("build");
		expect(world.roles[1].allow).toContain("view");
		expect(world.roles[1].allow).toContain("speak");
	});

	it("starts with no owner so the first authenticated user can claim it", () => {
		expect(migrateWorldConfig({}).ownerId).toBeNull();
	});

	it("drops memberships pointing at deleted roles", () => {
		const world = migrateWorldConfig({
			stored: {
				roles: [{ id: "r1", name: "a", color: "#fff", allow: [] }],
				members: { alice: ["r1", "r_gone"], bob: ["r_gone"] },
			} as any,
		});

		expect(world.members.alice).toEqual(["r1"]);
		expect(world.members.bob).toBeUndefined();
	});

	it("drops duplicate role ids, which would make hierarchy ambiguous", () => {
		const world = migrateWorldConfig({
			stored: {
				roles: [
					{ id: "r1", name: "first", color: "#fff", allow: [] },
					{ id: "r1", name: "second", color: "#000", allow: [] },
				],
			} as any,
		});

		expect(world.roles).toHaveLength(1);
		expect(world.roles[0].name).toBe("first");
	});

	it("strips unknown permission slugs", () => {
		const world = migrateWorldConfig({
			stored: {
				roles: [{ id: "r1", name: "a", color: "#fff", allow: ["build", "not_a_perm"] }],
			} as any,
		});

		expect(world.roles[0].allow).toEqual(["build"]);
	});

	it("is idempotent", () => {
		const once = migrateWorldConfig({
			legacyRoles: [
				{ id: "r1", name: "admin", color: "#e74c3c", permissions: { administrator: true } },
			],
		});
		const twice = migrateWorldConfig({ stored: once });

		expect(twice).toEqual(once);
	});
});
