import React from "react";
import { classes } from "../../../../utils/classes";

export function EnvironmentFilters({ items, activeValue, onChange }) {
  return (
    <div className="flex justify-center items-center w-full gap-2 mb-[18px]">
      {items.map((item, index) => (
        <button
          key={`EnvFilters${item.value}-${index}`}
          type="button"
          className={classes(
            "px-1 pb-[5px] border-b border-transparent text-white/40 text-[15px] font-normal leading-[17px] transition-[border-color,color] duration-200 ease-out-quad",
            activeValue === item.value && "text-white border-white"
          )}
          onClick={() => {
            onChange(item.value);
          }}
          disabled={item.disabled || false}
        >
          {item.title}
        </button>
      ))}
    </div>
  );
}
