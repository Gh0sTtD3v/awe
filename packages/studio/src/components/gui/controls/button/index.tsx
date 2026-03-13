import React from "react";

export interface ButtonProps {
  label: string;
  onAction: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
}

function _Button({ label, onAction, disabled = false }: ButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault();
    onAction(e);
  };

  return (
    <div className="flex flex-1 w-full h-[30px] items-center justify-center">
      <button
        disabled={disabled}
        type="button"
        onClick={handleClick}
        className="flex w-full h-[26px] items-center justify-center border-none outline-none cursor-pointer rounded bg-white/[0.08] text-white text-center text-[11px] font-normal leading-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {label ? label : null}
      </button>
    </div>
  );
}

export const Button = React.memo(_Button);
