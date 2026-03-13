import React from "react";
import { AssetCard } from "../../../../asset-card";
import { useComponentCard } from "../../../../../hooks/use-world-setting-card";

export function Card({
  type,
  disabled = false,
  image = null,
  className = "",
  objectFit = null,
}) {
  //
  const cardData = useComponentCard(type);

  return (
    <AssetCard
      display="square"
      title={cardData.title}
      image={image || cardData.image}
      action={cardData.action}
      disabled={cardData.disabled || disabled}
      editable={false}
      onRemove={null}
      onEditName={null}
      onClick={cardData.handleClick}
      onDrag={cardData.handleDrag}
      tooltip={cardData.tooltip}
      className={className}
      objectFit={objectFit}
      tip={cardData.tipNeeded && cardData.description}
    />
  );
}
