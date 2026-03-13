import React from "react";
import { cn } from "../../../utils/cn";

interface FormSelectInputProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  className?: string;
}

function FormSelectInput({ label = "", ...rest }: FormSelectInputProps) {
  return (
    <div
      className={cn(
        "flex relative flex-col w-full bg-white rounded-[20px] gap-[6px] h-[60px] px-[21px] py-[15px]",
        "desktop:gap-[6px] desktop:h-[60px] desktop:px-[21px] desktop:py-[15px]"
      )}
      {...rest}
    >
      <span
        className={cn(
          "w-full leading-[100%] font-medium not-italic tracking-[0.2px] uppercase text-[0.625rem]",
          "text-[rgba(54,54,72,0.4)]",
          "desktop:text-[0.625rem]"
        )}
      >
        {label}
      </span>
      <select
        className={cn(
          "w-full border-none flex outline-none font-normal appearance-none leading-[100%] not-italic",
          "relative items-center text-[0.738rem] tracking-[0.2px] bg-transparent uppercase",
          "text-[rgba(54,54,72,0.4)]"
        )}
        defaultValue="select"
      >
        <option value="select" className="select">
          Select
        </option>
        <option>Morocco</option>
        <option>Usa</option>
      </select>
    </div>
  );
}

export default FormSelectInput;
