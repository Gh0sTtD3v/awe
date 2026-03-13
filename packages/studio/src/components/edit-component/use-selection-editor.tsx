import {
  DispatchPayload,
  DispatcherProvider,
} from "../gui/dispatcher";
import { GUIStateProvider } from "../gui/gui-state";
import { RenderGui } from "../gui/render-gui";
import { usePromptTip } from "../../hooks/use-prompt-tip";
import { useCurrentGameData } from "../../contexts/game-data-context";
import { useEditorService } from "../../contexts/editor-service-context";
import { useComponentTypesMap } from "../../hooks/component-hooks";
import { useWorldSelection } from "../../hooks/use-world-selection";
import { useEventCallback } from "../../hooks/use-event-callback";
import { useEffect, useState } from "react";
import { EngineFacade } from "../../utils/engine-api";
import { useEffectOnce } from "../../hooks/use-effect-once";
import { getOrCreateEditor } from "@oncyberio/engine-edit/editors/editor-registry";
import { showError } from "../../modals/context";
import { useContentTab } from "../../contexts/content-tab-context";

export function useSelectionEditor() {
  //
  const { editor } = useEditorService();

  const { gameData } = useCurrentGameData();

  const {
    activeTab,
    setActiveTab,
    setActiveSecondTab,
    activeEnvironment,
    activeCategory,
    setActiveEnvironment,
    setActiveCategory,
    setActiveTabCollapsed,
    setActiveSecondTabCollapsed,
  } = useContentTab();

  const types = useComponentTypesMap();

  const [_, setState] = useState(0);

  const { showPrompt, hidePrompt } = usePromptTip();

  const forceUpdate = () => {
    setState((it) => it + 1);
  };

  const selection = useWorldSelection();

  let selected = selection.singleSelected;

  if (selected && selected.data == null) debugger;

  let factory = selected ? types[selected.data.type as any] : null;

  let title = factory?.getTitle(selected.data);

  const uiEditor = selected ? getOrCreateEditor(selected) : null;

  const dispatch = useEventCallback(async (payload: DispatchPayload) => {
    //
    if (payload == null) {
      //
      forceUpdate();

      return;
    }

    if (payload.origin === "action") {
      //
      await payload.run();

      forceUpdate();

      return;
    }

    selected._isProgress = payload.isProgress;

    if (payload.isProgress) {
      //
      await payload.run();
      //
    } else {
      //
      editor._runUpdate(selected.data.id, {
        ...payload,
      } as any);
    }

    forceUpdate();
  }, []);

  useEffectOnce(() => {
    //
    function onRequestSelection({ componentId }) {
      //
      if (componentId !== selected?.data.id) {
        //
        editor.selectComponents([componentId]);
      }
    }

    return EngineFacade.on("REQUEST_SELECTION", onRequestSelection);
  });

  useEffectOnce(() => {
    //
    function onRequestAdd({ group }) {
      //
      if (activeEnvironment !== group) {
        //
        setActiveTab("addAssetsV1");
        setActiveEnvironment(group);
      }
    }

    return EngineFacade.on("REQUEST_ADD", onRequestAdd);
  });

  useEffect(() => {
    //
    if (!uiEditor) return;

    function onShowPrompt({ opts, resolve, reject }) {
      //
      // TODD: add UI prompt
      let result = prompt(opts.message);

      while (true) {
        try {
          opts.onSubmit?.(result);
          resolve(result);
          break;
        } catch (err) {
          alert(err);
          result = prompt(opts.message);
        }
      }
    }

    function onShowError({ message, title }) {
      //
      showError(message, title);
    }

    function onUpdateUI() {
      //
      console.log("update ui");

      forceUpdate();
    }

    function onAttachTransformControls({ object, opts }) {
      //
      EngineFacade.editor.transformer.attachObject(object, opts);
    }

    function onDetachTransformControls({ object }) {
      //
      EngineFacade.editor.transformer.detachObject(object);
    }

    function addEvents() {
      uiEditor.on(uiEditor.COMMANDS.SHOW_PROMPT, onShowPrompt);
      uiEditor.on(uiEditor.COMMANDS.SHOW_ERROR, onShowError);

      uiEditor.on(uiEditor.COMMANDS.UPDATE_UI, onUpdateUI);

      uiEditor.on(
        uiEditor.COMMANDS.ATTACH_TRANSFORM_CONTROLS,
        onAttachTransformControls
      );
      uiEditor.on(
        uiEditor.COMMANDS.DETACH_TRANSFORM_CONTROLS,
        onDetachTransformControls
      );
    }

    function removeEvents() {
      uiEditor.off(uiEditor.COMMANDS.SHOW_PROMPT, onShowPrompt);
      uiEditor.off(uiEditor.COMMANDS.SHOW_ERROR, onShowError);

      uiEditor.off(uiEditor.COMMANDS.UPDATE_UI, onUpdateUI);

      uiEditor.off(
        uiEditor.COMMANDS.ATTACH_TRANSFORM_CONTROLS,
        onAttachTransformControls
      );
      uiEditor.off(
        uiEditor.COMMANDS.DETACH_TRANSFORM_CONTROLS,
        onDetachTransformControls
      );
    }

    addEvents();

    return () => {
      removeEvents();
    };
  }, [uiEditor]);

  let el = null;

  if (uiEditor) {
    //
    const gui = uiEditor._onGUI({
      gameData,
    });

    if (gui == null) {
      // TEMPORARY FOR DEBUGGING
      el = (
        <div style={{ color: "white", top: 10, right: 10 }}>
          No GUI for {selected.data.type as string}
        </div>
      );
    } else {
      el = (
        <DispatcherProvider
          key={selected.data.id}
          dispatch={dispatch}
          supportsUndo={true}
          component={selected}
          space={selected.space}
        >
          <GUIStateProvider store={uiEditor.guiStore}>
            <RenderGui config={gui} />
          </GUIStateProvider>
        </DispatcherProvider>
      );
    }
  }

  return {
    uiEditor: el,
    title,
    selected,
    allSelected: selection.allSelected,
    forceUpdate,
  };
}
