import type { Permission } from "./permissions";

/**
 * Isomorphic: shared by the studio UI and the servers. Nothing here touches
 * the filesystem.
 */

export type { Permission } from "./permissions";

/** The implicit role everyone holds, signed in or not. Can't be deleted or moved. */
export const EVERYONE_ROLE_ID = "everyone";

/** A user-defined, Discord-style role. */
export interface Role {
  id: string;
  name: string;
  color: string;
  /** Rank: higher outranks lower. `everyone` is always 0. */
  position: number;
  permissions: Partial<Record<Permission, boolean>>;
}

/**
 * Someone given roles in this world. `subject` is a Privy DID or a Cosmos
 * address; an address entry applies to whoever has that Keplr wallet linked,
 * so people can be given roles before they ever sign in.
 */
export interface Member {
  subject: string;
  roleIds: string[];
  banned?: boolean;
  note?: string;
  addedBy?: string;
  addedAt: number;
}

export interface AccessData {
  /** 2 added `send_messages`, granted to `everyone` when older data is read. */
  version: 3;
  roles: Role[];
  members: Member[];
}

/** What a person may do, resolved from the owner setting, their roles and bans. */
export interface ResolvedAccess {
  isOwner: boolean;
  banned: boolean;
  /** Held roles, highest first, always ending with `everyone`. */
  roleIds: string[];
  permissions: Permission[];
  /** Highest held role position; `Infinity` for the owner. */
  topPosition: number;
}
