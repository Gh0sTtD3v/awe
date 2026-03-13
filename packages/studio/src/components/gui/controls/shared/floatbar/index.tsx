import React, { useEffect, useRef, CSSProperties, useMemo } from "react";
import IconImg from "../../../../../ui/icon-image";
import { clamp, noop } from "../../../../../utils/js";
import { useEventCallback } from "../../../../../hooks/use-event-callback";
import { classes } from "../../../../../utils/classes";

export interface ClampPad {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export interface FloatbarProps {
  className?: string;
  children?: React.ReactNode;
  clampPad?: ClampPad;
  onChange?: (coords: { x: number; y: number }) => void;
  header?: string;
  style?: CSSProperties;
}

const defaultClamp = {
  top: 80,
  bottom: 6,
  left: 20,
  right: 20,
};

export function Floatbar({
  className = "",
  children,
  clampPad: _clamp = {},
  onChange = noop,
  header = "",
  style = {},
}: FloatbarProps) {
  //
  const handleRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  const clampPad = { ...defaultClamp, ..._clamp };

  const handleChange = useEventCallback((coords) => {
    const elem = elementRef.current as HTMLElement;

    coords.x = clamp(
      coords.x,
      clampPad.left,
      window.innerWidth - elem.clientWidth - clampPad.right
    );

    coords.y = clamp(
      coords.y,
      clampPad.top,
      window.innerHeight - elem.clientHeight - clampPad.bottom
    );

    onChange?.(coords);
  }, []);

  useEffect(() => {
    //

    if (handleRef.current == null || elementRef.current == null) return;

    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;

    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const { x, y } = elementRef.current.getBoundingClientRect();

      startX = event.clientX - x;
      startY = event.clientY - y;

      handleRef.current.setPointerCapture(event.pointerId);
      handleRef.current.addEventListener("pointermove", onPointerMove);
    };

    const onPointerMove = (event: PointerEvent) => {
      //
      event.stopPropagation();

      currentX = event.clientX - startX;
      currentY = event.clientY - startY;

      let coords = { x: currentX, y: currentY };

      handleChange?.(coords);

      elementRef.current.style.transform = `translate(${coords.x}px, ${coords.y}px)`;
    };

    const onPointerUp = (event: PointerEvent) => {
      event.stopPropagation();
      handleRef.current.releasePointerCapture(event.pointerId);
      handleRef.current.removeEventListener("pointermove", onPointerMove);
    };

    handleRef.current.addEventListener("pointerdown", onPointerDown);
    handleRef.current.addEventListener("pointerup", onPointerUp);

    return () => {
      //
      handleRef.current?.removeEventListener("pointerdown", onPointerDown);
      handleRef.current?.removeEventListener("pointerup", onPointerUp);
    };
  }, [handleRef.current, elementRef.current]);

  const hasMounted = useRef(false);

  useEffect(() => {
    //
    if (hasMounted.current) return;

    const bounds = elementRef.current.getBoundingClientRect();

    onChange?.({
      x: bounds.left,
      y: bounds.top,
    });

    elementRef.current.style.transform = `translate(${bounds.left}px, ${bounds.top}px)`;

    hasMounted.current = true;
  }, []);

  const _style = useMemo(() => {
    //
    if (!hasMounted.current) return style;

    // clear style positioning props and use only transform
    return {
      ...style,
      top: 0,
      left: 0,
      bottom: null,
      right: null,
    };
  }, [style, hasMounted.current]);

  return (
    <div
      ref={elementRef}
      className={classes(
        "!fixed !z-[10000] select-none overflow-hidden bg-studio-dark-alt shadow-[0px_2px_4px_rgba(0,0,0,0.15),0px_12px_28px_rgba(0,0,0,0.11)] w-full max-h-[80vh] rounded-lg m-0 flex flex-col items-center justify-center",
        className
      )}
      style={_style}
    >
      <div className="w-full flex p-5 select-none items-center justify-between border-b border-studio-border">
        <span className="h-full m-0 font-medium text-[15px] leading-[100%] text-white capitalize">{header}</span>
        <div className="cursor-move flex items-center" ref={handleRef}>
          <IconImg name="grab-vert" size={20} />
        </div>
      </div>

      {children}
    </div>
  );
}
