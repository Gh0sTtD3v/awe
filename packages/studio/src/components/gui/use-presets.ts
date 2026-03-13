// @ts-check

import { useDispatcher } from "./dispatcher";
import type { Component3D } from "@oncyberio/engine";
import { getOrCreateEditor } from "@oncyberio/engine-edit/editors/editor-registry";

export function createPreset({
    preset: presetConfig,
    source,
    onChange,
    dispatcher,
}) {
    //

    const { name, label, image, data } = presetConfig;

    // console.log("preset", name, label);
    const renderName = label || name;

    const preset = getOrCreateEditor(dispatcher.component as Component3D)?.getPreset(data);

    const selected = preset.isApplied();

    const alt = name;

    const onClick = () => {
        //

        dispatcher.dispatch({
            //
            origin: "input",
            run: async () => {
                //
                const info = { preset: name };

                const canUndo = dispatcher.supportsUndo;

                const result = preset.apply(canUndo);

                onChange?.(preset);

                if (result) {
                    return {
                        info,
                        ...result,
                    };
                }
            },
            changes: data,
            source,
            isProgress: false,
        });
    };

    return {
        image,
        alt,
        label: renderName,
        name,
        selected,
        onClick,
    };
}

export function useAllPresets({ configs, source, onChange }) {
    const dispatcher = useDispatcher();

    const presets = configs.map((item) => {
        const preset = createPreset({
            preset: item,
            source,
            onChange,
            dispatcher,
        });

        return preset;
    });

    const active = presets.findIndex((item) => item.selected === true);

    return {
        presets,
        active,
    };
}
