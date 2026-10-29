import { Euler, Quaternion } from "three";
import { gateFromComponent, pointInGate, vec, type BoxArea, type Vec3 } from "./gates";

/**
 * Rooms: boxes in the world with their own chat channel. Token gates are
 * rooms, and so are `chat-zone` components. Built from the stored components,
 * like gates, so the server can work out who is where without the engine.
 * Voice can follow the same rooms later.
 */

export const WORLD_CHANNEL = "world";

export interface ZoneDef extends BoxArea {
  id: string;
  kind: "gate" | "zone";
  label: string;
  /** Box volume, so overlapping rooms resolve to the smallest. */
  volume: number;
}

/** A room for a `chat-zone` or `token-gate` component, or null for anything else. */
export function zoneFromComponent(component: any): ZoneDef | null {
  if (component?.type === "token-gate") {
    const gate = gateFromComponent(component);
    if (!gate) return null;
    return {
      id: gate.id,
      kind: "gate",
      label: gate.label,
      center: gate.center,
      inverseRotation: gate.inverseRotation,
      halfSize: gate.halfSize,
      volume: volumeOf(gate.halfSize),
    };
  }

  if (component?.type !== "chat-zone" || !component.id) return null;

  const scale = vec(component.scale, 1);
  const rotation = vec(component.rotation);
  const inverse = new Quaternion().setFromEuler(new Euler(rotation.x, rotation.y, rotation.z)).invert();
  const halfSize = { x: Math.abs(scale.x) / 2, y: Math.abs(scale.y) / 2, z: Math.abs(scale.z) / 2 };

  return {
    id: component.id,
    kind: "zone",
    label: String(component.label || component.name || "Room").trim().slice(0, 40),
    center: vec(component.position),
    inverseRotation: { x: inverse.x, y: inverse.y, z: inverse.z, w: inverse.w },
    halfSize,
    volume: volumeOf(halfSize),
  };
}

/** The room `point` is in: the smallest box containing it, or null. */
export function zoneAt(zones: readonly ZoneDef[], point: Vec3): ZoneDef | null {
  let best: ZoneDef | null = null;
  for (const zone of zones) {
    if (pointInGate(zone, point) && (!best || zone.volume < best.volume)) best = zone;
  }
  return best;
}

/** Chat channel of a room; `world` when not in one. */
export function channelOf(zone: ZoneDef | null): string {
  return zone ? `${zone.kind}:${zone.id}` : WORLD_CHANNEL;
}

function volumeOf(half: Vec3): number {
  return 8 * half.x * half.y * half.z;
}
