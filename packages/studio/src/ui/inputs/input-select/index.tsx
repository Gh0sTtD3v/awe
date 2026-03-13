import React, { useState } from "react";
import { InputBase } from "../input-base";
import { cn } from "../../../utils/cn";

export interface InputSelectProps
  extends React.HTMLAttributes<HTMLInputElement> {
  className?: string;

  label: string;
  hasError?: boolean;
  disabled?: boolean;
  defaultValue?: string;
}

const inputSelectClass = cn(
  // .custom-select base
  "[&_.custom-select]:absolute [&_.custom-select]:top-px [&_.custom-select]:left-px",
  "[&_.custom-select]:w-full [&_.custom-select]:h-full [&_.custom-select]:outline-none",

  // .custom-select svg
  "[&_.custom-select_svg]:fill-[#161616]",
  "[&_.custom-select_svg]:transition-transform [&_.custom-select_svg]:duration-500",
  "[&_.custom-select_svg]:[transition-timing-function:var(--ease-out-expo)]",
  "[&_.custom-select_svg]:w-4 [&_.custom-select_svg]:h-4",

  // .custom-select > div:first-of-type (control)
  "[&_.custom-select>div:first-of-type]:h-full",
  "[&_.custom-select>div:first-of-type]:border-0",
  "[&_.custom-select>div:first-of-type]:bg-transparent",
  "[&_.custom-select>div:first-of-type]:rounded-lg",
  "[&_.custom-select>div:first-of-type]:shadow-none",
  "[&_.custom-select>div:first-of-type]:outline-none",

  // control when menu is open -> rotate svg
  "[&_.custom-select-__control--menu-is-open_svg]:rotate-180",

  // control > div:first-child (value container)
  "[&_.custom-select>div:first-of-type>div:first-child]:pl-5",
  "[&_.custom-select>div:first-of-type>div:first-child]:pt-[15px]",

  // control > div:first-child > div:first-child (single value)
  "[&_.custom-select>div:first-of-type>div:first-child>div:first-child]:text-[15px]",
  "[&_.custom-select>div:first-of-type>div:first-child>div:first-child]:not-italic",
  "[&_.custom-select>div:first-of-type>div:first-child>div:first-child]:font-normal",
  "[&_.custom-select>div:first-of-type>div:first-child>div:first-child]:leading-[17px]",
  "[&_.custom-select>div:first-of-type>div:first-child>div:first-child]:tracking-[-0.3px]",

  // control > div:last-child > span (separator) hidden
  "[&_.custom-select>div:first-of-type>div:last-child>span]:hidden",

  // dropdown menu (div:last-of-type:not(:first-of-type))
  "[&_.custom-select>div:last-of-type:not(:first-of-type)]:rounded-lg",
  "[&_.custom-select>div:last-of-type:not(:first-of-type)]:overflow-auto",
  "[&_.custom-select>div:last-of-type:not(:first-of-type)]:p-[3px_7px]",

  // menu items
  "[&_.custom-select>div:last-of-type:not(:first-of-type)>div>div]:p-[10px_12px]",
  "[&_.custom-select>div:last-of-type:not(:first-of-type)>div>div]:rounded-md",
  "[&_.custom-select>div:last-of-type:not(:first-of-type)>div>div]:text-studio-dark-alt-2",
  "[&_.custom-select>div:last-of-type:not(:first-of-type)>div>div]:text-[15px]",
  "[&_.custom-select>div:last-of-type:not(:first-of-type)>div>div]:not-italic",
  "[&_.custom-select>div:last-of-type:not(:first-of-type)>div>div]:font-normal",
  "[&_.custom-select>div:last-of-type:not(:first-of-type)>div>div]:leading-[17px]",
  "[&_.custom-select>div:last-of-type:not(:first-of-type)>div>div]:tracking-[-0.3px]",
  "[&_.custom-select>div:last-of-type:not(:first-of-type)>div>div]:cursor-pointer",

  // menu items spacing (not last child)
  "[&_.custom-select>div:last-of-type:not(:first-of-type)>div>div:not(:last-child)]:mb-[3px]",

  // menu items hover & focused & selected states
  "hover:[&_.custom-select>div:last-of-type:not(:first-of-type)>div>div]:bg-[rgba(22,22,22,0.08)]",
  "[&_.custom-select-__option--is-focused]:bg-[rgba(22,22,22,0.08)]",
  "[&_.custom-select-__option--is-selected]:bg-[rgba(22,22,22,0.08)]",
);

export function InputSelect({
  className,
  label = "Country",
  defaultValue = null,
  hasError,
  disabled,
  children,
  ...rest
}: InputSelectProps) {
  //
  const [selectedOption, setSelectedOption] = useState(defaultValue);

  return (
    // @ts-ignore
    <InputBase
      label={label}
      type="select"
      className={cn(inputSelectClass, className)}
      hasError={hasError}
      disabled={disabled}
      setSelectedOption={setSelectedOption}
      defaultValue={selectedOption}
      {...rest}
    />
  );
}
