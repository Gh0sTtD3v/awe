import React, { useEffect, useMemo, useState } from "react";
import { classes } from "../../../../utils/classes";
import { UploadCard } from "./card/upload";
import { AvatarCard } from "./card/avatar";
import { getMimeType, getExtension } from "../../../../utils/mime-utils";
import { useAvatar } from "../../../../contexts/avatar-context";
import { DropUpload } from "../../../drop-upload";
import { motion, AnimatePresence, cubicBezier } from "framer-motion";
import { UploadInput } from "../../../upload-input";
import { useUserUploads } from "../../../../hooks/use-user-uploads";
import { getUploader } from "../../../../services/uploader/utils";
import { AssetCardsGrid } from "../../../asset-cards-grid";
import { ScrollableSection } from "../../../scrollable-section";
import { Loading } from "../../components/loading";
import { NotFound } from "../../components/not-found";
import { Filters } from "../filters";
import useFilter from "../hooks/use-filter";
import { DEFAULT_AVATAR_IMAGE } from "../../../../utils/constants";

const collapseFilters = [
  {
    value: "all",
    label: "All",
  },
  {
    value: "image",
    label: "Images",
  },
  {
    value: "video",
    label: "Videos",
  },
  {
    value: "model",
    label: "3D models",
  },
  {
    value: "audio",
    label: "Audio",
  },
  {
    value: "avatars",
    label: "Avatars",
  },
];

const easeOutExpo = cubicBezier(0.5, 1, 0.89, 1);

export default function Uploads({ width }) {
  //
  const userUploadsResp = useUserUploads();

  const [showUploadPrompt, setShowUploadPrompt] = useState(false);

  const { uploadedAvatars, uploadAvatar } = useAvatar();

  const { filters, searchQuery, setSearchQuery, handleChangeFilter } =
    useFilter([]);

  const userAvatars = uploadedAvatars.map((it) => ({
    ...it,
    image: DEFAULT_AVATAR_IMAGE,
    component: "AvatarCard",
  }));

  const userUploads = (userUploadsResp.data ?? []).map((it) => ({
    ...it,
    component: "UploadCard",
  }));

  const data: any = useMemo(() => {
    //
    let result: any = [...userUploads, ...userAvatars];

    if (searchQuery) {
      result = result.filter((it) =>
        it.name.toLowerCase().includes(searchQuery?.toLowerCase())
      );
    }

    if (!filters.includes("all") && filters.length) {
      //
      result = result.filter((item) => {
        return filters.some((filter) => {
          if (filter === "avatars") {
            return item.component === "AvatarCard";
          } else {
            return item.mimeType && item.mimeType.startsWith(filter);
          }
        });
      });
    }

    return result.sort((x, y) => {
      return (y.createdAt || y.timestamp) - (x.createdAt || x.timestamp);
    });
  }, [userUploads, userAvatars, searchQuery, filters]);

  const handleUpload = async (file: File) => {
    //

    const ext = getExtension(file.name);

    if (!ext) return;

    if (ext === "vrm") {
      //
      const fileName = file?.name?.replace(".vrm", "");

      await uploadAvatar({
        file,
        name: fileName ?? "Avatar",
      });

      return;
    }

    const uploader = getUploader();

    const mime = getMimeType(file.name);

    await uploader.saveUpload({
      file,
      mime,
      onProgress(n) {},
    });

    userUploadsResp.mutate();
  };

  const isLoading = userUploadsResp.isLoading;

  useEffect(() => {
    setShowUploadPrompt(
      !(localStorage.getItem("studio_shown_upload_prompt") === "true")
    );
  }, []);

  return (
    <div className="env">
      <Filters
        width={width}
        filters={filters}
        query={searchQuery}
        items={collapseFilters}
        setSearchQuery={setSearchQuery}
        handleChangeFilter={handleChangeFilter}
      />
      <ScrollableSection>
        <AssetCardsGrid display="square" skipScrollableSection>
          <UploadInput
            fileMaxWeight={10000}
            onUpload={handleUpload}
            withBorder={true}
            hasFile={null}
            onDelete={null}
          />

          {data.length ? (
            <React.Fragment>
              {data.map((it) =>
                it.component === "UploadCard" ? (
                  <UploadCard
                    data={it}
                    key={it.hash}
                    mutate={userUploadsResp.mutate}
                  />
                ) : (
                  <AvatarCard
                    key={it.id}
                    data={it}
                    editable={false}
                    userAvatars={userAvatars}
                  />
                )
              )}
            </React.Fragment>
          ) : null}

          {isLoading ? <Loading /> : null}
        </AssetCardsGrid>
        {data.length === 0 && !isLoading && !searchQuery ? (
          <NotFound message="You do not have anything uploaded yet" />
        ) : data.length === 0 && !isLoading ? (
          <NotFound />
        ) : null}
      </ScrollableSection>
      <AnimatePresence mode="wait">
        {showUploadPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              ease: easeOutExpo,
              duration: 0.5,
            }}
            exit={{ opacity: 0 }}
          >
            <DropUpload
              accept=".png,.jpg,.mp4,.mp3,.glb,.vrm"
              fileMaxWeight={80000}
              // TODO : add upload method
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
