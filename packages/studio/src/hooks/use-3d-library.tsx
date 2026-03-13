import useSWR from "swr";
import { useCurrentGameData } from "../contexts/game-data-context";

const swrOptions = {
  revalidateOnFocus: false,
  refreshInterval: 0,
};

export interface LibraryItem {
  id: string;
  name: string;
  image: {
    cloudinary?: string;
    pinata?: string;
  };
  hash;
  url: {
    cloudinary?: string;
    pinata?: string;
  };
  d_optimized_files: {
    high: {
      cloudinary?: string;
      pinata?: string;
    };
    low: {
      cloudinary?: string;
      pinata?: string;
    };
    low_compressed: {
      cloudinary?: string;
      pinata?: string;
    };
  };
  createdAt: number;
  lastModified: number;
  mimeType: string;
  source?: {
    url: string;
    name: string;
    slug: string;
    nodeName: string;
  };
}

async function fetch3DLibrary(): Promise<LibraryItem[]> {
  const data = await import("../data/library-3d.json");

  return data.default;
}

export function use3DLibrary() {
  return useSWR(
    "/3d-library",
    () =>
      fetch3DLibrary(),
    swrOptions
  );
}
