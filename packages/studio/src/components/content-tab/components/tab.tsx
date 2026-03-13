import React, { useState, useRef, useEffect } from "react";
import { gsap } from "gsap";
import { classes } from "../../../utils/classes";
import { Draggable } from "gsap/Draggable";
import SpriteIcon from "../../../ui/sprite";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { NextImage } from "../../../ui/next-image";

if (typeof window !== "undefined") {
  gsap.registerPlugin(Draggable, ScrollTrigger);
}

export function Tab({
  items,
  className = "",
  currentTab = "",
  styles = {},
  itemsGrow = true,
  hideUnselected = false,
  skipClose = false,
  color = null,
  size = null,
  containerWidth = null,
  onClose = null,
  onChange = (value: string) => {},
}) {
  const inner = useRef(null);
  const container = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasScroll, setHasScroll] = useState(null);

  const checkScroll = () => {
    //
    const hasScroll = inner.current.scrollWidth > container.current.offsetWidth;

    if (hasScroll) {
      let sides;

      const canRight =
        inner.current.scrollLeft <
        inner.current.scrollWidth - inner.current.offsetWidth;
      sides = canRight && "right";

      const canLeft = inner.current.scrollLeft > 0;
      if (canLeft) {
        sides = "left";
      }

      if (canLeft && canRight) {
        sides = "both";
      }

      setHasScroll(sides);
    } else {
      setHasScroll(null);
    }
  };

  useEffect(() => {
    const handleDrag = (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const startX = event.clientX;
      const scrollLeftStart = inner.current.scrollLeft;

      const handleDragMove = (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const dx = event.clientX - startX;
        if (Math.abs(dx) > 5) {
          setIsDragging(true);
        }

        inner.current.scrollLeft = scrollLeftStart - dx;
      };

      const handleDragEnd = (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        setTimeout(() => {
          setIsDragging(false);
        }, 10);

        document.removeEventListener("mousemove", handleDragMove);
        document.removeEventListener("mouseup", handleDragEnd);
      };

      document.addEventListener("mousemove", handleDragMove);
      document.addEventListener("mouseup", handleDragEnd);
    };

    const handleWheel = (event) => {
      const delta = Math.sign(event.deltaY);
      container.current.scrollLeft += delta * 15;
    };

    const handleScroll = () => {
      checkScroll();
    };

    inner.current.addEventListener("mousedown", handleDrag);
    inner.current.addEventListener("wheel", handleWheel);
    inner.current.addEventListener("scroll", handleScroll);

    return () => {
      inner.current?.removeEventListener("mousedown", handleDrag);
      inner.current?.removeEventListener("wheel", handleWheel);
      inner.current?.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    checkScroll();
  }, [containerWidth, currentTab]);

  const selectedItem = items.filter((el) => el.value === currentTab)[0];

  return (
    <div
      ref={container}
      className={classes(
        "tab-container w-full h-[42px] relative rounded-[20px] p-1 border border-transparent flex min-w-0",
        "tabs",
        isDragging && "isDragging",
        hasScroll && `scroll-${hasScroll}`,
        !itemsGrow && "justifyStart w-auto max-w-full",
        color,
        size === "s" && "s h-[38px]",
        className
      )}
      style={styles}
    >
      <button
        type="button"
        className={classes("absolute top-[calc(50%-10px)] w-5 h-5 rounded-studio-card flex items-center justify-center bg-studio-gray-dark z-5 invisible opacity-0 transition-[background-color,opacity,visibility] duration-300 ease-out-quad hover:bg-studio-gray-dark [&_.icon]:text-white/40 left-1", hasScroll === "left" || hasScroll === "both" ? "visible! opacity-100!" : "")}
        onClick={() => {
          inner.current.scrollTo({
            left: inner.current.scrollLeft - 100,
            behavior: "smooth",
          });
        }}
      >
        <SpriteIcon id="chevron-left" width={5} height={10} />
      </button>
      {/* Content to be scrolled */}
      <div
        ref={inner}
        className={classes("w-full max-w-full flex items-center justify-between overflow-auto gap-1", !itemsGrow && "justify-start max-w-full", "tab-wrapper", "scrollbar-hidden")}
      >
        {hideUnselected && currentTab !== "" ? (
          <>
            {!skipClose && (
              <button type="button" className="w-[22px] h-[22px] bg-studio-dark rounded-full flex items-center justify-center mr-2 [&_.icon]:text-white/40" onClick={onClose}>
                <SpriteIcon id="close-simple" width={8} height={8} />
              </button>
            )}

            <span className={classes("tab-item", "tab-item-active")}>
              <span className="tab-text">{selectedItem.title}</span>
            </span>
          </>
        ) : (
          <>
            {items.map((item, index) => (
              <button
                key={`TabItem${item.value}-${index}`}
                type="button"
                className={classes(
                  "tab-item flex items-center justify-center gap-2 cursor-pointer text-white/40 text-center font-normal text-[15px] leading-[17px] grow h-8 rounded-xl bg-studio-dark relative border border-studio-dark opacity-40 transition-[color,opacity] duration-[0.15s,0.2s] ease-out-quad shadow-[0px_-4px_12px_0px_rgba(53,53,53,0.4)_inset,0px_4px_12px_0px_rgba(6,6,6,0.3)]",
                  item.value === currentTab ? "tab-item-active text-white opacity-100!" : ""
                )}
                onClick={() => {
                  onChange(item.value);
                }}
                disabled={item.soon || item.disabled ? true : false}
              >
                {item.icon && typeof item.icon === "string" ? (
                  <figure className="flex w-5 h-5 min-w-5 min-h-5 object-cover">
                    <NextImage
                      width={16}
                      height={16}
                      src={item.icon}
                      alt={item.title}
                      style={{ objectFit: "contain" }}
                    />
                  </figure>
                ) : item.icon ? (
                  <>{item.icon}</>
                ) : null}

                <span className="tab-text whitespace-nowrap relative [&_sup]:absolute [&_sup]:bottom-[calc(100%-(-3px))] [&_sup]:left-[calc(100%-20px)] [&_sup]:inline-block [&_sup]:text-white/60 [&_sup]:text-[8px] [&_sup]:font-bold [&_sup]:leading-[9px] [&_sup]:tracking-[0.16px] [&_sup]:py-[2px] [&_sup]:px-[3px_3px_1px_4px] [&_sup]:rounded-studio-round [&_sup]:bg-studio-success [&_sup]:uppercase">
                  {item.title}
                  {item.count !== null && item.count != undefined && (
                    <span className="text-white/20 text-[13px] font-normal leading-[15px]"> ({item.count})</span>
                  )}
                  {item.soon && <sup>Soon</sup>}
                </span>
              </button>
            ))}
          </>
        )}
      </div>

      <button
        type="button"
        className={classes("absolute top-[calc(50%-10px)] w-5 h-5 rounded-studio-card flex items-center justify-center bg-studio-gray-dark z-5 invisible opacity-0 transition-[background-color,opacity,visibility] duration-300 ease-out-quad hover:bg-studio-gray-dark [&_.icon]:text-white/40 right-1", hasScroll === "right" || hasScroll === "both" ? "visible! opacity-100!" : "")}
        onClick={() => {
          inner.current.scrollTo({
            left: inner.current.scrollLeft + 100,
            behavior: "smooth",
          });
        }}
      >
        <SpriteIcon id="chevron-right" width={5} height={10} />
      </button>
    </div>
  );
}
