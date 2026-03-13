import React from "react";

export interface LayoutProps {
  children: React.ReactNode;
  layout?: "row" | "column";
  gap?: number;
  align?: "center" | "start" | "end";
  justify?: "center" | "start" | "end";
  wrap?: "wrap" | "nowrap";
  padding?: number;
}

function _Layout({
  children,
  layout = "row",
  gap = 10,
  align = "center",
  justify = "start",
  wrap = "wrap",
  padding = 0,
}: LayoutProps) {
  //

  return (
    <div
      style={{
        display: "flex",
        flexDirection: layout as any,
        alignItems: align,
        justifyContent: justify,
        gap,
        flexWrap: wrap as any,
        userSelect: "none",
        padding,
      }}
    >
      {children}
    </div>
  );
}

export const Layout = React.memo(_Layout);
