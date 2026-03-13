import React from "react";

import { classes } from "../../../../utils/classes";
import { clamp } from "../../../../utils/js";

const progressWidth = (value, min, max) => {
  return clamp(((value - min) * 100) / (max - min), 0, 100);
};

export interface NumberInputProps {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  onChange: (value: number, isProgress: boolean) => void;
}

function _NumberInput({
  min = 0,
  max = 100,
  step = 1,
  value = 0,
  onChange,
}: NumberInputProps) {
  //
  const valueRef = React.useRef(value);

  const numberInput = React.useRef(null);

  const startValueRef = React.useRef(value);

  const parseInput = (input: string | number) => {
    if (typeof input === "number") {
      return input;
    }

    const normalizedInput = String(input).replace(",", ".");
    const parsedValue = parseFloat(normalizedInput);
    return isNaN(parsedValue) ? min : clamp(parsedValue, min, max);
  };

  const handleFinishChange = (e) => {
    //
    const newValue = parseInput(valueRef.current);

    startValueRef.current = newValue;

    if (numberInput.current) numberInput.current.value = newValue;

    onChange(newValue, false);
  };

  const handleChange = (val) => {
    //
    const newValue = parseInput(valueRef.current);

    valueRef.current = val;

    onChange(newValue, true);
  };

  const progress = progressWidth(value, min, max);

  const style = {
    background: `linear-gradient(to right, #353535 0%, #353535 ${progress}%, #ffffff00 ${progress}%, #ffffff00 100%)`,
  };

  return (
    <div className="w-full h-[29px] flex items-center relative overflow-hidden">
      <input
        ref={numberInput}
        data-noundo={true}
        className="w-[66px] h-full rounded-lg bg-studio-dark flex-shrink-0 outline-none mr-[3px] border-0 text-left p-1 px-[9px] text-white text-[13px] font-normal leading-[15px] transition-colors duration-200 ease-out-quad focus:text-white [-webkit-appearance:textfield] [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:[-webkit-appearance:none] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:[-webkit-appearance:none] [&::-webkit-inner-spin-button]:m-0 [&[type=number]]:[-moz-appearance:textfield]"
        type="text"
        inputMode="decimal"
        pattern="[0-9]*[.,]?[0-9]*"
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleFinishChange}
        onMouseUp={handleFinishChange}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleFinishChange(e);
          } else if (e.key === "Escape") {
            e.preventDefault();
            valueRef.current = startValueRef.current;
            onChange(valueRef.current, false);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            const value = parseInput(valueRef.current) + step;
            valueRef.current = value;
            if (numberInput.current) {
              numberInput.current.value = value;
            }
            onChange(value, true);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            const value = parseInput(valueRef.current) - step;
            valueRef.current = value;
            if (numberInput.current) {
              numberInput.current.value = value;
            }
            onChange(value, true);
          }
        }}
        defaultValue={value}
        style={{ left: `${progress}%` }}
      />

      <div className="relative flex-grow flex bg-studio-dark rounded-lg overflow-hidden">
        <input
          data-noundo={true}
          className="[-webkit-appearance:none] [-moz-appearance:none] [appearance:none] outline-0 p-0 w-full h-[29px] m-0 cursor-pointer rounded-md border-0 bg-none [&::-webkit-slider-thumb]:[-webkit-appearance:none] [&::-webkit-slider-thumb]:[appearance:none] [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:h-0 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:[appearance:none] [&::-moz-range-thumb]:w-0 [&::-moz-range-thumb]:h-0 [&::-moz-range-thumb]:cursor-pointer [&:active~.number-input-background_.number-input-thumb]:text-white"
          type="range"
          style={style}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            handleChange(e.target.value);
            if (numberInput.current) {
              numberInput.current.value = e.target.value;
            }
          }}
          onMouseUp={handleFinishChange}
        />

        <span className="number-input-background absolute top-0 left-4 rounded-md w-full pointer-events-none h-full block">
          <span
            className="number-input-thumb h-[18px] w-[3px] text-studio-border-focus bg-current rounded transition-colors duration-200 ease-out-quad absolute top-1.5 pointer-events-none flex items-center justify-center -translate-x-[25px]"
            style={{ left: `${progress}%` }}
          />
        </span>
      </div>
    </div>
  );
}

export const NumberInput = React.memo(_NumberInput);
