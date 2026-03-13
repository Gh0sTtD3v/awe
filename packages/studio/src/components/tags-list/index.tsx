import { classes } from "../../utils/classes";

import { Tag } from "./tag";

export interface TagsListProps {
  onChange: (value: string) => void;
  label?: string;
  items: Array<{
    label: string;
    isActive: boolean;
    value: string;
    title?: string;
  }>;
}

export function TagsList({ label = null, items, onChange }: TagsListProps) {
  return (
    <div className={classes("flex flex-col w-full", "tags")}>
      {label && (
        <p className="text-white/60 text-[13px] font-normal leading-[15px] mb-[11px]">
          {label}
        </p>
      )}
      <div className="tags-list flex flex-wrap gap-[3px] w-full">
        {items.map((item, i) => {
          return (
            <Tag
              key={`TagsList-tag-${i}-${item.label}`}
              label={item.label || item.title}
              active={item.isActive}
              onClick={() => onChange(item.value)}
            />
          );
        })}
      </div>
    </div>
  );
}
