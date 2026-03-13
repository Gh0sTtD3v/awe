import { OptimizedFiles } from "../types/optimized-files";

export const extToMime = {
  jpg: "image/jpg",
  jpeg: "image/jpeg",
  png: "image/png",
  svg: "image/svg",
  gif: "image/gif",
  bmp: "image/bmp",
  webp: "image/webp",
  mov: "video/quicktime",
  mp4: "video/mp4",
  webm: "video/webm",
  avi: "video/avi",
  html: "text/html",
  htm: "text/html",
  glb: "model/gltf-binary",
  gltf: "model/gltf+json",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4v: "video/x-m4v",
};

export const mimetoExt = {
  "image/jpg": "jpg",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg": "svg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
  "video/quicktime": "mov",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/avi": "avi",
  "text/html": "html",
  "model/gltf-binary": "glb",
  "model/gltf+json": "gltf",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "video/x-m4v": "m4v",
  "application/json": "json",
};

// all mime types supported
export const supportedMimes = [
  "image/jpg",
  "image/jpeg",
  "image/png",
  "image/svg",
  "image/svg+xml",
  "image/gif",
  "image/bmp",
  "image/webp",
  "video/quicktime",
  "video/mp4",
  "video/avi",
  "text/html",
  "model/gltf-binary",
  "model/gltf+json",
  "audio/mpeg",
  "audio/wav",
  "video/x-m4v",
];

export function getExtension(url = "") {
  //
  const dotIndex = url.lastIndexOf(".");

  if (dotIndex < 0) return null;

  const ext = url.slice(dotIndex + 1, url.length);

  return ext ? ext.toLowerCase() : null;
}

export function getMimeType(url = "") {
  //
  const ext = getExtension(url);

  if (!ext) return null;

  return extToMime[ext.toLowerCase()] ?? null;
}

export function isUploadable(mime: string) {
  if (!mime) return false;

  return (
    mime.includes("image") ||
    mime.includes("video") ||
    mime.includes("audio") ||
    mime.includes("model/gltf-binary") ||
    mime.includes("model/gltf+json")
  );
}

export function withCover(mime: string) {
  return mime.startsWith("audio") || mime === "text/html";
}

export function isAnimationUrl(mime: string = "") {
  return !mime.startsWith("image/");
}

export function getDefaultMimePreview(mime: string) {
  //
  if (mime === "cyber/text") {
    //
    return "/images/text-preview.svg";
    //
  }

  // to note:
  // You can also find other placeholder (cropped to pixel perfect size though, unlike these ones below that have some blank spacing) in UploadInput.module.scss
  // Might come in handy;

  if (mime?.startsWith("image/")) {
    return "https://cyber.mypinata.cloud/ipfs/QmTWUfiDMBswFfX13YLzp1vdvWB1H5qTrVouHKxQVNQeQP";
  }

  if (mime?.startsWith("video/")) {
    return "https://cyber.mypinata.cloud/ipfs/QmXTXCGaXGBxivCpdDNZQEx1qeCaTx1JmtbSUEhgCFJFCD";
  }

  if (mime?.startsWith("audio/") || mime === "cyber/globalstream") {
    return "https://cyber.mypinata.cloud/ipfs/QmZR6U8QzDkiJFdzApC5VSsqRhS6oKw8R5xYnNciLTnjmd";
  }

  if (mime?.startsWith("model/") || mime === "cyber/triggerzone") {
    //
    return "https://cyber.mypinata.cloud/ipfs/QmdMuK7WHQtmhRWK5weDfdptXg6iSnu9Rox2wfYqGkFNBd";
  } else {
    //
    return "https://cyber.mypinata.cloud/ipfs/QmTWUfiDMBswFfX13YLzp1vdvWB1H5qTrVouHKxQVNQeQP";
  }
}

export interface UploadedAsset {
  type: "audio" | "image" | "video" | "model" | "avatar";
  name: string;
  url: string;
  mime_type: string;
  optimized?: OptimizedFiles;
  preview?: string;
  meta?: any;
  hash?: string;
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
}

export function getAssetData({
  url,
  name,
  mimeType,
  d_optimized_files = null,
  meta = {},
  hash = null,
}): UploadedAsset {
  //

  let type: UploadedAsset["type"];

  let preview: string = null;

  if (mimeType == "video/avi") {
    //
    mimeType = "video/mp4";

    type = "video";
    //
  } else if (mimeType === "image/gif") {
    //

    type = "video";

    preview = url;

    url = null;
    //
  } else if (mimeType.startsWith("audio/")) {
    type = "audio";
  } else if (mimeType.startsWith("video/")) {
    //
    type = "video";
  } else if (mimeType.startsWith("model/")) {
    //
    const data = meta as any;

    const isAvatar =
      data?.isVrm || mimeType === "model/vrm" || data?.vrm_url || data?.vrm;

    if (isAvatar) {
      type = "avatar";
    } else {
      type = "model";
    }
  } else {
    //
    type = "image";
  }

  let asset: UploadedAsset = {
    type,
    mime_type: mimeType,
    url,
    name,
    preview: null,
    optimized: d_optimized_files,
    meta: {
      ...meta,
      hash,
    },
  };

  if (type == "video") {
    if (preview) {
      asset.preview = preview;
    }
  }

  if (type == "image" || type == "video") {
    // @ts-ignore
    asset.hasBorder = true;
    // @ts-ignore
    asset.borderColor = "#000000";
  }

  return asset;
}

function getUrlExtension(url: string) {
  return url.split(/[#?]/)[0].split(".").pop().trim();
}

export const getAssetMime = (asset) => {
  if (asset?.mime_type) {
    return asset.mime_type;
  }
  if (!asset?.animation_url && asset?.image_url) {
    let extension = getUrlExtension(asset.image_url);

    if (extension === "jpg") {
      return "image/jpg";
    }
    if (extension === "jpeg") {
      return "image/jpeg";
    } else if (extension === "png") {
      return "image/png";
    } else if (extension === "svg") {
      return "image/svg";
    } else if (extension === "gif") {
      return "image/gif";
    } else if (extension === "bmp" || extension === "bin") {
      return "image/bmp";
    } else if (extension === "mp4") {
      asset.animation_url = asset.image_url;
      return "video/mp4";
    } else if (extension === "html") {
      return "text/html";
    } else {
      return null;
    }
  } else if (asset?.animation_url) {
    let extension = getUrlExtension(asset.animation_url);

    if (extension === "png") {
      asset.image_url = asset.animation_url;
      asset.animation_url = null;
      return "image/png";
    } else if (extension === "jpg") {
      asset.image_url = asset.animation_url;
      asset.animation_url = null;
      return "image/jpg";
    } else if (extension === "jpeg") {
      return "image/jpeg";
    } else if (extension === "svg") {
      return "image/svg";
    } else if (extension === "glb") {
      return "model/gltf-binary";
    } else if (extension === "gltf") {
      return "model/gltf+json";
    } else if (extension === "fbx") {
      return "model/fbx";
    } else if (extension === "obj") {
      return "model/obj";
    } else if (extension === "mov") {
      return "video/quicktime";
    } else if (extension === "mp4") {
      return "video/mp4";
    } else if (extension === "avi") {
      return "video/avi";
    } else if (extension === "gif") {
      return "image/gif";
    } else if (extension === "mp3") {
      return "audio/mpeg";
    } else if (extension === "wav") {
      return "audio/wav";
    } else if (extension === "html") {
      return "text/html";
    }
  } else if (asset?.animation_original_url) {
    let extension = getUrlExtension(asset.animation_original_url);

    if (extension === "png") {
      asset.image_url = asset?.animation_original_url;
      asset.image_original_url = asset?.animation_original_url;
      asset.animation_original_url = null;

      return "image/png";
    }
  }
  return null;
};
