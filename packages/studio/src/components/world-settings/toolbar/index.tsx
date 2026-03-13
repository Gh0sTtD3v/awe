import React, { use, useEffect, useMemo, useState } from "react";
import { classes } from "../../../utils/classes";

import { useHotkey } from "../../../hooks/use-hotkey";
import { useWorldSelection } from "../../../hooks/use-world-selection";
import { useWorldTransformerState } from "../../../hooks/use-world-transformer-state";
import { useEditorService } from "../../../contexts/editor-service-context";
import { useContentTab } from "../../../contexts/content-tab-context";

import SpriteIcon from "../../../ui/sprite";

import { canChangeLock } from "../../../utils/editor";
import { useCurrentGameData } from "../../../contexts/game-data-context";
import { useWorldToolsState } from "../../../hooks/use-world-tools-state";

import { showConfirm } from "../../../modals/context";

const ToolbarItems = [
  // {
  //     key: "drawerTool",
  //     label: "Draw",
  //     component: <SpriteIcon id="studio/pencil" width={20} height={20} />,
  //     active: true,
  // },
  {
    key: "translation",
    label: "Position",
    component: <SpriteIcon id="studio/relocating" width={20} height={20} />,
    active: true,
  },
  {
    key: "rotation",
    label: "Rotation",
    component: <SpriteIcon id="studio/rotation" width={20} height={20} />,
    active: false,
    disabled: true,
  },
  {
    key: "replace",
    label: "Replace",
    component: <SpriteIcon id="studio/replace" width={20} height={20} />,
    active: false,
  },
  // {
  //     key: "target",
  //     label: "Target",
  //     component: <SpriteIcon id="studio/target" width={20} height={20} />,
  //     active: false,
  // },
  {
    key: "duplicate",
    label: "Duplicate",
    component: <SpriteIcon id="studio/duplicate" width={20} height={20} />,
    active: false,
  },
  {
    key: "local-space",
    label: "Local Space",
    component: <SpriteIcon id="studio/relocating" width={20} height={20} />,
    active: true,
  },
  // {
  //     key: "toggleLock",
  //     label: "Lock/Unlock",
  //     component: (
  //         <>
  //             <SpriteIcon id="lock-outline" width={19} height={19} />
  //             <SpriteIcon id="unlock-outline" width={19} height={19} />
  //         </>
  //     ),
  //     active: false,
  // },
  // {
  //     key: "delete",
  //     label: "Delete",
  //     component: <SpriteIcon id="studio/trash" width={16} height={19} />,
  //     active: false,
  // },
] as const;

type ToolbarActionItem = (typeof ToolbarItems)[number]["key"];

type ToolbarAction =
  | "translation"
  | "rotation"
  | "replace"
  | "duplicate"
  | "local-space"
  | "toggleLock"
  | "delete"
  | "drawerTool"
  | "group"
  | "ungroup"
  | "target";

export function WorldSettingsToolbar() {
  //
  const { editor } = useEditorService();

  const selection = useWorldSelection();

  const { store } = useCurrentGameData();

  const [replaceStatus, setReplaceStatus] = useState(0);

  const { gameData } = store;

  const {
    setActiveTab,
    setActiveTabCollapsed,
    isReplaceToggled,
    isReplaceLocked,
    setIsReplaceToggled,
    setIsReplaceLocked,
  } = useContentTab();

  useHotkey(
    (event) => {
      //
      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key === "d" || event.key === "D")
      ) {
        event.preventDefault();
        handleAction("duplicate");
      }

      if (event.key === "f" || event.key === "F") {
        //
        handleAction("target");
      }

      if (event.key === "g" || event.key === "G") {
        //
        if (event.shiftKey) handleAction("ungroup");
        else handleAction("group");
      }
    },
    { INPUT: true, TEXTAREA: true }
  );

  const transformState = useWorldTransformerState();

  const toolsState = useWorldToolsState();

  const handleAction = async (action: ToolbarAction) => {
    //
    if (action === "delete") {
      //
      if (!canDelete) return;

      editor.deleteSelection();
    } else if (action === "duplicate") {
      const insances = selection.allSelected.filter((it) => {
        // ensure we can duplicate
        return !it.info.singleton;
      });

      if (insances.length === 0) {
        return;
      }

      const ids = insances.map((item) => item.data.id);

      editor.duplicateComponents(ids);
    } else if (action === "group") {
      //
      console.log("handle group action", { canGroup, canUngroup });
      if (canGroup) {
        editor.groupSelection();
      }
    } else if (action === "ungroup") {
      //
      if (canUngroup) {
        editor.ungroupSelection();
      }
      //
      if (!canDuplicate) return;
      editor.duplicateSelection();
    } else if (action === "replace") {
      //
      if (!canReplace) return;

      let status = replaceStatus;

      if (replaceStatus === 1) {
        status = 0;
      } else {
        status = status + 1;
      }

      if (status !== 0) {
        setIsReplaceToggled(true);

        setActiveTab("addAssetsV1");

        setActiveTabCollapsed(false);

        if (status == 2) {
          setIsReplaceLocked(true);
        } else {
          setIsReplaceLocked(false);
        }
      } else {
        setIsReplaceLocked(false);
        setIsReplaceToggled(false);
      }

      setReplaceStatus(status);

      //
    } else if (action === "toggleLock") {
      //
      if (!canLock) return;

      editor.toggleComponentsLock(
        selection.allSelected
          .filter((it) =>
            canChangeLock(gameData, it?.data?.lock?.lockedBy, store.userId)
          )
          .map((it) => it.data.id)
      );
      //
    } else if (action === "translation") {
      //
      if (!canTranslate) return;
      transformState.toggleMode({
        enableTranslate: !transformState.enableTranslate,
      });
      //
    } else if (action === "local-space") {
      //
      if (!canTranslate) return;
      transformState.toggleMode({
        enableLocalSpace: !transformState.enableLocalSpace,
      });
      //
    } else if (action === "rotation") {
      //
      if (!canRotate) return;
      transformState.toggleMode({
        enableRotate: !transformState.enableRotate,
      });
      //
    } else if (action === "target") {
      //
      if (!canFocus) return;
      editor.focusOnComponent(selection.singleSelected.data.id);
      //
    } else if (action === "drawerTool") {
      //
      // console.log(toolsState.drawer);
      editor.setDrawerTool({
        enabled: !toolsState.drawer,
      });
    } else {
      //
      console.error("Unknown action", action);
    }
    //
  };

  const canDuplicate = useMemo(() => {
    //
    return editor.canDuplicate(selection.allSelected);
    //
  }, [selection.allSelected]);

  const canDelete = selection.allSelected.every((it) => {
    return !it.info.required && it.data.lock == null;
  });

  const canFocus = useMemo(() => {
    //
    if (!selection.singleSelected) return false;

    return editor.getComponentEditor(selection.singleSelected.data.id)
      ?.isFocusable;
    //
  }, [selection.singleSelected?.data.id]);

  const someLocked = selection.allSelected.some((it) => {
    return it.data.lock != null;
  });

  const allLocked = selection.allSelected.every((it) => {
    return it.data.lock != null;
  });

  const activeStates = {
    drawerTool: toolsState.drawer,
    translation: transformState.enableTranslate,
    rotation: transformState.enableRotate,
    "local-space": transformState.enableLocalSpace,
    replace: isReplaceToggled,
    duplicate: false,
    toggleLock: allLocked,
    target: false,
    delete: false,
  };

  const canTransform =
    transformState.targets?.length === selection.allSelected.length;

  const canTranslate = useMemo(() => {
    //
    return transformState.targets?.every((it) => {
      return (it.data as any).position;
    });
  }, [transformState.targets]);

  const canRotate = useMemo(() => {
    //
    return transformState.targets?.every((it) => {
      return (it.data as any).rotation;
    });
  }, [transformState.targets]);

  const canLock = canTransform;

  const canGroup = useMemo(() => {
    //
    return editor.canGroup(selection.allSelected);
    //
  }, [selection.allSelected]);

  const canUngroup = useMemo(() => {
    //
    if (selection.singleSelected == null) return false;

    return editor.canUngroup(selection.singleSelected);
    //
  }, [selection.allSelected]);

  const canReplace = useMemo(() => {
    //
    if (!selection.singleSelected) return false;

    return editor.canReplace(selection.singleSelected);
    //
  }, [selection.allSelected]);

  // samsy
  // need update render mode for selected component
  const canDraw = useMemo(() => {
    //
    const instance = selection.singleSelected;

    if (instance == null) return false;

    return instance.data.type === "batch" || instance?._canBatchDraw();
    //
  }, [selection.singleSelected]);

  const disabledSates = {
    drawerTool: !canDraw,
    translation: !canTransform || !canTranslate || someLocked,
    rotation: !canTransform || !canRotate || someLocked,
    replace: !canReplace,
    duplicate: !canDuplicate,
    toggleLock: !canLock,
    target: !canFocus,
    delete: !canDelete,
  };

  useEffect(() => {
    if (transformState.enableTranslate || transformState.enableRotate) {
      // Disabled for now since feature doesnt exist
      // if (isNewUser) {
      // showPrompt("clickShift")
      // }
    }
  }, [transformState.enableTranslate, transformState.enableRotate]);

  useEffect(() => {
    if (!isReplaceLocked) {
      setIsReplaceToggled(false);
    }
  }, [selection.singleSelected]);

  useEffect(() => {
    if (!isReplaceToggled) {
      setReplaceStatus(0);
    }
  }, [isReplaceToggled]);

  // hide toolbar if all is disabled
  if (!canTransform && !canFocus && !canDuplicate) {
    return null;
  }

  return (
    <div className="world-settings-toolbar h-[42px] rounded-xl fixed bottom-12 left-1/2 -translate-x-1/2 translate-y-0 flex items-center justify-between p-1 bg-studio-darker pointer-events-auto before:content-[''] before:absolute before:inset-0 before:p-px before:rounded-xl before:pointer-events-none before:bg-[linear-gradient(0deg,rgba(32,32,32,0)_10.23%,rgba(32,32,32,0.8)_87.5%)] before:[-webkit-mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:[-webkit-mask-composite:xor] before:[mask-composite:exclude]">
      {ToolbarItems.map((item) => (
        <button
          className={classes(
            "toolbar-button flex items-center justify-center relative w-[34px] h-[34px] min-w-[34px] min-h-[34px] transition-colors duration-300 ease-out-quad cursor-pointer rounded-[10px] [&:not(:last-child)]:mr-1.5 [&_.icon]:text-white before:content-[''] before:absolute before:inset-0 before:p-px before:rounded-[10px] before:pointer-events-none before:opacity-0 before:transition-opacity before:duration-200 before:ease-out-quad before:bg-[linear-gradient(0deg,rgba(255,255,255,0)_10.23%,rgba(255,255,255,0.1)_87.5%)] before:[-webkit-mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:[-webkit-mask-composite:xor] before:[mask-composite:exclude] [&>svg]:opacity-40 [&>svg]:transition-opacity [&>svg]:duration-300 [&>svg]:ease-out-quad hover:bg-studio-dark hover:before:opacity-50 hover:[&>svg]:opacity-100",
            activeStates[item.key] && !disabledSates[item.key] && "active bg-studio-gray-dark [&>svg]:opacity-100 before:opacity-100",
            disabledSates[item.key] && "disabled cursor-not-allowed [&>svg]:opacity-[0.15]"
          )}
          key={item.key}
          type="button"
          onClick={(e) => {
            handleAction(item.key);
          }}
          onMouseDown={(e) => {
            // Prevent focus when clicking on it
            e.preventDefault();
          }}
          disabled={disabledSates[item.key]}
        >
          {item.component}

          <span className="toolbar-label absolute top-[calc(100%+11px)] h-7 left-1/2 bg-studio-darker rounded-[9px] text-white px-[9px] flex items-center justify-center text-[13px] font-normal leading-[15px] opacity-0 -translate-x-1/2 -translate-y-1 transition-[opacity,transform] duration-300 ease-out-quad">{item.label}</span>

          {/* {item.key === "replace" && (
                        <span className={styles.repeat}>
                            {replaceStatus === 1
                                ? "1"
                                : replaceStatus === 2
                                ? "R"
                                : null}
                        </span>
                    )} */}
        </button>
      ))}
    </div>
  );
}
