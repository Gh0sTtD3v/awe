import { classes } from "../../../../utils/classes";
import React from "react";
import { Button } from "../button";
import Sprite from "../../../../ui/sprite";
import { Folder } from "../folder";

export interface ArrayProps {
  items: any[];
  itemType: string;
  renderItem: (idx: number) => React.ReactNode;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onReset: () => void;
}

function _ArrayUI({
  itemType,
  items,
  renderItem,
  onAdd,
  onRemove,
  onReset,
}: ArrayProps) {
  // a list of deletable items + add button
  // the add button should show a dropdown of available items

  const useFolder = itemType === "group" || itemType === "array";

  return (
    <div className="w-full flex flex-col gap-3 select-none">
      {useFolder
        ? renderBlockChildren(items, renderItem, onRemove)
        : renderInlineChildren(items, renderItem, onRemove)}
      <div className="flex flex-row gap-1.5">
        {onAdd && <Button label="Add New" onAction={() => onAdd()} />}
        {onReset && <Button label="Reset" onAction={() => onReset()} />}
      </div>
    </div>
  );
}

function RemoveItem({ onRemove, width = 16, height = 16 }) {
  return (
    <Sprite
      id="studio/trash"
      width={width}
      height={height}
      className="cursor-pointer"
      onClick={onRemove}
    />
  );
}

function renderInlineChildren(items, renderItem, onRemove) {
  //
  return items.map((item, idx) => {
    return (
      <div key={idx} className="w-full flex flex-row items-center gap-1.5">
        <div className="flex-1">{renderItem(idx)}</div>
        {onRemove && <RemoveItem onRemove={() => onRemove(idx)} />}
      </div>
    );
  });
}

function renderBlockChildren(items, renderItem, onRemove) {
  //
  return items.map((item, idx) => {
    //
    const el = renderItem(idx);

    return (
      <RenderBlockItem
        key={idx}
        idx={idx}
        item={el}
        onRemove={() => onRemove(idx)}
      />
    );
  });
}

function RenderBlockItem({ idx, item, onRemove }) {
  //
  const [collapsed, setCollapsed] = React.useState(true);

  const handleToggle = () => {
    //
    setCollapsed(!collapsed);
  };

  return (
    <Folder
      key={idx}
      title={`Item ${idx + 1}`}
      collapsed={collapsed}
      onToggle={handleToggle}
      headerStyle={{ height: 32 }}
      headerActions={onRemove && <RemoveItem onRemove={onRemove} />}
    >
      {item}
    </Folder>
  );
}

export const ArrayUI = React.memo(_ArrayUI);
