import useSWR from "swr";

const swrOptions = {
  revalidateOnFocus: false,
  refreshInterval: 0,
};

export interface VrmInfo {
  id: string;
  name: string;
  url: string;
  urlCompressed: string;
  preview_image?: string;
  image: string;
  description?: string;
  glb?: string;
  glbCompressed?: string;
}

async function fetchAvatarList(): Promise<VrmInfo[]> {
  const json = await import("../data/vrms.json");

  return Object.values(json.default);
}

export function useAvatarList() {
  return useSWR(["avatar-list"], () => fetchAvatarList(), swrOptions);
}
