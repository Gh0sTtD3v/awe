import { Game } from "./game";
import type { RuntimeProfile } from "./enter-space-opts";

/**
 * Internal options for initializing a Space instance.
 *
 * @remarks
 * This is used internally by the engine when creating a Space.
 * Most users should use {@link EnterSpaceOpts} instead.
 *
 * @internal
 */
export interface SpaceOpts {
    /** The game data to load */
    game: Game;
    /** External API to expose to scripts */
    externalApi: unknown;
    /** Enable hot reload for development */
    hot?: boolean;
    /** Runtime profile ("web" | "headless") */
    runtime?: RuntimeProfile;
    /** Additional loading options */
    loadOpts?: {
        /**
         * Enable loose mode for more permissive loading.
         * Useful during development when game data may be incomplete.
         */
        looseMode?: boolean;
        /**
         * Controls when the space starts running.
         * - `"auto"` - Start automatically after loading (default)
         * - `"manual"` - Wait for explicit start call
         */
        autoStart?: "auto" | "manual";
    };
}
