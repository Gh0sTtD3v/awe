import { Euler, Quaternion, Vector3 } from "three";
import { pointInGate, vec, type BoxArea } from "./gates";

/**
 * Reverse gravity zones: a floor square extruded `height` metres up. Players
 * inside are carried up or down at `strength` m/s instead of falling.
 * Purely client-side, like the rest of player movement.
 */

export interface GravityZoneDef extends BoxArea {
  id: string;
  /** Target vertical speed in m/s: + up, - down, 0 float. */
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
 * its strength, slowed to a stop at the top for rising zones.
 */
export function targetSpeed(zone: GravityZoneDef, y: number): number {
  if (zone.strength <= 0) return zone.strength;
  const below = Math.max(0, zone.top - y);
  return zone.strength * Math.min(1, below / TOP_EASE_DISTANCE);
}

function volumeOf(box: BoxArea): number {
  return box.halfSize.x * box.halfSize.y * box.halfSize.z;
}
