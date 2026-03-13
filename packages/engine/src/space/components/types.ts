/**
 * @public
 *
 * This is a shared interface used to represent various 3D coordinates in component data (position, rotation, scale ...)
 */
export interface XYZ {
    x: number;
    y: number;
    z: number;
}

/**
 * @public
 *
 * This is a shared interface used to represent various 2D coordinates in component data
 */
export interface XY {
    x: number;
    y: number;
}

/**
 * @public
 *
 * Declarative descriptor for attaching a visual plugin to a model or avatar component.
 * The `id` identifies the plugin class registered in `VisualPluginRegistry`.
 * Remaining properties are plugin-specific config (e.g. `speed`, `amount`).
 */
export interface PluginData {
    /** Plugin identifier (matches `VisualPluginClass.pluginName`). */
    id: string;
    /** Arbitrary plugin-specific config values. */
    [key: string]: any;
}

