import { useState, useRef, useEffect } from "react";
import { nanoid } from "nanoid";
import { cn } from "../../../utils/cn";

export function InputRange({
  label,
  name = "",
  id = nanoid(),
  disabled = false,
  defaultValue = 1,
  light = false,
  className,
  onChange,
}) {
  const rangeInput = useRef(null);

  const [range, setRange] = useState(defaultValue);

  const onRangeChange = () => {
    setRange(rangeInput.current?.value);
  };

  useEffect(() => {
    setRange(rangeInput.current?.value);
  }, []);

  return (
    <label
      htmlFor={id}
      className={cn(
        "p-[15px_16px] w-full text-studio-dark-alt-2 text-xs font-bold leading-[11px] tracking-[0.26px] uppercase flex justify-between items-center relative cursor-pointer rounded-lg border border-studio-light-border-alt",
        light && "text-white",
        className
      )}
    >
      <span className={cn("w-[calc(50%-5px)]")}>{label}</span>

      <span
        className={cn(
          "relative w-[calc(50%-5px)] h-7 overflow-hidden pl-[13px]",
          "[&_input]:w-full [&_input]:absolute [&_input]:top-1/2 [&_input]:left-0 [&_input]:z-[2] [&_input]:-translate-y-1/2 [&_input]:opacity-0"
        )}
      >
        <input
          ref={rangeInput}
          id={id}
          type="range"
          name={name}
          defaultValue={defaultValue * 100}
          onChange={onRangeChange}
          onMouseUp={onChange}
          onPointerUp={onChange}
        />
        <span
          className={cn(
            "absolute top-3 left-0 w-full h-[3px] overflow-hidden rounded-sm flex bg-[#16161614]"
          )}
        >
          <span
            className={cn(
              "absolute top-0 right-full w-full h-[3px] bg-[#12121233] rounded-sm"
            )}
            style={{ transform: `translateX(${range}%)` }}
          />
        </span>
        <span
          className={cn(
            "absolute top-3 right-[calc(100%-25px)] w-[calc(100%-25px)] h-[3px]",
            "after:absolute after:top-[calc(50%-9px)] after:right-0 after:h-[19px] after:w-[19px] after:bg-white after:border-2 after:border-studio-dark-alt-2 after:rounded-full after:content-['']"
          )}
          style={{ transform: `translateX(${range}%)` }}
        ></span>
      </span>
    </label>
  );
}
