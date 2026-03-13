import { cn } from "../../../utils/cn";
import SpriteIcon from "../../sprite";

export function DefaultOption({ data, close, selected, setSelectedOption }) {
  return (
    <div
      className={cn(
        "h-[28px] flex items-center relative",
        "pl-[24px] pr-[5px] min-w-0 w-full shrink-0",
        "[&:not(:last-child)]:mb-[2px]",
        // before pseudo-element for hover background
        "before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-full",
        "before:pointer-events-none before:rounded-[8px] before:opacity-0",
        "before:bg-studio-darker before:transition-opacity before:duration-200 before:ease-out-quad",
        "before:-z-[1]",
        "hover:before:opacity-[0.1]",
        // icon--check positioning (hidden by default, shown when selected)
        "[&_.icon--check]:absolute [&_.icon--check]:top-[11px] [&_.icon--check]:left-[9px]",
        "[&_.icon--check]:hidden [&_.icon--check]:pointer-events-none",
        selected && "[&_.icon--check]:block",
        "js-prevent-custom-select-close"
      )}
      onClick={() => {
        setSelectedOption(data);
        close();
      }}
    >
      <SpriteIcon id="check" width={8} height={7} />
      <span
        className={cn(
          "whitespace-nowrap overflow-hidden text-ellipsis pointer-events-none"
        )}
      >
        {typeof data.label === "function" ? data.label?.() : data.label}
      </span>
    </div>
  );
}
