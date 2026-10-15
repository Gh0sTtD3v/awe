import { describe, expect, it } from "vitest";
import {
	actorPosition,
	canManageRole,
	canSetChunkOwner,
	validateChunkOverwriteMutation,
	validateRoleMutation,
} from "../src/hierarchy";
import { defaultChunkConfig, defaultWorldConfig } from "../src/types";
import type { WorldConfig } from "../src/types";

const OWNER = "did:privy:owner";
const ADMIN = "did:privy:admin";
const MOD = "did:privy:mod";
const MEMBER = "did:privy:member";

/** admin (0) outranks mod (1) outranks plain member (2). */
function makeWorld(overrides: Partial<WorldConfig> = {}): WorldConfig {
	return {
		...defaultWorldConfig(),
		ownerId: OWNER,
		everyone: { color: "#99aab5", allow: ["view"] },
		roles: [
			{ id: "r_admin", name: "admin", color: "#e74c3c", allow: ["administrator"] },
			{ id: "r_mod", name: "mod", color: "#f39c12", allow: ["manage_roles", "moderate"] },
			{ id: "r_member", name: "member", color: "#95a5a6", allow: ["speak"] },
		],
		members: {
			[ADMIN]: ["r_admin"],
			[MOD]: ["r_mod"],
			[MEMBER]: ["r_member"],
		},
		...overrides,
	};
}

describe("positions", () => {
	it("ranks the owner above every role", () => {
		expect(actorPosition(makeWorld(), OWNER)).toBeLessThan(
			actorPosition(makeWorld(), ADMIN),
		);
	});

	it("uses a member's highest role", () => {
		const world = makeWorld({ members: { [MEMBER]: ["r_member", "r_mod"] } });
		expect(actorPosition(world, MEMBER)).toBe(1);
	});

	it("puts a role-less user below everyone", () => {
		expect(actorPosition(makeWorld(), "nobody")).toBe(Number.POSITIVE_INFINITY);
	});
});

describe("who may manage which role", () => {
	it("lets a moderator manage roles below them", () => {
		expect(canManageRole(makeWorld(), MOD, "r_member")).toBe(true);
	});

	it("stops a moderator managing their own role", () => {
		expect(canManageRole(makeWorld(), MOD, "r_mod")).toBe(false);
	});

	it("stops a moderator managing a role above them", () => {
		expect(canManageRole(makeWorld(), MOD, "r_admin")).toBe(false);
	});

	it("lets the owner manage anything", () => {
		expect(canManageRole(makeWorld(), OWNER, "r_admin")).toBe(true);
	});

	it("never treats @everyone as a manageable role", () => {
		expect(canManageRole(makeWorld(), OWNER, "everyone")).toBe(false);
	});

	it("refuses users without manage_roles", () => {
		expect(canManageRole(makeWorld(), MEMBER, "r_member")).toBe(false);
	});
});

describe("granting is bounded by what you hold", () => {
	it("stops a moderator granting a permission they lack", () => {
		const result = validateRoleMutation(makeWorld(), MOD, {
			kind: "create",
			role: { id: "r_new", name: "new", color: "#fff", allow: ["manage_world"] },
		});

		expect(result.ok).toBe(false);
		expect(result.reason).toMatch(/permissions you don't have/);
	});

	it("allows granting a permission they do hold", () => {
		const result = validateRoleMutation(makeWorld(), MOD, {
			kind: "create",
			role: { id: "r_new", name: "new", color: "#fff", allow: ["moderate"] },
		});

		expect(result.ok).toBe(true);
	});

	it("reserves administrator for the owner", () => {
		const asAdmin = validateRoleMutation(makeWorld(), ADMIN, {
			kind: "create",
			role: { id: "r_new", name: "new", color: "#fff", allow: ["administrator"] },
		});
		expect(asAdmin.ok).toBe(false);

		const asOwner = validateRoleMutation(makeWorld(), OWNER, {
			kind: "create",
			role: { id: "r_new", name: "new", color: "#fff", allow: ["administrator"] },
		});
		expect(asOwner.ok).toBe(true);
	});

	it("only checks newly-added permissions on an update", () => {
		const world = makeWorld({
			roles: [
				{ id: "r_admin", name: "admin", color: "#e74c3c", allow: ["administrator"] },
				{ id: "r_mod", name: "mod", color: "#f39c12", allow: ["manage_roles", "moderate"] },
				{ id: "r_member", name: "member", color: "#95a5a6", allow: ["manage_world"] },
			],
		});

		// Removing a permission the actor lacks is fine.
		expect(
			validateRoleMutation(world, MOD, {
				kind: "update",
				roleId: "r_member",
				patch: { allow: [] },
			}).ok,
		).toBe(true);

		// Keeping that permission while adding one the actor *does* hold is
		// fine too — only the newly-added slug is checked.
		expect(
			validateRoleMutation(world, MOD, {
				kind: "update",
				roleId: "r_member",
				patch: { allow: ["manage_world", "moderate"] },
			}).ok,
		).toBe(true);

		// But newly adding one the actor lacks is rejected.
		expect(
			validateRoleMutation(world, MOD, {
				kind: "update",
				roleId: "r_member",
				patch: { allow: ["manage_world", "upload"] },
			}).ok,
		).toBe(false);
	});
});

describe("reordering respects the hierarchy", () => {
	it("stops a moderator promoting a role above themselves", () => {
		const result = validateRoleMutation(makeWorld(), MOD, {
			kind: "reorder",
			roleId: "r_member",
			newIndex: 0,
		});

		expect(result.ok).toBe(false);
	});

	it("allows a move that stays below them", () => {
		const world = makeWorld({
			roles: [
				{ id: "r_admin", name: "admin", color: "#e74c3c", allow: ["administrator"] },
				{ id: "r_mod", name: "mod", color: "#f39c12", allow: ["manage_roles"] },
				{ id: "r_a", name: "a", color: "#fff", allow: [] },
				{ id: "r_b", name: "b", color: "#fff", allow: [] },
			],
		});

		expect(
			validateRoleMutation(world, MOD, { kind: "reorder", roleId: "r_b", newIndex: 2 }).ok,
		).toBe(true);
	});
});

describe("assignment respects both ranks", () => {
	it("stops a moderator changing the roles of an admin", () => {
		const result = validateRoleMutation(makeWorld(), MOD, {
			kind: "assign",
			roleId: "r_member",
			targetUserId: ADMIN,
		});

		expect(result.ok).toBe(false);
		expect(result.reason).toMatch(/at or above your own rank/);
	});

	it("lets a moderator assign a lower role to a plain member", () => {
		expect(
			validateRoleMutation(makeWorld(), MOD, {
				kind: "assign",
				roleId: "r_member",
				targetUserId: MEMBER,
			}).ok,
		).toBe(true);
	});

	it("always lets someone drop a role from themselves", () => {
		const world = makeWorld({ members: { [MOD]: ["r_mod"] } });

		expect(
			validateRoleMutation(world, MOD, {
				kind: "unassign",
				roleId: "r_mod",
				targetUserId: MOD,
			}).ok,
		).toBe(false); // r_mod is their own highest role, so still blocked

		const withExtra = makeWorld({ members: { [MOD]: ["r_mod", "r_member"] } });
		expect(
			validateRoleMutation(withExtra, MOD, {
				kind: "unassign",
				roleId: "r_member",
				targetUserId: MOD,
			}).ok,
		).toBe(true);
	});
});

describe("ownership", () => {
	it("is transferable only by the owner", () => {
		expect(
			validateRoleMutation(makeWorld(), ADMIN, {
				kind: "transferOwnership",
				targetUserId: MOD,
			}).ok,
		).toBe(false);

		expect(
			validateRoleMutation(makeWorld(), OWNER, {
				kind: "transferOwnership",
				targetUserId: MOD,
			}).ok,
		).toBe(true);
	});

	it("lets a chunk owner hand off their own chunk", () => {
		const chunk = { ...defaultChunkConfig(), ownerId: MEMBER };

		expect(canSetChunkOwner(makeWorld(), chunk, MEMBER)).toBe(true);
		expect(canSetChunkOwner(makeWorld(), chunk, MOD)).toBe(false);
		expect(canSetChunkOwner(makeWorld(), chunk, OWNER)).toBe(true);
	});
});

describe("chunk overwrite mutations", () => {
	it("requires manage_chunk on that chunk", () => {
		const result = validateChunkOverwriteMutation({
			world: makeWorld(),
			chunk: defaultChunkConfig(),
			actorId: MEMBER,
			target: { kind: "everyone" },
			overwrite: { allow: [], deny: ["view"] },
		});

		expect(result.ok).toBe(false);
	});

	it("lets a chunk owner set overwrites on their own chunk", () => {
		const chunk = { ...defaultChunkConfig(), ownerId: MEMBER };

		const result = validateChunkOverwriteMutation({
			world: makeWorld(),
			chunk,
			actorId: MEMBER,
			target: { kind: "everyone" },
			overwrite: { allow: [], deny: ["view"] },
		});

		expect(result.ok).toBe(true);
	});

	it("stops a chunk owner targeting a role above their own rank", () => {
		const chunk = { ...defaultChunkConfig(), ownerId: MEMBER };

		const result = validateChunkOverwriteMutation({
			world: makeWorld(),
			chunk,
			actorId: MEMBER,
			target: { kind: "role", roleId: "r_admin" },
			overwrite: { allow: ["view"], deny: [] },
		});

		expect(result.ok).toBe(false);
	});
});
