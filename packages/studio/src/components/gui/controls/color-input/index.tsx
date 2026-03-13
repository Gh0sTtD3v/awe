import React, { useRef } from "react";

const COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export interface ColorInputProps {
  value: string;
  onChange: (value: string, isColorPicker: boolean) => void;
}

function _ColorInput({ value, onChange }: ColorInputProps) {
  const input = React.useRef(null);
  const valueRef = React.useRef(value);

  const colorPickerRef = useRef(null);

  const handleFinishChange = (e) => {
    //
    const value = e.target.value;

    valueRef.current = value;
    input.current.value = value;
    onChange(valueRef.current, false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    isColorPicker
  ) => {
    //
    const color = e.target.value;

    valueRef.current = color;

    if (!isColorPicker) {
      colorPickerRef.current.value = value;
    } else {
      input.current.value = value;
    }

    if (COLOR_REGEX.test(color)) {
      onChange(color, isColorPicker ? true : false);
    }
  };

  return (
    <div className="relative w-full h-[29px] rounded-lg bg-studio-dark border-0 flex items-center">
      <input
        ref={colorPickerRef}
        data-noundo={true}
        className="absolute top-[5px] left-[5px] w-[18px] h-[18px] outline-none border-none p-0 opacity-0"
        type="color"
        onChange={(e) => handleChange(e, true)}
        onBlur={handleFinishChange}
        defaultValue={value}
      />

      <div
        className="absolute top-[5px] left-[5px] w-[18px] h-[18px] pointer-events-none rounded-md bg-studio-success-dark"
        style={{ background: value }}
      />

      <input
        ref={input}
        className="flex-shrink-0 w-full bg-transparent p-0 pl-[30px] border-0 outline-none text-white text-[13px] font-normal leading-[15px]"
        type="text"
        onChange={(e) => handleChange(e, false)}
        onMouseUp={handleFinishChange}
        defaultValue={value}
      />
    </div>
  );
}

export const ColorInput = React.memo(_ColorInput);
