import React from "react";
import { arePropsEqual, isEqual } from "../common";
import { classes } from "../../../../../utils/classes";


interface TabbedProps {
  nullable: boolean;
  value: any;
  items: any[];
  ui: any;
  onChange: (value: any) => void;
}

function _Tabbed({ nullable, value, items, ui, onChange }: TabbedProps) {
  //
  const handleToggle = (item) => {
    //
    if (value == null || typeof value != "object") {
      item = item?.id ?? item;
    }

    if (item !== value) {
      onChange(item);
    } else {
      //
      if (nullable) {
        onChange(null);
      }
    }
  };

  return (
    <div className={classes("flex items-center justify-between rounded-lg bg-studio-dark")}>
      {items.map((item, index) => {
        //
        const isObject = typeof item === "object";

        const label = isObject ? item?.label || item?.name : item;
        const count = isObject ? item?.count : null;

        const active = isEqual(value, item);

        return (
          <button
            type="button"
            className={classes(
              "w-full border-none outline-none h-[29px] cursor-pointer flex items-center justify-center text-white/40 text-center text-[13px] font-normal leading-[15px] rounded bg-transparent capitalize transition-[background-color,color] duration-200 ease-out-quad hover:text-white",
              active && "opacity-100 text-white bg-studio-gray-dark"
            )}
            key={index}
            onClick={() => {
              handleToggle(item);
            }}
          >
            {label}
            {count != null && <i className="not-italic opacity-40"> ({count})</i>}
          </button>
        );
      })}
    </div>
  );
}

export const Tabbed = React.memo(_Tabbed, arePropsEqual);
