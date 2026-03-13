import React from "react";
import { nanoid } from "nanoid";
import type { ComponentData } from "@oncyberio/engine";
import { LibraryItem } from "../../../../../hooks/use-3d-library";
import { AssetCard } from "../../../../asset-card";
import { useComponentAddHandler } from "../../../../../hooks/use-component-add-handler";

function kitAssetFormatter(info: LibraryItem): ComponentData {
  return {
    id: `model-${nanoid()}`,
    name: info.source.nodeName,
    image: info.image.pinata,
    mime_type: "model/gltf-binary",
    type: "model",
    url: info.url.pinata,
    optimized: {
      high: info.d_optimized_files.high.pinata,
      low: info.d_optimized_files.low.pinata,
      low_compressed: info.d_optimized_files.low_compressed.pinata,
    },
    collider: {
      enabled: true,
      colliderType: "MESH",
      rigidbodyType: "FIXED",
    },
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  };
}

export function Card({ libraryItem }: { libraryItem: LibraryItem }) {
  //
  const handler = useComponentAddHandler(kitAssetFormatter);

  const handleClick = () => {
    handler.handleAdd(libraryItem);
  };

  const handleDrag = (e) => {
    handler.handleDrag(e, libraryItem);
  };

  return (
    <AssetCard
      key={libraryItem.id}
      display="square"
      title={libraryItem.name}
      image={libraryItem.image.pinata}
      onClick={handleClick}
      onDrag={handleDrag}
      editable={false}
      onEditName={null}
    />
  );
}
