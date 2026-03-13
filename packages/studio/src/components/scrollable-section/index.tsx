import { forwardRef, useEffect, useState, useRef } from "react";

import { classes } from "../../utils/classes";
import { gsap } from "gsap";

import { useContextualTip } from "../../hooks/use-contextual-tip";

type ScrollableSectionProps = {
  className?: string;
  children: React.ReactNode;
  onScroll?: (progress: number, element: HTMLElement) => void;
};

export const ScrollableSection = forwardRef<
  HTMLDivElement,
  ScrollableSectionProps
>(({ children, onScroll, className = "" }, ref) => {
  const container = useRef(null);
  const wrapper = useRef(null);
  const scrollIndicator = useRef(null);
  const timeOutRef = useRef(null);

  const prevScroll = useRef(0);

  const [showScroll, setShowScroll] = useState(false);

  const { setContextualTipContent } = useContextualTip();

  const onContainerScroll = () => {
    if (!wrapper?.current) return;

    const { scrollTop, offsetHeight, scrollHeight } = wrapper.current;

    if (scrollTop === prevScroll.current) {
      return;
    }

    const formattedHeight = scrollHeight - offsetHeight;

    const progress = scrollTop / formattedHeight;

    const totalWrapperHeight =
      offsetHeight - scrollIndicator.current.offsetHeight;

    gsap.to(scrollIndicator.current, {
      y: `${progress * totalWrapperHeight}px`,
      duration: 0.3,
      ease: "expo.out",
    });

    setContextualTipContent(null);

    if (onScroll) onScroll(progress, wrapper.current);

    prevScroll.current = scrollTop;
  };

  const checkScrollable = () => {
    if (!wrapper.current) return;

    const { scrollHeight, offsetHeight } = wrapper.current;

    setShowScroll(scrollHeight > offsetHeight);
    onContainerScroll();
  };

  useEffect(() => {
    const observer = new MutationObserver((mutationsList) => {
      // Iterate through the list of mutations
      mutationsList.forEach((mutation) => {
        // Check if nodes were added or removed
        if (
          mutation.type === "childList" ||
          mutation.type === "attributes" ||
          mutation.attributeName === "class"
        ) {
          clearTimeout(timeOutRef.current);
          // Call your function here
          timeOutRef.current = setTimeout(() => {
            checkScrollable();
          }, 50);
        }
      });
    });

    // Configuration of the observer:
    const config = {
      attributes: true,
      subtree: true,
      attributeFilter: ["class"],
    };

    // Start observing the target node for configured mutations
    observer.observe(wrapper.current, config);

    const resizeObserver = new ResizeObserver((entries) => {
      checkScrollable();
    });

    // Observe one or multiple elements
    resizeObserver.observe(container.current);

    checkScrollable();
    window.addEventListener("resize", checkScrollable);

    return () => {
      resizeObserver.disconnect();

      window.removeEventListener("resize", checkScrollable);
    };
  }, []);

  useEffect(() => {
    if (typeof ref === "function") {
      ref(container.current);
    } else if (ref) {
      ref.current = container.current;
    }
  }, [ref]);

  return (
    <div
      ref={container}
      className={classes(
        "relative flex max-h-full min-h-0 overflow-hidden -mx-2 w-[calc(100%+16px)]",
        "scrollable-section",
        className
      )}
    >
      <div
        className={classes(
          "absolute top-0 right-0 h-full w-[5px] pointer-events-none z-[3] flex",
          "transition-opacity duration-300 ease-out-quad",
          showScroll ? "opacity-100" : "opacity-0"
        )}
      >
        <span
          ref={scrollIndicator}
          className="w-[3px] h-[90px] block rounded-[3px] bg-studio-gray-dark"
        />
      </div>

      <div
        ref={wrapper}
        className={classes(
          "flex overflow-auto max-h-full px-2 w-full",
          "scrollable-wrapper",
          "scrollbar-hidden",
          showScroll && "show-scroll"
        )}
        onScroll={onContainerScroll}
      >
        {children}
      </div>
    </div>
  );
});
