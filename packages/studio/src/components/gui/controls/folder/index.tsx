import React from "react";
import { NextImage } from "../../../../ui/next-image";
import { classes } from "../../../../utils/classes";
import SpriteIcon from "../../../../ui/sprite";

interface CollapseProps {
  collapsed: boolean;
  count: number | null;
  image: string | null;
  title: string;
  onToggle: () => void;
  style?: React.CSSProperties;
  actions?: React.ReactNode | null;
}

const Collapse = React.memo(
  ({
    collapsed,
    count,
    image,
    title,
    onToggle,
    style = {},
    actions = null,
  }: CollapseProps) => {
    return (
      <button
        type="button"
        className={classes(
          "folder-header w-full flex cursor-pointer items-center h-[43px] text-white relative -ml-[15px] w-[calc(100%+30px)] pl-[15px] pr-[15px] transition-colors duration-300 ease-out-quad border-t border-white/10"
        )}
        style={style}
        onClick={() => {
          //
          onToggle();
        }}
      >
        {image && (
          <figure className="ml-1 flex-shrink-0 w-8 h-8 block relative mr-[9px] rounded overflow-hidden">
            <NextImage
              fill
              src={image}
              style={{ objectFit: "contain" }}
              alt={title || "image"}
            />
          </figure>
        )}

        <span className="text-[15px] text-current font-normal leading-normal max-w-[95%] overflow-hidden whitespace-nowrap text-ellipsis">
          {title}
          {count != null ? (
            <span className="opacity-40">{` (${count})`}</span>
          ) : null}
        </span>

        <SpriteIcon id="chevron-right" width={6} height={9} />
        {actions && <div>{actions}</div>}
      </button>
    );
  }
);

export function Folder({
  title,
  collapsed,
  count = null,
  image = null,
  onToggle,
  color = null,
  children,
  style = {},
  headerStyle = {},
  headerActions = null,
}) {
  //
  return (
    <div
      className={classes(
        "folder w-full flex flex-col overflow-hidden flex-shrink-0",
        color === "white" && "bg-white [&_.folder-header]:text-studio-black/40 [&.folder.collapsed_.folder-header]:text-studio-black hover:[&_.folder-header]:text-studio-black",
        color === "accent" && "[&_.folder-header]:text-studio-info/70 [&.folder.collapsed_.folder-header]:text-studio-info hover:[&_.folder-header]:text-[#b4d7ff]",
        collapsed && "collapsed"
      )}
      style={style}
    >
      <Collapse
        title={title}
        count={count}
        image={image}
        collapsed={collapsed}
        onToggle={onToggle}
        style={headerStyle}
        actions={headerActions}
      />
      <div
        className={classes("folder-content w-full pt-[3px] pb-[31px] px-[3px] last:pb-3")}
        style={{
          display: collapsed ? "none" : "block",
        }}
      >
        {children}
      </div>
    </div>
  );
}
