import React, { useEffect, useState } from "react";
import { arePropsEqual } from "../common";
import { isObject } from "../../../../../utils/js";
import SpriteIcon from "../../../../../ui/sprite";
import { CustomSelect } from "../../../../../ui/custom-select";

interface ComboProps {
  nullable: boolean;
  value: any;
  items: any[];
  onChange: (value: any) => void;
}

function _Combo({ nullable, value, items, onChange }: ComboProps) {
  const selectValue = isObject(value)
    ? value.id != null
      ? value.id
      : value.value
    : value;

  const currentItem = items.filter((el) => (el?.id ?? el) === selectValue);

  const [val, setVal] = useState({
    value: selectValue ?? null,
    label:
      currentItem?.[0]?.label ??
      currentItem?.[0]?.name ??
      currentItem?.[0] ??
      "Choose an option",
  });

  const options = {};

  let opts = nullable ? [{ label: "None", id: "null" }] : [];

  opts = opts.concat(
    items.map((item) => {
      const isObject = typeof item === "object";
      const id = isObject ? item?.id : item;
      const label = isObject ? item?.label || item?.name : item;

      return { label: label, value: id, id };
    })
  );

  useEffect(() => {
    const labl =
      currentItem?.[0]?.label ||
      currentItem?.[0]?.name ||
      currentItem?.[0] ||
      "Choose an option";

    setVal({
      value: selectValue ?? null,
      label:
        currentItem?.[0]?.label ??
        currentItem?.[0]?.name ??
        currentItem?.[0] ??
        "Choose an option",
    });
  }, [value]);

  return (
    <div className="w-full h-[30px] flex items-center justify-center relative">
      <CustomSelect
        options={opts}
        optionsWidth={219}
        defaultLabel={"Choose an option"}
        selectedOption={val}
        setSelectedOption={(val) => {
          //
          let newValue = val.value;

          if (newValue === "null") {
            newValue = null;
          } else if (isObject(value)) {
            newValue = items.find((item) => item.id === newValue);
          }

          onChange(newValue ?? null);
        }}
      />

      <SpriteIcon id="chevron-bottom" width={9} height={6} />
    </div>
  );
}

export const Combo = React.memo(_Combo, arePropsEqual);
