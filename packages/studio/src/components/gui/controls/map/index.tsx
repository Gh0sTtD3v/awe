import React from "react";
import { Button } from "../button";
import Sprite from "../../../../ui/sprite";
import { Folder } from "../folder";
import { TextInput } from "../text-input";

export interface MapProps {
  items: any[];
  itemType: string;
  renderItem: (key: string, i: number) => React.ReactNode;
  onAdd: () => void;
  onRemove: (key: string) => void;
  onReset: () => void;
}

function _MapUI({
  itemType,
  items,
  renderItem,
  onAdd,
  onRemove,
  onReset,
}: MapProps) {
  // a list of deletable items + add button
  // the add button should show a dropdown of available items

  return (
    <div className="w-full flex flex-col gap-3 select-none">
      <div className="w-full flex flex-col gap-6">
        {renderBlockChildren(items, renderItem, onRemove)}
      </div>
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

export function MapKey({ value, onChange }) {
  //
  return <TextInput value={value} onChange={onChange} />;
}

function renderInlineChildren(items, renderItem, onRemove) {
  //
  return items.map(({ key, value }, i) => {
    return (
      <div key={i} className="w-full flex flex-col items-center gap-3">
        <div className="w-full flex flex-row gap-1.5 items-center">
          <div>{key}</div>
          {onRemove && <RemoveItem onRemove={() => onRemove(key)} />}
        </div>
        {renderItem(key, i)}
      </div>
    );
  });
}

function renderBlockChildren(items, renderItem, onRemove) {
  //
  return items.map(({ key }, idx) => {
    //
    const el = renderItem(key, idx);

    return (
      <RenderBlockItem
        key={idx}
        idx={idx}
        label={key}
        item={el}
        onRemove={onRemove ? () => onRemove(key) : null}
      />
    );
  });
}

function RenderBlockItem({ idx, label, item, onRemove }) {
  //
  const [collapsed, setCollapsed] = React.useState(false);

  const handleToggle = () => {
    //
    setCollapsed(!collapsed);
  };

  return (
    <Folder
      key={idx}
      title={label}
      collapsed={collapsed}
      onToggle={handleToggle}
      headerStyle={{ height: 28 }}
      headerActions={onRemove && <RemoveItem onRemove={onRemove} />}
    >
      {item}
    </Folder>
  );
}

export const MapUI = React.memo(_MapUI);
