import type { Game } from "./index";
import type { AssetResolverConfig } from "./asset-resolver-config";

/**
 * Basic user identification data.
 *
 * @public
 */
export interface UserData {
  /** Unique identifier for the user */
  id: string;
  /** Display name of the user */
  name: string;
}

/**
 * Runtime profile for engine boot behavior.
 *
 * @public
 */
export type RuntimeProfile = "web" | "headless";

/**
 * Configuration options for entering a space.
 *
 * @remarks
 * This interface defines all the options available when loading and entering
 * a game space. The `mode` determines whether the space is loaded for playing
 * or editing.
 *
 * @example
 * ```ts
 * const opts: EnterSpaceOpts = {
 *   mode: "game",
 *   game: gameData,
 *   user: { id: "user-123", name: "Player1" },
 * };
 * ```
 *
 * @public
 */
export interface EnterSpaceOpts {
  /**
   * Runtime profile used to load and run the space.
   * - `"web"` - Full renderer + intro flow (default)
   * - `"headless"` - No intro/render stack
   */
  runtime?: RuntimeProfile;

  /**
   * The mode to enter the space in.
   * - `"game"` - Play mode for end users (default)
   * - `"edit"` - Studio/editor mode for content creation
   */
  mode?: "edit" | "game";

  /** The game data to load */
  game: Game;

  /** Optional external API to expose to scripts within the space */
  externalApi?: Record<string, unknown>;

  /**
   * Current user data. Only used in game mode.
   * @remarks Ignored when `mode` is `"edit"`
   */
  user?: UserData;

  /**
   * Promise that resolves with user data when available.
   * Useful when user authentication is async.
   * @remarks Only used in game mode
   */
  userReady?: Promise<UserData>;

  /**
   * Enable hot reload for development.
   * When true, script changes are applied without full reload.
   */
  hot?: boolean;

  /**
   * Enable chunk-based world loading.
   * When true, only global components load initially;
   * spatial chunks stream in as the camera moves.
   */
  chunked?: boolean;

  /**
   * Asset resolver configuration.
   *
   * @remarks
   * Controls how asset URLs are resolved. Useful for:
   * - Development: Proxying to a different server
   * - Production: Using a CDN base URL
   * - Custom: Implementing advanced resolution logic
   *
   * @example
   * ```ts
   * // Development setup
   * assets: { baseUrl: 'http://localhost:3001' }
   *
   * // Production CDN
   * assets: { baseUrl: 'https://cdn.mygame.com' }
   * ```
   */
  assets?: AssetResolverConfig;
}

/**
 * Represents the current state of the engine session.
 *
 * @remarks
 * - `"void"` - No active session, engine is idle
 * - `"loading"` - Space is being loaded
 * - `"game"` - Space is running in play mode
 * - `"studio"` - Space is running in edit/studio mode
 *
 * @public
 */
export type EngineSessionState = "void" | "loading" | "game" | "studio";

/**
 * Result of creating a space via {@link Engine.createSpace}.
 *
 * @remarks
 * The `reveal` function allows you to control when the intro animation
 * fades out and the scene becomes visible. This gives you time to set up
 * the camera, controls, and other game state before the player sees the scene.
 *
 * @example
 * ```ts
 * const { space, reveal } = await engine.createSpace(opts);
 *
 * // Set up camera and controls before revealing
 * const player = space.components.byId("player");
 * initializeCamera(player);
 * setupControls(player);
 *
 * // Now reveal the scene to the player
 * await reveal();
 *
 * // Start the game
 * space.start();
 * ```
 *
 * @public
 */
export interface CreateSpaceResult {
  /** The created space instance */
  space: Space;

  /**
   * Reveals the scene by fading out the intro animation.
   *
   * Call this after you've finished setting up the camera, controls,
   * and any other game state that should be ready before the player
   * sees the scene.
   *
   * @returns A promise that resolves when the intro fade completes
   */
  reveal: () => Promise<void>;
}

// Forward declaration for Space type (actual import would create circular dependency)
import type { Space } from "../space/space";
