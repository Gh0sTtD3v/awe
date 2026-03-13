import { gsap } from "gsap";
import { useEffect, useRef, useState } from "react";
import { classes } from "../utils/classes";
import { useGSAP } from "@gsap/react";
// @ts-ignore
import { Draggable } from "../ui/utils/gsap/draggable-plugin";
import { useEventCallback } from "../hooks/use-event-callback";
import { EditComponent } from "./edit-component";
import { useContentTab } from "../contexts/content-tab-context";
import { useWorldSelection } from "../hooks/use-world-selection";

if (typeof window !== "undefined") {
  gsap.registerPlugin(Draggable);
}

const styles = {
  centerPanel: "centerPanel",
  centerEditSizeYBounds: "centerEditSizeYBounds",
  centerEditComponent: "centerEditComponent",
  centerEditComponentDrag: "centerEditComponentDrag",
  studioEditComponent: "studioEditComponent",
  divisionResizerUi: "divisionResizerUi",
  centerResizeBar: "centerResizeBar",
};

export default function CenterPanel({ showWorldItems, children = null }) {
  const panel = useRef(null);
  const editComponent = useRef(null);
  const draggableBar = useRef(null);
  const resizeBar = useRef(null);
  const sizeYBounds = useRef(null);

  const dragInstance = useRef(null);
  const resizeInstance = useRef(null);

  const dragStartValue = useRef(null);

  const [spaceBottom, setSpacebottom] = useState(0);
  const [editFullHeight, setEditFullHeight] = useState(null);

  const { singleSelected: selected } = useWorldSelection();
  const {
    tabWidth,
    activeTab,
    rightBarWidth,
    editPanelAttached,
    editComponentTopPos,
    editComponentLeftPos,
    editPanelAttachedHeight,
    editComponentMaxHeight,
    editComponentHasResized,
    setEditComponentTopPos,
    setEditComponentLeftPos,
    setEditPanelAttachedHeight,
    setEditComponentMaxHeight,
    setEditComponentHasResized,
  } = useContentTab();

  useEffect(() => {
    if (!panel.current || !selected?.data?.id || editPanelAttached) return;

    gsap.set(editComponent.current, {
      y: `${editComponentTopPos ? editComponentTopPos : 0}px`,
      x: `${editComponentLeftPos ? editComponentLeftPos : 0}px`,
    });

    const ctx = gsap.context(() => {
      dragInstance.current = Draggable.create(editComponent.current, {
        bounds: panel.current,
        trigger: draggableBar.current,
        onDrag: function () {
          setEditComponentTopPos(this.y);
          setEditComponentLeftPos(this.x);
          setEditPanelBoundHeight();
        },
      });
    });

    setEditPanelBoundHeight();

    return () => {
      ctx.revert();
    };
  }, [selected?.data?.id, editFullHeight, editPanelAttached]);

  const onSizeChanged = useEventCallback(() => {
    setEditPanelBoundHeight();

    if (!editComponentHasResized) {
      gsap.set(editComponent.current, {
        maxHeight: `100%`,
      });
    }
  }, []);

  const setEditPanelBoundHeight = useEventCallback(() => {
    const scrollable = editComponent?.current?.querySelector(
      ".scrollable-wrapper"
    );

    if (!scrollable) return;

    let fullHeight = scrollable.scrollHeight + 45 + 42 + 9;

    setEditFullHeight(fullHeight);
    setSpacebottom(
      Math.max(0, panel.current.offsetHeight - editComponentTopPos - fullHeight)
    );
    setEditComponentMaxHeight(editComponent.current.offsetHeight);
  }, [editComponentTopPos]);

  const resizeY = useEventCallback((y) => {
    gsap.set(editComponent.current, {
      maxHeight: `${y}px`,
    });
  }, []);

  useGSAP(
    () => {
      if (editPanelAttached || !selected?.data.id) return;

      setEditPanelBoundHeight();
      dragStartValue.current = editComponent.current.offsetHeight;
      setEditComponentMaxHeight(editComponent.current.offsetHeight);

      resizeInstance.current = Draggable.create(resizeBar.current, {
        type: "y",
        y: 0,
        bounds: sizeYBounds.current,
        onDragStart: () => {},
        onDrag: function () {
          setEditComponentHasResized(true);
          resizeY(dragStartValue.current + this.y);
        },
      });

      setEditPanelBoundHeight();
    },
    {
      dependencies: [
        selected,
        editFullHeight,
        spaceBottom,
        showWorldItems,
        editPanelAttached,
        selected?.data.id,
      ],
      revertOnUpdate: true,
    }
  );

  const onResize = () => {
    if (dragInstance.current) {
      dragInstance?.current?.[0]?.applyBounds();
      resizeInstance.current?.[0]?.applyBounds();
    }
  };

  useEffect(() => {
    // @ts-ignore
    setEditComponentTopPos(gsap.getProperty(editComponent.current, "y"));
    // @ts-ignore
    setEditComponentLeftPos(gsap.getProperty(editComponent.current, "x"));

    if (dragInstance.current) {
      dragInstance?.current?.[0]?.applyBounds();
      resizeInstance.current?.[0]?.applyBounds();
    }
  }, [tabWidth, rightBarWidth, showWorldItems, activeTab]);

  useEffect(() => {
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div
      ref={panel}
      className={classes(styles.centerPanel)}
      style={{
        // @ts-ignore
        "--detached-edit-panel-top": `${editComponentTopPos}px`,
        "--detached-edit-panel-left": `${editComponentLeftPos}px`,
        "--detached-edit-panel-bottom": `${spaceBottom}px`,
        "--detached-edit-panel-maxheight": `${editComponentMaxHeight}px`,
      }}
    >
      {!editPanelAttached && selected?.data.id && (
        <>
          <div ref={sizeYBounds} className={styles.centerEditSizeYBounds} />
          <div ref={editComponent} className={styles.centerEditComponent}>
            <div
              ref={draggableBar}
              className={styles.centerEditComponentDrag}
              onClick={() => {
                draggableBar.current.focus();
              }}
              tabIndex={0}
            />
            <EditComponent
              showWorldItems={showWorldItems}
              className={styles.studioEditComponent}
              onSizeChanged={onSizeChanged}
            />
            <div className={styles.divisionResizerUi} />
          </div>
          <div ref={resizeBar} className={styles.centerResizeBar} />
        </>
      )}
    </div>
  );
}
