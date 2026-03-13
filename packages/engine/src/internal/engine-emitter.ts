import Augmented from "./events/augmented";
import type { EngineEventListeners } from "./engine-events";
import type { GameEventListeners } from "./game-events";

/**
 * Internal engine emitter instance.
 * Used by engine systems only - not part of the public API.
 *
 * @internal
 */
const emitter = Augmented.engineEmitter as Augmented<
  EngineEventListeners & GameEventListeners
>;

export default emitter;
