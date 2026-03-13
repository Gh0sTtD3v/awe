import React, { useState, useRef, useEffect, useMemo } from "react";
import { cubicBezier } from "framer-motion";
import { classes } from "../utils/classes";
import { gsap } from "gsap";

// @ts-ignore
import { Draggable } from "../ui/utils/gsap/draggable-plugin";

if (typeof window !== "undefined") {
  gsap.registerPlugin(Draggable);
}

import SpriteIcon from "../ui/sprite";
import { useWorldItems } from "../hooks/use-world-items";
import { useEventCallback } from "../hooks/use-event-callback";
import { useCurrentGameData } from "../contexts/game-data-context";
import { SearchInput } from "../ui/search-input";
import { NextImage } from "../ui/next-image";

import { useComponentTypesMap } from "../hooks/component-hooks";
import { useWorldSelection } from "../hooks/use-world-selection";
import { useEditorService } from "../contexts/editor-service-context";
import { ScrollableSection } from "./scrollable-section";
import { useContentTab } from "../contexts/content-tab-context";
import DragDestination from "./drag-destination";
import DragSource from "./drag-source";
import Tip from "../ui/tip";
import { useOnClickOutside } from "../hooks/use-on-click-outside";
import { showConfirm, showError } from "../modals/context";

import { RenameField } from "./rename-field";
import { useWorldItemsPanel } from "../hooks/use-world-items-panel";
import { canShowHide } from "../utils/editor";

const ItemName = ({ item }) => {
  //
  const input = useRef(null);

  const { editor } = useEditorService();

  const { allSelected } = useWorldSelection();

  const onBlur = () => {
    if (input.current.value !== "") {
      editor.updateComponent(item.data.id, {
        name: input.current.value,
      });
    } else {
      input.current.value = item.name;
    }

    input.current.blur();
  };

  const onSubmit = (e) => {
    e.preventDefault();
    onBlur();
  };

  const onInputClick = (e) => {
    const ids = allSelected.map((obj) => obj.data.id);

    if (e.metaKey) {
      editor.selectComponents([...ids, item.data.id]);
    } else {
      editor.selectComponents([item.data.id]);
    }
  };

  return (
    <>
      <span className={classes("world-items-item-label-container")}>
        <span className="world-items-rename-wrapper">
          <RenameField
            id={`worldItemNameEdit${item.id}`}
            // disabledEditing={isModule}
            value={item.name}
            onSubmit={(val) => {
              if (val !== "") {
                editor.updateComponent(item.data.id, {
                  name: val,
                });
              }
            }}
          />
        </span>
      </span>
    </>
  );
};

const ItemQuickActions = ({ item, setIsShow, isVisible, isLocked }) => {
  const types = useComponentTypesMap();
  const { editor } = useEditorService();

  const [mounted, setMounted] = useState(false);

  const canDelete = !types[item.data.type].info.required;
  const canLock = item.data.position != null;

  const canFocus = useMemo(() => {
    return editor.getComponentEditor(item.data.id)?.isFocusable;
  }, [item.data.id]);

  const canHide = useMemo(() => {
    return canShowHide(item.type);
  }, [item.type]);

  const handleDelete = useEventCallback(
    (e) => {
      e.stopPropagation();
      if (!canDelete) return;
      editor.deleteComponents([item.data.id]);
      setIsShow(false);
    },
    [canDelete]
  );

  const handleToggleLock = useEventCallback(
    (e) => {
      e.stopPropagation();
      if (!canLock) return;
      editor.toggleComponentsLock([item.data.id]);
      setIsShow(false);
    },
    [canLock]
  );

  const handleFocus = useEventCallback(
    (e) => {
      e.stopPropagation();
      if (!canFocus) return;
      editor.focusOnComponent(item.data.id);
      setIsShow(false);
    },
    [canFocus]
  );

  const handleVisibility = useEventCallback((e) => {
    e.stopPropagation();
    editor.toggleComponentVisibility(item.data.id);
    setIsShow(false);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Tip
      visible={mounted}
      interactive
      closeState={() => {
        setIsShow(false);
      }}
    >
      <div className="world-items-quick-actions-buttons">
        {canFocus && (
          <button
            type="button"
            className="tip-default-btn"
            onClick={handleFocus}
          >
            Target
          </button>
        )}

        {canHide && (
          <button
            type="button"
            className="tip-default-btn"
            onClick={handleVisibility}
          >
            {isVisible ? "Hide" : "Show"}
          </button>
        )}

        {canDelete && (
          <button
            type="button"
            className="tip-default-btn"
            onClick={handleDelete}
          >
            Delete
          </button>
        )}

        {canLock && (
          <button
            type="button"
            className="tip-default-btn"
            onClick={handleToggleLock}
          >
            {isLocked ? "Unlock" : "Lock"}
          </button>
        )}
      </div>
    </Tip>
  );
};

const ItemActions = ({ item }) => {
  //
  const [isShow, setIsShow] = useState(false);
  const [isHover, setIsHover] = useState(false);

  const { scrollTop } = useWorldItemsPanel();
  const { editor } = useEditorService();

  const { addTogglerRef } = useOnClickOutside({
    handler: () => {
      setIsShow(false);
    },
  });

  const isLocked = item.data.lock?.position;

  const isVisible = useMemo(() => {
    const r = editor.getComponentEditor(item.data.id);
    return !!r?.visible;
  }, [item.data.id, isShow]);

  const handleToggleDropdown = useEventCallback(
    (e) => {
      e.stopPropagation();
      e.preventDefault();
      setIsShow(!isShow);
    },
    [isShow]
  );

  useEffect(() => {
    setIsShow(false);
  }, [scrollTop]);

  return (
    <div
      className="world-items-item-actions"
      style={{
        pointerEvents: "auto",
      }}
    >
      {!isVisible && (
        <span className="world-items-state-indicator">
          <SpriteIcon id="studio/eye-hidden" width={14} height={13} />
        </span>
      )}

      {isLocked && (
        <span className="world-items-state-indicator">
          <SpriteIcon id="studio/lock" width={12} height={14} />
        </span>
      )}

      <div
        className={classes("world-items-quick-actions", isShow && "world-items-show-menu")}
        onMouseLeave={(e) => {
          if (
            !(e.relatedTarget as HTMLElement)?.classList?.contains(
              "contextual-tip"
            )
          ) {
            setIsShow(false);
          }
        }}
      >
        <button
          className={classes(
            "world-items-btn-item-actions",
            "world-items-action-btn",
            isShow ? "world-items-active-btn" : "world-items-hover-btn"
          )}
          onClick={handleToggleDropdown}
          ref={(el) => {
            addTogglerRef("world-items-dropdown-action", el);
          }}
          onMouseEnter={() => setIsHover(true)}
          onMouseLeave={() => {
            setIsHover(false);
          }}
        >
          <SpriteIcon
            id="studio/horizontal-menu"
            className="world-items-btn-item-actions-icon"
          />
        </button>

        {!isShow && isHover && (
          <Tip
            visible={isHover}
            closeState={() => {
              setIsHover(false);
            }}
            nowrap={true}
          >
            Quick Actions
          </Tip>
        )}

        {isShow && (
          <ItemQuickActions
            item={item}
            setIsShow={(val) => {
              setIsShow(val);
              setIsHover(!val);
            }}
            isVisible={isVisible}
            isLocked={isLocked}
          />
        )}
      </div>
    </div>
  );
};

const WorldItem = ({
  wrapper,
  item,
  className = null,
  children,
  childrens = null,
  isSelected,
  parentChildrenIds,
}) => {
  const container = useRef<HTMLDivElement>(null);

  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const [isDraggedOverPrevPos, setIsDraggedOverPrevPos] = useState(false);
  const [isDraggedOverNextPos, setIsDraggedOverNextPos] = useState(false);

  const [dragError, setDragError] = useState(false);
  const [allowDoubleClick, setAllowDoubleClick] = useState(false);
  const doubleClickTimeout = useRef(null);

  const previousSelected = useRef(null);

  const {
    mouseIsMoving,
    mouseIsDragging,
    search,
    openCollapseIds,
    selectedObjectsAreTopLevel,
    lastDirectClickedItemId,
    mouseIsHovering,
    reorderingParentId,
    setMouseIsDragging,
    setSelectedObjectsAreTopLevel,
    setLastDirectClickedItemId,
    setReorderingParentId,
    setOpenCollapseIds,
  } = useWorldItemsPanel();

  const items = useWorldItems().filter((el) => {
    return el !== undefined;
  });
  const { editor } = useEditorService();
  const { allSelected } = useWorldSelection();
  const { store } = useCurrentGameData();

  const { activeTab, setActiveTab } = useContentTab();

  const droppable = true;

  const allSelectedIds = allSelected.map((obj) => obj.data.id);

  const isChildOfSelected = store.treeModel.isDescendentOf(
    item.data,
    allSelectedIds
  );

  useEffect(() => {
    if (
      isSelected &&
      !mouseIsHovering &&
      previousSelected.current != container.current
    ) {
      setTimeout(() => {
        container.current?.scrollIntoView({ block: "center" });
      }, 30);
    }

    if (!isSelected && !mouseIsHovering) {
      previousSelected.current = null;
    } else {
      previousSelected.current = container.current;
    }
  }, [isSelected, mouseIsHovering]);

  useEffect(() => {
    if (dragError) setTimeout((_) => setDragError(false), 500);
  }, [dragError]);

  const handleMouseEnter = useEventCallback((e) => {
    editor.highlightComponent(item.data.id);
  }, []);

  const handleMouseLeave = useEventCallback(() => {
    editor.highlightComponent(null);
  }, []);

  const onClick = (e) => {
    if (e.shiftKey) {
      const currentIndex = item._index; // Current item's index

      // Retrieve the children based on parentId
      const children = item.data.parentId
        ? Object.values(store.treeModel.getChildren(item.data.parentId))
        : items;

      // Find the last directly clicked item's index
      const lastSelected = children.find(
        (el) => el.id === lastDirectClickedItemId
      );

      // Ensure lastSelected exists to prevent errors
      if (!lastSelected) {
        editor.selectComponents([item.id]);
        setLastDirectClickedItemId(item.id);
        return;
      }

      const lastSelectedIndex = lastSelected._index;

      const newSelectedItems = [];

      // Determine the range of selection
      if (currentIndex > lastSelectedIndex) {
        // Select items from lastSelectedIndex to currentIndex
        for (let i = lastSelectedIndex; i <= currentIndex; i++) {
          const el = children.filter((el) => el._index === i);
          if (el[0]) {
            newSelectedItems.push(el[0].id);
          }
        }
      } else {
        // Select items from currentIndex to lastSelectedIndex
        for (let i = currentIndex; i <= lastSelectedIndex; i++) {
          const el = children.filter((el) => el._index === i);
          if (el[0]) {
            newSelectedItems.push(el[0].id);
          }
        }
      }

      // Update the editor with the new selected items
      editor.selectComponents(newSelectedItems);
    } else if (e.metaKey || e.ctrlKey) {
      const ids = allSelected.map((obj) => obj.data.id);
      const others = ids.filter((el) => el !== item.data.id);
      if (others.length !== ids.length) {
        editor.selectComponents(others);
      } else {
        ids.push(item.data.id);
        editor.selectComponents(ids);
      }
      setLastDirectClickedItemId(item.data.id);
    } else {
      clearTimeout(doubleClickTimeout.current);
      setAllowDoubleClick(true);

      if (allowDoubleClick) {
        // When double clicked...
        setAllowDoubleClick(false);
      } else {
        doubleClickTimeout.current = setTimeout(() => {
          setAllowDoubleClick(false);
        }, 200);
      }

      editor.selectComponents([item.data.id]);
      setLastDirectClickedItemId(item.data.id);
    }
  };

  const onKeyDown = (e) => {
    if (e.keyCode === 40 || e.keyCode === 38) {
      const indexCurrentClicked = items.findIndex(
        (el) => el.data.id === item.data.id
      );

      const moveToTarget = (targetItem) => {
        if (targetItem?.data?.id) {
          editor.selectComponents([targetItem.data.id]);
          const targetDom = wrapper.current.querySelector(
            `[data-id=${targetItem.data.id}]`
          );

          if (targetDom) {
            targetDom.focus();
          }
        }
      };

      if (e.keyCode === 40) {
        const targetIndex = indexCurrentClicked + 1;
        const targetItem = items[targetIndex];

        moveToTarget(targetItem);
      } else if (e.keyCode === 38) {
        const targetIndex = indexCurrentClicked - 1;
        const targetItem = items[targetIndex];

        moveToTarget(targetItem);
      }
    }
  };

  const onReceiveDragData = async (data) => {
    setMouseIsDragging(false);
    setIsDraggedOver(false);

    if (data?.dataType === "resource") {
      try {
        if (item.type !== "group") {
          if (item.data.parentId) {
            const isBehavior = editor.isBehavior(data?.type);

            if (isBehavior) {
              editor.addBehavior(
                {
                  type: data.type,
                },
                {
                  parentId: item.data.id,
                }
              );
            } else {
              // need to handle this case for the prefabs
              return setDragError(true);
            }
          } else {
            data = structuredClone({
              ...data,
              position: item.data.position,
              rotation: item.data.rotation,
            });
            const { cmd } = await editor.addComponent(data);
            if (!cmd) return setDragError(true);
            const instance = cmd.instance;
            if (!instance) return setDragError(true);
            await editor.groupComponents([item.id, instance.componentId]);
          }
        } else {
          data = structuredClone({
            ...data,
            parentId: item.id,
          });
          const { cmd } = await editor.addComponent(data);
          if (!cmd) return setDragError(true);
          const instance = cmd.instance;
          if (!instance) return setDragError(true);
        }
      } catch (e) {
        console.error(e);
        return setDragError(true);
      }
    } else if (
      data?.dataType === "component" ||
      data?.dataType === "selection:component"
    ) {
      try {
        const datas = data?.dataType === "component" ? [data] : data.selection;

        const ids = datas.map((x) => x.id);

        if (ids.includes(item.id)) return setDragError(true);

        if (
          item.type === "group" ||
          datas.every((x) => editor.isBehavior(x.type))
        ) {
          editor.changeParent({
            groupId: item.data.id,
            children: ids,
            ref: null,
            dir: 0,
          });
          setSelectedObjectsAreTopLevel(null);
        } else {
          setDragError(true);
          // const cmd = await editor.groupComponents([item.id, ...ids]);
        }
      } catch (e) {
        console.error(e);
        return setDragError(true);
      }
    }
  };

  const onDragReorderReceive = useEventCallback(
    async (data) => {
      // el = item dropped on
      // data = items dragged onto item

      if (data?.dataType !== "resource") {
        const items: string[] = data?.selection
          ? data?.selection?.map((el) => el.id)
          : [data?.id];

        const dir = isDraggedOverPrevPos ? 0 : 1;

        const groupId = item?.data?.parent?.id || null;

        if (editor.canChangeParent(groupId, items)) {
          editor.changeParent({
            groupId,
            children: items,
            ref: item.data.id,
            dir,
          });
        }
      }

      // Reset drag state flags
      setIsDraggedOverPrevPos(false);
      setIsDraggedOverNextPos(false);
      setIsDraggedOver(false);
      setMouseIsDragging(false);
    },
    [
      parentChildrenIds,
      allSelected,
      setIsDraggedOverPrevPos,
      setIsDraggedOverNextPos,
      setIsDraggedOver,
      setMouseIsDragging,
    ]
  );

  return (
    <div
      ref={container}
      className={classes(
        "worldItem",
        droppable && droppable,
        isSelected && "highlighted",

        mouseIsDragging && mouseIsMoving && isSelected && "isDragged",

        isDraggedOver && isDraggedOver,

        className
      )}
    >
      <DragDestination
        onReceiveData={(data) => {
          onDragReorderReceive(data);
        }}
        onDragOver={(_) => {
          setIsDraggedOver(true);
          // if (reorderingParentId === item?.data?.parent?.id) {
          setIsDraggedOverPrevPos(true);
          setIsDraggedOverNextPos(false);
          // }
        }}
        onDragLeave={(_) => {
          setIsDraggedOver(false);
          setIsDraggedOverPrevPos(false);
        }}
        className={classes(
          "world-items-reorder-drop",
          isDraggedOver && isDraggedOverPrevPos && "world-items-reorder-hovered"
        )}
      />

      <DragSource
        jsonData={
          allSelected.some((obj) => obj.data.id === item.data.id) &&
          allSelected.length > 1
            ? {
                dataType: "selection:component",
                selection: allSelected.map((obj) => ({
                  id: obj.data.id,
                })),
              }
            : {
                dataType: "component",
                id: item.componentId || item.id,
                type: item.type,
                name: item.name,
              }
        }
        onDragStart={(_) => {
          if (!allSelectedIds.includes(item.data.id)) {
            //onClick(_);
          }
          setReorderingParentId(item.data?.parent?.id);
          setMouseIsDragging(true);
        }}
        onDragEnd={(_) => setMouseIsDragging(false)}
        image={item.image}
      >
        <DragDestination
          onReceiveData={onReceiveDragData}
          onDragOver={(_) => setIsDraggedOver(true)}
          onDragLeave={(_) => setIsDraggedOver(false)}
          onClick={onClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onKeyDown={onKeyDown}
          className={classes(dragError && "world-items-drag-error")}
        >
          {children}
        </DragDestination>
      </DragSource>

      {childrens}

      <DragDestination
        onReceiveData={(data) => {
          onDragReorderReceive(data);
        }}
        onDragOver={(_) => {
          setIsDraggedOver(true);

          // if (reorderingParentId === item?.data?.parent?.id) {
          setIsDraggedOverPrevPos(false);
          setIsDraggedOverNextPos(true);
          // }
        }}
        onDragLeave={(_) => {
          setIsDraggedOver(false);
          setIsDraggedOverNextPos(false);
        }}
        className={classes(
          "world-items-reorder-drop",
          isDraggedOver && isDraggedOverNextPos && "world-items-reorder-hovered"
        )}
      />
    </div>
  );
};

const WorldItemButton = ({
  wrapper,
  item,
  isSelected,
  parentChildrenIds,
}) => {
  const { editor } = useEditorService();

  const { mouseIsDragging } = useWorldItemsPanel();

  const isBehavior = editor.isBehavior(item.data.type);

  const key = item.name;

  return (
    <WorldItem
      wrapper={wrapper}
      item={item}
      isSelected={isSelected}
      parentChildrenIds={parentChildrenIds}
    >
      <div className={classes("world-item", "world-item-button")}>
        <TreeLine />

        <figure className={classes("world-items-item-image", "drag-preview")}>
          {isBehavior ? (
            <SpriteIcon
              width={15}
              height={15}
              id="studio/behavior"
              className="world-items-behavior"
            />
          ) : (
            <NextImage
              width={30}
              height={30}
              alt={item.image}
              src={item.image}
              style={{ objectFit: "contain" }}
              draggable="false"
            />
          )}
        </figure>

        <ItemName item={item} key={key} />

        {!mouseIsDragging && <ItemActions item={item} />}
      </div>
    </WorldItem>
  );
};

const WorldItemCollapse = ({
  wrapper,
  item,
  isSelected,
  parentChildrenIds,
}) => {
  const {
    search,
    mouseIsDragging,
    mouseIsMoving,
    openCollapseIds,
    setOpenCollapseIds,
  } = useWorldItemsPanel();

  const open = openCollapseIds.includes(item?.data?.id);

  const { allSelected } = useWorldSelection();
  const { editor } = useEditorService();

  const sortedChildren = item.children?.sort(
    (a, b) =>
      (a._index ?? Number.MAX_SAFE_INTEGER) -
      (b._index ?? Number.MAX_SAFE_INTEGER)
  );

  const childrenIds = sortedChildren?.map((item) => item?.data?.id);

  useEffect(() => {
    if (!item.data.children || item.data.children.length === 0) return;

    const selectedIds = allSelected.map((obj) => obj.data.id);

    const contains = selectedIds.filter((element) =>
      childrenIds.includes(element)
    );
  }, [allSelected]);

  return (
    <WorldItem
      wrapper={wrapper}
      item={item}
      className={classes(
        "group",
        "world-item-collapse",
        !open && "collapsed",
        item.children.length > 0 && "hasChildren"
      )}
      childrens={
        open && (
          <div className="world-items-item-children">
            <TreeLineGroup />

            <LoopCheck
              // @ts-ignore
              wrapper={wrapper}
              items={item.children}
              parentChildrenIds={parentChildrenIds}
            />
          </div>
        )
      }
      isSelected={isSelected}
      parentChildrenIds={parentChildrenIds}
    >
      <div className={classes("world-item", !open && "collapsed")}>
        <TreeLine thirdLine={open} />

        <span className={classes("world-items-item-icon", "drag-preview")}>
          {item.image && item.type !== "group" ? (
            <NextImage
              width={30}
              height={30}
              alt={item.image}
              src={item.image}
              style={{ objectFit: "contain" }}
              draggable="false"
            />
          ) : (
            <SpriteIcon id="studio/layer" width={14} height={12} />
          )}
        </span>

        {item.children.length > 0 && (
          <span
            className={classes("world-items-item-icon", "world-items-collapse-icon")}
            onClick={(e) => {
              //
              e.stopPropagation();
              if (openCollapseIds.includes(item.data.id)) {
                setOpenCollapseIds(
                  openCollapseIds.filter((el) => el != item.data.id)
                );
              } else {
                setOpenCollapseIds([...openCollapseIds, item.data.id]);
              }
            }}
          >
            <SpriteIcon id="chevron-bottom" width={11} height={7} />
          </span>
        )}

        <ItemName item={item} />

        {!mouseIsDragging && <ItemActions item={item} />}
      </div>
    </WorldItem>
  );
};

const WorldItemPlaceholder = ({ item, isSelected }) => {
  const container = useRef<HTMLDivElement>(null);

  const previousSelected = useRef(null);

  const { mouseIsHovering } = useWorldItemsPanel();

  const { allSelected } = useWorldSelection();

  useEffect(() => {
    if (
      isSelected &&
      !mouseIsHovering &&
      previousSelected.current != container.current
    ) {
      previousSelected.current = container.current;
      setTimeout(() => {
        container.current?.scrollIntoView({ block: "center" });
      }, 30);
    }

    if (!isSelected) {
      previousSelected.current = null;
    }
  }, [isSelected, mouseIsHovering]);

  return (
    <div ref={container} className="worldItem">
      <div className="world-item"></div>
    </div>
  );
};

const IntersectionObserverComponent = ({ wrapper, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        root: wrapper.current,
        rootMargin: "200px",
        threshold: 0, // 0 means even a single pixel intersection will trigger
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return (
    <div ref={ref} className="world-items-child-marker">
      {children(isVisible)}
    </div>
  );
};

const LoopCheck = React.memo<any>(
  ({ wrapper, items, parentChildrenIds }) => {
    const { allSelected } = useWorldSelection();

    return (
      <>
        {items.map((item, index) => {
          if (!item) return null;

          const isSelected = allSelected.some(
            (selectedItem) => selectedItem.data.id === item.data.id
          );

          return (
            <IntersectionObserverComponent
              wrapper={wrapper}
              key={`${item.data.id}-${item.data?.parent?.id || "root"}-${
                item._index
              }`}
            >
              {(isVisible) => (
                <>
                  {!isVisible &&
                  !isSelected &&
                  (!item?.children || item?.children?.length === 0) ? (
                    <WorldItemPlaceholder item={item} isSelected={isSelected} />
                  ) : item.children?.length || item.data.type === "group" ? (
                    <WorldItemCollapse
                      key={`${item.data.id}-${item.data.name}-${item._index}`}
                      wrapper={wrapper}
                      item={item}
                      isSelected={isSelected}
                      parentChildrenIds={parentChildrenIds}
                    />
                  ) : (
                    <WorldItemButton
                      key={`${item.data.id}-${item.data.name}-${item._index}`}
                      wrapper={wrapper}
                      item={item}
                      isSelected={isSelected}
                      parentChildrenIds={parentChildrenIds}
                    />
                  )}
                </>
              )}
            </IntersectionObserverComponent>
          );
        })}
      </>
    );
  }
);

const BASE_WIDTH = 243;
const NULLIFY_ID = "__nullify";

export default function WorldItems({
  count,
  showWorldItems,
  setShowWorldItems,
}) {
  const [listIsVisible, setListIsVisible] = useState(false);

  const [createGroupHovered, setCreateGroupHovered] = useState(false);
  const [minimizedHovered, setMinimizedHovered] = useState(false);

  const {
    search,
    mouseIsMoving,
    mouseIsDragging,
    selectedObjectsAreTopLevel,
    lastDirectClickedItemId,
    mouseIsHovering,
    setSearch,
    setMouseIsDragging,
    setSelectedObjectsAreTopLevel,
    setLastDirectClickedItemId,
    setMouseIsHovering,
    setScrollTop,
  } = useWorldItemsPanel();

  const container = useRef(null);
  const wrapper = useRef(null);
  const scrollableWrapper = useRef(null);

  const { activeTab } = useContentTab();

  const { editor } = useEditorService();

  const { allSelected } = useWorldSelection();

  const items = useWorldItems().filter((el) => {
    return el !== undefined;
  });

  const easeOutExpo = cubicBezier(0.5, 1, 0.89, 1);

  const onKeyDown = useEventCallback(
    async (e) => {
      if (e.keyCode === 27 && document.activeElement.tagName === "INPUT") {
        setTimeout(() => {
          (document.activeElement as HTMLElement).blur?.();
        }, 10);
      }

      if (
        e.keyCode === 8 &&
        allSelected.length > 0 &&
        document.activeElement.tagName != "INPUT" &&
        document.activeElement.tagName != "TEXTAREA" &&
        document.activeElement.tagName != "SELECT" &&
        document.activeElement.tagName != "BUTTON"
      ) {
        //
        const hasPublishModule = document.getElementById("publish-module");

        const shouldSkip = hasPublishModule || activeTab === "script";

        if (!shouldSkip) {
          //
          await showConfirm(
            "Delete component ?",
            "Danger",
            "Are you sure you want to delete component?",
            async () => {
              try {
                await editor.deleteSelection();
              } catch (err) {
                console.error(err);

                showError(err?.message ?? "Cannot delete selected components");
              }
            }
          );
        }
      }
      //
    },
    [allSelected]
  );

  const onDeleteSelection = useEventCallback(
    async (e) => {
      if (
        e.keyCode === 8 &&
        allSelected.length > 0 &&
        document.activeElement.tagName != "INPUT"
      ) {
        await showConfirm(
          "Delete component ?",
          "Danger",
          "Are you sure you want to delete component?",
          async () => {
            try {
              await editor.deleteSelection();
            } catch (err) {
              console.error(err);

              showError(err?.message ?? "Cannot delete selected components");
            }
          }
        );
      }
    },
    [allSelected]
  );

  const onWrapperScroll = (progress, wrapper) => {
    const { scrollTop } = wrapper;
    setScrollTop(scrollTop);
  };

  const filterData = (item, query) => {
    query = query.toLowerCase();
    const candidates = [item.name.toLowerCase(), item.type.toLowerCase()];
    return candidates.some((c) => c.includes(query));
  };

  const filteredItems = useMemo(() => {
    if (search !== "") {
      function searchAndFilter(item) {
        if (!item) return null;

        const currentItemMatches = filterData(item, search);

        // Process children only if the current item matches the search
        const filteredChildren = (item.children || [])
          .map((child) => {
            // Recursively filter children
            const filteredChild = searchAndFilter(child);

            // Include children with type starting with 'script_' only if the current item matches
            if (currentItemMatches) {
              return child;
            }

            return filteredChild;
          })
          .filter(Boolean);

        // Include the current item only if it matches or has filtered children
        if (currentItemMatches || filteredChildren.length > 0) {
          return {
            ...item,
            children: filteredChildren,
          };
        }

        return null;
      }

      const filtered = items
        .map((item) => searchAndFilter(item))
        .filter(Boolean);

      return filtered;
    } else {
      return items;
    }
  }, [search, items]);

  useEffect(() => {
    if (listIsVisible) {
      window.addEventListener("keydown", onKeyDown);

      scrollableWrapper.current = wrapper.current.querySelector(
        ".scrollable-wrapper"
      );
    }

    return () => {
      setSearch("");
      window.addEventListener("keydown", onKeyDown);
    };
  }, [listIsVisible]);

  useEffect(() => {
    setListIsVisible(showWorldItems);
  }, [showWorldItems]);

  const sortedChildren = filteredItems.sort(
    (a, b) =>
      (a._index ?? Number.MAX_SAFE_INTEGER) -
      (b._index ?? Number.MAX_SAFE_INTEGER)
  );

  // useEffect(() => {
  //     if (
  //         (sortedChildren?.[0]?._index == null ||
  //             sortedChildren?.[sortedChildren.length - 1]?._index == null) &&
  //         editor
  //     ) {
  //         const newIndexIds = [];
  //         sortedChildren?.forEach((child, index) => {
  //             // Assign the index as _index if _index is undefined or null
  //             if (child._index == null) {
  //                 child._index = index;
  //             }

  //             newIndexIds.push(child.id);
  //         });

  //         editor.sortChildren(newIndexIds);
  //     }
  // }, [sortedChildren, editor]);

  const childrenIds = sortedChildren?.map((item) => item?.data?.id);

  return (
    <div
      ref={container}
      className={classes(
        "world-items-container",
        "world-items-panel",
        mouseIsDragging && "isDragging"
      )}
      onMouseEnter={() => {
        setMouseIsHovering(true);
      }}
      onMouseLeave={() => {
        setMouseIsHovering(false);
      }}
    >
      {listIsVisible && (
        <div
          className="world-items-inner"
          tabIndex={0}
          onKeyDown={onDeleteSelection}
        >
          <div className="world-items-header">
            World Items
            <span className="world-items-count">{count}</span>
            <div className="world-items-space"></div>
            <button
              type="button"
              className="world-items-header-btn"
              onClick={async () => {
                const add = await editor.createEmptyGroup();
                editor.selectComponents([add.componentId]);
                scrollableWrapper.current.scrollTop = 0;
              }}
              onMouseEnter={() => {
                setCreateGroupHovered(true);
              }}
              onMouseLeave={() => {
                setCreateGroupHovered(false);
              }}
            >
              <span className="u-visually-hidden">Create new group</span>

              <SpriteIcon id="studio/add-group" width={17} height={16} />

              {createGroupHovered && (
                <Tip visible={createGroupHovered} nowrap={true}>
                  Create new group
                </Tip>
              )}
            </button>
            <button
              type="button"
              className={classes("world-items-header-btn", "highlighted")}
              onClick={() => {
                setShowWorldItems(false);
              }}
              onMouseEnter={() => {
                setMinimizedHovered(true);
              }}
              onMouseLeave={() => {
                setMinimizedHovered(false);
              }}
            >
              <span className="u-visually-hidden">Close world items</span>

              <SpriteIcon id="studio/layers" width={16} height={14} />

              {minimizedHovered && (
                <Tip visible={minimizedHovered} nowrap={true}>
                  Minimize panel
                </Tip>
              )}
            </button>
          </div>

          <SearchInput
            appearance="fill"
            onChange={(val) => {
              setSearch(val);
              scrollableWrapper.current.scrollTop = 0;
            }}
          />

          <div ref={wrapper} className="world-items-wrapper">
            <ScrollableSection onScroll={onWrapperScroll}>
              <LoopCheck
                // @ts-ignore
                wrapper={scrollableWrapper}
                items={filteredItems}
                parentChildrenIds={childrenIds}
              />
            </ScrollableSection>
          </div>
        </div>
      )}
    </div>
  );
}

function TreeLine({ thirdLine }: any = {}) {
  return (
    <div className="world-items-tree-container">
      <div className="world-items-tree-vertical-line" />
      <div className="world-items-tree-horizontal-line" />
      {thirdLine && <div className="world-items-tree-vertical-collapse" />}
    </div>
  );
}

function TreeLineGroup() {
  return (
    <div className="world-items-tree-container">
      <div className="world-items-tree-vertical-line" />
    </div>
  );
}
