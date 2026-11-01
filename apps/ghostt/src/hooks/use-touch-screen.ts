"use client";

import { useEffect, useState } from "react";

export function isTouchScreen(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches ||
    "ontouchstart" in window
  );
}

export function useTouchScreen() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(pointer: coarse)");
    const update = () => {
      setEnabled(isTouchScreen());
    };

    update();
    media.addEventListener("change", update);
    window.addEventListener("resize", update);

    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return enabled;
}
