import React, { useState, useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { classes } from "../../../../utils/classes";
import SpriteIcon from "../../../../ui/sprite";
import { SearchInput } from "../../../../ui/search-input";

export function CollapseFilters({
  count,
  width,
  search,
  children,
  buttonLabel = "",
  onSearchChange,
  filterItems = [],
}) {
  const collapseFiltersRef = useRef(null);
  const collapseFiltersInnerRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);

  useGSAP(() => {
    if (!collapseFiltersRef.current) return;

    if (collapsed) {
      const { offsetTop } = collapseFiltersRef.current;
      const { offsetHeight } = collapseFiltersInnerRef.current;

      const marginTop = collapseFiltersInnerRef.current.offsetTop - offsetTop;

      gsap.to(collapseFiltersRef.current, {
        maxHeight: `${offsetHeight + marginTop}px`,
        duration: 1,
        ease: "expo.out",
      });
    } else {
      gsap.to(collapseFiltersRef.current, {
        maxHeight: 0,
        duration: 1,
        ease: "expo.out",
      });
    }
  }, [collapsed, width]);

  const disabled = !filterItems?.length;

  return (
    <div className={classes("flex flex-col", "collapse-filters")}>
      <div className="flex items-center">
        {onSearchChange && (
          <SearchInput value={search} onChange={onSearchChange} />
        )}

        {!disabled && (
          <button
            type="button"
            className={classes(
              "p-2 ml-[2px] shrink-0 text-studio-border-focus relative flex items-center gap-1 [&_.icon]:text-studio-border-focus [&_.icon]:transition-[fill] [&_.icon]:duration-200 [&_.icon]:ease-out-quad hover:[&_.icon]:text-white",
              collapsed && "text-white [&_.icon]:!text-white",
              disabled && "[&_.icon]:!text-studio-gray [&_.icon]:transition-colors [&_.icon]:duration-200 [&_.icon]:ease-out-quad"
            )}
            onClick={() => {
              if (disabled) return;
              setCollapsed(!collapsed);
            }}
            disabled={disabled}
            title={collapsed ? "Show Filters" : "Hide Filters"}
          >
            <span className="u-visually-hidden">
              {collapsed ? "Show Filters" : "Hide Filters"}
            </span>

            {count > 0 && (
              <span className="px-[6px] min-h-5 flex items-center justify-center text-white text-[11px] font-medium leading-[13px] tracking-[0.22px] rounded-md bg-studio-gray-medium-alt">
                {count}
              </span>
            )}

            {buttonLabel && (
              <span>{buttonLabel}</span>
            )}

            <SpriteIcon
              id="studio/filters"
              className="icon"
              width={20}
              height={17}
            />
          </button>
        )}
      </div>

      {!disabled ? (
        <div ref={collapseFiltersRef} className="flex flex-col overflow-hidden shrink-0 rounded-md">
          <div ref={collapseFiltersInnerRef} className="mt-2 p-[19px_16px] bg-studio-dark flex rounded-md flex-col">
            <div className="flex items-center justify-between text-white mb-5 border-b border-white/10 pb-[18px]">
              <p className="text-white text-[15px] leading-[17px]">Filters</p>

              <button
                type="button"
                className="[&_.icon]:text-white/60 [&_.icon]:transition-colors [&_.icon]:duration-200 [&_.icon]:ease-out-quad hover:[&_.icon]:text-white"
                onClick={() => {
                  setCollapsed(!collapsed);
                }}
              >
                <span className="u-visually-hidden">Close filters</span>

                <SpriteIcon
                  id="close"
                  width={14}
                  height={14}
                  className="icon"
                />
              </button>
            </div>

            <div className="flex flex-col gap-[18px]">{children}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
