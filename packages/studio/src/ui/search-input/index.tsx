import { useRef, useId } from "react";
import { cn } from "../../utils/cn";
import SpriteIcon from "../sprite";

export interface SearchInputProps {
  appearance?: string;
  value?: string;
  className?: string;
  placeholder?: string;
  type?: "primary" | "secondary";
  onChange?: (value: string) => void;
}

const typeStyles = {
  primary: cn(
    "bg-studio-dark",
    "transition-[border-color] duration-200 ease-out-quad",
    "hover:border-[rgba(167,167,167,0.5)]",
    "focus-within:border-studio-border-focus"
  ),
  secondary: cn("bg-transparent", "border border-white/[0.12]"),
};

export function SearchInput({
  value = "",
  onChange,
  className = "",
  type = "primary",
  placeholder = "Search",
  ...rest
}: SearchInputProps) {
  const input = useRef(null);

  const id = useId();

  return (
    <label
      htmlFor={`searchInput${id}`}
      className={cn(
        "relative w-full h-[28px] rounded-[10px]",
        "px-[10px] pl-[13px] py-[10px]",
        "bg-transparent text-white",
        "text-[13px] font-normal leading-[15px]",
        "flex items-center justify-start gap-2",
        "border border-transparent",
        "[&_.icon]:shrink-0 [&_.icon]:text-white/60 [&_.icon]:transition-colors [&_.icon]:duration-300 [&_.icon]:ease-out-quad",
        typeStyles[type],
        className
      )}
    >
      <SpriteIcon id="studio/search" className="icon" width={14} height={14} />

      <input
        ref={input}
        name="searchInput"
        autoComplete="off"
        defaultValue={value}
        id={`searchInput${id}`}
        className={cn(
          "outline-none w-full bg-transparent text-white",
          "text-[13px] font-normal not-italic leading-[15px]",
          "border-none",
          "placeholder:text-white/60"
        )}
        placeholder={placeholder}
        onChange={(e) => {
          onChange?.(e.target.value);
        }}
        {...rest}
      />

      {value && (
        <button
          type="button"
          className={cn(
            "absolute top-0 right-0",
            "flex items-center justify-center",
            "h-full px-4",
            "[&_.icon]:text-white/60 [&_.icon]:transition-colors [&_.icon]:duration-200 [&_.icon]:ease-out-quad",
            "hover:[&_.icon]:text-white"
          )}
          onClick={() => {
            input.current.value = "";
            onChange("");
          }}
        >
          <SpriteIcon
            id="studio/close-simple"
            className="icon"
            width={10}
            height={10}
          />

          <span className="u-visually-hidden">Reset search input</span>
        </button>
      )}
    </label>
  );
}
