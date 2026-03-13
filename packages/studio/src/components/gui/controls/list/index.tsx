import React from "react";

import { Checkbox } from "../checkbox";

interface ListProps {
  value: string[];
  items: string[];
  emptyLabel?: string;
  onChange: (value: string[]) => void;
}

function _List({ value, items, emptyLabel = "Clear", onChange }: ListProps) {
  const handleToggle = (item) => {
    if (!value.includes(item)) {
      onChange([...value, item]);
    } else {
      onChange(value.filter((i) => i !== item));
    }
  };

  return (
    <div className="flex flex-row items-start justify-start flex-wrap gap-4">
      <Checkbox
        label={emptyLabel}
        value={!value.length}
        onChange={() => onChange([])}
      />

      {items.map((item) => {
        const active = value.includes(item);

        return (
          <Checkbox
            key={item}
            label={item}
            value={active}
            onChange={() => handleToggle(item)}
          />
        );
      })}
    </div>
  );
}

export const List = React.memo(_List);
