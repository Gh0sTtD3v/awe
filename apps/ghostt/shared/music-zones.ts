import { Euler, Quaternion, Vector3 } from "three";
import { vec, type Vec3 } from "./gates";

/**
 * Music zones: a box or a sphere where a track plays at full volume, with an
 * optional fade band around it. Purely client-side: each player hears the
 * music for where they are; nothing is synced.
 */

export interface MusicZoneDef {
  id: string;
  url: string;
  shape: "box" | "sphere";
  center: Vec3;
  /** World → zone-local rotation (box only). */
  inverseRotation: { x: number; y: number; z: number; w: number };
  /** Box: half width / height / depth. */
  halfSize: Vec3;
  /** Sphere radius. */
  radius: number;
  /** 0 to 1. */
  volume: number;
  /** Fade band width in metres; 0 = none. */
  fade: number;
  loop: boolean;
  restartOnEnter: boolean;
}

/** A zone for a `music-zone` component, or null for anything else (or without a file). */
export function musicZoneFromComponent(component: any): MusicZoneDef | null {
  if (component?.type !== "music-zone" || !component.id) return null;
  const url = String(component.url ?? "").trim();
  if (!url) return null;

  const position = vec(component.position);
  const scale = vec(component.scale, 1);
  const rotation = vec(component.rotation);
  const inverse = new Quaternion().setFromEuler(new Euler(rotation.x, rotation.y, rotation.z)).invert();
  const volume = Number(component.volume);
  const fade = Number(component.fadeDistance);

  return {
    id: component.id,
    url,
    shape: component.shape === "sphere" ? "sphere" : "box",
    center: position,
    inverseRotation: { x: inverse.x, y: inverse.y, z: inverse.z, w: inverse.w },
    halfSize: { x: Math.abs(scale.x) / 2, y: Math.abs(scale.y) / 2, z: Math.abs(scale.z) / 2 },
    radius: Math.abs(scale.x) / 2,
    volume: Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0.8,
    fade: Number.isFinite(fade) && fade > 0 ? fade : 0,
    loop: component.loop !== false,
    restartOnEnter: component.restartOnEnter === true,
  };
}

const _p = new Vector3();
const _q = new Quaternion();

/** How far `point` is outside the zone, in metres (0 when inside). */
export function distanceOutside(zone: MusicZoneDef, point: Vec3): number {
  _p.set(point.x - zone.center.x, point.y - zone.center.y, point.z - zone.center.z);
  if (zone.shape === "sphere") return Math.max(0, _p.length() - zone.radius);
  const r = zone.inverseRotation;
  _p.applyQuaternion(_q.set(r.x, r.y, r.z, r.w));
  const dx = Math.max(0, Math.abs(_p.x) - zone.halfSize.x);
  const dy = Math.max(0, Math.abs(_p.y) - zone.halfSize.y);
  const dz = Math.max(0, Math.abs(_p.z) - zone.halfSize.z);
  return Math.hypot(dx, dy, dz);
}

/**
 * How loud the zone should be for a listener at `point`, 0 to 1 (before the
 * zone's own volume): 1 inside, fading to 0 across the fade band. The fade is
 * eased (squared) so it sounds even to the ear rather than dropping late.
 */
export function zoneGain(zone: MusicZoneDef, point: Vec3): number {
  const d = distanceOutside(zone, point);
  if (d <= 0) return 1;
  if (zone.fade <= 0 || d >= zone.fade) return 0;
  const t = 1 - d / zone.fade;
  return t * t;
}
