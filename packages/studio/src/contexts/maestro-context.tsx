import React, { createContext, useContext, useEffect, useState } from "react";
import { motion, AnimatePresence, cubicBezier } from "framer-motion";
import { useCustomSelect } from "../hooks/use-custom-select";
import { usePromptTip } from "../hooks/use-prompt-tip";
import { ContextualTip } from "../ui/contextual-tip";
import { CustomSelectOptions } from "../ui/custom-select/options";
import { PromptTip } from "../ui/prompt-tip";
import { debounce } from "../utils/js";

type MaestroContextState = {
  isMobile: boolean;
  loaderIsHidden: boolean;
  setLoaderIsHidden: React.Dispatch<React.SetStateAction<boolean>>;
};

export const MaestroContext = createContext<MaestroContextState>(null);

export const MaestroProvider = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileBreakpoint, setIsMobileBreakpoint] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [loaderIsHidden, setLoaderIsHidden] = useState(false);

  const {
    customSelectOptions,
    customSelectedOption,
    currentCustomSelect,
    setCustomSelectedOption,
  } = useCustomSelect();

  const { activePrompt, promptsHidden, showPrompt, hidePrompt } =
    usePromptTip();

  // const onPointerLockChanged = () => {
  //     setIsPointerLocked(document.pointerLockElement ? true : false);
  // };

  const resize = () => {
    setIsMobileBreakpoint(window.innerWidth < 768);
  };
  const onResize = debounce(resize, 10);

  useEffect(() => {
    const isMobile =
      typeof window !== "undefined"
        ? /iPhone|iPad|iPod|Android/i.test(navigator?.userAgent)
        : false;

    setIsMobile(isMobile);
  }, []);

  useEffect(() => {
    if (isMobile) {
      document.body.classList.add("is-mobile");
    } else {
      document.body.classList.remove("is-mobile");
    }
  }, [isMobile]);

  useEffect(() => {
    if (isDragging) {
      document.body.classList.add("is-dragging");
    } else {
      document.body.classList.remove("is-dragging");
    }
  }, [isDragging]);

  useEffect(() => {
    window.addEventListener("resize", onResize);

    onResize();

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    if (loaderIsHidden) {
      document.documentElement.classList.add("lock-scroll");
    }
  }, [loaderIsHidden]);

  const state = {
    isMobile,
    isMobileBreakpoint,
    isDragging,
    loaderIsHidden,
    isPointerLocked,
    setLoaderIsHidden,
    setIsDragging,
  };

  return (
    <MaestroContext.Provider value={state}>
      {children}

      {customSelectOptions && customSelectOptions.length > 0 && (
        <CustomSelectOptions
          currentCustomSelect={currentCustomSelect}
          options={customSelectOptions}
          selectedOption={customSelectedOption}
          setSelectedOption={setCustomSelectedOption}
        />
      )}

      <PromptTip />
      <ContextualTip />
    </MaestroContext.Provider>
  );
};

export const useMaestro = () => {
  const context = useContext(MaestroContext);

  if (!context) {
    throw Error("useMaestro needs to be called within MaestroContext.");
  }

  return context;
};

export default MaestroProvider;
