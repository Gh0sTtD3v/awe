/**
 * Base interface for component data in the game format.
 *
 * @remarks
 * Components are the building blocks of a game/space. Each component has a type
 * that determines its behavior (e.g., model, video, platform, script).
 * Components can be nested via the `children` property to create hierarchies.
 *
 * @typeParam T - The component type string (e.g., "model", "video", "platform")
 *
 * @example
 * ```ts
 * const modelComponent: ComponentData<"model"> = {
 *   id: "player-model",
 *   type: "model",
 *   name: "Player",
 *   url: "https://example.com/player.glb"
 * };
 * ```
 *
 * @public
 */
export interface ComponentData<T extends string = any> {
  /**
   * Unique identifier for the component. If not provided, an auto id will be generated.
   */
  id?: string;

  /**
   * @internal
   */
  kind?: "builtin" | "script";

  /**
   * Name for the component. Defaults to ""
   */
  name?: string;

  /**
   * Type of the component (model, video, platform, kitbash, etc)
   */
  type: T;

  /**
   * @internal
   */
  kit?: string;

  /**
   * Id of the parent component
   */
  parentId?: string;

  /**
   * List of children components
   */
  children?: Record<string, ComponentData>;

  /**
   * @internal
   */
  _index?: number;

  /**
   * @internal
   */
  __skipBuild?: boolean;

  /**
   * @internal
   */
  attachements?: Record<string, any>;

  _meta?: Record<string, any>;

  [key: string]: any;
}

/**
 * Represents the complete game/space data structure.
 *
 * @remarks
 * A Game contains all the component data that defines a space, along with
 * metadata about ownership and editing permissions.
 *
 * @example
 * ```ts
 * const game: Game = {
 *   id: "game-123",
 *   creatorId: "user-456",
 *   editors: ["user-456", "user-789"],
 *   components: {
 *     "comp-1": { type: "model", name: "Tree", url: "..." }
 *   }
 * };
 * ```
 *
 * @public
 */
export interface Game {
  /** Unique identifier for the game/space */
  id: string;
  /** Map of component IDs to their data */
  components: Record<string, ComponentData>;
  /** User ID of the game creator */
  creatorId?: string;
  /** List of user IDs with edit permissions */
  editors?: string[];
}
