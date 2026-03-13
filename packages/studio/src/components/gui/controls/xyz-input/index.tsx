import React, { useRef, useState } from "react";
import { useEventCallback } from "../../../../hooks/use-event-callback";
import { classes } from "../../../../utils/classes";
import { clamp } from "../../../../utils/js";

function progressWidth(value, min, max) {
  return clamp(((value - min) * 100) / (max - min), 0, 100);
}

function toNum(n: any, fallback = 0) {
  return isNaN(+n) ? fallback : +n;
}

const MIN = -1000000;
const MAX = 1000000;

const defMin = { x: MIN, y: MIN, z: MIN };
const defMax = { x: MAX, y: MAX, z: MAX };
const defStep = { x: 1, y: 1, z: 1 };

function xyzEqual(prev, next) {
  if (prev == null && next == null) return true;
  if (prev == null || next == null) return false;
  return prev.x === next.x && prev.y === next.y && prev.z === next.z;
}

function arePropsEqual(prevProps, nextProps) {
  return (
    xyzEqual(prevProps.value, nextProps.value) &&
    xyzEqual(prevProps.min, nextProps.min) &&
    xyzEqual(prevProps.max, nextProps.max) &&
    xyzEqual(prevProps.step, nextProps.step) &&
    prevProps.layout === nextProps.layout &&
    prevProps.onChange === nextProps.onChange &&
    prevProps.inline === nextProps.inline &&
    prevProps.locked === nextProps.locked
  );
}

const distanceThreshold = 5;
const sensitivity = 1;

interface XYZValue {
  x: number;
  y: number;
  z: number;
}

interface XYZInputProps {
  value: XYZValue;
  min: XYZValue;
  max: XYZValue;
  step: XYZValue;
  layout: "inline" | "stacked";
  inline: boolean;
  onChange: (value: XYZValue, isProgress: boolean) => void;
  locked: boolean;
}

function _XYZInput({
  value,
  min: _min,
  max: _max,
  step: _step,
  layout,
  inline = true,
  onChange,
  locked,
}: XYZInputProps) {
  if (typeof _min === "number") {
    _min = { x: _min, y: _min, z: _min };
  }

  if (typeof _max === "number") {
    _max = { x: _max, y: _max, z: _max };
  }

  if (typeof _step === "number") {
    _step = { x: _step, y: _step, z: _step };
  }

  const min = { ...defMin, ..._min };
  const max = { ...defMax, ..._max };
  const step = { ...defStep, ..._step };

  const hasMinMax = !locked && (min || max || step);

  const handleChange = useEventCallback((name, inputVal, isProgress) => {
    onChange({ ...value, [name]: inputVal }, isProgress);
  }, []);

  return (
    <div
      className={classes(
        "w-full flex gap-[3px] items-center justify-between",
        inline ? "flex-row justify-stretch" : "flex-col items-start justify-start gap-[15px]"
      )}
    >
      <NumberInput
        name={"x"}
        inline={inline}
        min={min.x}
        max={max.x}
        step={step.x}
        value={value.x}
        locked={locked}
        hasMinMax={hasMinMax}
        onChange={handleChange}
      />

      {value.y != null && (
        <NumberInput
          name={"y"}
          inline={inline}
          min={min.y}
          max={max.y}
          step={step.y}
          value={value.y}
          locked={locked}
          hasMinMax={hasMinMax}
          onChange={handleChange}
        />
      )}

      {value.z != null && (
        <NumberInput
          name={"z"}
          inline={inline}
          min={min.z}
          max={max.z}
          step={step.z}
          value={value.z}
          locked={locked}
          hasMinMax={hasMinMax}
          onChange={handleChange}
        />
      )}
    </div>
  );
}

function NumberInput({
  name,
  min,
  max,
  step,
  value,
  inline = true,
  onChange,
  hasMinMax,
  locked,
}: any) {
  const ref = useRef<HTMLInputElement>(null);
  const isDraggingRef = useRef(false);
  const isPointerDown = useRef(false);
  const dragStart = useRef(0);
  const startX = useRef(null);

  const [state, setState] = React.useState({
    startValue: value,
    input: value.toString(),
    isEditing: false,
  });

  const parseInput = (input: string) => {
    const normalizedInput = input.replace(",", ".");
    return parseFloat(normalizedInput);
  };

  const validate = (input) => {
    const parsedInput = parseInput(input);
    if (isNaN(parsedInput)) return value;
    return Math.max(min, Math.min(max, parsedInput));
  };

  const handleChange = useEventCallback((input, isProgress) => {
    const val = validate(input);
    const isEditing = isProgress && !isDraggingRef.current;

    setState((prev) => ({
      ...prev,
      input: isEditing ? input : val.toString(),
      isEditing,
    }));

    if (val !== value || !isProgress) {
      onChange(name, val, isProgress);
    }
  }, []);

  const handleInputDrag = (event) => {
    event.preventDefault();
    const { input } = state;

    if (isDraggingRef.current) {
      const currentX = event.clientX || event.touches[0].clientX;
      const deltaX = currentX - startX.current;
      const normalizedDeltaX = deltaX / sensitivity;

      if (Math.abs(normalizedDeltaX) >= distanceThreshold) {
        const valueChange = Math.sign(normalizedDeltaX) * step;
        handleChange((parseFloat(input) + valueChange).toString(), true);
        startX.current = currentX;
      }
    }
  };

  const handleFinishDragging = (e) => {
    isDraggingRef.current = false;
    startX.current = null;
    const value = e.target.value;
    ref.current.blur();
    handleChange(value, false);
  };

  const onKeyDown = useEventCallback((e) => {
    const { startValue, input } = state;

    if (e.key === "Enter") {
      handleChange(input, false);
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleChange(startValue.toString(), false);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      handleChange((parseFloat(input) + step).toString(), false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      handleChange((parseFloat(input) - step).toString(), false);
    }
  }, []);

  const handleInputChange = useEventCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      handleChange(value, true);
    },
    []
  );

  const handleFinishChange = useEventCallback((e) => {
    const value = e.target.value;
    handleChange(value, false);
  }, []);

  const handleFocus = useEventCallback(() => {
    setState({
      startValue: value,
      input: value.toString(),
      isEditing: true,
    });
  }, []);

  const handleStartDragging = useEventCallback((e) => {
    isDraggingRef.current = true;
    startX.current = e.clientX || e.touches[0].clientX;
  }, []);

  const handleBlur = useEventCallback(() => {
    handleChange(state.input, false);
  }, []);

  const { isEditing, input } = state;

  const progress = progressWidth(parseFloat(value), min, max);

  const style = {
    background: `linear-gradient(to right, #ffffff14 0%, #ffffff14 ${progress}%, #ffffff00 ${progress}%, #ffffff00 100%)`,
  };

  const beginSliding = useEventCallback((e) => {
    if (!ref.current) return;
    dragStart.current = Date.now();
    isPointerDown.current = true;
    ref.current.setPointerCapture(e.pointerId);
  }, []);

  const stopSliding = useEventCallback((e) => {
    if (!ref.current) return;

    if (isDraggingRef.current) {
      handleFinishDragging(e);
    }

    isPointerDown.current = false;

    ref.current.onpointermove = null;
    ref.current.releasePointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useEventCallback((e) => {
    if (!isPointerDown.current) return;

    if (Date.now() - dragStart.current < 50) return;

    if (!isDraggingRef.current) {
      isDraggingRef.current = true;
      handleStartDragging(e);
    }

    handleInputDrag(e);
  }, []);

  const conditionalProps = hasMinMax
    ? {
        onPointerDown: beginSliding,
        onPointerUp: stopSliding,
        onMouseMove: handlePointerMove,
        onTouchMove: handlePointerMove,
        onDragStart: (e) => e.preventDefault(),
      }
    : {};

  return (
    <div className={classes(
      inline ? "flex-grow flex flex-col gap-[3px] relative" : "w-full flex relative flex-col overflow-hidden"
    )}>
      <label className={classes(
        inline
          ? "absolute top-0 left-2 z-[2] text-white/60 text-[13px] font-normal leading-[25px] uppercase pointer-events-none"
          : "text-white/40 mb-[5px] text-[11px] font-normal leading-[13px]"
      )}>{name}</label>

      <div className={classes(
        inline ? "relative" : "w-full flex flex-row-reverse h-[29px]"
      )}>
        {!inline && (
          <div className="relative w-full flex-grow bg-studio-dark rounded-lg overflow-hidden">
            <input
              data-noundo={true}
              className="[-webkit-appearance:none] [-moz-appearance:none] [appearance:none] outline-0 p-0 w-full h-[29px] m-0 cursor-pointer border-none [&::-webkit-slider-thumb]:[-webkit-appearance:none] [&::-webkit-slider-thumb]:[appearance:none] [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:h-0 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:[appearance:none] [&::-moz-range-thumb]:w-0 [&::-moz-range-thumb]:h-0 [&::-moz-range-thumb]:cursor-pointer"
              type="range"
              readOnly={locked}
              min={min}
              max={max}
              step={step}
              value={parseFloat(value)}
              style={style}
              onChange={handleInputChange}
              onMouseUp={handleFinishChange}
            />

            <span className="h-[18px] w-[3px] text-studio-border-focus bg-current rounded pointer-events-none absolute top-1.5 flex items-center justify-center -translate-x-2 transition-colors duration-200 ease-out-quad" style={{ left: `${progress}%` }} />
          </div>
        )}

        <div className={classes(
          inline ? "select-all flex h-6 relative rounded-md items-center justify-center" : ""
        )}>
          <input
            ref={ref}
            data-noundo={true}
            name={name}
            min={min}
            max={max}
            step={step}
            value={isEditing ? input : value}
            readOnly={locked}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={onKeyDown}
            className={classes(
              inline
                ? classes(
                    "select-none w-full rounded-lg bg-studio-dark border border-studio-dark h-[29px] outline-none text-center text-white [-moz-appearance:textfield] px-[15px] pl-[21px] text-[13px] font-normal leading-[15px] transition-[background,border-color,color] duration-100 ease-out-quad hover:bg-studio-gray-dark hover:border-studio-gray-dark focus:not(:active):border-studio-border-focus focus:not(:active):bg-studio-dark [&::-webkit-outer-spin-button]:[-webkit-appearance:none] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:[-webkit-appearance:none] [&::-webkit-inner-spin-button]:m-0",
                    locked && "cursor-not-allowed",
                    !locked && "cursor-col-resize",
                    isDraggingRef?.current && "!caret-transparent"
                  )
                : "w-[66px] h-[29px] border-0 flex-shrink-0 outline-none mr-[3px] rounded-lg bg-studio-dark text-left px-[9px] py-1 text-white text-[11px] font-normal leading-[13px] [-webkit-appearance:none] [-moz-appearance:none] [appearance:none] cursor-pointer [&::-webkit-slider-thumb]:[-webkit-appearance:none] [&::-webkit-slider-thumb]:[appearance:none] [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:h-0 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:[appearance:none] [&::-moz-range-thumb]:w-0 [&::-moz-range-thumb]:h-0 [&::-moz-range-thumb]:cursor-pointer"
            )}
            {...conditionalProps}
            type="text"
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
          />
        </div>
      </div>
    </div>
  );
}

export const XYZInput = React.memo(_XYZInput, arePropsEqual);
