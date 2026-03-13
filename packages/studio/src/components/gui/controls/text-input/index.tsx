import React, { useEffect } from "react";

import { classes } from "../../../../utils/classes";

interface TextInputProps {
  required?: boolean;
  value?: string;
  onChange: (value: string, isProgress: boolean) => void;
  onValidate?: (value: string) => void;
  disabled?: boolean;
  isSecret?: boolean;
  action?: React.ReactNode;
}

function _TextInput({
  required = false,
  value = "",
  onChange,
  onValidate = null,
  disabled = false,
  isSecret = false,
  action = null,
}: TextInputProps) {
  //

  // const [value, setValue] = React.useState(_value);

  const textInputRef = React.useRef(null);

  const valueRef = React.useRef(value);

  const startValueRef = React.useRef(value);

  const type = isSecret ? "password" : "text";

  const handleFinishChange = (e) => {
    //
    if (required && !valueRef.current) {
      //
      return;
    }

    if (valueRef.current == startValueRef.current) {
      //
      return;
    }

    try {
      onValidate?.(valueRef.current);
    } catch (error) {
      //

      //TODO: Show error message
      // showError(error.message, "Invalid Input").then(() => {
      //     //
      //     e.target.focus();
      // });

      onChange(startValueRef.current, false);

      return;
    }

    startValueRef.current = valueRef.current;

    onChange(valueRef.current, false);
  };

  useEffect(() => {
    //
    if (textInputRef.current) {
      //
      textInputRef.current.value = value;
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    //
    const value = e.target.value;

    valueRef.current = value;

    // setValue(value);

    onChange(value, true);
  };

  return (
    <div className="relative w-full h-[29px] flex items-center">
      <input
        ref={textInputRef}
        data-noundo={true}
        className={classes(
          "w-full h-full bg-transparent outline-none border-none text-white/60",
          "text-[13px] font-normal leading-[15px] px-3 rounded-lg bg-studio-dark border border-studio-dark",
          "transition-[background,border-color,color] duration-100 ease-out-quad",
          "hover:bg-studio-gray-dark",
          "focus:text-white focus:border-studio-border-focus focus:bg-studio-dark",
          "placeholder:text-white/40 placeholder:text-[13px] placeholder:font-normal placeholder:leading-[15px]",
          "disabled:opacity-50",
          action && "pr-7",
          required && "invalid:border-red-500"
        )}
        type={type}
        placeholder="Type here"
        disabled={disabled}
        required={required}
        onChange={handleChange}
        onBlur={handleFinishChange}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleFinishChange(e);
          } else if (e.key === "Escape") {
            e.preventDefault();
            valueRef.current = startValueRef.current;
            onChange(valueRef.current, false);
          }
        }}
        defaultValue={value}
      />
      {action && (
        <div className="absolute right-1.5 m-0 p-0 flex items-center justify-center size-4 cursor-pointer">
          {action}
        </div>
      )}
    </div>
  );
}

export const TextInput = React.memo(_TextInput);
