import { Euler, Quaternion, Vector3 } from "three";

/**
 * Token gates, as both the game server and the client see them. Built from the
 * `token-gate` components stored in chunk files, so the server can enforce
 * gates without loading the engine.
 */

export type Vec3 = { x: number; y: number; z: number };

export interface GateRequirement {
  type: "cft20" | "inscription" | "erc20" | "nft";
  /** `"cosmos"`, or an EVM chain id from {@link EVM_CHAIN_LABELS}. */
  chain: string;
  /** CFT-20 ticker, upper-cased. For ERC-20, an optional display symbol. */
  ticker?: string;
  /** Inscription collection id or symbol. */
  collection?: string;
  /** ERC-20 / NFT contract address, lower-cased. */
  contract?: string;
  /** ERC-1155 token id; absent for ERC-721. */
  tokenId?: string;
  /** Minimum CFT-20 / ERC-20 balance in display units. */
  minAmount: string;
}

/** EVM chains gates can check. Mirrors the studio's `EVM_CHAINS`. */
export const EVM_CHAIN_LABELS: Record<string, string> = {
  ethereum: "Ethereum",
  base: "Base",
  polygon: "Polygon",
  arbitrum: "Arbitrum",
  optimism: "Optimism",
  bsc: "BNB Chain",
  avalanche: "Avalanche",
};

/** An oriented box in world space: token gates and chat zones. */
export interface BoxArea {
  center: Vec3;
  /** World → box-local rotation (the inverse of the box's rotation). */
  inverseRotation: { x: number; y: number; z: number; w: number };
  halfSize: Vec3;
}

export interface GateDef extends BoxArea {
  id: string;
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
  const chain = String(component.chain ?? "cosmos").trim() || "cosmos";
  const nft = component.requirementType === "inscription" || component.requirementType === "nft";

  if (chain !== "cosmos") {
    if (!EVM_CHAIN_LABELS[chain]) return null;
    const contract = String(component.contract ?? "").trim().toLowerCase();
    if (!/^0x[0-9a-f]{40}$/.test(contract)) return null;

    if (nft) {
      const tokenId = String(component.tokenId ?? "").trim();
      return { type: "nft", chain, contract, ...(tokenId ? { tokenId } : {}), minAmount: "1" };
    }
    const ticker = String(component.ticker ?? "").trim();
    return { type: "erc20", chain, contract, ...(ticker ? { ticker } : {}), minAmount };
  }

  if (nft) {
    const collection = String(component.collection ?? "").trim();
    return collection ? { type: "inscription", chain, collection, minAmount } : null;
  }

  const ticker = String(component.ticker ?? "").trim().toUpperCase();
  return ticker ? { type: "cft20", chain, ticker, minAmount } : null;
}

export function vec(value: any, fallback = 0): Vec3 {
  const n = (v: unknown) => (Number.isFinite(v) ? (v as number) : fallback);
  return { x: n(value?.x), y: n(value?.y), z: n(value?.z) };
}

const _local = new Vector3();
const _q = new Quaternion();

function toLocal(gate: BoxArea, point: Vec3, out: Vector3): Vector3 {
  const r = gate.inverseRotation;
  return out
    .set(point.x - gate.center.x, point.y - gate.center.y, point.z - gate.center.z)
    .applyQuaternion(_q.set(r.x, r.y, r.z, r.w));
}

/** True when `point` lies inside the gate's oriented box. */
export function pointInGate(gate: BoxArea, point: Vec3): boolean {
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

function shortAddress(address = ""): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * "≥ 100 ROIDS" / "an inscription from Collection" / "≥ 5 USDC on Base" /
 * "an NFT from 0x1234…abcd on Ethereum".
 */
export function describeRequirement(requirement: GateRequirement): string {
  switch (requirement.type) {
    case "inscription":
      return `an inscription from ${requirement.collection}`;
    case "cft20":
      return `≥ ${requirement.minAmount} ${requirement.ticker}`;
  }

  const on = ` on ${EVM_CHAIN_LABELS[requirement.chain] ?? requirement.chain}`;
  if (requirement.type === "erc20") {
    return `≥ ${requirement.minAmount} ${requirement.ticker || `of token ${shortAddress(requirement.contract)}`}${on}`;
  }
  const token = requirement.tokenId ? ` (token #${requirement.tokenId})` : "";
  return `an NFT from ${shortAddress(requirement.contract)}${token}${on}`;
}
