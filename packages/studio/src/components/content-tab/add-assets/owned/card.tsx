import { Suspense, use, useMemo } from "react";
import { getAssetData } from "../../../../utils/mime-utils";
import type { Asset } from "../../../../dApp/nfts/types";
import { AssetCard } from "../../../asset-card";
import { categoryMatches, getNftAssetData, searchMatches } from "./utils";
import { useComponentAddHandler } from "../../../../hooks/use-component-add-handler";

const getPreviewUrl = (asset: Asset) => {
  //
  const src = asset?.image_url || asset?.image_original_url;

  return src;
};

type CardProps = {
  data: Asset;
  category?: any;
  searchQuery?: string;
};

function getMedia(data, mediaInfo) {
  try {
    if (mediaInfo?.type === "NotUploable") {
      //
      data = {
        ...data,
        url: mediaInfo.url,
        mime_type: mediaInfo.mime_type,
        [mediaInfo.urlField]: mediaInfo.url,
      };
    }
  } catch (error) {
    console.error(error);
  }

  return data;
}

const CardChild = ({ data, category, searchQuery }: CardProps) => {
  //

  let mediaInfo = null;

  if (data.mediaInfoPromise) {
    mediaInfo = use(data.mediaInfoPromise);
  }

  const result = getMedia(data, mediaInfo);

  const handler = useComponentAddHandler(getAssetData);

  const name = data?.name;

  const preview = getPreviewUrl(data);

  const show = useMemo(() => {
    //
    return (
      searchMatches(result, searchQuery) &&
      categoryMatches(result, result.mime_type, category)
    );
  }, [searchQuery, category, result]);

  const handleClick = async () => {
    //

    const asset = getNftAssetData(result);

    handler.handleAdd(asset);
  };

  const handleDrag = async (e) => {
    //
    const asset = getNftAssetData(result);

    handler.handleDrag(e, asset);
  };

  if (!show) return null;

  return (
    <AssetCard
      display="square"
      title={name}
      image={preview}
      onRemove={null}
      onEditName={null}
      unoptimized={true}
      // onDrag={handleDrag}
      onClick={handleClick}
    />
  );
};

export function Card({ data, searchQuery, category }: CardProps) {
  if (!data.mediaInfoPromise == null) {
    return (
      <CardChild data={data} searchQuery={searchQuery} category={category} />
    );
  }

  return (
    <Suspense fallback={<div style={{ display: "none" }} />}>
      <CardChild data={data} category={category} searchQuery={searchQuery} />
    </Suspense>
  );
}
