import type {
    GuiFolderDescriptor,
    GuiValueBinding,
} from "../gui-types";

/**
 * Static side of a visual plugin class. Every plugin class must expose
 * these static members so the registry and editor can discover it by name,
 * display it with a human-readable label, and populate default config when
 * the user adds it through the editor.
 *
 * @public
 */
export interface VisualPluginClass {
    /** Unique string identifier (e.g. `"RainbowPlugin"`). */
    pluginName: string;
    /** Human-readable label shown in the editor's plugin list. */
    label: string;
    /** Default config values used when the plugin is first added. */
    defaults: Record<string, any>;
    /**
     * Return a GUI folder descriptor for editing this plugin's config.
     * The `dataBinding` tuple points to this plugin's entry in the data
     * array — append the property name to bind controls.
     */
    getGUI(dataBinding: GuiValueBinding): GuiFolderDescriptor;
    /** Constructor — receives the plugin's config object. */
    new (config: Record<string, any>): VisualPlugin;
}

/**
 * Per-instance attribute definition used by instanced mesh and visual plugins.
 *
 * @public
 */
export interface InstancedAttribute {
    /** Attribute name used in the shader. */
    name: string;
    /** Backing array for the attribute data. */
    array: number[];
    /** Number of components per instance (1 = scalar, 3 = vec3, 4 = vec4). */
    length: number;
    /** Default value assigned to new instances. */
    defaultValue: number;
}

/**
 * Base interface for plugins that feed into the shader compilation pipeline.
 *
 * Both {@link VisualPlugin} and `InstancedMeshPlugin` extend this interface
 * to share common shader-related fields.
 *
 * @public
 */
export interface ShaderPlugin {
    /** Plugin name identifier. */
    name: string;
    /** Shader uniform values. */
    uniforms?: Record<string, { value: any }>;
    /** Preprocessor defines added to the material. */
    defines?: Record<string, string>;
    /** Code injected into the vertex shader. */
    vertexShaderHooks?: { prefix?: string; main?: string; suffix?: string };
    /** Code injected into the fragment shader. */
    fragmentShaderHooks?: { prefix?: string; main?: string; suffix?: string };
}

/**
 * Instance-side interface that every visual plugin must implement.
 *
 * A visual plugin modifies the rendering of `avatar` and `model` components
 * by injecting custom shader hooks at the material level.
 *
 * @public
 */
export interface VisualPlugin extends ShaderPlugin {
    /** Shader chunk replacements. */
    chunks?: {
        vertex?: Record<string, string>;
        fragment?: Record<string, string>;
    };
    /** Shader string replacers. */
    replacers?: {
        vertex?: Record<string, string>;
        fragment?: Record<string, string>;
    };
    /** Custom vertex attributes. */
    attributes?: Record<string, InstancedAttribute>;
    /** Whether the material should be transparent. */
    transparent?: boolean;
}
