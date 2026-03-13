import React from "react";

import { classes } from "../../../../utils/classes";

interface TextareaProps {
  required?: boolean;
  value?: string;
  onChange: (value: string, isProgress: boolean) => void;
  onValidate?: (value: string) => void;
  disabled?: boolean;
}

function _Textarea({
  required = false,
  value = "",
  onChange,
  onValidate = null,
  disabled = false,
}: TextareaProps) {
  //

  // --const [value, setValue] = React.useState(_value);

  const valueRef = React.useRef(value);

  const startValueRef = React.useRef(value);

  const handleFinishChange = (e) => {
    //

    e.stopPropagation();

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

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    //

    e.stopPropagation();

    const value = e.target.value;

    valueRef.current = value;

    // setValue(value);

    onChange(value, true);
  };

  return (
    <div className="w-full flex items-center rounded-md border border-white/20">
      <textarea
        data-noundo={true}
        className={classes(
          "w-full h-full bg-transparent outline-none border-none text-white resize-both",
          "text-[13px] font-normal leading-[15px] p-1.5 px-3",
          "placeholder:text-white/40 placeholder:text-[13px] placeholder:font-normal placeholder:leading-[15px]",
          "disabled:opacity-50",
          "scrollbar-hidden",
          required && "invalid:border invalid:border-red-500"
        )}
        placeholder="Type here"
        disabled={disabled}
        required={required}
        onChange={handleChange}
        onBlur={handleFinishChange}
        onKeyDown={(e) => {
          e.stopPropagation();

          if (e.key === "Enter") {
            handleFinishChange(e);
          } else if (e.key === "Escape") {
            valueRef.current = startValueRef.current;
            onChange(valueRef.current, false);
          }
        }}
        defaultValue={value}
      />
    </div>
  );
}

export const Textarea = React.memo(_Textarea);
