import { useEffect, useRef, useState } from "react";
import { classes } from "../utils/classes";

import WorldItems from "./world-items";
import { EditComponent } from "./edit-component";
import SpriteIcon from "../ui/sprite";
import ButtonIcon from "../ui/button-icon";

import { gsap } from "gsap";
// @ts-ignore
import { Draggable } from "../ui/utils/gsap/draggable-plugin";
if (typeof window !== "undefined") {
  gsap.registerPlugin(Draggable);
}

import { useGSAP } from "@gsap/react";
import { useContentTab } from "../contexts/content-tab-context";
import { useWorldItemsPanel } from "../hooks/use-world-items-panel";
import { useWorldSelection } from "../hooks/use-world-selection";

const styles = {
  rightPanels: "rightPanels",
  onlyButton: "onlyButton",
  worldItemsButton: "worldItemsButton",
  rightPanelWrapper: "rightPanelWrapper",
  rightPanelDragBar: "rightPanelDragBar",
  rightPanelDragBarVisible: "rightPanelDragBarVisible",
  rightPanelBounds: "rightPanelBounds",
  rightPanelDivision: "rightPanelDivision",
  rightPanelItems: "rightPanelItems",
  hasDivider: "hasDivider",
  mouseIsDragging: "mouseIsDragging",
  divisionResizerUi: "divisionResizerUi",
  singleWorldItemsResizer: "singleWorldItemsResizer",
  divisionResizer: "divisionResizer",
  rightPanelEdit: "rightPanelEdit",
  studioPanelEditComponent: "studioPanelEditComponent",
  rightPanelDivisionBounds: "rightPanelDivisionBounds",
  singleWorldItems: "singleWorldItems",
};

export default function RightPanels({
  countByType,
  showWorldItems,
  setShowWorldItems,
}) {
  const panel = useRef(null);
  const bounds = useRef(null);

  const divisions = useRef([]);
  const divisionBounds = useRef(null);
  const divisionResizer = useRef(null);

  const draggableBar = useRef(null);

  const { mouseIsDragging } = useWorldItemsPanel();

  const [ready, setReady] = useState(false);
  const [draggableBarHeight, setDraggableBarHeight] = useState(1);

  const singleWorldItemsResizer = useRef(null);

  const {
    activeTab,
    rightBarWidth,
    rightBarDivider,
    editPanelAttached,
    singleWorldItemsHeight,
    setRightBarWidth,
    setRightBarDivider,
    setSingleWorldItemsHeight,
  } = useContentTab();

  const { singleSelected: selected } = useWorldSelection();

  const BASE_WIDTH = 243;

  const calculateDragBarHeight = () => {
    setTimeout(() => {
      let height = 0;

      if (divisions.current[0]) {
        height += divisions.current[0].offsetHeight;
      }

      if (divisions.current[1]) {
        height += divisions.current[1].offsetHeight;
      }

      setDraggableBarHeight(height);
    }, 10);
  };

  useGSAP(() => {
    Draggable.create(draggableBar.current, {
      type: "x",
      bounds: bounds.current,
      onDrag: function () {
        const w = BASE_WIDTH + Math.abs(this.x);
        setRightBarWidth(w);
      },
    });
    setReady(true);
  }, []);

  useGSAP(
    () => {
      const height = panel.current.offsetHeight;

      if (!selected?.data.id || (selected?.data.id && !editPanelAttached)) {
        gsap.set(singleWorldItemsResizer.current, {
          y: `${(height / 100) * singleWorldItemsHeight}px`,
        });

        Draggable.create(singleWorldItemsResizer.current, {
          type: "y",
          bounds: divisionBounds.current,
          onDrag: function () {
            const height = panel.current.offsetHeight;
            let newY = this.y;
            const firstPanelHeight = (newY / height) * 100;
            setSingleWorldItemsHeight(firstPanelHeight);
          },
        });
      } else {
        gsap.set(divisionResizer.current, {
          y: `${(height * rightBarDivider[0]) / 100}px`,
        });

        Draggable.create(divisionResizer.current, {
          type: "y",
          bounds: divisionBounds.current,
          onDrag: function () {
            const height = panel.current.offsetHeight;
            let newY = this.y;

            let newDivision;

            const firstPanelHeight = (newY / height) * 100;
            newDivision = [firstPanelHeight, 100 - firstPanelHeight];

            setRightBarDivider(newDivision);
          },
        });
      }
    },
    {
      dependencies: [showWorldItems, editPanelAttached, selected?.data.id],
      revertOnUpdate: true,
    }
  );

  useEffect(() => {
    if (selected?.data.id && editPanelAttached) {
      setShowWorldItems(true);
    }
  }, [editPanelAttached, selected?.data.id]);

  useEffect(() => {
    calculateDragBarHeight();
  }, [
    editPanelAttached,
    selected?.data.id,
    showWorldItems,
    countByType["worldItems"],
  ]);

  const isEditPanelAttached = editPanelAttached || activeTab === "script";

  const worldItemsHeight =
    selected?.data.id && isEditPanelAttached
      ? `${rightBarDivider[0]}%`
      : `${singleWorldItemsHeight !== 0 ? singleWorldItemsHeight : 100}%`;

  return (
    <div
      ref={panel}
      className={classes(
        styles.rightPanels,
        ready &&
          !showWorldItems &&
          (!selected?.data.id || (selected?.data.id && !isEditPanelAttached)) &&
          styles.onlyButton
      )}
    >
      {!showWorldItems && (
        <ButtonIcon
          intent="primary"
          color={showWorldItems ? "white" : "black"}
          onClick={() => {
            setShowWorldItems(!showWorldItems);
          }}
          count={countByType?.["worldItems"]}
          className={styles.worldItemsButton}
        >
          <SpriteIcon id="studio/layers" width={20} height={18} />
        </ButtonIcon>
      )}

      <div className={styles.rightPanelWrapper}>
        <div
          ref={draggableBar}
          className={classes(
            styles.rightPanelDragBar,
            (showWorldItems || selected?.data.id) &&
              styles.rightPanelDragBarVisible
          )}
          style={{
            maxHeight:
              (!selected?.data.id ||
                (selected?.data.id && !editPanelAttached)) &&
              showWorldItems
                ? `${singleWorldItemsHeight}%`
                : `${draggableBarHeight}px`,
          }}
        />
        <div ref={bounds} className={styles.rightPanelBounds} />

        <div
          ref={divisionBounds}
          className={classes(
            styles.rightPanelDivisionBounds,
            (!selected?.data.id || (selected?.data.id && !editPanelAttached)) &&
              styles.singleWorldItems
          )}
        />

        {showWorldItems && (
          <div
            ref={(el) => {
              divisions.current[0] = el;
            }}
            className={classes(
              styles.rightPanelDivision,
              styles.rightPanelItems,
              styles.hasDivider,
              mouseIsDragging && styles.mouseIsDragging
            )}
            style={{
              height: worldItemsHeight,
            }}
          >
            <WorldItems
              count={countByType["worldItems"]}
              showWorldItems={showWorldItems}
              setShowWorldItems={setShowWorldItems}
            />

            {((selected?.data.id && editPanelAttached) ||
              ((!selected?.data.id ||
                (selected?.data.id && !editPanelAttached)) &&
                showWorldItems)) && (
              <div className={styles.divisionResizerUi} />
            )}

            {(!selected?.data.id ||
              (selected?.data.id && !editPanelAttached)) && (
              <div
                ref={singleWorldItemsResizer}
                className={styles.singleWorldItemsResizer}
              />
            )}
          </div>
        )}

        {selected?.data.id && showWorldItems && isEditPanelAttached && (
          <div ref={divisionResizer} className={styles.divisionResizer} />
        )}

        {selected?.data.id && isEditPanelAttached && (
          <div
            ref={(el) => {
              divisions.current[1] = el;
            }}
            className={classes(
              styles.rightPanelDivision,
              styles.rightPanelEdit
            )}
            style={{
              maxHeight: showWorldItems ? `${rightBarDivider[1]}%` : "100%",
            }}
          >
            {showWorldItems && <div className={styles.divisionResizerUi} />}
            <EditComponent
              showWorldItems={showWorldItems}
              className={styles.studioPanelEditComponent}
              onSizeChanged={calculateDragBarHeight}
            />
          </div>
        )}
      </div>
    </div>
  );
}
