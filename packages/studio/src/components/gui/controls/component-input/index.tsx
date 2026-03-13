import DragDestination from "../../../drag-destination";
import SpriteIcon from "../../../../ui/sprite";
import { useEditorService } from "../../../../contexts/editor-service-context";
import { memo, useState } from "react";
import { classes } from "../../../../utils/classes";
import { HoverLabel, SimpleLabel } from "../shared/label";
import {
  TEXT_READONLY,
  INPUT_ACTION_CONTAINER,
  FLEX_CENTER_ALL
} from "../../../../ui/utils/tailwind-classes";

interface ComponentInputProps {
  targetId: string;
  value: any;
  onChange: (value: any) => void;
  type: string | { name: string; $$resource: { data: { id: string } } };
  required?: boolean;
}

function _ComponentInput({
  targetId,
  value,
  onChange,
  type,
  required = true,
}: ComponentInputProps) {
  const { editor } = useEditorService();
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const [isWrongType, setIsWrongType] = useState(false);
  const [label, setLabel] = useState("Uploading...");

  const typeLabel =
    typeof type === "string"
      ? type === "any"
        ? "Component"
        : type
      : type?.name;
  const target = editor.getComponent(targetId);
  const asComponent = getComponent(value, target);
  const name = getName(asComponent);
  const isDefined = !!value?.$$id;
  const isUnfound = !asComponent && isDefined;

  const silentErrorWith = (message: string) => {
    setIsWrongType(true);
    setLabel(message);
    setTimeout((_) => setIsWrongType(false), 1000);
  };

  const handleNewValue = (component: any) => {
    setIsDraggedOver(false);
    setLabel("Copying...");
    if (component?.dataType !== "component")
      return silentErrorWith("Not a Component");
    if (!component.id) return silentErrorWith("Component has no content");
    if (!component.type) return silentErrorWith("Component has no type");
    if (typeof type === "string") {
      console.log(component, type);
      if (component.type !== type && type !== "any")
        return silentErrorWith("Wrong Component Type");
    } else {
      console.log(component, type);
      if (component.type !== type?.$$resource?.data?.id)
        return silentErrorWith("Wrong Component Type");
    }
    onChange({
      $$paramType: "component",
      $$id: component.id,
    });
  };

  const handleDelete = () => onChange({ $$paramType: "component", $$id: null });

  const selectValue = () => {
    if (!asComponent) return;
    editor.selectComponents([asComponent.componentId]);
  };

  let content = null;
  switch (true) {
    case isWrongType: {
      content = (
        <>
          <span className={TEXT_READONLY}>{label}</span>
        </>
      );
      break;
    }
    case isUnfound: {
      content = (
        <>
          <span className={TEXT_READONLY}>
            Assigned component has been deleted
          </span>
        </>
      );
      break;
    }
    case isDefined: {
      content = (
        <>
          <div className="pointer-events-none whitespace-pre-wrap w-full text-[13px] font-normal leading-[15px] max-w-full text-white text-ellipsis overflow-hidden pr-9">{name}</div>
          <div className={INPUT_ACTION_CONTAINER}>
            <HoverLabel
              pop={<SimpleLabel>Select</SimpleLabel>}
              className="backdrop-blur-[12.5px] w-[22px] h-[22px] rounded-[30px] flex items-center cursor-pointer justify-center pointer-events-auto bg-white/30 text-white hover:bg-white/50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                selectValue();
              }}
            >
              <SpriteIcon id="eye" width={13} height={13} />
            </HoverLabel>
            <HoverLabel
              pop={<SimpleLabel>Unset</SimpleLabel>}
              className="backdrop-blur-[12.5px] w-[22px] h-[22px] rounded-[30px] flex items-center cursor-pointer justify-center pointer-events-auto bg-white/30 text-white hover:bg-white/50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDelete();
              }}
            >
              <SpriteIcon id="studio/trash-filled" width={12} height={12} />
            </HoverLabel>
          </div>
        </>
      );
      break;
    }
    default: {
      content = (
        <>
          <div className={TEXT_READONLY}>{`No ${typeLabel}`}</div>
        </>
      );
      break;
    }
  }

  return (
    <DragDestination
      onDragOver={(_) => setIsDraggedOver(true)}
      onDragLeave={(_) => setIsDraggedOver(false)}
      onReceiveData={handleNewValue}
    >
      <div
        className={classes(
          "upload-input relative w-full flex items-center justify-center h-[34px] min-h-[34px] rounded-lg bg-white/5 border border-dashed border-white/40",
          !isDefined && required && "bg-[rgba(150,23,23,0.219)]",
          isDraggedOver && "bg-studio-gray-medium",
          isWrongType && "bg-[rgba(150,23,23,0.219)] border-[rgba(255,0,0,0.767)] cursor-not-allowed",
          isUnfound && required && "bg-[rgba(150,23,23,0.219)]"
        )}
      >
        <div className={classes(
          "pt-[3px] pl-[5px] pr-1 text-white/80 opacity-30",
          asComponent && "opacity-100"
        )}>
          <SpriteIcon id="studio/relation" width={18} height={18} />
        </div>
        <div className={`${FLEX_CENTER_ALL} w-full h-full pr-0 pl-1.5`}>{content}</div>
      </div>
    </DragDestination>
  );
}

export const ComponentInput = memo(_ComponentInput);

function getComponent(value, target) {
  if (!value?.$$id) return "";
  if (!target) return;
  const id = value.$$id;
  const component = target.container.byInternalId(id);
  return component;
}

function getName(component) {
  if (!component) return "";
  const name = component.componentName || component.componentType;
  return name.length > 25 ? `${name.slice(0, 25)}...` : name;
}
