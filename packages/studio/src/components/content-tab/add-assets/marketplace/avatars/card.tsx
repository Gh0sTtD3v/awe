import React from "react";
import type { ComponentData } from "@oncyberio/engine";
import { useEventCallback } from "../../../../../hooks/use-event-callback";
import { VrmInfo } from "../../../../../hooks/use-avatar-list";
import { AssetCard } from "../../../../asset-card";
import { useComponentAddHandler } from "../../../../../hooks/use-component-add-handler";

function avatarFormatter(info: VrmInfo): ComponentData {
  return {
    name: info.name,
    type: "avatar",
    url: info.url || info.glb,
    urlCompressed: info.urlCompressed || info.glbCompressed,
    image: info.image,
  };
}

export function Card({ avatarItem }: { avatarItem: VrmInfo }) {
  //
  const handler = useComponentAddHandler(avatarFormatter);

  const handleClick = useEventCallback(() => {
    console.log("avataritem", avatarItem);
    //
    handler.handleAdd(avatarItem);
  }, []);

  const handleDrag = useEventCallback((e: React.DragEvent) => {
    //
    handler.handleDrag(e, avatarItem);
  }, []);

  return (
    <AssetCard
      key={avatarItem.id}
      display="square"
      title={avatarItem.name}
      image={avatarItem.image}
      onClick={handleClick}
      onDrag={handleDrag}
      editable={false}
      onEditName={null}
    />
  );
}
