import { useEffect, useRef, useState } from "react";
import { useContextualTip } from "../hooks/use-contextual-tip";

export default function Tip({
  position = "bottom",
  visible = false,
  children = null,
  closeState = null,
  interactive = false,
  limitIsScrollable = false,
  boundElement = null,
  maxWidth = null,
  nowrap = false,
  defaultPos = null,
}) {
  //
  const container = useRef(null);

  const [isVisible, setIsVisible] = useState(false);

  const hasMounted = useRef(null);

  const {
    contextualTipCloseCallback,
    setContextualTipOptions,
  } = useContextualTip();

  useEffect(() => {
    if (isVisible) {
   
      const boundEl =
        boundElement || limitIsScrollable
          ? container.current.closest(".scrollable-section")
          : null;

      const options = {
        contextualTipContent: children,
        contextualTipParent: container.current.parentElement,
        contextualTipBoundElement: boundEl,
        contextualTipPos: position,

        contextualTipMaxWidth: maxWidth,
        contextualTipNoWrap: nowrap,
        contextualTipInteractive: interactive,
        contextualTipDefaultPos: defaultPos,
        contextualTipCloseCallback: closeState,
      };

      setContextualTipOptions(options);

      hasMounted.current = true;
    }

    return () => {
      if (!hasMounted.current) return;
      if (contextualTipCloseCallback && hasMounted.current)
        contextualTipCloseCallback();

      hasMounted.current = false;

      setContextualTipOptions({
        contextualTipContent: null,
        contextualTipParent: null,
        contextualTipHasRepositioned: false,
        contextualTipCloseCallback: null,
      });
    };
  }, [isVisible]);

  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  return <span ref={container} style={{ position: "absolute" }}></span>;
}
