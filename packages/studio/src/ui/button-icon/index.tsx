import React, { useEffect, useState, useRef } from "react";
import { cn } from "../../utils/cn";
import { gsap } from "gsap";

type Props = {
  className?: string;
  intent?: "primary" | "secondary";
  children?: React.ReactElement;
  reversed?: boolean;
  shadow?: boolean;
  onClick?: () => void;
  color?: string;
  count?: number;
  animated?: boolean;
  label?: string;
  style?: React.CSSProperties;
};

export default function ButtonIcon({
  intent = "primary",
  count,
  label = "",
  children,
  color = "default",
  shadow = false,
  reversed = true,
  className = "",
  animated = true,
  onClick = null,
  style = {},
}: Props) {
  const container = useRef(null);
  const labelRef = useRef(null);

  const [baseWidth, setBaseWidth] = useState(32);
  const [isHover, setIsHover] = useState(!animated ? true : false);

  const onMouseEnter = () => {
    if (!animated) return;
    setIsHover(true);
  };

  const onMouseLeave = () => {
    if (!animated) return;
    setIsHover(false);
  };

  const onResize = () => {
    setBaseWidth(container.current.offsetWidth);

    if (!animated) return;
    setIsHover(false);
  };

  useEffect(() => {
    if (!baseWidth || !labelRef?.current || intent != "primary") return;

    if (isHover) {
      gsap.to(container.current, {
        width: baseWidth + labelRef.current.offsetWidth,
        paddingRight: !reversed && labelRef.current.offsetWidth,
        paddingLeft: reversed && labelRef.current.offsetWidth,
        duration: 1,
        ease: "expo.out",
      });
    } else {
      gsap.to(container.current, {
        width: baseWidth,
        paddingRight: 0,
        paddingLeft: 0,
        duration: 1,
        ease: "expo.out",
      });
    }
  }, [baseWidth, isHover]);

  useEffect(() => {
    if (intent != "primary" || !animated) return;

    onResize();

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <button
      style={style}
      ref={container}
      type="button"
      onClick={onClick}
      className={cn(
        // .container base
        "w-8 h-8 shrink-0 cursor-pointer flex items-center justify-center relative text-white [&_.icon]:fill-current [&_.icon]:text-current",
        "button-icon",
        // .hasLabelHover
        label &&
          isHover &&
          "[&_.label]:translate-y-[-50%] [&_.label]:translate-x-0 [&_.label]:opacity-100",
        !animated &&
          "[&_.label]:translate-y-[-50%] [&_.label]:translate-x-0 [&_.label]:opacity-100",
        // .primary
        intent === "primary" &&
          "w-[42px] h-[42px] bg-white/20 rounded-xl border border-transparent transition-[background-color,color] duration-300 ease-out-quad [&_.icon]:fill-current [&_.icon]:text-current hover:bg-white hover:text-studio-darker",
        // .primary hover: label transform
        intent === "primary" &&
          "hover:[&_.label]:translate-y-[-50%] hover:[&_.label]:translate-x-0",
        // .primary:not(.animated) label
        intent === "primary" &&
          !animated &&
          "[&_.label]:translate-y-[-50%] [&_.label]:translate-x-0",
        // .primary.withShadow
        intent === "primary" &&
          shadow &&
          "[&_.icon]:relative [&_.icon]:before:content-[''] [&_.icon]:before:absolute [&_.icon]:before:w-0 [&_.icon]:before:h-0 [&_.icon]:before:top-1/2 [&_.icon]:before:left-1/2 [&_.icon]:before:shadow-[0px_0px_10px_6px_#20202033] [&_.icon]:before:rounded-full [&_.icon]:before:z-[-1]",
        // .primary.reversed
        intent === "primary" &&
          reversed &&
          "[&_.label]:left-auto [&_.label]:right-full [&_.label]:pl-0.5 [&_.label]:pr-2 [&_.label]:translate-y-[-50%] [&_.label]:translate-x-[-8px]",
        // .primary.white
        intent === "primary" &&
          color === "white" &&
          "backdrop-filter-none bg-white text-studio-darker",
        intent === "primary" &&
          color === "white" &&
          shadow &&
          "shadow-[0px_2px_4px_0px_#20202033]",
        intent === "primary" &&
          color === "white" &&
          "[&_.count]:bg-[#d8d8d8] [&_.count]:text-studio-darker",
        // .primary.black
        intent === "primary" &&
          color === "black" &&
          "bg-studio-dark text-white border-studio-gray-dark [&_.count]:bg-studio-gray-medium-alt hover:bg-studio-darker",
        // .secondary
        intent === "secondary" && "w-8 h-8",
        className,
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onFocus={onMouseEnter}
    >
      {intent === "secondary" && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 42.74 9.5"
          className={cn(
            "absolute top-0 left-1/2 -translate-x-1/2 w-[42px] block fill-white opacity-20",
          )}
        >
          <path d="M10.19,4.74l-3.09,3A6.47,6.47,0,0,1,2.64,9.49H0v-1H2.64A5.49,5.49,0,0,0,6.42,7L9.5,4,11.6,1.9A6.49,6.49,0,0,1,16.2,0H26.33a6.47,6.47,0,0,1,4.46,1.77L36.32,7A5.49,5.49,0,0,0,40.1,8.5h2.64v1H40.1a6.47,6.47,0,0,1-4.46-1.77L30.11,2.5A5.49,5.49,0,0,0,26.33,1H16.2a5.46,5.46,0,0,0-3.89,1.61Z" />
        </svg>
      )}

      <span className={cn("relative flex items-center justify-center")}>
        {children}

        {label && (
          <span
            ref={labelRef}
            className={cn(
              "label",
              "absolute top-1/2 left-full pl-2 pr-0.5 -translate-y-1/2 translate-x-2 whitespace-nowrap text-inherit text-[15px] font-normal leading-[17px] pointer-events-none opacity-0 transition-[transform,opacity] duration-1000 ease-[var(--ease-out-expo)]",
            )}
          >
            {label}
          </span>
        )}
      </span>

      {count && (
        <span
          className={cn(
            "count",
            "absolute -bottom-[5px] -right-[3px] rounded-[6px] min-w-[19px] px-1 pt-px pb-0 pl-[5px] min-h-[19px] bg-studio-gray-medium-alt text-white text-center text-[11px] font-medium leading-[13px] tracking-[0.22px] flex items-center justify-center",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
