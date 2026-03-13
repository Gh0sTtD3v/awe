import { useEffect, useState } from "react";
import { nanoid } from "nanoid";
import { cn } from "../../../utils/cn";
import Tip from "../../tip";
import SpriteIcon from "../../sprite";

export function InputCheckbox({
  label,
  name,
  id = nanoid(),
  disabled = false,
  defaultChecked,
  light = false,
  className = "",
  onChange = (e: any) => {},
  tip = null,
  size = null,
  value = null,
  ...props
}) {
  const [val, setVal] = useState(value);
  const [disable, setDisable] = useState(disabled);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    setVal(value);
  }, [value]);

  useEffect(() => {
    setDisable(disabled);
  }, [disabled]);

  return (
    <label
      htmlFor={id}
      className={cn(
        "input-checkbox",
        "px-4 py-[11px] w-full text-studio-darker",
        "text-[15px] font-normal leading-[17px]",
        "flex justify-between items-center relative cursor-pointer",
        "rounded-xl transition-opacity duration-300 ease-out-quad",
        light && [
          "input-checkbox--light",
          "text-white bg-studio-dark border-0",
        ],
        light && size === "inline" && "input-checkbox--light-inline",
        disable && "opacity-50 pointer-events-none",
        size === "s" && "input-checkbox--size-s !py-[5px] !px-0 !border-l-0 !border-r-0 !rounded-none",
        size === "inline" && "input-checkbox--size-inline !w-auto !flex-row-reverse !justify-end !p-0",
        className
      )}
    >
      <input
        id={id}
        type="checkbox"
        className="absolute top-0 left-0 opacity-0"
        name={name}
        checked={val}
        onChange={onChange}
        disabled={disable}
      />
      <span className={cn("inline-flex items-center")}>
        {label}
        {tip && (
          <span
            className={cn(
              "w-[22px] h-[22px] inline-flex shrink-0 items-center justify-center",
              "bg-studio-gray-dark text-white/40 rounded-[6px] ml-[5px]"
            )}
          >
            <SpriteIcon id="studio/question-mark" width={8} height={12} />

            {hovering && (
              <Tip
                visible={hovering}
                closeState={() => {
                  setHovering(false);
                }}
              >
                {tip}
              </Tip>
            )}
          </span>
        )}
      </span>
      <span
        className={cn(
          "box-ui input-checkbox-box",
          "w-7 h-3.5 text-current flex relative ml-3",
          "items-center justify-center rounded-[6px] bg-studio-light-border",
          size === "s" && "!w-4 !h-4 !rounded-[4px] input-checkbox-box--small",
          size === "inline" && "!w-4 !h-4 !rounded-[4px] !ml-0 !mr-2.5 input-checkbox-box--small",
        )}
      >
        {(size === "s" || size === "inline") && (
          <SpriteIcon id="check" width={9} height={8} />
        )}
      </span>
    </label>
  );
}
