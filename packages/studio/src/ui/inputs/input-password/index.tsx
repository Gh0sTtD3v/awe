import { useState } from "react";
import { cn } from "../../../utils/cn";
import { InputBase } from "../input-base";
import SpriteIcon from "../../sprite";

export function InputPassword({
  label,
  hasError,
  disabled,
  defaultValue,
  onChange,
  ...rest
}) {
  const [isView, setIsView] = useState(false);

  const onSeeClick = () => {
    setIsView(!isView);
  };

  return (
    // @ts-ignore
    <InputBase
      type={isView ? "text" : "password"}
      label={label}
      defaultValue={defaultValue}
      hasError={hasError}
      disabled={disabled}
      className={cn(
        "[&_.input-base]:pr-[30px]",
        "[&_.input-base-getter]:max-w-[calc(100%-22px-36px-30px)]"
      )}
      onChange={onChange}
      {...rest}
    >
      <button
        type="button"
        onClick={onSeeClick}
        className={cn(
          "absolute top-[22px] right-[22px] bottom-[22px] cursor-pointer",
          "[&_.icon]:opacity-40",
          isView && "[&_.icon]:opacity-100"
        )}
      >
        <SpriteIcon id="eye" width={20} height={15} />
      </button>
    </InputBase>
  );
}
