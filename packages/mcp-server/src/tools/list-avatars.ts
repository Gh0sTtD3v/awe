import { normalizeToArray } from "../utils/file-io.js";
import { getVrmsData } from "../utils/paths.js";
import { makeSuccess } from "../utils/errors.js";
import type { ToolResponse } from "../types.js";

interface AvatarEntry {
  id?: string;
  name?: string;
  url?: string;
  urlCompressed?: string;
  image?: string;
  description?: string;
  hidden?: boolean;
  [key: string]: unknown;
}

export async function listAvatars(args: Record<string, unknown>, projectDir: string): Promise<ToolResponse> {
  const raw = getVrmsData() as Record<string, AvatarEntry> | AvatarEntry[];
  let filtered = normalizeToArray(raw);

  const includeHidden = (args.includeHidden as boolean) ?? false;
  if (!includeHidden) {
    filtered = filtered.filter((a) => !a.hidden);
  }

  const search = args.search as string | undefined;
  if (search) {
    const lower = search.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.name?.toLowerCase().includes(lower) ||
        a.description?.toLowerCase().includes(lower)
    );
  }

  const results = filtered.map((a) => ({
    id: a.id,
    name: a.name,
    url: a.url,
    urlCompressed: a.urlCompressed,
    image: a.image,
    description: a.description,
  }));

  return makeSuccess({ count: results.length, results });
}
