import React from "react";
import { classes } from "../../../../utils/classes";

interface IconGroupProps {
  value: string;
  items: { id: string; image: string }[];
  onChange: (value: string) => void;
}

export function IconGroup({ value, items, onChange }: IconGroupProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={classes(
            "flex items-center justify-center w-8 h-8 rounded opacity-40 cursor-pointer",
            item.id === value && "opacity-100 bg-white/[0.04]"
          )}
          onClick={() => onChange(item.id)}
        >
          <img src={item.image} width={16} height={14} />
        </div>
      ))}
    </div>
  );
}
