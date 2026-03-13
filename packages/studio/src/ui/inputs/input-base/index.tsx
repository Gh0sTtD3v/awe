import React, { useRef, useState } from "react";
import SpriteIcon from "../../sprite";
import { cn } from "../../../utils/cn";

import Select, { GroupBase, OptionsOrGroups } from "react-select";

export interface InputBaseProps extends React.HTMLAttributes<HTMLInputElement> {
  className?: string;
  label: string;
  type: "text" | "email" | "password" | "select" | "textarea";
  onChange: (b: any) => void;
  hasError?: boolean;
  disabled?: boolean;
  layout?: "default" | "rows";
  defaultValue?: string | number;
  placeholder?: string;
  formatFeedback?: string;
  color?: string;
  maxlength?: number;
  selectedOption: any;
  setSelectedOption?: (b: any) => void;
  options: OptionsOrGroups<string, GroupBase<string>>;
}

export function InputBase({
  className,
  id,
  label = "Email",
  type = "text",
  hasError,
  disabled,
  layout = "default", // default || rows
  defaultValue,
  formatFeedback,
  color = "default",

  options,
  onChange,

  // Select specific
  setSelectedOption,

  children,
  ...rest
}: InputBaseProps) {
  const inputRef = useRef(null);
  // const inputWidthGetter = useRef(null);

  const [value, setValue] = useState("");

  const handleChange = (e) => {
    //
    const value = e.target.value;
    // onChange?.(value)
    // if (value === "") {
    //     setWidth("100%") ^ setTyping(false)
    //     return
    // }
    // setTyping(true)

    if (type === "password") {
      setValue("•".repeat(e.target.value.length));
    } else {
      setValue(value);
    }
    // setWidth(value.length + 4 + "ch")

    if (onChange) onChange(value);
  };

  const selectedOption = (options || []).find(
    // @ts-ignore
    (option) => option?.value == defaultValue
  );

  const isRows = layout === "rows";
  const isError = !!hasError;
  const isWhite = color === "white";

  return (
    <label
      htmlFor={id}
      className={cn(
        "input-base-container",
        "flex flex-col relative w-full h-[60px] border border-transparent px-5 pt-3.5 pb-3.5 pr-9 bg-[#f8f8f8] rounded-lg transition-[border-color] duration-300 [transition-timing-function:var(--ease-out-quad)]",
        "focus-within:border-studio-darker",
        isError &&
          "bg-[rgba(255,56,56,0.08)] border-studio-error [&>span]:text-[rgba(255,56,56,0.6)] [&_.label-feedback]:text-studio-error [&>div>input]:text-studio-error",
        disabled &&
          "bg-[#b1b1b1] [&>div>input::placeholder]:opacity-100 [&>div>input::placeholder]:text-[rgba(22,22,22,0.4)]",
        isWhite && "bg-white",
        isRows &&
          "bg-transparent rounded-none h-auto text-[rgba(255,255,255,0.6)] p-0 [&_.input-base:not(textarea)]:h-[42px] [&_.input-base]:bg-studio-dark [&_.input-base]:rounded-xl [&_.input-base]:px-[15px] [&_.input-base]:text-white [&_.input-base::placeholder]:text-[rgba(255,255,255,0.6)] [&_.label-feedback]:right-0",
        className
      )}
    >
      <span
        className={cn(
          "input-base-container-label",
          "relative -top-px left-px font-medium leading-[11px] not-italic text-[rgba(22,22,22,0.4)] uppercase text-[10px] flex",
          isRows &&
            "text-current text-[15px] font-normal leading-[17px] normal-case mb-[13px]"
        )}
      >
        {label}

        {formatFeedback && (
          <span
            className={cn(
              "label-feedback",
              "shrink-0 ml-auto relative -right-[13px]"
            )}
          >
            {formatFeedback}
          </span>
        )}
      </span>
      <div className={cn("flex items-center justify-start")}>
        {type === "select" ? (
          <Select
            // @ts-ignore
            setSelectedOption={setSelectedOption}
            onChange={(b) => {
              setSelectedOption(b);
              onChange(b);
            }}
            className="custom-select"
            classNamePrefix="custom-select-"
            isDisabled={disabled}
            // menuIsOpen={true}
            options={options}
            defaultValue={selectedOption}
          />
        ) : type === "textarea" ? (
          // @ts-ignore
          <textarea
            ref={inputRef}
            className={cn(
              "input-base",
              "outline-none h-full font-normal not-italic text-[var(--color)] text-[var(--font-size)] leading-[var(--line-height)] tracking-[var(--letter-spacing)] bg-transparent p-0 w-full border-none placeholder:text-[rgba(22,22,22,0.4)]",
              "[--font-size:15px] [--line-height:17px] [--letter-spacing:-0.3px] [--color:#161616]",
              "pt-[13px] max-w-full min-w-full resize-none"
            )}
            onChange={handleChange}
            defaultValue={defaultValue}
            {...rest}
            readOnly={disabled}
          />
        ) : (
          <input
            ref={inputRef}
            type={type}
            className={cn(
              "input-base",
              "outline-none h-full font-normal not-italic text-[var(--color)] text-[var(--font-size)] leading-[var(--line-height)] tracking-[var(--letter-spacing)] bg-transparent p-0 w-full border-none placeholder:text-[rgba(22,22,22,0.4)]",
              "[--font-size:15px] [--line-height:17px] [--letter-spacing:-0.3px] [--color:#161616]"
            )}
            onChange={handleChange}
            defaultValue={defaultValue}
            // style={{
            //     width,
            // }}
            {...rest}
            disabled={disabled}
          />
        )}
        {hasError && value !== "" && (
          <div
            className={cn(
              "absolute top-full w-full text-left left-0 flex items-center gap-1.5 text-studio-error text-[13px] not-italic font-normal leading-[15px] pl-[15px] pt-1.5",
              "[&_.icon]:shrink-0 [&_.icon]:mr-0.5"
            )}
          >
            <SpriteIcon id="danger" width={13} height={11} />
            {typeof hasError === "string" ? hasError : null}
          </div>
        )}
      </div>

      {children}
    </label>
  );
}
