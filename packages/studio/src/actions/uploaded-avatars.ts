"use server";

import { AvatarService, type Avatar } from "../server/avatar-service";

export async function getAvatars(): Promise<Avatar[]> {
  return AvatarService.getAvatars();
}

export async function getAvatarByHash(
  fileHash: string
): Promise<{ url: string; urlCompressed: string | null; image?: string } | false> {
  return AvatarService.getAvatarByHash(fileHash);
}

export async function setAvatarData(payload: {
  url: string;
  fileHash: string;
  name: string;
  urlCompressed: string;
  image?: string;
}): Promise<{ id: string }> {
  return AvatarService.setAvatarData(payload);
}

export async function editAvatar(
  avatarId: string,
  updates: { name?: string }
): Promise<boolean> {
  return AvatarService.editAvatar(avatarId, updates);
}

export async function deleteAvatar(avatarId: string): Promise<boolean> {
  return AvatarService.deleteAvatar(avatarId);
}

export async function verifyAvatarHash(fileHash: string): Promise<boolean> {
  return AvatarService.verifyUserAvatarHash(fileHash);
}
