import type {
  GuiDescriptor,
  GuiGroupDescriptor,
  GuiFolderDescriptor,
} from "@oncyberio/engine/space/gui-types";
import { FormItem } from "./controls/shared/form-item";
import { ColorInput } from "./controls/color-input";
import { Folder } from "./controls/folder";
import { Group } from "./controls/group";
import { TextInput } from "./controls/text-input";
import { NumberInput } from "./controls/number-input";
import { Combo } from "./controls/selectors/combo";
import { Tabbed } from "./controls/selectors/tabbed";
import { Slider } from "./controls/selectors/slider";
import { XYZInput } from "./controls/xyz-input";
import { ImageInput } from "./controls/image-input";
import { Button } from "./controls/button";
import { Checkbox } from "./controls/checkbox";
import { List } from "./controls/list";
import { IconGroup } from "./controls/icon-group";
import SpriteIcon from "../../ui/sprite";

import { useInput } from "./use-input";
import { useAction, useActionList } from "./use-action";
import { numberFormat, colorFormat, xyzFormat, idFormat } from "./formats";
import { useEventCallback } from "../../hooks/use-event-callback";
import { useWorldTransformerState } from "../../hooks/use-world-transformer-state";
import { Layout } from "./controls/layout";
import { Toolbar } from "./controls/toolbar";

// import { Preset } from "./controls/Preset";
// import { Panel } from "./controls/panel";

import { FileInput } from "./controls/file-input";
import { PresetsLayout } from "./controls/preset/presets-layout";
import { StaticImage } from "./controls/static-image";
import { useGUIState } from "./gui-state";
import { DispatcherContextType, useDispatcher } from "./dispatcher";
import { getOrCreateEditor } from "@oncyberio/engine-edit/editors/editor-registry";
import { ResourceInput } from "./controls/resource-input";
import { ComponentInput } from "./controls/component-input";
import { Textarea } from "./controls/textarea";
import { ReceiverInput } from "./controls/receiver-input";
import { SignalIndicator } from "./controls/signal-indicator";
import { rewriteLenses, useArray } from "./use-array";
import { ArrayUI } from "./controls/array";
import { MapKey, MapUI } from "./controls/map";
import { useMap } from "./use-map";
import { useSecret } from "./use-secret";

//
export function RenderObjectGui({ object }: { object: { getGUI(): GuiDescriptor } }) {
  //

  return <RenderGui config={object.getGUI()} />;
}

export function RenderGui({ config, path = "" }: { config: GuiDescriptor; path?: string }) {
  //
  if (config.type === "group") {
    //
    return <RenderGroup config={config} standalone={true} path={path} />;
    //
  } else if (config.type === "folder") {
    //
    return <RenderFolder config={config} path={path} />;
    //
  } else if (config.type === "number") {
    //
    return <RenderNumberInput config={config} />;
    //
  } else if (config.type === "textarea") {
    //
    return <RenderTextarea config={config} />;
    //
  } else if (config.type === "text" || config.type === "string") {
    //
    if (config.isSecret) {
      return <RenderSecretInput config={config} />;
    } else {
      return <RenderTextInput config={config} />;
    }
    //
  } else if (config.type === "xyz" || config.type === "vec3") {
    //
    return <RenderXYZInput config={config} />;
    //
  } else if (config.type === "select" || config.type === "animation") {
    //
    return <RenderSelect config={config} />;
  } else if (config.type === "list") {
    //
    return <RenderList config={config} />;
  } else if (config.type === "color") {
    //
    return <RenderColorInput config={config} />;
    //
  } else if (config.type === "image") {
    //
    return <RenderImageInput config={config} />;
    //
  } else if (config.type === "staticimage") {
    return <RenderStaticImage config={config} />;
  } else if (config.type === "file") {
    //
    return <RenderFileInput config={config} />;
    //
  } else if (config.type === "checkbox" || config.type === "boolean") {
    //
    return <RenderCheckbox config={config} />;
  } else if (config.type === "button") {
    //
    return <RenderButton config={config} />;
  } else if (config.type === "array") {
    //
    return <RenderArray config={config} />;
  } else if (config.type === "map") {
    //
    return <RenderMap config={config} />;
  } else if (config.type === "layout") {
    //
    return <RenderLayout config={config} />;
  } else if (config.type === "presets") {
    //
    return <RenderPresets config={config} />;
    //
  } else if (config.type === "toolbar") {
    //
    return <RenderToolbar config={config} />;
  } else if (config.type === "icongroup") {
    //
    return <RenderIconGroup config={config} />;
  } else if (config.type === "resource") {
    //
    return <RenderResource config={config} />;
  } else if (config.type === "component") {
    //
    return <RenderComponent config={config} />;
  } else if (config.type === "receiver") {
    //
    return <RenderReceiver config={config} />;
  } else if (config.type === "signal") {
    //
    return <RenderSignal config={config} />;
  } else {
    //
    return (
      <span style={{ background: "red", color: "white" }}>
        unknown type {String(config.type)}
      </span>
    );
  }
}

const isInput = (config: GuiDescriptor): boolean => {
  //
  return (
    config.type === "number" ||
    config.type === "text" ||
    config.type === "string" ||
    config.type === "xyz" ||
    config.type === "vec3" ||
    config.type === "select" ||
    config.type === "list" ||
    config.type === "color" ||
    config.type === "image" ||
    config.type === "file" ||
    config.type === "checkbox" ||
    config.type === "boolean"
  );
};

function RenderButton({ config }) {
  //
  const { onAction: _onAction, ...rest } = config;

  const onAction = useAction({ label: config.label, onAction: _onAction });

  const disabled =
    typeof config.disabled === "function" ? config.disabled() : config.disabled;

  const label =
    typeof config.label === "function" ? config.label() : config.label;

  const props = { ...rest, onAction, disabled, label };

  return <Button {...props} />;
}

function RenderLayout({ config }) {
  //
  const { children, ...props } = config;

  return (
    <Layout {...props}>
      {children.map((config, i) => {
        //
        return <RenderGui key={i} config={config} />;
      })}
    </Layout>
  );
}

const formLayouts = {
  presets: "stacked",
  toolbar: "stacked",
  xyz: "stacked",
};

function evalInCtx(
  ctx: DispatcherContextType,
  exp: any,
  defValue?: any,
  ignoreStrExp = false
) {
  //
  if (exp == null) return defValue;

  let instance = getOrCreateEditor(ctx.component)?.getDataContext();

  if (typeof exp == "string") {
    //
    return ignoreStrExp ? exp : instance[exp];
  }

  if (typeof exp == "function") {
    return exp(instance);
  }

  return exp;
}

function RenderGroup({ config, standalone, path }: { config: GuiGroupDescriptor | GuiFolderDescriptor; standalone: boolean; path: string }) {
  //
  const dispatcher = useDispatcher();

  const { children } = config;

  const style = standalone
    ? { marginBottom: 0, ...config.style }
    : config.style;

  const getPreferredOrder = (key) => {
    if (key == null) return Infinity;

    const orderMap = {
      transform: 0,
      border: 1,
      controls: 2,
      preset: 3,
    };

    if (typeof key !== "string") {
      return Infinity;
    }

    const normalizedKey = key.toLowerCase();

    return orderMap[normalizedKey] ?? Infinity;
  };

  const sortedKeys = Object.keys(children);

  return (
    <Group
      style={style}
      className={Object.keys(children).length === 0 ? "empty" : null}
    >
      {sortedKeys.map((key) => {
        //
        let config = children[key];

        if (typeof config === "function") {
          config = config();
        }

        if (
          config == null ||
          !evalInCtx(dispatcher, config.visible, true, false)
        ) {
          //
          return null;
        }

        const el =
          config == null ? null : (
            <RenderGui key={key} config={config} path={path + "/" + key} />
          );

        const labelConfig = evalInCtx(
          dispatcher,
          config.label,
          undefined,
          true
        );

        if (
          el == null ||
          config.type === "group" ||
          config.type === "folder" ||
          config.type === "layout" ||
          config.noLabel ||
          labelConfig === null
        ) {
          //
          return el;
        }

        let label = labelConfig || config.name;

        if (!label && config.type !== "button") {
          //
          label = key;
        } else if (config.type === "button" && !labelConfig) {
          //
          label = "";
        }

        if (
          (config.type === "checkbox" && config.label && !config.info) ||
          config.skipLabel
        ) {
          label = null;
        }

        if (config.type === "checkbox" && config.mainLabel) {
          label = config.mainLabel;
        }

        let layout = config.layout ?? formLayouts[config.type] ?? "stacked";

        const skipLabel =
          (el.props.config.type === "image" &&
            el.props.config.display !== "s") ||
          el.props.config.type === "staticimage";

        return (
          <FormItem
            key={key}
            layout={layout}
            label={skipLabel ? null : label}
            style={(config as any).style}
            config={config}
          >
            {el}
          </FormItem>
        );
      })}
    </Group>
  );
}

function RenderArray({ config }) {
  //

  // console.log("RenderArray", config);
  const { items, onAdd, onRemove, onReset } = useArray(config);

  const renderItem = (idx: number) => {
    //
    // const placeholder = config.idxPlaceholder;

    // const itemConfig = rewriteLenses(config.itemGui, (gui) => {
    //     //
    //     gui = {
    //         ...gui,
    //         value: gui.value.map((it) => (it === placeholder ? idx : it)),
    //     };

    //     return gui;
    // });

    const itemConfig = config.itemGui(idx);

    return <RenderGui config={itemConfig} />;
  };

  return (
    <ArrayUI
      itemType={config.itemType}
      items={items}
      onAdd={onAdd}
      onRemove={onRemove}
      onReset={onReset}
      renderItem={renderItem}
    />
  );
}

function RenderMap({ config }) {
  //

  // console.log("RenderArray", config);
  const { items, onAdd, onRemove, onReset } = useMap(config);

  const renderItem = (key: string, i: number) => {
    //
    // const itemConfig = rewriteLenses(config.itemGui, (gui) => {
    //     //
    //     const placeholder = config.idxPlaceholder;

    //     gui = {
    //         ...gui,
    //         value: gui.value.map((it) => (it === placeholder ? i : it)),
    //     };

    //     return gui;
    // });

    const itemConfig = config.itemGui(key, i);

    const gui: GuiGroupDescriptor = {
      type: "group",
      children: {
        keyEntry: config.readonly
          ? null
          : {
              type: "text" as const,
              label: "Key",
              value: config.value.concat([i, "key"]),
              validate: (key) => config.validateKey(key, i),
            },
        value: itemConfig,
      },
    } as GuiGroupDescriptor;

    return <RenderGui config={gui} />;
  };

  return (
    <MapUI
      itemType={config.itemType}
      items={items}
      onAdd={onAdd}
      onRemove={onRemove}
      onReset={onReset}
      renderItem={renderItem}
    />
  );
}

function RenderFolder({ config, path }: { config: GuiFolderDescriptor; path: string }) {
  //
  const { enableRotate, enableTranslate } = useWorldTransformerState();

  const dispatcher = useDispatcher();

  const { name, label, slug, defaultOpen = false, onToggle, color } = config;

  let defUnfolded = defaultOpen;

  if (
    (slug === "position" && enableTranslate) ||
    (slug === "rotation" && enableRotate)
  ) {
    defUnfolded = true;
  }

  const { state: guiState, setState: setGuiState } = useGUIState();

  const isCollapsed = !(guiState.unfolds?.[path] ?? defUnfolded);

  const setIsCollapsed = (value) => {
    //
    setGuiState({
      unfolds: {
        ...guiState.unfolds,
        [path]: !value,
      },
    });
  };

  const id = name || (typeof label === "function" ? label() : label);

  const handleToggle = useEventCallback(() => {
    //
    setIsCollapsed(!isCollapsed);

    onToggle?.(!isCollapsed);
  }, []);

  return (
    <Folder
      key={id}
      title={label}
      collapsed={isCollapsed}
      onToggle={handleToggle}
      color={color}
    >
      <RenderGroup config={config} standalone={false} path={path} />
    </Folder>
  );
}

function RenderNumberInput({ config }) {
  //

  const { value: source, onChange, locked, ...rest } = config;

  const inputProps = useInput({
    source,
    onChange,
    format: config.format || numberFormat,
    locked,
    opts: config.opts,
  });

  const props = { ...rest, ...inputProps };

  return <NumberInput {...props} />;
}

function RenderTextInput({ config }) {
  //
  const dispatcher = useDispatcher();

  const {
    value: source,
    onChange,
    locked,
    validate,
    disabled: _disabled,
    ...rest
  } = config;

  const inputProps = useInput({
    source,
    onChange,
    format: config.format || idFormat,
    validate,
    locked,
    opts: config.opts,
  });

  const disabled = evalInCtx(dispatcher, _disabled, false, false);

  const props = { ...rest, ...inputProps, disabled };

  return <TextInput {...props} />;
}

function RenderSecretInput({ config }) {
  //
  const dispatcher = useDispatcher();

  const {
    value: source,
    locked,
    validate,
    disabled: _disabled,
    ...rest
  } = config;

  const { inputProps, decrypt, isEncrypting } = useSecret({
    source,
    validate,
    locked,
    opts: config.opts,
  });

  const disabled = evalInCtx(dispatcher, _disabled, false, false);

  const action = isEncrypting ? (
    <SpriteIcon id="dot-horizontal" width={12} height={12} />
  ) : inputProps.value ? (
    <SpriteIcon id="eye" width={12} height={12} onClick={decrypt} />
  ) : null;

  const props = { ...rest, ...inputProps, disabled, isSecret: true, action };

  return <TextInput {...props} />;
}

function RenderTextarea({ config }) {
  //
  const dispatcher = useDispatcher();

  const {
    value: source,
    onChange,
    locked,
    validate,
    disabled: _disabled,
    ...rest
  } = config;

  const inputProps = useInput({
    source,
    onChange,
    format: config.format || idFormat,
    validate,
    locked,
    opts: config.opts,
  });

  const disabled = evalInCtx(dispatcher, _disabled, false, false);

  const props = { ...rest, ...inputProps, disabled };

  return <Textarea {...props} />;
}

function RenderXYZInput({ config }) {
  //
  const { value: source, onChange, locked, inline, ...rest } = config;

  const inputProps = useInput({
    source,
    onChange,
    format: config.format || xyzFormat,
    locked,
    opts: config.opts,
  });

  const props = { ...rest, inline, ...inputProps };

  return <XYZInput {...props} />;
}

function RenderSelect({ config }) {
  //
  const dipatcher = useDispatcher();

  const { value: source, onChange, locked, ...rest } = config;

  const _items = config.items || config.options;

  const items = evalInCtx(dipatcher, _items, [], false);

  const inputProps = useInput({
    source,
    onChange,
    format: config.format,
    validate: config.validate,
    locked,
    opts: config.opts,
  });

  const onChangeOpt = (value, isProgress) => {
    //
    if (typeof items[0] === "number" && value != null) {
      //
      value = +value;
    }

    return inputProps.onChange(value, isProgress);
  };

  const props = { ...rest, ...inputProps, items, onChange: onChangeOpt };
  return config.mode === "buttons" ? (
    <Tabbed {...props} />
  ) : config.mode === "slider" ? (
    <Slider {...props} />
  ) : (
    <Combo {...props} />
  );
}

function RenderResource({ config }) {
  //
  const { value, onChange } = useInput({
    onChange: config.onChange,
    source: config.value,
    format: config.format || idFormat,
    locked: config.locked,
    opts: config.opts,
  });

  const handleChange = (newValue: unknown) => {
    onChange(newValue, false);
  };

  return (
    <ResourceInput
      value={value}
      onChange={handleChange}
      type={config.typeof}
      required={config.required}
    />
  );
}

function RenderReceiver({ config }) {
  //
  const { value, onChange } = useInput({
    onChange: config.onChange,
    source: config.value,
    locked: config.locked,
    opts: config.opts,
  });

  const handleChange = (newValue: unknown) => {
    onChange(newValue, false);
  };

  return <ReceiverInput value={value} onChange={handleChange} />;
}

function RenderSignal({ config }) {
  //
  return <SignalIndicator config={config} />;
}

function RenderComponent({ config }) {
  //
  const { value, onChange } = useInput({
    onChange: config.onChange,
    source: config.value,
    format: config.format || idFormat,
    locked: config.locked,
    opts: config.opts,
  });

  const handleChange = (newValue: unknown) => {
    onChange(newValue, false);
  };

  return (
    <ComponentInput
      targetId={config.value?.[0]?.DATA_PROXY_ID}
      value={value}
      onChange={handleChange}
      type={config.typeof}
      required={config.required}
    />
  );
}

function RenderIconGroup({ config }) {
  //
  const dipatcher = useDispatcher();

  const { value: source, items: _items, onChange, locked, ...rest } = config;

  const inputProps = useInput({
    source,
    onChange,
    format: config.format,
    locked,
    opts: config.opts,
  });

  const items = evalInCtx(dipatcher, _items, [], false);

  const props = { ...rest, ...inputProps, items };

  return <IconGroup {...props} />;
}

function RenderList({ config }) {
  //
  const dipatcher = useDispatcher();

  const { value, items: getItems, onChange, format, locked, ...rest } = config;

  const inputProps = useInput({
    source: value,
    onChange,
    format,
    opts: config.opts,
    locked,
  });

  const items = evalInCtx(dipatcher, getItems, [], false);

  const props = { ...rest, ...inputProps, items };

  return <List {...props} />;
}

function RenderColorInput({ config }) {
  //
  const { value: source, onChange, locked, ...rest } = config;

  const inputProps = useInput({
    source,
    onChange,
    format: config.format || colorFormat,
    locked,
    opts: config.opts,
  });

  const props = { ...rest, ...inputProps };

  return <ColorInput {...props} />;
}

function RenderStaticImage({ config }) {
  //
  const { image, disabled, ...rest } = config;

  const props = { image, disabled, ...rest };

  return <StaticImage {...props} />;
}

function RenderImageInput({ config }) {
  //
  const { value: source, onChange, locked, ...rest } = config;

  const inputProps = useInput({
    source,
    onChange,
    format: config.format || idFormat,
    locked,
    opts: config.opts,
  });

  const props = { ...rest, ...inputProps };

  return <ImageInput {...props} />;
}

function RenderFileInput({ config }) {
  const { value: source, disabled, onChange, locked, ...rest } = config;

  const inputProps = useInput({
    source,
    onChange,
    format: config.format || idFormat,
    locked,
    opts: config.opts,
  });

  const props = {
    ...rest,
    ...inputProps,
    disabled: typeof disabled === "function" ? disabled() : disabled,
  };

  return <FileInput {...props} />;
}

function RenderCheckbox({ config }) {
  //
  const { value: source, onChange, locked, ...rest } = config;

  const inputProps = useInput({
    source,
    onChange,
    format: config.format,
    locked,
    opts: config.opts,
  });

  const props = { ...rest, ...inputProps };

  return <Checkbox {...props} />;
}

// function RenderPresets({ config }) {
//     //
//     const { items, onChange } = config;

//     return (
//         <Layout gap={9}>
//             {items.map((preset, i) => {
//                 //
//                 return <Preset key={i} preset={preset} onChange={onChange} />;
//             })}
//         </Layout>
//     );
// }

function RenderToolbar({ config }) {
  //
  const actions = useActionList(config.actions);

  return <Toolbar actions={actions} />;
}

function RenderPresets({ config }) {
  //
  const { items, source, objectFit, onChange } = config;

  return (
    <PresetsLayout
      items={items}
      source={source}
      onChange={onChange}
      objectFit={objectFit}
    />
  );
}
