import { cn } from "../../utils/cn";

const colorClasses = {
  white: "",
  black:
    "!bg-studio-dark !text-white disabled:!bg-transparent disabled:opacity-50 disabled:pointer-events-none",
  "transparent-white":
    "!bg-white/20 !text-white [text-shadow:0px_2px_4px_#20202033] hover:!bg-white/35",
  "transparent-black": "!text-white !bg-studio-darker/20",
  "bordered-white": "!bg-transparent !border !border-white/60 !text-white",
  "bordered-black": "!text-white !border !border-white/60 !bg-transparent",
};

const shadowClasses = {
  default: "shadow-[0px_2px_4px_0px_#20202033]",
  "transparent-white": "shadow-[0px_2px_4px_0px_rgba(32,32,32,0.2)]",
};

const sizeClasses = {
  s: "!py-2 !px-[15px] !text-[13px] !leading-[15px]",
  m: "!py-[10px] !px-[15px]",
  xl: "!h-[60px] !text-center !justify-center !tracking-[0.3px] !px-6 !text-2xl !font-normal !leading-[22px] !text-left",
};

const iconSizeClasses = {
  xl: "!ml-[30px] !max-w-6 !max-h-6",
};

export default function ButtonPill({
  id = "",
  disabled = false,
  color = "white",
  label,
  size = null,
  shadow = false,
  href = null,
  target = "_blank",
  onClick = null,
  children = null,
  className = "",
}) {
  let TAG = "span";

  if (onClick) {
    TAG = "button";
  }

  if (href) {
    TAG = "a";
  }

  return (
    // @ts-ignore
    <TAG
      type={onClick && !href && "button"}
      href={href}
      target={href ? target : null}
      className={cn(
        "relative text-studio-darker text-[15px] font-normal leading-[17px] py-[11px] px-[15px] inline-flex items-center rounded-studio border border-transparent bg-white transition-[background] duration-300 ease-out-quad [&_svg]:w-full [&_svg]:h-full [&_svg]:block",
        colorClasses[color],
        size && sizeClasses[size],
        shadow && (color === "transparent-white" ? shadowClasses["transparent-white"] : shadowClasses.default),
        "button-pill",
        className
      )}
      onClick={!href ? onClick : null}
      disabled={disabled}
    >
      <span className={cn(`${id}-label`)}>{label}</span>
      {children && (
        <span
          className={cn(
            "ml-5 text-inherit max-w-[14px] max-h-[14px] relative [&_.loading-spinner]:w-[14px] [&_.loading-spinner]:h-[14px] [&_.icon]:text-current",
            size && iconSizeClasses[size],
            "button-pill-icon",
            `${id}-button-pill-icon`
          )}
        >
          {children}
        </span>
      )}
    </TAG>
  );
}
