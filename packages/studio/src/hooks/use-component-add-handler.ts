import { useEventCallback } from "./use-event-callback";
import { useEditorService } from "../contexts/editor-service-context";
import type { ComponentData } from "@oncyberio/engine";
import { useContentTab } from "../contexts/content-tab-context";
import { canReplaceComponent } from "./component-hooks";

export function useComponentAddHandler<T>(
  formatter: (data: T) => ComponentData
) {
  const { editor } = useEditorService();

  const { isReplaceToggled, setIsReplaceToggled } = useContentTab();

  const handleAdd = useEventCallback(async (data: T) => {
    //
    let targetId: string;

    if (isReplaceToggled) {
      //
      let target = editor.getSelectedComponents()?.[0];

      if (canReplaceComponent(target)) {
        targetId = target.data.id;
      }

      // setIsReplaceToggled(false);
    }

    let asset: any = formatter(data);

    await editor.addComponent(asset, { targetId });

    // Re-focus canvas so that keyboard shortcuts are in game canvas context
    const gameCanvas = document.getElementById("game-canvas");
    gameCanvas.tabIndex = 1;
    gameCanvas.focus();
    gameCanvas.removeAttribute("tabIndex");
    //
  }, []);

  const handleDrag = useEventCallback((e: React.DragEvent, data: T) => {
    //
    let asset = formatter(data);

    let isBehavior =
      asset.type.startsWith("script") && editor.isBehavior(asset.type);

    editor.handleComponentDragStart({
      event: e.nativeEvent,
      isBehavior,
      asset,
      onCreatePreview: isBehavior
        ? null
        : async () => {
            //
            let component = await editor.facade.editor.commands.addComponent(
              asset
            );

            editor.facade.editor.commands.adjustInitialProps(component);

            return component;
          },
      onDestroyPreview: (preview) => {
        //
        preview?.destroy();
      },
      onDrop: (dropOpts) => {
        //
        let instance = dropOpts.preview;

        if (isBehavior) {
          //
          if (!dropOpts.target) {
            //
            console.log("no target host for behavior");

            return;
          }

          asset = {
            ...asset,
            parentId: dropOpts.target.componentId,
          };
          //
        } else {
          instance = instance?.then((it) => {
            //
            it.position.copy(dropOpts.coords.position as any);

            it.rotation.copy(dropOpts.coords.rotation as any);

            return it;
          });
        }

        editor.addComponent(asset, { instance }).finally(() => {
          dropOpts.onDropEnd();
        });
      },
    });
    //
  }, []);

  return {
    handleAdd,
    handleDrag,
  };
}
