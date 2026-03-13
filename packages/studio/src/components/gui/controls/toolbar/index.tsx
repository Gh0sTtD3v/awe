import React from "react";
import IconImg from "../../../../ui/icon-image";

interface ToolbarAction {
  icon: string;
  disabled: boolean;
  onAction: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

interface ToolbarProps {
  actions: ToolbarAction[];
}

function _Toolbar({ actions }: ToolbarProps) {
  //
  const handleClick =
    (action) =>
    (e: React.MouseEvent<HTMLButtonElement>): void => {
      //
      e.preventDefault();

      action(e);
    };

  return (
    <div className="flex w-full flex-row items-center justify-between gap-2">
      {actions.map((action, i) => {
        //
        return (
          <button
            className="flex items-center justify-center w-[66px] h-[58px] border-none outline-none cursor-pointer rounded-lg bg-[linear-gradient(90deg,rgba(6,6,6,0.48)_0%,rgba(6,6,6,0.6)_100%)] backdrop-blur-[12.5px] max-[600px]:w-full hover:bg-studio-dark-alt-3 disabled:opacity-30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[rgba(61,63,70,0.5)]"
            key={i}
            onClick={handleClick(action.onAction)}
            disabled={action.disabled}
          >
            <IconImg
              name={action.icon}
              size={22}
              style={{ filter: "invert(1)" }}
            />
          </button>
        );
      })}
    </div>
  );
}

export const Toolbar = React.memo(_Toolbar);
