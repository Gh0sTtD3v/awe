import React, { useEffect, useState, useRef } from "react";
import { cn } from "../../utils/cn";
import { useContextualTip } from "../../hooks/use-contextual-tip";

export function ContextualTip() {
  const container = useRef(null);
  const [caretDiff, setCaretDiff] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);

  const ySpace = 6;
  const xSpace = 15;

  const {
    // Core
    contextualTipContent,
    contextualTipParent,
    contextualTipBoundElement,
    contextualTipPos,

    // Preferences
    contextualTipMaxWidth,
    contextualTipNoWrap,
    contextualTipHasRepositioned,
    contextualTipInteractive,
    contextualTipDefaultPos,

    // Callbacks
    contextualTipCloseCallback,

    setContextualTipPos,
    setContextualTipContent,
    setContextualTipHasRepositioned,
  } = useContextualTip();

  const calculatePosition = () => {
    if (!container.current) return;

    const rect = contextualTipParent.getBoundingClientRect();
    let top = rect.top;
    let left = rect.left;

    switch (contextualTipPos) {
      case "top":
        top = rect.top - container.current.offsetHeight - ySpace;
        break;
      case "bottom":
        top = rect.top + rect.height + ySpace;
        break;
      case "left":
        left = rect.left - container.current.offsetWidth - xSpace;
        break;
      case "right":
        left = rect.left + rect.width + xSpace;
        break;
      default:
        break;
    }

    // Adjust positioning to prevent overflow
    adjustForOverflow(rect, top, left);
  };

  const adjustForOverflow = (rect, top, left) => {
    const { offsetWidth, offsetHeight } = container.current;
    const isVertical =
      contextualTipPos === "top" || contextualTipPos === "bottom";
    const isHorizontal =
      contextualTipPos === "left" || contextualTipPos === "right";

    const boundRect = contextualTipBoundElement
      ? contextualTipBoundElement?.getBoundingClientRect()
      : {};

    const limitTop = boundRect?.top ? boundRect.top || 0 : 0;
    const limitBottom = boundRect?.top
      ? boundRect.bottom || window.innerHeight
      : window.innerHeight;

    if (isVertical) {
      left = rect.left + rect.width / 2 - offsetWidth / 2;

      if (left + offsetWidth > window.innerWidth) {
        const prevLeft = left;
        left = window.innerWidth - offsetWidth;
        const diff = prevLeft - left;
        setCaretDiff(diff);
      }

      if (left < 0) {
        const prevLeft = left;
        left = 0;
        const diff = prevLeft - left;
        setCaretDiff(diff);
      }
    }

    if (isHorizontal) {
      top = rect.top + rect.height / 2 - offsetHeight / 2;

      if (top + offsetHeight > window.innerHeight) {
        const prevTop = top;
        top = window.innerHeight - offsetHeight;
        const diff = prevTop - top;
        setCaretDiff(diff);
      }
    }

    if (
      contextualTipPos === "bottom" &&
      top + offsetHeight > limitBottom &&
      contextualTipHasRepositioned === false
    ) {
      if (top < limitTop && contextualTipDefaultPos) {
        setContextualTipPos(contextualTipDefaultPos);
      } else {
        setContextualTipPos("top");
      }

      setContextualTipHasRepositioned(true);
      return;
    } else if (
      contextualTipPos === "top" &&
      top < limitTop &&
      contextualTipHasRepositioned === false
    ) {
      if (top + offsetHeight > limitBottom && contextualTipDefaultPos) {
        setContextualTipPos(contextualTipDefaultPos);
      } else {
        setContextualTipPos("bottom");
      }

      setContextualTipHasRepositioned(true);
      return;
    }

    if (
      contextualTipDefaultPos &&
      ((contextualTipPos === "bottom" &&
        top + offsetHeight > limitBottom &&
        contextualTipHasRepositioned) ||
        (contextualTipPos === "top" &&
          top < limitTop &&
          contextualTipHasRepositioned))
    ) {
      setContextualTipPos(contextualTipDefaultPos);
    }

    container.current.style.top = `${top}px`;
    container.current.style.left = `${left}px`;
  };

  useEffect(() => {
    if (contextualTipContent && contextualTipParent) {
      setCaretDiff(0);
      calculatePosition();
    }
  }, [
    contextualTipContent,
    contextualTipParent,
    contextualTipPos,
    contextualTipBoundElement,
    contextualTipHasRepositioned,
  ]);

  const handleMouseLeave = (e) => {
    if (!isInteracting) {
      if (contextualTipCloseCallback) contextualTipCloseCallback();
      setContextualTipContent(null);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only process if both container and content exist
      if (!container.current || !contextualTipContent) return;

      // Check if click is outside the tooltip container
      const isOutsideContainer = !container.current.contains(event.target);
      // Check if click is outside the parent (if parent exists)
      const isOutsideParent = !contextualTipParent?.contains(event.target);

      if (isOutsideContainer && isOutsideParent) {
        setIsInteracting(false);
        if (contextualTipCloseCallback) contextualTipCloseCallback();
        setContextualTipContent(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [contextualTipContent, contextualTipParent]);

  if (!contextualTipContent) return;

  return (
    <div
      ref={container}
      className={cn(
        "contextual-tip",
        "fixed top-0 left-0 z-50 flex items-center rounded-[6px] border border-studio-gray-dark bg-studio-darker px-[6px] py-[7px] text-[13px] font-normal leading-[15px] text-white text-center pointer-events-none",
        "transition-[opacity,visibility] duration-200 ease-out-quad",
        "[&_dl]:text-left",
        "[&_dt]:text-white [&_dt]:text-[15px] [&_dt]:font-medium [&_dt]:leading-[17px] [&_dt]:mb-[10px] [&_dt]:first-letter:uppercase",
        "[&_dd]:text-white/60 [&_dd]:text-[11px] [&_dd]:font-normal [&_dd]:leading-[13px]",
        "[&_.tip-default-btn-wrapper]:flex [&_.tip-default-btn-wrapper]:flex-col",
        "[&_.tip-default-btn]:rounded-lg [&_.tip-default-btn]:w-full [&_.tip-default-btn]:h-7 [&_.tip-default-btn]:inline-flex [&_.tip-default-btn]:items-center [&_.tip-default-btn]:px-[27px] [&_.tip-default-btn]:text-white/60 [&_.tip-default-btn]:text-[13px] [&_.tip-default-btn]:font-normal [&_.tip-default-btn]:leading-[15px] [&_.tip-default-btn]:transition-[color,background] [&_.tip-default-btn]:duration-100 [&_.tip-default-btn]:ease-out-quad",
        "[&_.tip-default-btn:hover]:bg-white [&_.tip-default-btn:hover]:text-studio-darker",
        contextualTipPos,
        contextualTipInteractive && "contextual-tip-interactive pointer-events-auto"
      )}
      style={{
        maxWidth: `${contextualTipMaxWidth || 300}px`,
        // @ts-ignore
        "--caret-diff": `${caretDiff}px`,
        whiteSpace: `${contextualTipNoWrap ? "nowrap" : "normal"}`,
      }}
      onMouseLeave={handleMouseLeave}
      onMouseDown={(e) => {
        if (container.current?.contains(e.target)) {
          setIsInteracting(true);
        }
      }}
      onBlur={() => {
        setIsInteracting(false);
      }}
    >
      {contextualTipContent}
    </div>
  );
}
