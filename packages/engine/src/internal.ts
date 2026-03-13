/**
 * Internal engine utilities for use by sibling packages (engine-edit, studio).
 * NOT part of the public API.
 * @internal
 */
import SpaceFactory from "./space/index";
import type { Space } from "./space/space";

export function getCurrentSpace(): Space {
  return SpaceFactory.current;
}
