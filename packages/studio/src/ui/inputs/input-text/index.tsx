import React from "react";

import { InputBase } from "../input-base";

export interface InputTextProps extends React.HTMLAttributes<HTMLInputElement> {
  className?: string;
  placeholder?: string;
  label: string;
  type: "text" | "email" | "password" | "select" | "textarea";
  layout?: "rows" | "columns";
  hasError?: boolean;
  disabled?: boolean;
  formatFeedback?: string;
  readonly?: boolean;
}

export function InputText({
  className,
  label = "Email",
  type = "text",
  defaultValue = "",
  hasError = false,
  disabled = false,
  formatFeedback = null,
  children,
  onChange,
  placeholder = "",
  ...rest
}: InputTextProps) {
  return (
    // @ts-ignore
    <InputBase
      label={label}
      type={type}
      hasError={hasError}
      disabled={disabled}
      onChange={onChange}
      placeholder={placeholder}
      defaultValue={defaultValue as string}
      formatFeedback={formatFeedback}
      {...rest}
    />
  );
}
