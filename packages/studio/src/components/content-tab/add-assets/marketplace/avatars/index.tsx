import React, { useRef, useMemo, useState } from "react";
import { getExtension } from "../../../../../utils/mime-utils";
import { useAvatar } from "../../../../../contexts/avatar-context";
import { useAvatarList } from "../../../../../hooks/use-avatar-list";
import { UploadInput } from "../../../../upload-input";
import { AssetCardsGrid } from "../../../../asset-cards-grid";
import { DEFAULT_AVATAR_IMAGE } from "../../../../../utils/constants";
import { EnvironmentFilters } from "../../../components/environment-filters";
import { ScrollableSection } from "../../../../scrollable-section";
import { Loading } from "../../../components/loading";
import { NotFound } from "../../../components/not-found";
import { Filters } from "../../filters";
import { Card } from "./card";
import { Card as OfficialCard } from "../official/card";

const environmentOptions = [
  {
    title: "Library",
    value: "library",
  },
  {
    title: "Uploads",
    value: "uploads",
  },
];

export default function Avatars({ width }) {
  //
  const scrollable = useRef(null);

  const avatarResp = useAvatarList();

  const [searchQuery, setSearchQuery] = useState(null);

  const [environment, setEnvironment] = useState("library"); // library || uploads

  const { uploadedAvatars, uploadAvatar } = useAvatar();

  const handleUpload = async (file: File) => {
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
  };

  const data = useMemo(() => {
    //
    let source = avatarResp?.data as any;

    if (environment === "uploads") {
      source = uploadedAvatars;
    }

    if (!source) return [];

    let result = source;

    if (searchQuery) {
      result = result.filter((it) =>
        it.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    return result;
  }, [avatarResp.data, uploadedAvatars, searchQuery, environment]);

  return (
    <React.Fragment>
      <Filters
        query={searchQuery}
        setSearchQuery={setSearchQuery}
        width={width}
        filters={null}
        handleChangeFilter={null}
      />

      <EnvironmentFilters
        items={environmentOptions}
        onChange={(val) => {
          setEnvironment(val);
        }}
        activeValue={environment}
      />

      <ScrollableSection ref={scrollable}>
        {avatarResp.isLoading ? (
          <Loading />
        ) : environment === "uploads" && !data.length ? (
          <AssetCardsGrid display="square" skipScrollableSection={true}>
            <UploadInput
              onUpload={handleUpload}
              withBorder={true}
              hasFile={null}
              onDelete={null}
              acceptLabel=".vrm"
            />
          </AssetCardsGrid>
        ) : !data.length ? (
          <NotFound />
        ) : (
          <AssetCardsGrid
            display="square"
            skipScrollableSection={true}
            className="owned_avatars"
          >
            {environment === "uploads" && (
              <UploadInput
                onUpload={handleUpload}
                withBorder={true}
                hasFile={null}
                onDelete={null}
                acceptLabel=".vrm"
              />
            )}

            {environment != "uploads" && (
              <OfficialCard
                type="vrm-anims"
                objectFit="cover"
                className="official-card"
                image="https://cyber.mypinata.cloud/ipfs/QmcF3FeJhEBLUJYbWRYRbCsS9vXWUfMZGaMM8vc6dNBCeP?filename=vrm-animation.png"
              />
            )}

            {data?.map((it) => (
              <Card
                key={it.id}
                avatarItem={{
                  ...it,
                  image: it?.image ?? DEFAULT_AVATAR_IMAGE,
                }}
              />
            ))}
          </AssetCardsGrid>
        )}
      </ScrollableSection>
    </React.Fragment>
  );
}
