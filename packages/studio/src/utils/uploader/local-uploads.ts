import { UserAssetUpload } from "../../types/user-upload";

const LIMITS = {
  assets: 350,
  portals: 3,
  uploads: 3,
  allUploads: 10,
};

export function getAnonUploads(): UserAssetUpload[] {
  //
  const uploads = localStorage.getItem("anon-uploads");

  if (uploads) {
    return JSON.parse(uploads);
  }

  return [];
}

export async function updateAnonUploads(fn: (updates: any) => any) {
  //
  const uploads = getAnonUploads();

  const newUploads = fn(uploads);

  localStorage.setItem("anon-uploads", JSON.stringify(newUploads));

  return newUploads;
}

export async function deleteAnonUploads({ hashes }) {
  //
  return updateAnonUploads((uploads) => {
    //
    return uploads.filter((it) => !hashes.includes(it.hash));
  });
}

export async function saveAnonUpload(opts) {
  //
  return updateAnonUploads((uploads) => {
    //
    const now = Date.now();

    const entry = {
      ...opts,
      createdAt: now,
      lastModified: now,
    };
    return [...uploads, entry];
  });
}

export async function updateAnonUpload(hash, data) {
  //
  return updateAnonUploads((uploads) => {
    //
    return uploads.map((it) => {
      //
      if (it.hash === hash) {
        return { ...it, ...data };
      }

      return it;
    });
  });
}

export async function checkAnonUploadExists(hash) {
  //
  const uploads = getAnonUploads();

  return uploads.find((it) => it.hash === hash);
}
