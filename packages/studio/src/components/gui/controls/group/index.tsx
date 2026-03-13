import React from "react";
import { classes } from "../../../../utils/classes";

interface GroupProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Group({ children, className, style = {} }: GroupProps) {
  //

  return (
    <div
      className={classes("group w-full flex flex-col select-none", className)}
      style={style}
    >
      {children}
    </div>
  );
}
