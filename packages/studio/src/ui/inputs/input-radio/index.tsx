import { nanoid } from "nanoid";
import { cn } from "../../../utils/cn";

export function InputRadio({
  label,
  name,
  id = nanoid(),
  disabled = false,
  defaultChecked,
  light = false,
  className,
  onChange,
  size = null,
  value,
}) {
  const isSmall = size === "s";

  return (
    <label
      htmlFor={id}
      className={cn(
        "group/radio flex w-full cursor-pointer items-center justify-between relative",
        "py-[15px] text-[15px] font-normal leading-[17px] text-studio-darker",
        light && "text-white",
        isSmall && "py-2 text-[11px] leading-[13px]",
        className
      )}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        onChange={onChange}
        defaultChecked={defaultChecked}
        className="peer absolute top-0 left-0 opacity-0"
      />
      <span
        className={cn(
          "opacity-40 transition-opacity duration-300 [transition-timing-function:var(--ease-out-quad)]",
          "group-hover/radio:opacity-100 peer-checked:opacity-100"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "relative ml-3 flex",
          isSmall ? "h-4 w-4" : "h-6 w-6",
          // ::after - outer ring
          "after:absolute after:top-0 after:left-0 after:h-full after:w-full after:content-['']",
          "after:rounded-full after:border after:border-current after:opacity-20",
          "after:transition-opacity after:duration-300 after:[transition-timing-function:var(--ease-out-quad)]",
          "group-hover/radio:after:opacity-100",
          // ::before - inner dot
          "before:absolute before:content-[''] before:rounded-full before:bg-studio-darker",
          "before:opacity-0 before:scale-[0.3]",
          "before:transition-[opacity,transform] before:duration-300 before:[transition-timing-function:var(--ease-out-quad)]",
          "peer-checked:before:scale-100 peer-checked:before:opacity-100",
          isSmall
            ? "before:top-[calc(50%-3px)] before:left-[calc(50%-3px)] before:h-1.5 before:w-1.5"
            : "before:top-[calc(50%-5px)] before:left-[calc(50%-5px)] before:h-2.5 before:w-2.5"
        )}
      ></span>
    </label>
  );
}
