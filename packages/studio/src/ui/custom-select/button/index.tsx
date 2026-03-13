import { cn } from "../../../utils/cn";
import Icon from "../../icon";

export function Button({ close, data }) {
  return (
    <button
      type="button"
      className={cn(
        "h-[28px] flex items-center justify-center",
        "relative",
        "transition-[color,background-color,border-color] duration-200 ease-out-quad",
        "rounded-studio bg-studio-dark",
        "shadow-[inset_0px_-4px_12px_0px_rgba(53,53,53,0.4)]",
        "text-white text-center text-[15px] font-medium leading-[17px]",
        "min-h-[34px] shrink-0",
        "[&:not(:first-child)]:mt-[7px]",
        // border-gradient via before pseudo-element
        "before:content-[''] before:absolute before:inset-0 before:pointer-events-none before:p-px before:rounded-studio",
        "before:bg-[linear-gradient(180deg,rgba(255,255,255,0)_10.23%,rgba(255,255,255,0.3)_87.5%)]",
        "before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)]",
        "before:[mask-composite:exclude]",
        "before:opacity-75 before:transition-opacity before:duration-200 before:ease-out-quad",
        "hover:bg-studio-gray-dark hover:before:opacity-100",
        "[&_.icon]:fill-current [&_.icon]:pointer-events-none",
        "[&_.icon:first-child]:mr-2 [&_.icon:last-child]:ml-2",
        "js-prevent-custom-select-close"
      )}
      onClick={() => {
        data.onClick();
        close();
      }}
    >
      {data.icon && data.icon.pos === "left" && (
        <Icon
          name={data.icon.name}
          width={data.icon.width}
          height={data.icon.height}
          folder={data.icon.folder}
        />
      )}
      <span
        className={cn(
          "px-[5px] whitespace-nowrap overflow-hidden text-ellipsis pointer-events-none"
        )}
      >
        {data.label}
      </span>
      {data.icon && data.icon.pos === "right" && (
        <Icon
          name={data.icon.name}
          width={data.icon.width}
          height={data.icon.height}
          folder={data.icon.folder}
        />
      )}
    </button>
  );
}
