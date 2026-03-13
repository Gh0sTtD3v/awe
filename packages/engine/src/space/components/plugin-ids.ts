import { VisualPluginRegistry } from "./visual-plugin-registry";

/** @internal */
export function getAvailablePluginIds(): { id: string; label: string }[] {
    return VisualPluginRegistry.list().map((cls) => ({
        id: cls.pluginName,
        label: cls.label,
    }));
}
