import { Euler, Quaternion, Vector3 } from "three";
import { pointInGate, vec, type BoxArea } from "./gates";

/**
 * Reverse gravity zones: a floor square extruded `height` metres up. Inside,
 * normal gravity is replaced: a positive strength carries players up at that
 * many m/s, a negative one lets them fall slowly at no more than that speed
 * (like a parachute), 0 makes them float. Purely client-side, like the rest
 * of player movement.
 */

export interface GravityZoneDef extends BoxArea {
  id: string;
  /** m/s: + rise at this speed, - fall no faster than this, 0 float. */
  strength: number;
  /** World height of the top of the zone (for an upright zone). */
  top: number;
}

/** A zone for a `gravity-zone` component, or null for anything else. */
export function gravityZoneFromComponent(component: any): GravityZoneDef | null {
  if (component?.type !== "gravity-zone" || !component.id) return null;

  const position = vec(component.position);
  const scale = vec(component.scale, 1);
  const rotation = vec(component.rotation);
  const heightRaw = Number(component.height);
  const height = Number.isFinite(heightRaw) && heightRaw > 0.1 ? heightRaw : 0.1;
  const strengthRaw = Number(component.strength);

  const q = new Quaternion().setFromEuler(new Euler(rotation.x, rotation.y, rotation.z));
  const center = new Vector3(0, height / 2, 0)
    .applyQuaternion(q)
    .add(new Vector3(position.x, position.y, position.z));
  const inverse = q.clone().invert();

  return {
    id: component.id,
    strength: Number.isFinite(strengthRaw) ? strengthRaw : 0,
    center: { x: center.x, y: center.y, z: center.z },
    inverseRotation: { x: inverse.x, y: inverse.y, z: inverse.z, w: inverse.w },
    halfSize: { x: Math.abs(scale.x) / 2, y: height / 2, z: Math.abs(scale.z) / 2 },
    top: position.y + height,
  };
}

/** The zone `point` is in, if any. The smallest wins when zones overlap. */
export function gravityZoneAt(zones: GravityZoneDef[], point: { x: number; y: number; z: number }): GravityZoneDef | null {
  let best: GravityZoneDef | null = null;
  for (const zone of zones) {
    if (!pointInGate(zone, point)) continue;
    if (!best || volumeOf(zone) < volumeOf(best)) best = zone;
  }
  return best;
}

/** Rising zones ease off over this many metres below the top, so players stop at the top. */
const TOP_EASE_DISTANCE = 1.5;

/**
 * The vertical speed (m/s) a zone wants for a player whose feet are at `y`:
 * its strength, slowed to a stop at the top for rising zones. For a negative
 * strength this is the slow-fall speed.
 */
export function targetSpeed(zone: GravityZoneDef, y: number): number {
  if (zone.strength <= 0) return zone.strength;
  const below = Math.max(0, zone.top - y);
  return zone.strength * Math.min(1, below / TOP_EASE_DISTANCE);
}

/**
 * How fast a player too slow upward (rising too slowly, or falling too fast)
 * catches up with the target: halfway in about 0.06 s. This is what brakes a
 * player falling into a slow-fall zone from high up within a few metres.
 */
const CATCH_UP_TIME = 0.08;

/** Downward acceleration in a slow-fall zone, and slowing near the top of a rising one (m/s²). */
const EASE_DOWN_ACCELERATION = 20;

/**
 * The player's next vertical speed (m/s) after `dt` seconds in a zone.
 * Moving down faster than the target (or up slower) is corrected quickly;
 * being above the target speed eases down gently, so a slow-fall zone never
 * pushes anyone down faster than normal falling would.
 */
export function nextSpeed(speed: number, target: number, dt: number): number {
  if (speed < target) return target + (speed - target) * Math.exp(-dt / CATCH_UP_TIME);
  return Math.max(target, speed - EASE_DOWN_ACCELERATION * dt);
}

function volumeOf(box: BoxArea): number {
  return box.halfSize.x * box.halfSize.y * box.halfSize.z;
}
