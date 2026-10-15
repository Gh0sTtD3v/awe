import { Euler, Quaternion, Vector3 } from "three";

/**
 * Token gates, as both the game server and the client see them. Built from the
 * `token-gate` components stored in chunk files, so the server can enforce
 * gates without loading the engine.
 */

export type Vec3 = { x: number; y: number; z: number };

export interface GateRequirement {
  type: "cft20" | "inscription";
  /** CFT-20 ticker, upper-cased. */
  ticker?: string;
  /** Inscription collection id or symbol. */
  collection?: string;
  /** Minimum CFT-20 balance in display units. */
  minAmount: string;
}

export interface GateDef {
  id: string;
  center: Vec3;
  /** World → gate-local rotation (the inverse of the gate's rotation). */
  inverseRotation: { x: number; y: number; z: number; w: number };
  halfSize: Vec3;
  /** Where players without access are sent. */
  exit: Vec3;
  requirement: GateRequirement;
  doorTag: string;
  label: string;
}

/**
 * Build a gate from a stored `token-gate` component. Returns null for
 * components that aren't gates or have no usable requirement — a half-
 * configured gate placed in the studio shouldn't lock anyone out.
 */
export function gateFromComponent(component: any): GateDef | null {
  if (component?.type !== "token-gate" || !component.id) return null;

  const requirement = requirementOf(component);
  if (!requirement) return null;

  const position = vec(component.position);
  const scale = vec(component.scale, 1);
  const rotation = vec(component.rotation);
  const offset = vec(component.exitOffset);

  const inverse = new Quaternion()
    .setFromEuler(new Euler(rotation.x, rotation.y, rotation.z))
    .invert();

  return {
    id: component.id,
    center: position,
    inverseRotation: { x: inverse.x, y: inverse.y, z: inverse.z, w: inverse.w },
    halfSize: {
      x: Math.abs(scale.x) / 2,
      y: Math.abs(scale.y) / 2,
      z: Math.abs(scale.z) / 2,
    },
    exit: {
      x: position.x + offset.x,
      y: position.y + offset.y,
      z: position.z + offset.z,
    },
    requirement,
    doorTag: String(component.doorTag ?? "").trim(),
    label: String(component.label || component.name || "this area").trim(),
  };
}

function requirementOf(component: any): GateRequirement | null {
  const minAmount = String(component.minAmount ?? "1").trim() || "1";

  if (component.requirementType === "inscription") {
    const collection = String(component.collection ?? "").trim();
    return collection ? { type: "inscription", collection, minAmount } : null;
  }

  const ticker = String(component.ticker ?? "").trim().toUpperCase();
  return ticker ? { type: "cft20", ticker, minAmount } : null;
}

function vec(value: any, fallback = 0): Vec3 {
  const n = (v: unknown) => (Number.isFinite(v) ? (v as number) : fallback);
  return { x: n(value?.x), y: n(value?.y), z: n(value?.z) };
}

const _local = new Vector3();
const _q = new Quaternion();

function toLocal(gate: GateDef, point: Vec3, out: Vector3): Vector3 {
  const r = gate.inverseRotation;
  return out
    .set(point.x - gate.center.x, point.y - gate.center.y, point.z - gate.center.z)
    .applyQuaternion(_q.set(r.x, r.y, r.z, r.w));
}

/** True when `point` lies inside the gate's oriented box. */
export function pointInGate(gate: GateDef, point: Vec3): boolean {
  const p = toLocal(gate, point, _local);
  const h = gate.halfSize;
  return Math.abs(p.x) <= h.x && Math.abs(p.y) <= h.y && Math.abs(p.z) <= h.z;
}

const _a = new Vector3();
const _b = new Vector3();

/**
 * True when the segment `from → to` passes through the gate — catches a fast
 * mover that skipped over a thin gate between two updates. Slab test in the
 * gate's local frame.
 */
export function segmentHitsGate(gate: GateDef, from: Vec3, to: Vec3): boolean {
  const a = toLocal(gate, from, _a);
  const b = toLocal(gate, to, _b);
  const h = gate.halfSize;

  let tMin = 0;
  let tMax = 1;

  for (const axis of ["x", "y", "z"] as const) {
    const start = a[axis];
    const delta = b[axis] - start;

    if (Math.abs(delta) < 1e-9) {
      if (Math.abs(start) > h[axis]) return false;
      continue;
    }

    let t1 = (-h[axis] - start) / delta;
    let t2 = (h[axis] - start) / delta;
    if (t1 > t2) [t1, t2] = [t2, t1];

    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }

  return true;
}

/** "≥ 100 ROIDS" / "an inscription from Collection". */
export function describeRequirement(requirement: GateRequirement): string {
  return requirement.type === "inscription"
    ? `an inscription from ${requirement.collection}`
    : `≥ ${requirement.minAmount} ${requirement.ticker}`;
}
