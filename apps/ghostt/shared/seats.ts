import { vec, type Vec3 } from "./gates";

/**
 * Seats: `seat` squares placed on chairs and benches. Walking up to one shows
 * a prompt; sitting snaps the avatar onto the square, facing its arrow, and
 * plays the "sitting" animation. Purely client-side — the server only sees
 * the position and the animation name, like any other player update.
 */

export interface SeatDef {
  id: string;
  /** Where the avatar is placed: the square's centre, plus the height offset. */
  sitAt: Vec3;
  /** Which way the seated avatar faces (the square's Y rotation). */
  rotY: number;
  /** How close a player must be, in metres, measured flat. */
  range: number;
  /** Prompt text after "E". */
  prompt: string;
}

/** Players further above or below a seat than this don't get its prompt. */
const MAX_HEIGHT_GAP = 2;

/** A seat for a `seat` component, or null for anything else. */
export function seatFromComponent(component: any): SeatDef | null {
  if (component?.type !== "seat" || !component.id) return null;

  const position = vec(component.position);
  const offset = Number(component.heightOffset);
  const range = Number(component.range);

  return {
    id: component.id,
    sitAt: { x: position.x, y: position.y + (Number.isFinite(offset) ? offset : 0), z: position.z },
    rotY: vec(component.rotation).y,
    range: Number.isFinite(range) && range > 0 ? range : 1.5,
    prompt: String(component.prompt ?? "").trim() || "Sit",
  };
}

/** The closest seat in range of `point`, if any. */
export function seatNear(seats: SeatDef[], point: Vec3): SeatDef | null {
  let best: SeatDef | null = null;
  let bestDist = Infinity;
  for (const seat of seats) {
    if (Math.abs(point.y - seat.sitAt.y) > MAX_HEIGHT_GAP) continue;
    const dist = Math.hypot(point.x - seat.sitAt.x, point.z - seat.sitAt.z);
    if (dist <= seat.range && dist < bestDist) {
      best = seat;
      bestDist = dist;
    }
  }
  return best;
}
