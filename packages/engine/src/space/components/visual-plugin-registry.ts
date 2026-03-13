import type { VisualPluginClass } from "./visual-plugin-types";

const registry = new Map<string, VisualPluginClass>();

/**
 * Singleton registry for visual plugin classes.
 *
 * Register a plugin class to make it available in the editor and at runtime:
 *
 * ```ts
 * import { VisualPluginRegistry } from "..";
 *
 * VisualPluginRegistry.register(MyPlugin);
 * ```
 *
 * @public
 */
export const VisualPluginRegistry = {
    /** Register a plugin class (reads statics from the class). */
    register(pluginClass: VisualPluginClass) {
        registry.set(pluginClass.pluginName, pluginClass);
    },

    /** Remove a plugin from the registry. */
    unregister(id: string) {
        registry.delete(id);
    },

    /** Look up a plugin class by its `pluginName`. */
    get(id: string): VisualPluginClass | undefined {
        return registry.get(id);
    },

    /** Return all registered plugin classes. */
    list(): VisualPluginClass[] {
        return Array.from(registry.values());
    },

    /** Check whether a plugin with the given id is registered. */
    has(id: string): boolean {
        return registry.has(id);
    },
};
