import { Euler, Quaternion } from "three";
import { pointInGate, vec, type BoxArea, type Vec3 } from "./gates";

/**
 * Lifts: `lift` boxes placed on each floor. Boxes sharing a lift name are one
 * lift; standing in one, a player can travel to any of its other floors.
 * Purely client-side — the server only sees a teleport, and still applies
 * gates and members-only chunks to where it lands.
 */

export interface LiftDef extends BoxArea {
  id: string;
  /** Lift name: boxes with the same one are the floors of one lift. */
  group: string;
  floor: number;
  /** Optional floor name, e.g. "Lobby". */
  label: string;
  /** Where riders arrive: the box's bottom centre. */
  arrival: Vec3;
}

/** A lift stop for a `lift` component, or null for anything else. */
export function liftFromComponent(component: any): LiftDef | null {
  if (component?.type !== "lift" || !component.id) return null;

  const position = vec(component.position);
  const scale = vec(component.scale, 1);
  const rotation = vec(component.rotation);
  const inverse = new Quaternion()
    .setFromEuler(new Euler(rotation.x, rotation.y, rotation.z))
    .invert();
  const halfSize = {
    x: Math.abs(scale.x) / 2,
    y: Math.abs(scale.y) / 2,
    z: Math.abs(scale.z) / 2,
  };
  const floor = Number(component.floor);

  return {
    id: component.id,
    group: String(component.group ?? "").trim() || "Lift",
    floor: Number.isFinite(floor) ? Math.round(floor) : 0,
    label: String(component.floorLabel ?? "").trim(),
    center: position,
    inverseRotation: { x: inverse.x, y: inverse.y, z: inverse.z, w: inverse.w },
    halfSize,
    arrival: { x: position.x, y: position.y - halfSize.y, z: position.z },
  };
}

/** The lift box `point` stands in, if any. The smallest wins when boxes overlap. */
export function liftAt(lifts: LiftDef[], point: Vec3): LiftDef | null {
  let best: LiftDef | null = null;
  for (const lift of lifts) {
    if (!pointInGate(lift, point)) continue;
    if (!best || volumeOf(lift) < volumeOf(best)) best = lift;
  }
  return best;
}

/** One lift's floors, highest first. A second box on the same floor is ignored. */
export function floorsOf(lifts: LiftDef[], group: string): LiftDef[] {
  const byFloor = new Map<number, LiftDef>();
  for (const lift of lifts) {
    if (lift.group !== group || byFloor.has(lift.floor)) continue;
    byFloor.set(lift.floor, lift);
  }
  return [...byFloor.values()].sort((a, b) => b.floor - a.floor);
}

/** "Lobby", or "Floor 2" when the floor has no name. */
export function floorName(lift: Pick<LiftDef, "floor" | "label">): string {
  return lift.label || `Floor ${lift.floor}`;
}

function volumeOf(box: BoxArea): number {
  return box.halfSize.x * box.halfSize.y * box.halfSize.z;
}
