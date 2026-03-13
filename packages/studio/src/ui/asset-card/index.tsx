import { cn } from "../../utils/cn";
import React, { useState, useRef } from "react";
import Tip from "../tip";
import SpriteIcon from "../sprite";
import { NextImage } from "../next-image";

export interface AssetCardProps {
  icon?: string;
  title: string;
  count?: number;
  image?: string;
  fallbackImage?: string; // New prop for fallback image
  author?: string;
  message?: string;
  isVideo?: boolean;
  iconTitle?: string;
  editError?: string;
  editable?: boolean;
  selected?: boolean;
  disabled?: boolean;
  unoptimized?: boolean;
  showTip?: boolean;
  tip?: any;
  tooltip?: string;
  setHideEditorUi?: (hide: boolean) => void;
  className?: string;
  action?: "edit" | "add";
  objectFit?: "cover" | "contain";
  display?: "rectangle" | "square" | "row";
  color?: string;
  closeTip?: () => void;
  interactiveTip?: boolean;
  children?: React.ReactNode;

  //
  onDrag?: (e: React.DragEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  onRemove?: (e: React.MouseEvent) => void;
  onEditName?: (e: React.FormEvent) => void;
  onSettings?: (e: React.MouseEvent) => void;
  onPublish?: (e: React.MouseEvent) => void;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  onInputEditChange?: (e: React.FormEvent) => void;
}

export function AssetCard({
  display = "rectangle",
  icon,
  title,
  isVideo = false,
  action = "add",
  iconTitle = null,
  author,
  disabled = false,
  selected = false,
  editError = null,
  objectFit = "contain",
  image = "https://cyber.mypinata.cloud/ipfs/QmeHbpcFbaNChzbYFY8xvJRETCmQtWe4oUQrmFkG7hqt3w",
  fallbackImage = "https://cyber.mypinata.cloud/ipfs/QmeHbpcFbaNChzbYFY8xvJRETCmQtWe4oUQrmFkG7hqt3w", // Default fallback
  unoptimized = false,
  tip = null,
  tooltip = null,
  showTip,
  onSettings,
  onPublish,
  onDrag = null,
  onClick,
  onRemove,
  onEditName = null,
  onInputEditChange,
  onMouseEnter,
  onMouseLeave,
  className = "",
  setHideEditorUi = null,
  color = null,
  closeTip,
  interactiveTip,
  children = null,
}: AssetCardProps) {
  const editInput = useRef(null);
  const renameDoubleTapTimeout = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isHover, setIsHover] = useState(false);
  const [actionIsHover, setActionIsHover] = useState(false);
  const [_isDragging, setIsDragging] = useState(false);
  const [isInputFocus, setIsInputFocus] = useState(false);
  const [renameIsTapped, setRenameIsTapped] = useState(false);
  const [imgSrc, setImgSrc] = useState(image); // New state for managing image source
  const [name, setName] = useState<String>(title);

  const handleMouseOver = (e) => {
    setIsHover(true);
    if (onMouseEnter) {
      onMouseEnter(e);
    }
  };

  const handleMouseLeave = (e) => {
    setIsHover(false);
    if (onMouseLeave) {
      onMouseLeave(e);
    }
  };

  const handleImageError = () => {
    setImgSrc(fallbackImage);
    setIsLoading(false);
  };

  const onEditSubmit = (e) => {
    e.preventDefault();
    setName(e.currentTarget.value);
    onEditName(e);
  };

  const isHoverable = !disabled;

  return (
    <div
      className={cn(
        // Base container
        "group/card relative rounded-[10px] bg-studio-dark shrink-0 transition-[background] duration-100 ease-out-quad",
        // Hover: background + z-index (only when not disabled)
        isHoverable && "hover:z-10 hover:bg-studio-gray",
        // Disabled
        disabled && "disabled",
        // Action hovered
        actionIsHover && "action-hovered",
        // Editable
        onEditName && "editable",
        // Rename tapped
        renameIsTapped && "rename-tapped",
        // Input focused
        isInputFocus && "input-focused",
        // Selected
        selected && "z-[3]",
        // Hover z-index
        "hover:z-[3]",
        // Class hooks
        "asset-card",
        className,
      )}
      draggable={onDrag != null}
      onDragStart={(e) => {
        setIsDragging(true);
        onDrag(e);
      }}
      onDragEnd={() => {
        setIsDragging(false);
      }}
      onMouseEnter={handleMouseOver}
      onMouseLeave={handleMouseLeave}
    >
      {/* Full-size clickable overlay */}
      <button
        type="button"
        className={cn(
          "absolute top-0 left-0 w-full h-full block bg-transparent border-0 cursor-pointer z-[2]",
          disabled && "pointer-events-none",
        )}
        onClick={disabled ? null : onClick}
        disabled={disabled}
        title={!tip && tooltip ? tooltip : null}
      >
        <span className="sr-only">Add/See {name}</span>
      </button>

      {/* Inner wrapper */}
      <div
        className={cn(
          "relative z-[2] pointer-events-none border border-transparent",
          // Square display: column-reverse layout
          display === "square" && "flex flex-col-reverse shrink-0",
          // Selected state
          selected && "border-studio-border-active",
          // Disabled state
          disabled && "opacity-40 grayscale",
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "asset-card-header",
            "relative flex flex-col text-[11px] font-normal leading-[13px] text-white/60 w-full transition-colors duration-200 ease-out-quad pointer-events-none z-[3]",
            // Hover: white text
            isHoverable && "group-hover/card:text-white",
            // Square header styles
            display === "square" &&
              "my-0.5 px-1 pb-0.5 transition-transform duration-200 ease-out-quad",
            // Author header shift on hover
            isHoverable &&
              author &&
              display === "square" &&
              "group-hover/card:-translate-y-[13px]",
          )}
          style={{ color }}
        >
          {icon && <SpriteIcon id={icon} width={18} height={18} />}

          <div className="flex items-center justify-start gap-1.5 grow relative min-w-0">
            {iconTitle && (
              <SpriteIcon
                id={iconTitle}
                width={12}
                height={12}
                style={{
                  minWidth: "12px",
                  minHeight: "12px",
                }}
              />
            )}

            {onEditName && display === "square" ? (
              <>
                <button
                  type="button"
                  className={cn(
                    "text-current block max-w-full overflow-hidden whitespace-nowrap text-ellipsis text-[11px] font-normal leading-[13px] [&::first-letter]:uppercase",
                    // Editable title styles
                    "cursor-pointer z-[3] relative border border-transparent transition-[opacity,color,border-color] duration-200 ease-out-quad rounded-[4px] pointer-events-auto",
                    // Rename tapped
                    renameIsTapped && "!text-white !border-white/40",
                    // Input focused: hide title
                    isInputFocus && "opacity-0",
                  )}
                  onClick={() => {
                    clearTimeout(renameDoubleTapTimeout.current);
                    if (renameIsTapped && onEditName && display === "square") {
                      editInput.current.focus();
                      return;
                    }
                    setRenameIsTapped(true);
                    renameDoubleTapTimeout.current = setTimeout(() => {
                      setRenameIsTapped(false);
                    }, 200);
                  }}
                >
                  {name}
                </button>

                <form
                  className={cn(
                    "absolute -top-px left-0 h-[calc(100%+1px)] w-full flex items-center justify-between z-[5] pointer-events-none min-w-0",
                    // Focus-within handled via isInputFocus state
                    isInputFocus && "pointer-events-auto",
                  )}
                  onSubmit={(e) => {
                    e.preventDefault();
                    (e.currentTarget.elements[0] as HTMLElement).blur?.();
                  }}
                >
                  <input
                    ref={editInput}
                    type="text"
                    defaultValue={name as string}
                    className={cn(
                      "grow h-full w-full bg-transparent border-0 text-transparent px-1.5 py-[3px] text-[11px] font-normal leading-[13px] pointer-events-none outline-none rounded-[6px]",
                      // Input focused state
                      isInputFocus &&
                        "text-white! pointer-events-auto! border! border-studio-border-focus! bg-studio-gray-dark!",
                    )}
                    onFocus={() => {
                      setIsInputFocus(true);
                      setRenameIsTapped(false);
                    }}
                    onBlur={(e) => {
                      onEditSubmit(e);
                      setIsInputFocus(false);
                      setRenameIsTapped(false);
                    }}
                    onChange={(e) => {
                      if (onInputEditChange) {
                        onInputEditChange(e);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.keyCode === 27) {
                        editInput.current.value = title;
                      }
                    }}
                  />

                  {editError && isInputFocus && (
                    <div className="absolute bottom-full left-0 h-auto w-full bg-studio-error text-white text-[11px] font-normal px-1.5 py-1 leading-[1.2]">
                      {editError}
                    </div>
                  )}
                </form>
              </>
            ) : (
              <p className="text-current block max-w-full overflow-hidden whitespace-nowrap text-ellipsis text-[11px] font-normal leading-[13px] [&::first-letter]:uppercase">
                {name}
              </p>
            )}
          </div>

          {author && (
            <p
              className={cn(
                "absolute top-[calc(100%-4px)] left-[9px] w-full h-auto opacity-0 invisible transition-[opacity,visibility] duration-200 ease-out-quad text-white/60 text-[11px] font-normal leading-[13px]",
                isHoverable &&
                  "group-hover/card:visible group-hover/card:opacity-100",
              )}
            >
              {author}
            </p>
          )}
        </div>

        {/* Image wrapper */}
        <picture
          className={cn(
            "card-figure block w-full relative",
            // Before pseudo-element for gradient overlay
            "before:content-[''] before:absolute before:inset-0 before:bg-[linear-gradient(180deg,rgba(77,77,77,0)_70%,rgba(77,77,77,0.8)_90%,rgb(77,77,77)_100%)] before:z-2 before:opacity-0 before:transition-opacity before:duration-200 before:ease-out-quad before:pointer-events-none",
            // Hover: show gradient overlay
            isHoverable && "group-hover/card:before:opacity-100",
            // Square display
            display === "square" &&
              "aspect-square m-0.5 w-[calc(100%-4px)] rounded-[8px] overflow-hidden bg-studio-gray-darker shrink-0",
          )}
        >
          <div className="w-full h-full max-w-full max-h-full relative flex items-center justify-center">
            {isVideo ? (
              <video
                src={imgSrc}
                playsInline
                muted={true}
                autoPlay
                loop
                width={250}
                height={190}
                className="object-cover w-full h-full max-w-full max-h-full asset-card-image"
                //onError={handleImageError}
              ></video>
            ) : (
              <>
                {isLoading && (
                  <div className="absolute inset-0 w-full h-full opacity-70 animate-[skeleton-loading_1s_linear_infinite_alternate]" />
                )}
                <NextImage
                  src={imgSrc}
                  alt={title}
                  quality="75"
                  width={250}
                  height={190}
                  unoptimized={unoptimized}
                  className="object-cover w-full h-full max-w-full max-h-full asset-card-image"
                  style={{
                    objectFit,
                    visibility: isLoading ? "hidden" : "visible",
                  }}
                  onLoad={() => setIsLoading(false)}
                  //onError={handleImageError}
                />
              </>
            )}
          </div>

          {/* Actions overlay */}
          <div
            className={cn(
              "absolute bottom-2 right-0.5 max-w-[calc(100%-4px)] flex justify-end items-end pointer-events-none z-[6] opacity-0 invisible translate-y-2.5 gap-[3px] transition-[transform,opacity,visibility] duration-200 ease-out-quad",
              isHoverable &&
                "group-hover/card:opacity-100 group-hover/card:visible group-hover/card:translate-y-0",
            )}
          >
            {onSettings && (
              <button
                type="button"
                onClick={onSettings}
                className={cn(
                  "asset-card-action-btn",
                  "relative pointer-events-auto shrink-0 w-[18px] h-[18px] flex items-center justify-center rounded-[6px] transition-transform duration-200 ease-out-quad",
                  "before:absolute before:inset-0 before:content-[''] before:z-0 before:rounded-[6px] before:bg-[rgba(18,18,18,0.6)] before:backdrop-blur-[12.5px] before:transition-[background-color,backdrop-filter] before:duration-200 before:ease-out-quad",
                  "hover:before:bg-[rgba(18,18,18,1)]",
                  "[&>svg]:relative [&>svg]:z-[2]",
                )}
                onMouseEnter={() => {
                  setActionIsHover(true);
                }}
                onMouseLeave={() => {
                  setActionIsHover(false);
                }}
              >
                <SpriteIcon id="studio/settings" width={12} height={12} />
                <Tip position="fixed">Settings</Tip>
              </button>
            )}

            {onPublish && (
              <button
                type="button"
                onClick={onPublish}
                className={cn(
                  "asset-card-action-btn",
                  "relative pointer-events-auto shrink-0 w-[18px] h-[18px] flex items-center justify-center rounded-[6px] transition-transform duration-200 ease-out-quad",
                  "before:absolute before:inset-0 before:content-[''] before:z-0 before:rounded-[6px] before:bg-[rgba(18,18,18,0.6)] before:backdrop-blur-[12.5px] before:transition-[background-color,backdrop-filter] before:duration-200 before:ease-out-quad",
                  "hover:before:bg-[rgba(18,18,18,1)]",
                  "[&>svg]:relative [&>svg]:z-[2]",
                )}
                onMouseEnter={() => {
                  setActionIsHover(true);
                }}
                onMouseLeave={() => {
                  setActionIsHover(false);
                }}
              >
                <SpriteIcon id="studio/publish" width={12} height={12} />
                <Tip position="fixed">Publish</Tip>
              </button>
            )}

            {onRemove && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(e);
                }}
                className={cn(
                  "asset-card-action-btn",
                  "relative pointer-events-auto shrink-0 w-[18px] h-[18px] flex items-center justify-center rounded-[6px] transition-transform duration-200 ease-out-quad",
                  "before:absolute before:inset-0 before:content-[''] before:z-0 before:rounded-[6px] before:bg-[rgba(18,18,18,0.6)] before:backdrop-blur-[12.5px] before:transition-[background-color,backdrop-filter] before:duration-200 before:ease-out-quad",
                  "hover:before:bg-[rgba(18,18,18,1)]",
                  "[&>svg]:relative [&>svg]:z-[2]",
                )}
                onMouseEnter={() => {
                  setActionIsHover(true);
                }}
                onMouseLeave={() => {
                  setActionIsHover(false);
                }}
              >
                <SpriteIcon id="studio/trash-filled" width={12} height={12} />
                <Tip position="fixed">Delete</Tip>
              </button>
            )}

            {onClick && action === "edit" && (
              <span
                className={cn(
                  "asset-card-action-btn asset-card-default-btn",
                  "relative shrink-0 w-[18px] h-[18px] flex items-center justify-center rounded-[6px] bg-white/20 backdrop-blur-none pointer-events-none",
                  "[&>svg]:relative [&>svg]:z-[2]",
                  "[&_.icon]:text-white",
                )}
              >
                <SpriteIcon id="pencil" width={10} height={10} />
              </span>
            )}
          </div>
        </picture>
      </div>

      {tip && (
        <Tip position="fixed" visible={(isHover && !actionIsHover) || showTip} interactive={interactiveTip} closeState={closeTip}>
          {children ? (
            children
          ) : (
            <dl>
              <dt>{name}</dt>
              <dd>{tip}</dd>
            </dl>
          )}
        </Tip>
      )}
    </div>
  );
}
