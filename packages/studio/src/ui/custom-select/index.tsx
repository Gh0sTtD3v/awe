import { useState, useCallback, useEffect, useRef } from "react";

import { cn } from "../../utils/cn";
import SpriteIcon from "../sprite";
import { useCustomSelect } from "../../hooks/use-custom-select";

export const DEFAULT_OPTIONS_WIDTH = 258;

export function CustomSelect({
  options,
  optionsWidth = DEFAULT_OPTIONS_WIDTH,
  selectedOption,
  setSelectedOption,
  disabled = false,
  defaultLabel = "Select an option",
}) {
  const container = useRef(null);

  const [collapsed, setCollapsed] = useState(true);

  const {
    customSelectOptions,
    currentCustomSelect,
    setCustomSelectOptions,
    setCurrentCustomSelect,
    setCustomSelectedOptionFunc,
    setCustomSelectedOption,
    setCustomSelectOptionsWidth,
  } = useCustomSelect();

  useEffect(() => {
    if (!collapsed) {
      setCustomSelectedOptionFunc(setSelectedOption);
      setCustomSelectedOption(selectedOption);
      setCustomSelectOptions(options);
      setCurrentCustomSelect(container.current);
      setCustomSelectOptionsWidth(optionsWidth || DEFAULT_OPTIONS_WIDTH);
    } else {
      setCustomSelectOptions(null);
      setCurrentCustomSelect(null);
      setCustomSelectedOptionFunc(null);
      setCustomSelectOptionsWidth(DEFAULT_OPTIONS_WIDTH);
    }
  }, [collapsed]);

  useEffect(() => {
    if (!customSelectOptions) {
      setCollapsed(true);
    }
  }, [customSelectOptions]);

  const onKeyDown = useCallback((e) => {
    if (e.keyCode === 27) {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div
      ref={container}
      className={cn(
        "inline-flex relative w-full",
        "custom-select-wrapper",
        "js-prevent-custom-select-close"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between",
          "rounded-[10px] bg-studio-gray-dark text-white",
          "text-[13px] font-normal leading-[15px]",
          "px-[9px] pr-[21px] h-[28px] w-full",
          "whitespace-nowrap overflow-hidden text-ellipsis",
          "relative",
          "[&_.icon--chevron-bottom]:absolute [&_.icon--chevron-bottom]:top-[12px] [&_.icon--chevron-bottom]:right-[10px] [&_.icon--chevron-bottom]:fill-current [&_.icon--chevron-bottom]:pointer-events-none",
          "custom-select-input",
          "js-prevent-custom-select-close"
        )}
        onClick={() => {
          setCollapsed(!collapsed);
        }}
      >
        <span
          className={cn(
            "flex min-w-0 max-w-full w-full",
            "whitespace-nowrap overflow-hidden text-ellipsis",
            "pointer-events-none"
          )}
        >
          {(typeof selectedOption?.label === "function"
            ? selectedOption?.label?.()
            : selectedOption?.label) || defaultLabel}
        </span>

        <SpriteIcon id="chevron-bottom" width={8} height={5} />
      </div>
    </div>
  );
}
