import { memo } from "react";
import { useEventCallback } from "../../../../hooks/use-event-callback";
import SpriteIcon from "../../../../ui/sprite";
import { HoverLabel, SimpleLabel } from "../shared/label";
import { showSelectParam } from "../../../../modals/modals/select";
import { useDispatcher } from "../../dispatcher";
import { useEditorService } from "../../../../contexts/editor-service-context";
import { classes } from "../../../../utils/classes";

interface ReceiverInputProps {
  value: any;
  onChange: (value: any) => void;
}

function _ReceiverInput({ value, onChange }: ReceiverInputProps) {
  const { editor } = useEditorService();

  const disptacher = useDispatcher();

  function unlink(i) {
    onChange(value.filter((v, _i) => _i !== i));
  }

  function renderListener(item, i) {
    const instance = getComponent(item.$$id, disptacher.component);
    return (
      <div
        key={i}
        className={classes(
          "relative h-6 w-full rounded-[5px] bg-white/5 flex justify-center items-center text-white p-[5px] text-[11px] font-normal leading-[13px]",
          !instance && "bg-[rgba(255,0,0,0.1)]"
        )}
      >
        {instance ? (
          <>
            {instance.componentName} - {item.$$event}
          </>
        ) : (
          <>Missing Reference</>
        )}

        <SpriteIcon
          onClick={() => unlink(i)}
          id="studio/trash-filled"
          className="cursor-pointer absolute right-[5px] top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
          width={13}
          height={13}
        />
      </div>
    );
  }

  const handleListen = useEventCallback((e) => {
    e.stopPropagation();
    const items = editor.getComponents();
    showSelectParam(
      items,
      "signal",
      (item, path, param) => {
        onChange(
          (value || []).concat([
            {
              $$id: item.componentId,
              $$event: path.join("."),
            },
          ])
        );
      },
      "Select a signal emitter to bind"
    );
  }, []);

  return (
    <div className="relative w-full flex items-center justify-center flex-col h-max min-h-[34px] rounded-lg bg-white/5 p-[5px] gap-[5px] border border-white/40">
      {(value || []).map(renderListener)}
      <HoverLabel
        pop={<SimpleLabel>Listen to a signal</SimpleLabel>}
        className="cursor-pointer h-6 w-full rounded-[5px] bg-white/10 flex justify-center items-center text-studio-success-bright hover:bg-studio-success-bright hover:text-black"
        onClick={handleListen}
      >
        <SpriteIcon id="studio/receiver" width={14} height={14} />
      </HoverLabel>
    </div>
  );
}

export const ReceiverInput = memo(_ReceiverInput);

function getComponent(id, target) {
  if (!id) return "";
  if (!target) return;
  const component = target.container.byInternalId(id);
  return component;
}
