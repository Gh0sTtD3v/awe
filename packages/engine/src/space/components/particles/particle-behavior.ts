import type {
    GuiFolderDescriptor,
    GuiValueBinding,
} from "../../gui-types";
import type { ParticlesComponent } from "./particles-component";

/** Hint returned by onConfigChange to tell the component what to do */
export type RebuildHint = "none" | "rebuild" | "material";

/** Base config — each behavior defines its own shape */
export type BehaviorConfig = Record<string, any>;

/** Context passed to applySpawnData */
export interface SpawnContext {
    source: any;
    billboard: boolean;
    frame: number;
}

/** Per-particle spawn data mutated by behaviors */
export interface ParticleSpawnData {
    primitive: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    opacity: number;
    scale: { x: number; y: number; z: number };
    plugins: any[];
    billboard: boolean;
    randomID: number;
    source: any;
    frame: number;
    spawnTimer?: number;
    lifeSpanTimer?: number;
    [key: string]: any;
}

/**
 * Static side of a particle behavior class. Every behavior class must expose
 * these static members so the registry and editor can discover it by name,
 * display it with a human-readable label, and populate default options when
 * the user adds it through the editor.
 *
 * Implement this as a plain class with `static` fields:
 *
 * ```ts
 * export class MyBehavior implements ParticleBehavior {
 *     static behaviorName = "myBehavior";
 *     static label = "My Behavior";
 *     static defaults = { speed: 1 };
 *
 *     constructor(private host: ParticlesComponent, private config: BehaviorConfig) {}
 *     // ...
 * }
 * ```
 *
 * Then register it:
 *
 * ```ts
 * ParticleBehaviorRegistry.register(MyBehavior);
 * ```
 */
export interface ParticleBehaviorClass {
    /** Unique string identifier used as the `type` value in the data array. */
    behaviorName: string;
    /** Human-readable label shown in the editor's behavior list. */
    label: string;
    /** Default config values used when the behavior is first added. */
    defaults: BehaviorConfig;
    /** Constructor — receives the owning component and the behavior's options object. */
    new (host: ParticlesComponent, config: BehaviorConfig): ParticleBehavior;
}

/**
 * Instance-side interface that every particle behavior must implement.
 *
 * A behavior extends the particle system through one or more optional hooks
 * that the component calls at well-defined points in its lifecycle:
 *
 * | Hook | When called | Typical use |
 * |------|-------------|-------------|
 * | {@link init} | Once, right after construction | One-time setup (e.g. create debug meshes) |
 * | {@link getPlugin} | During mesh creation | Return a shader plugin injected between the pre and post plugins |
 * | {@link applySpawnData} | Each time a particle spawns | Mutate per-particle CPU data (position, scale, color, …) |
 * | {@link onFrame} | Every frame | Update uniforms or other per-frame state |
 * | {@link onConfigChange} | When the behavior's options change in the editor | Return a {@link RebuildHint} so the component knows whether to rebuild |
 * | {@link getMaterialConstructors} | During mesh creation | Override material classes (e.g. switch to unlit) |
 * | {@link getGeometryOptions} | During mesh creation | Merge extra options into the instanced-mesh geometry config |
 * | {@link setupMaterial} | After mesh creation, and on material updates | Apply textures, colors, PBR settings to the live material |
 * | {@link getGUI} | When the editor builds its UI | Return a folder descriptor for this behavior's controls |
 * | {@link dispose} | When the behavior is removed or the component is disposed | Release resources |
 *
 * All hooks except {@link getGUI} are optional. A minimal behavior only needs
 * `getGUI` and whichever hooks are relevant to its feature (e.g. a CPU-only
 * spawn offset behavior only implements `applySpawnData` and `getGUI`).
 */
export interface ParticleBehavior {
    /**
     * Called once after construction. Use for one-time setup that depends on
     * the host component being available (e.g. creating debug meshes).
     */
    init?(): void;

    /**
     * Return a shader plugin to inject between the pre and post plugins.
     * The plugin can declare uniforms, attributes, defines, and shader hooks.
     * Return `null` if this behavior has no GPU-side work.
     */
    getPlugin?(): any | null;

    /**
     * Mutate per-particle spawn data on the CPU at spawn time. Called once
     * per particle, after the component has set up base position/rotation/scale.
     * Add or overwrite any properties on `spawnData` — they are forwarded to
     * the instanced mesh as attribute values.
     */
    applySpawnData?(spawnData: ParticleSpawnData, context: SpawnContext): void;

    /**
     * Called every frame. Use to update shader uniforms or other time-varying
     * state. Called after auto-spawn logic and before `frame` is incremented.
     */
    onFrame?(delta: number): void;

    /**
     * Called when the behavior's options object changes (e.g. from the editor).
     * Compare `config` with `prev` and return a hint:
     * - `"none"` — no action needed (just update internal state)
     * - `"rebuild"` — full mesh rebuild required (defines or structure changed)
     * - `"material"` — material re-setup needed (textures, colors, etc.)
     *
     * Also use this callback to store the new config reference internally.
     */
    onConfigChange?(config: BehaviorConfig, prev: BehaviorConfig): RebuildHint;

    /**
     * Return material constructor overrides. The returned record is merged
     * into the default material map (`diffuseMaterial`, `lightingMaterial`,
     * `occlusionMaterial`, `lightingOcclusionMaterial`).
     */
    getMaterialConstructors?(): Record<string, any> | null;

    /**
     * Return additional geometry options merged into the instanced-mesh
     * config (e.g. `{ atlas: true }`).
     */
    getGeometryOptions?(): Record<string, any> | null;

    /**
     * Called after the instanced mesh is created (and again on material-only
     * updates). Use to apply textures, PBR values, blending modes, etc. to
     * the live material instances on the mesh.
     */
    setupMaterial?(mesh: any): Promise<void> | void;

    /**
     * Return a GUI folder descriptor for editing this behavior's config.
     * The `dataBinding` tuple points to this behavior's entry in the data
     * array — append `"options"` and then the property name to bind controls:
     *
     * ```ts
     * getGUI(dataBinding) {
     *     const opts = [...dataBinding, "options"];
     *     return {
     *         type: "folder",
     *         label: "My Behavior",
     *         children: {
     *             speed: { type: "number", label: "Speed", value: [...opts, "speed"] },
     *         },
     *     };
     * }
     * ```
     */
    getGUI(dataBinding: GuiValueBinding): GuiFolderDescriptor;

    /**
     * Cleanup when behavior is removed or component disposed.
     * Release any resources (textures, debug meshes, event listeners, …).
     */
    dispose?(): void;
}

// ── Registry ──

const registry = new Map<string, ParticleBehaviorClass>();

export const ParticleBehaviorRegistry = {
    register(behaviorClass: ParticleBehaviorClass) {
        registry.set(behaviorClass.behaviorName, behaviorClass);
    },

    get(name: string): ParticleBehaviorClass | undefined {
        return registry.get(name);
    },

    list(): ParticleBehaviorClass[] {
        return Array.from(registry.values());
    },

    has(name: string): boolean {
        return registry.has(name);
    },
};
