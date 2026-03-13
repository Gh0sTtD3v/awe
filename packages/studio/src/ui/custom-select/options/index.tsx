import { useEffect, useRef } from "react";
import { cn } from "../../../utils/cn";
import { Button } from "../button";
import { DefaultOption } from "../default-option";
import { useCustomSelect } from "../../../hooks/use-custom-select";
import { gsap } from "gsap";

import { DEFAULT_OPTIONS_WIDTH } from "../index";

function getDefaultSelectedOption(data, value) {
  //
  if (Array.isArray(data)) {
    return data.find((option) => option?.value === value);
  }
  return data?.value == value;
}

export function CustomSelectOptions({
  currentCustomSelect,
  selectedOption,
  options,
  setSelectedOption,
}) {
  const container = useRef(null);

  const {
    customSelectOptionsWidth,
    customSelectedOption,
    setCustomSelectOptions,
    setCurrentCustomSelect,
    setCustomSelectedOptionFunc,
    setCustomSelectOptionsWidth,
  } = useCustomSelect();

  const close = () => {
    if (options) {
      setCustomSelectOptions(null);
      setCurrentCustomSelect(null);
      setCustomSelectedOptionFunc(null);
      setCustomSelectOptionsWidth(DEFAULT_OPTIONS_WIDTH);
    }
  };

  const onWindowClick = (e) => {
    if (
      !e.target ||
      !e.target.classList.contains("js-prevent-custom-select-close")
    ) {
      close();
    }
  };

  const positionBox = () => {
    const rect = currentCustomSelect.getBoundingClientRect();
    const rectContainer = container.current.getBoundingClientRect();

    let top = rect.top + rect.height / 2 - rectContainer.height / 2;
    const diff = Math.abs(rect.width - customSelectOptionsWidth);
    let left = rect.left + rect.width / 2 - customSelectOptionsWidth / 2;
    let right = left + customSelectOptionsWidth;

    if (top < 0) {
      top = 0;
    }

    if (left < 0) {
      left = 0;
    }

    if (right > window.innerWidth) {
      left = window.innerWidth - customSelectOptionsWidth;
    }

    gsap.set(container.current, {
      top,
      maxHeight: window.innerHeight - top,
      left,
    });
  };

  const onResize = () => {
    positionBox();
  };

  useEffect(() => {
    if (currentCustomSelect) {
      positionBox();
    }

    if (options && currentCustomSelect) {
      window.addEventListener("click", onWindowClick);
      window.addEventListener("resize", onResize);
    }

    return () => {
      window.removeEventListener("click", onWindowClick);
      window.removeEventListener("resize", onResize);
    };
  }, [currentCustomSelect]);

  return (
    <div
      ref={container}
      className={cn(
        "fixed top-0 left-0 w-[258px]",
        "bg-white text-studio-darker",
        "text-[13px] font-normal leading-[15px]",
        "p-2 z-[1000] max-h-screen min-w-0",
        "flex flex-col",
        "rounded-[14px] shadow-[0px_2px_4px_0px_rgba(6,6,6,0.2)]",
        "overflow-auto",
        "js-prevent-custom-select-close"
      )}
      style={{ width: `${customSelectOptionsWidth}px` }}
    >
      {options.map((option, index) => {
        if (option.type === "button") {
          return (
            <Button
              key={`CS-Opt-Btn-${option.value}-${index}`}
              close={close}
              data={option}
            />
          );
        } else {
          return (
            <DefaultOption
              close={close}
              data={option}
              key={`CS-Opt${option.value}-${index}`}
              setSelectedOption={setSelectedOption}
              selected={getDefaultSelectedOption(selectedOption, option?.value)}
            />
          );
        }
      })}
    </div>
  );
}
