import { InputBase } from "../input-base";

export interface InputTextareaProps
  extends React.HTMLAttributes<HTMLInputElement> {
  className?: string;
  placeholder?: string;
  label: string;
  type?: string;
  layout?: "rows" | "columns";
  hasError?: string | boolean;
  disabled?: boolean;
  formatFeedback?: string;
  rows?: number;
}

export function InputTextarea({
  className,
  label = "Email",
  type = "textarea",
  defaultValue,
  hasError,
  disabled,
  formatFeedback,
  children,
  onChange,
  placeholder = "",
  ...rest
}: InputTextareaProps) {
  return (
    <InputBase
      label={label}
      // @ts-ignore
      defaultValue={defaultValue as string}
      // @ts-ignore
      type={type}
      // @ts-ignore
      hasError={hasError}
      disabled={disabled}
      onChange={onChange}
      placeholder={placeholder}
      formatFeedback={formatFeedback}
      {...rest}
    />
  );
}
