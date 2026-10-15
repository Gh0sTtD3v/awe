import { describe, expect, it } from "vitest";
import { computeBasePermissions, resolvePermissions } from "../src/resolve";
import { defaultChunkConfig, defaultWorldConfig } from "../src/types";
import type { ChunkConfig, WorldConfig } from "../src/types";

const OWNER = "did:privy:owner";
const ADMIN = "did:privy:admin";
const BUILDER = "did:privy:builder";
const STRANGER = "did:privy:stranger";

function makeWorld(overrides: Partial<WorldConfig> = {}): WorldConfig {
	return {
		...defaultWorldConfig(),
		ownerId: OWNER,
		everyone: { color: "#99aab5", allow: ["view", "speak"] },
		roles: [
			{ id: "r_admin", name: "admin", color: "#e74c3c", allow: ["administrator"] },
			{ id: "r_builder", name: "builder", color: "#3498db", allow: ["build"] },
			{ id: "r_guest", name: "guest", color: "#95a5a6", allow: [] },
		],
		members: {
			[ADMIN]: ["r_admin"],
			[BUILDER]: ["r_builder"],
		},
		...overrides,
	};
}

function makeChunk(overrides: Partial<ChunkConfig> = {}): ChunkConfig {
	return { ...defaultChunkConfig(), ...overrides };
}

describe("base permissions", () => {
	it("gives the world owner everything", () => {
		const perms = computeBasePermissions(makeWorld(), OWNER);

		expect(perms.has("administrator")).toBe(true);
		expect(perms.has("manage_roles")).toBe(true);
		expect(perms.has("view")).toBe(true);
	});

	it("expands administrator into every permission", () => {
		const perms = computeBasePermissions(makeWorld(), ADMIN);

		expect(perms.has("manage_world")).toBe(true);
		expect(perms.has("build")).toBe(true);
	});

	it("expands implied permissions — build grants view", () => {
		const world = makeWorld({ everyone: { color: "#fff", allow: [] } });
		const perms = computeBasePermissions(world, BUILDER);

		expect(perms.has("build")).toBe(true);
		expect(perms.has("view")).toBe(true);
	});

	it("gives an unknown user only the @everyone permissions", () => {
		const perms = computeBasePermissions(makeWorld(), STRANGER);

		expect(perms.has("view")).toBe(true);
		expect(perms.has("speak")).toBe(true);
		expect(perms.has("build")).toBe(false);
	});

	it("treats a signed-out visitor as @everyone", () => {
		const perms = computeBasePermissions(makeWorld(), null);

		expect(perms.has("view")).toBe(true);
		expect(perms.has("build")).toBe(false);
	});

	it("ignores roles a member holds that no longer exist", () => {
		const world = makeWorld({ members: { [STRANGER]: ["r_deleted"] } });
		const perms = computeBasePermissions(world, STRANGER);

		expect(perms.has("build")).toBe(false);
	});
});

describe("chunk overwrites", () => {
	it("lets an @everyone deny lock a chunk", () => {
		const chunk = makeChunk({
			overwrites: { everyone: { allow: [], deny: ["view"] } },
		});

		expect(resolvePermissions({ world: makeWorld(), chunk, userId: STRANGER }).has("view")).toBe(false);
	});

	it("lets a role allow re-open a chunk the @everyone deny closed", () => {
		const chunk = makeChunk({
			overwrites: {
				everyone: { allow: [], deny: ["view"] },
				roles: { r_builder: { allow: ["view"], deny: [] } },
			},
		});

		const world = makeWorld();

		expect(resolvePermissions({ world, chunk, userId: BUILDER }).has("view")).toBe(true);
		expect(resolvePermissions({ world, chunk, userId: STRANGER }).has("view")).toBe(false);
	});

	it("accumulates all role denies before all role allows, so one allow wins", () => {
		// The canonical Discord case: holding two roles where one denies and
		// the other allows resolves to allowed.
		const world = makeWorld({
			members: { [STRANGER]: ["r_builder", "r_guest"] },
		});
		const chunk = makeChunk({
			overwrites: {
				roles: {
					r_guest: { allow: [], deny: ["speak"] },
					r_builder: { allow: ["speak"], deny: [] },
				},
			},
		});

		expect(resolvePermissions({ world, chunk, userId: STRANGER }).has("speak")).toBe(true);
	});

	it("lets a member-specific deny beat a role allow", () => {
		const chunk = makeChunk({
			overwrites: {
				roles: { r_builder: { allow: ["speak"], deny: [] } },
				members: { [BUILDER]: { allow: [], deny: ["speak"] } },
			},
		});

		expect(resolvePermissions({ world: makeWorld(), chunk, userId: BUILDER }).has("speak")).toBe(false);
	});

	it("lets a member-specific allow beat a role deny", () => {
		const chunk = makeChunk({
			overwrites: {
				roles: { r_builder: { allow: [], deny: ["view"] } },
				members: { [BUILDER]: { allow: ["view"], deny: [] } },
			},
		});

		expect(resolvePermissions({ world: makeWorld(), chunk, userId: BUILDER }).has("view")).toBe(true);
	});

	it("does not let an implied permission resurrect a denied one", () => {
		// @everyone grants speak, and speak implies view. Denying view must
		// actually deny it rather than have the implication add it back.
		const chunk = makeChunk({
			overwrites: { everyone: { allow: [], deny: ["view"] } },
		});

		const perms = resolvePermissions({ world: makeWorld(), chunk, userId: STRANGER });

		expect(perms.has("speak")).toBe(true);
		expect(perms.has("view")).toBe(false);
	});

	it("still expands implications when a permission is granted", () => {
		const world = makeWorld({ everyone: { color: "#fff", allow: [] } });
		const chunk = makeChunk({
			overwrites: { everyone: { allow: ["build"], deny: [] } },
		});

		const perms = resolvePermissions({ world, chunk, userId: STRANGER });

		expect(perms.has("build")).toBe(true);
		expect(perms.has("view")).toBe(true);
	});

	it("ignores overwrites entirely for an administrator", () => {
		const chunk = makeChunk({
			overwrites: { everyone: { allow: [], deny: ["view"] } },
		});

		expect(resolvePermissions({ world: makeWorld(), chunk, userId: ADMIN }).has("view")).toBe(true);
		expect(resolvePermissions({ world: makeWorld(), chunk, userId: OWNER }).has("view")).toBe(true);
	});
});

describe("chunk ownership", () => {
	it("gives the chunk owner every chunk permission", () => {
		const chunk = makeChunk({
			ownerId: BUILDER,
			overwrites: { everyone: { allow: [], deny: ["view"] } },
		});

		const perms = resolvePermissions({ world: makeWorld(), chunk, userId: BUILDER });

		expect(perms.has("view")).toBe(true);
		expect(perms.has("manage_chunk")).toBe(true);
		expect(perms.has("moderate")).toBe(true);
	});

	it("does not let chunk ownership escalate to managing the world", () => {
		// The whole point of the chunk/world split: owning a chunk must not
		// become a route to editing the world's roles.
		const chunk = makeChunk({ ownerId: BUILDER });
		const perms = resolvePermissions({ world: makeWorld(), chunk, userId: BUILDER });

		expect(perms.has("manage_chunk")).toBe(true);
		expect(perms.has("manage_roles")).toBe(false);
		expect(perms.has("administrator")).toBe(false);
	});

	it("confers nothing on other users", () => {
		const chunk = makeChunk({ ownerId: BUILDER });
		const perms = resolvePermissions({ world: makeWorld(), chunk, userId: STRANGER });

		expect(perms.has("manage_chunk")).toBe(false);
	});
});
