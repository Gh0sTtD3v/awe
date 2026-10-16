/**
 * Every permission a role can grant. Roles are user-defined data; permissions
 * are not — each one maps to a check somewhere in the code. Adding one means an
 * entry here plus its check. The studio Roles tab renders straight from this.
 *
 * Isomorphic: imported by the studio UI as well as the servers.
 */

export const PERMISSIONS = [
  {
    id: "administrator",
    category: "General",
    label: "Administrator",
    description: "Every permission. Bypasses chunk access rules and token gates.",
  },
  {
    id: "manage_roles",
    category: "General",
    label: "Manage Roles",
    description: "Create, edit, reorder and delete roles below their highest role.",
  },
  {
    id: "manage_world",
    category: "General",
    label: "Manage World",
    description: "Edit chunk settings: info and who may enter.",
  },
  {
    id: "build",
    category: "Studio",
    label: "Build",
    description: "Open the studio and edit the scene.",
  },
  {
    id: "upload_assets",
    category: "Studio",
    label: "Upload Assets",
    description: "Upload, optimise and delete assets and avatars.",
  },
  {
    id: "manage_members",
    category: "Members",
    label: "Manage Members",
    description: "Add and remove members and assign roles below their highest role.",
  },
  {
    id: "kick_members",
    category: "Members",
    label: "Kick Members",
    description: "Remove lower-ranked players from the game.",
  },
  {
    id: "ban_members",
    category: "Members",
    label: "Ban Members",
    description: "Ban and unban lower-ranked members.",
  },
  {
    id: "mute_members",
    category: "Members",
    label: "Mute Members",
    description: "Silence lower-ranked players in voice chat for everyone.",
  },
  {
    id: "speak",
    category: "In-game",
    label: "Speak",
    description: "Talk in voice chat. Without it, players can still listen.",
  },
  {
    id: "control_screens",
    category: "In-game",
    label: "Control Screens",
    description: "Play, pause and change the videos on video screens for everyone.",
  },
] as const;

export type Permission = (typeof PERMISSIONS)[number]["id"];

export const PERMISSION_IDS: readonly Permission[] = PERMISSIONS.map((p) => p.id);

export function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && (PERMISSION_IDS as readonly string[]).includes(value);
}
