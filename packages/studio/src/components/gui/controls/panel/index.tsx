import React from "react";
import ReactDOM from "react-dom";

import { Floatbar } from "../shared/floatbar";

export type Props = {
  title: string;
  info?: React.ReactNode;
  children?: React.ReactNode;
  onSubmit?: (_) => unknown;
  onCancel?: (_) => unknown;
  submitAction?: string;
  style?: React.CSSProperties;
};

function _Panel({
  title,
  info,
  children,
  style,
}: Props) {
  return ReactDOM.createPortal(
    <Floatbar style={style} header={title} className="floatbar">
      {info != null ? info : null}
      <div className="w-full overflow-y-scroll overflow-x-hidden py-2.5 pr-5 pl-2.5 pt-2.5 pb-0 max-h-[calc(90vh-180px)] [&>div:not(:last-child)]:pb-2 [&>div:not(:last-child)]:border-b [&>div:not(:last-child)]:border-studio-border">
        {children}
      </div>
    </Floatbar>,

    document.body
  );
}

export const Panel = React.memo(_Panel);
