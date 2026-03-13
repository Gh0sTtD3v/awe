import React, { useRef } from "react";
import ReactDOM from "react-dom";
import SpriteIcon from "../../../ui/sprite";
import { noop } from "../../../utils/js";
import { classes } from "../../../utils/classes";
import { useEffectOnce } from "../../../hooks/use-effect-once";

export interface UserDialogProps {
  id?: any;
  style?: object;
  overlayStyle?: object;
  isModal?: boolean;
  className?: string;
  preventDefaultClosing?: boolean;
  layout?: string;
  openedMenu?: string;
  sidebarPosition?: string;
  iconStyle?: object;
  onClose?: () => void;
}

export interface DialogProps extends UserDialogProps {
  show?: boolean;
  onHide?: () => unknown;
  children: React.ReactNode;
}

let dialogRoot: HTMLDivElement;

function getDialogRoot() {
  //
  if (dialogRoot == null) {
    dialogRoot = document.createElement("div");
    dialogRoot.id = "dialogs-root";
    document.body.appendChild(dialogRoot);
  }

  return dialogRoot;
}

export function Dialog({
  style = {},
  overlayStyle = {},
  show = true,
  preventDefaultClosing = false,
  onHide = noop,
  isModal = false,
  children,
  className = "",
  layout,
}: DialogProps) {
  //
  const content = useRef(null);
  const closeButton = useRef(null);
  const isWide = layout === "wide";

  if (!show) return null;

  const handleHide = () => {
    //
    if (!isModal) {
      onHide();
    }
  };

  useEffectOnce(() => {
    if (show) {
      let firstFocusable = content.current.querySelector(
        "input, button, a, textarea"
      );

      if (!firstFocusable && closeButton.current) {
        firstFocusable = closeButton.current;
      }

      firstFocusable?.focus();
    }
  });

  return ReactDOM.createPortal(
    <>
      <div
        className="fixed w-full top-0 left-0 h-screen bg-[rgba(10,10,10,0.8)]"
        style={overlayStyle || {}}
        onClick={!preventDefaultClosing ? handleHide : null}
        onTouchStart={!preventDefaultClosing ? handleHide : null}
      />
      <div
        style={{ ...style }}
        className={classes(
          "dialog-modal fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-studio-black rounded-[10px]",
          className
        )}
      >
        <div
          className={classes(
            "relative",
            isWide ? "w-[700px] h-[450px]" : "w-[362px]"
          )}
        >
          {!preventDefaultClosing && (
            <button
              ref={closeButton}
              type="button"
              onClick={handleHide}
              className="dialog-close-icon absolute top-[22px] right-[22px] cursor-pointer text-white outline-none"
            >
              <span className="u-visually-hidden">Close modal</span>
              <SpriteIcon id="close" width={14} height={14} />
            </button>
          )}

          <div
            ref={content}
            className={classes(
              "dialog-content-inner p-[39px_39px_34px_39px] w-full flex gap-[41px] flex-col items-center overflow-auto max-h-[calc(90vh-20px)] [&>div]:w-full",
              isWide && "h-full"
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </>,

    getDialogRoot()
  );
}
