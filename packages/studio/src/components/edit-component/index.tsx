import { useRef, useEffect, useState, useMemo, useId } from "react";
import { classes } from "../../utils/classes";
import { useEditorService } from "../../contexts/editor-service-context";

import { usePromptTip } from "../../hooks/use-prompt-tip";
import { useWorldToolsState } from "../../hooks/use-world-tools-state";
import { ScrollableSection } from "../scrollable-section";
import { EngineFacade } from "../../utils/engine-api";
import { useUserStudioProfile } from "../../hooks/use-user-studio-profile";
import { useWorldSelection } from "../../hooks/use-world-selection";
import { useWorldEvent } from "../../hooks/use-world-event";
import { useContentTab } from "../../contexts/content-tab-context";
import { useSelectionEditor } from "./use-selection-editor";
import { useEventCallback } from "../../hooks/use-event-callback";
import { useCurrentGameData } from "../../contexts/game-data-context";
import { useWorldTransformerState } from "../../hooks/use-world-transformer-state";
import SpriteIcon from "../../ui/sprite";
import { RenameField } from "../rename-field";
import "./edit-component-styles.css";

export function EditComponent({ className, showWorldItems, onSizeChanged }) {
  //
  const { store, gameData } = useCurrentGameData();

  const wrapper = useRef(null);
  const panel = useRef(null);
  const resizerWrapper = useRef(null);

  const {
    activeTab,
    setHideEditorUi,
    editPanelAttached,
    setEditPanelAttached,
  } = useContentTab();

  const id = useId();
  const { editor } = useEditorService();
  const { uiEditor, selected } = useSelectionEditor();
  const selection = useWorldSelection();
  const { showPrompt } = usePromptTip();
  const toolsState = useWorldToolsState();
  const { isNewUser } = useUserStudioProfile();
  const transformState = useWorldTransformerState();

  let title = selected.data.name || selected.info.title;

  const [error, setError] = useState<String>("");

  useWorldEvent(EngineFacade.Events.COMPONENTS_COORDS_CHANGED_STARTED, () => {
    setHideEditorUi(true);
  });

  useWorldEvent(EngineFacade.Events.COMPONENTS_COORDS_CHANGED, () => {
    setHideEditorUi(false);
  });

  const canFocus = useMemo(() => {
    //
    if (!selection.singleSelected) return false;

    return editor.getComponentEditor(selection.singleSelected.data.id)
      ?.isFocusable;
    //
  }, [selection.singleSelected?.data.id]);

  // const canTransform =
  //     transformState.targets?.length === selected?.allSelected?.length;

  const canLock = (selected.data as any).position != null;

  const canDraw = useMemo(() => {
    //
    const instance = selection.singleSelected;

    if (instance == null) return false;

    return instance.data.type === "batch" || instance?._canBatchDraw();
    //
  }, [selection.singleSelected]);

  const handleFocus = () => {
    //
    if (!canFocus) return;

    editor.focusOnComponent(selected?.data?.id);
  };

  const updateComponentName = (value) => {
    editor.updateComponents([
      {
        id: selected.data.id,
        changes: {
          name: value,
        },
        undo: {
          name: selected.data.name,
        },
      },
    ]);
  };

  const submitNewName = (newName) => {
    setError(null);

    if (newName == "") {
      throw new Error("Field can't be empty");
      return;
    }
    //
    try {
      updateComponentName(newName);
    } catch (e) {
      setError(e.message);
    }
  };

  // const disableLock = selected?.info?.disableLock;

  const canDelete = !selected?.info?.required;

  // const canEdit = selected?.data?.meta?.metaType !== "nft";

  const locked = selected?.data?.lock?.position;

  const lockedBy = selected?.data?.lock?.lockedBy;

  const isBehavior = editor.isBehavior(selected?.data?.type as string);
  // const isBehavior = true;

  const onDelete = () => {
    //
    if (locked) return;

    if (isNewUser) {
      showPrompt("objectBackspaceDelete");
    }

    editor.deleteSelection();
  };

  const handleDraw = () => {
    editor.setDrawerTool({
      enabled: !toolsState.drawer,
    });
  };

  const onToggleLock = useEventCallback(
    (e) => {
      if (!canLock) return;
      editor.toggleComponentsLock([selected.data.id]);
    },
    [canLock]
  );

  const resizeObserver = new ResizeObserver((entries) => {
    onSizeChanged?.();
  });

  // Observe one or multiple elements
  useEffect(() => {
    if (resizerWrapper.current && onSizeChanged) {
      resizeObserver.observe(resizerWrapper.current);
    }
  }, [selected]);

  let el = null;

  if (uiEditor != null) {
    //
    el = (
      <div
        key={title}
        ref={panel}
        className={classes(
          "edit-layout max-h-full z-[1000] flex flex-col px-4 select-none w-full text-white pointer-events-auto min-h-0",
          !editPanelAttached && "detached pointer-events-none"
        )}
      >
        <div
          className={classes(
            "edit-header shrink-0 h-[45px] flex items-center justify-between pr-[7px] pl-0 gap-1.5 relative text-white text-[15px] font-normal leading-[17px] grow",
            isBehavior && "text-studio-warning"
          )}
        >
          <RenameField
            id={id}
            // disabledEditing={isModule}
            value={title}
            error={error}
            resetError={() => {
              setError(null);
            }}
            onSubmit={(val) => {
              submitNewName(val);
            }}
          />

          {isBehavior && (
            <span className="edit-header-icon -mr-px order-1">
              <SpriteIcon
                id="studio/behavior"
                width={12}
                height={12}
              />
            </span>
          )}

          <div className="shrink-0 flex items-center order-[3]">
            <button
              type="button"
              className="edit-header-button rounded-lg bg-studio-dark relative w-7 h-7 shrink-0 flex items-center justify-center text-white transition-opacity duration-200 ease-out-quad disabled:opacity-20 disabled:pointer-events-none before:content-[''] before:absolute before:inset-0 before:p-px before:rounded-lg before:pointer-events-none before:bg-[linear-gradient(0deg,rgba(255,255,255,0)_10.23%,rgba(255,255,255,0.2)_87.5%)] before:[-webkit-mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:[-webkit-mask-composite:xor] before:[mask-composite:exclude]"
              onClick={() => {
                setEditPanelAttached(!editPanelAttached);
              }}
              disabled={activeTab === "script"}
            >
              <span className="u-visually-hidden">
                {editPanelAttached || activeTab === "script"
                  ? "Detach edit panel"
                  : "Attach edit panel"}
              </span>

              {editPanelAttached || activeTab === "script" ? (
                <SpriteIcon id={"studio/detach-tab"} width={16} height={14} />
              ) : (
                <SpriteIcon id={"studio/attach-tab"} width={15} height={14} />
              )}
            </button>

            <button
              type="button"
              className="w-7 h-7 flex items-center justify-center -mr-[15px] text-white"
              onClick={() => {
                editor.selectComponents([]);
              }}
            >
              <span className="u-visually-hidden">Close edit panel</span>
              <SpriteIcon id="close" width={12} height={12} />
            </button>
          </div>
        </div>

        <div className="edit-actions border-t border-b border-white/10 flex items-center justify-center p-[7px] shrink-0">
          {/* Draw */}
          <button
            type="button"
            onClick={canDraw ? handleDraw : null}
            disabled={!canDraw}
          >
            <span className="u-visually-hidden">
              Draw a batch of this element
            </span>

            <SpriteIcon id="studio/draw" width={18} height={18} />
          </button>

          {/* Target */}
          <button
            type="button"
            onClick={canFocus ? handleFocus : null}
            disabled={!canFocus}
          >
            <span className="u-visually-hidden">Target element</span>

            <SpriteIcon id="studio/target" width={18} height={18} />
          </button>

          {/* LOCK */}
          <button
            type="button"
            onClick={canLock ? onToggleLock : null}
            disabled={!canLock}
          >
            <span className="u-visually-hidden">
              {locked ? "Unlock" : "Lock"} element
            </span>

            {locked ? (
              <SpriteIcon id="lock-outline" width={18} height={18} />
            ) : (
              <SpriteIcon id="unlock-outline" width={18} height={18} />
            )}
          </button>

          {/* DELETE */}
          <button
            type="button"
            onClick={canDelete ? onDelete : null}
            disabled={!canDelete}
          >
            <span className="u-visually-hidden">Delete element</span>

            <SpriteIcon id="studio/trash" width={15} height={18} />
          </button>
        </div>

        <ScrollableSection>
          <div className="resizer-wrapper w-full" ref={resizerWrapper}>
            {uiEditor}
          </div>
        </ScrollableSection>
      </div>
    );
  }

  return (
    <div
      key={selected?.data.id ?? "no-sel"}
      ref={wrapper}
      className={classes("edit-wrapper pointer-events-none z-[2] flex justify-start items-end flex-col w-full relative h-full min-h-0", className)}
    >
      {el}
    </div>
  );
}
