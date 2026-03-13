import type { Asset } from "../../../../dApp/nfts/types";
import { mimeTypeCategory } from "./constants";

function removeResize(url) {
  const urlObj = new URL(url);
  urlObj.searchParams.delete("width");
  urlObj.searchParams.delete("height");
  return urlObj.toString();
}

export function getNftAssetData(nft: Asset) {
  //
  const { url, ...meta } = nft;

  const originalUrl = removeResize(url);

  const data = {
    name: nft.name ?? nft.token_id,
    mimeType: nft.mime_type,
    url: originalUrl,
    meta: {
      ...meta,
      metaType: "nft",
    },
    createdAt: Date.now(),
  };

  return data;
}

const isAvatar = (data, mime_type) => {
  //
  const result =
    data.isVrm ||
    mime_type === "model/vrm" ||
    ((data?.vrm_url || data?.vrm) && mime_type.startsWith("model"));

  return result;
};

export function searchMatches(data, searchQuery) {
  if (!searchQuery) return true; // If no search query, always return true

  const searchableProperties = [
    data.collection?.name,
    data.name,
    data.description,
    data.token_id,
  ];

  return searchableProperties.some((property) => {
    if (!property) return false;
    return property.toLowerCase().includes(searchQuery.toLowerCase());
  });
}

export function categoryMatches(data, mime_type, category) {
  //

  if (category === "all") return true;

  const isVrm = isAvatar(data, mime_type);

  if (category === "vrms") return isVrm;

  const arr = mimeTypeCategory[category] ?? [];

  if (category === "3d") return arr.includes(mime_type) && !isVrm;

  return arr.includes(mime_type);
}
