import path from "node:path";
import { getAuthMode, getDevUserId, requireIdentity } from "../auth-service";
import { linkedAddressesOf, type GateIdentity } from "../identity";
import { JsonAccessStore, type AccessStore } from "./json-store";
import { normalizeSubject, resolveAccess } from "./resolve";
import { AccessError, requirePermissionIn, type ActorContext } from "./rules";
import type { Permission } from "./permissions";
import type { ResolvedAccess } from "./types";

/**
 * Server-side only. Roles, members and the owner for this world, and the
 * checks every studio action and the game server go through.
 */

export * from "./types";
export * from "./permissions";
export * from "./resolve";
export * from "./rules";
export { JsonAccessStore, type AccessStore } from "./json-store";

let store: AccessStore | null = null;

function dataDir(): string {
  return process.env.AWE_DATA_DIR || path.join(process.cwd(), "public", "data");
}

export function getAccessStore(): AccessStore {
  if (!store) {
    store = new JsonAccessStore({
      file: path.resolve(process.env.AWE_ACCESS_FILE || path.join(process.cwd(), ".data", "access.json")),
      legacyRolesFile: path.join(dataDir(), "roles.json"),
    });
  }
  return store;
}

/** Swap the backing store (tests, or a database later). `null` restores the default. */
export function setAccessStore(next: AccessStore | null): void {
  store = next;
}

let warnedNoOwner = false;

/**
 * The single world owner, set at world setup through `AWE_OWNER_ID` (a Privy
 * DID or a Cosmos address). Without it, local dev treats the dev user as the
 * owner, as before roles existed.
 */
export function getOwnerId(): string | null {
  const configured = process.env.AWE_OWNER_ID?.trim();
  if (configured) return normalizeSubject(configured);
  if (getAuthMode() !== "privy") return getDevUserId();

  if (!warnedNoOwner) {
    warnedNoOwner = true;
    console.warn("[Access] AWE_OWNER_ID is not set: this world has no owner.");
  }
  return null;
}

/** What this identity may do. Anonymous callers get the `everyone` role only. */
export async function accessFor(
  identity: GateIdentity | null,
  opts: { fresh?: boolean } = {},
): Promise<ResolvedAccess> {
  const { cosmos, evm } = await linkedAddressesOf(identity, opts);
  return resolveAccess(
    { userId: identity?.userId ?? null, cosmosAddress: cosmos, evmAddresses: evm },
    await getAccessStore().read(),
    getOwnerId(),
  );
}

/** The calling user and their access, for a server action. */
export async function currentActor(): Promise<{ identity: GateIdentity; access: ResolvedAccess; ctx: ActorContext }> {
  const identity = await requireIdentity();
  const access = await accessFor(identity);
  if (access.banned) throw new AccessError("forbidden", "You are banned from this world.");
  return { identity, access, ctx: { access, actorId: identity.userId, ownerId: getOwnerId() } };
}

/** Throw unless the calling user holds `permission`. Use at the top of server actions. */
export async function requirePermission(permission: Permission): Promise<ResolvedAccess> {
  const { access } = await currentActor();
  requirePermissionIn(access, permission);
  return access;
}
