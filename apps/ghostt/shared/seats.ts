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
  /** Which way the seated avatar faces: the yaw of the square's arrow (radians, around Y). */
  rotY: number;
  /** How close a player must be, in metres, measured flat. */
  range: number;
  /** Prompt text after "E". */
  prompt: string;
}

/** Players further above or below a seat than this don't get its prompt. */
const MAX_HEIGHT_GAP = 2;

/**
 * Yaw of a seat's arrow from its rotation. Rotations are three.js XYZ Euler
 * angles, and a turn past 90 degrees is stored as (±180, 180 - yaw, ±180):
 * taking `y` alone mirrors the facing (a bench turned 150.8 degrees reads
 * 29.2). After an XYZ rotation the arrow (local Z) points along
 * (sin y, -sin x cos y, cos x cos y); its yaw ignores z.
 */
export function seatYaw(rotation: Vec3): number {
  return Math.atan2(Math.sin(rotation.y), Math.cos(rotation.x) * Math.cos(rotation.y));
}

/** A seat for a `seat` component, or null for anything else. */
export function seatFromComponent(component: any): SeatDef | null {
  if (component?.type !== "seat" || !component.id) return null;

  const position = vec(component.position);
  const rotation = vec(component.rotation);
  const offset = Number(component.heightOffset);
  const range = Number(component.range);

  return {
    id: component.id,
    sitAt: { x: position.x, y: position.y + (Number.isFinite(offset) ? offset : 0), z: position.z },
    rotY: seatYaw(rotation),
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
