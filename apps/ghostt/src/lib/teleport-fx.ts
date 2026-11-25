/**
 * Teleport effect: the avatar fades out inside a ring of rising light beams,
 * moves, then fades back in while the beams fall.
 *
 * Ported from the community "Teleport" behaviour (Devstarlight, updated by
 * Gh0stt) in the old component-based codebase.
 */

import {
  AdditiveBlending,
  Color,
  DoubleSide,
  InstancedMesh,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
} from "three";

const BEAM_COUNT = 30;
/** Beams sit between these fractions of the ring radius from the centre. */
const RING_INNER = 0.3;
const RING_OUTER = 0.69;
/** Beams stay fully lit for this share of the effect, then fade. */
const FADE_START = 0.1;
const BEAM_OPACITY = 0.9;

/** Snap an avatar back to fully visible and stop any effect on it. */
export function clearTeleportFx(avatar: FxAvatar): void {
  runs.set(avatar, (runs.get(avatar) ?? 0) + 1);
  setOpacity(avatar, 1);
}

/** Default timings, in seconds. */
export const TELEPORT_OUT_S = 0.35;
export const TELEPORT_IN_S = 0.45;

interface Beam {
  x: number;
  z: number;
  speed: number;
  height: number;
}

type FxAvatar = Object3D & {
  getDimensions?: () => { x: number; y: number; z: number };
  setData?: (data: Record<string, unknown>) => void;
  data?: { opacity?: number };
};

const BEAM_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

const BEAM_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uGlobalOpacity;
  varying vec2 vUv;
  void main() {
    // Soft horizontal falloff from the centre line.
    float glow = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 2.0);
    // Fade at the top and bottom ends.
    float vFade = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
    gl_FragColor = vec4(uColor, glow * vFade * uGlobalOpacity);
  }
`;

function setOpacity(avatar: FxAvatar, value: number) {
  try {
    avatar.setData?.({ opacity: Math.max(0, Math.min(1, value)) });
  } catch {
    // The avatar was destroyed mid-effect (player left).
  }
}

/** Latest run per avatar: a newer phase cancels the one still playing. */
const runs = new WeakMap<object, number>();

function nextFrame(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

/**
 * Run one phase of the effect on `avatar`:
 * - `"out"`: beams rise, avatar fades to invisible.
 * - `"in"`: beams fall, avatar fades back in.
 * Resolves when the phase is over and its beams are removed. Starting a new
 * phase on the same avatar ends the previous one early, leaving opacity to
 * the new one.
 */
export async function playTeleportFx(
  avatar: FxAvatar,
  phase: "out" | "in",
  seconds = phase === "out" ? TELEPORT_OUT_S : TELEPORT_IN_S,
): Promise<void> {
  const run = (runs.get(avatar) ?? 0) + 1;
  runs.set(avatar, run);
  const superseded = () => runs.get(avatar) !== run;

  const dims = avatar.getDimensions?.() ?? { x: 1, y: 2, z: 1 };
  // The avatar's origin is at its feet, so the beams start at local y 0.
  const floorY = 0;
  const radius = Math.max(dims.x, dims.z) * 0.6;
  const wrapY = dims.y * 1.4;
  const direction = phase === "out" ? 1 : -1;

  const geometry = new PlaneGeometry(0.04, 1);
  const material = new ShaderMaterial({
    vertexShader: BEAM_VERT,
    fragmentShader: BEAM_FRAG,
    uniforms: {
      uColor: { value: new Color(0xffffff) },
      uGlobalOpacity: { value: BEAM_OPACITY },
    },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
  });
  const mesh = new InstancedMesh(geometry, material, BEAM_COUNT);
  mesh.name = "teleport-beams";
  mesh.frustumCulled = false;

  const beams: Beam[] = [];
  for (let i = 0; i < BEAM_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = radius * (RING_INNER + Math.random() * (RING_OUTER - RING_INNER));
    beams.push({
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * r,
      speed: 1 + Math.random() * 2,
      height: wrapY * (0.1 + Math.random() * 0.9),
    });
  }

  const dummy = new Object3D();
  const place = (elapsed: number) => {
    for (let i = 0; i < beams.length; i++) {
      const b = beams[i];
      // Travel along the column and wrap so beams keep streaming.
      const travel = (b.height / 2 + elapsed * b.speed) % wrapY;
      const y = direction === 1 ? travel : wrapY - travel;
      dummy.position.set(b.x, floorY + y, b.z);
      dummy.scale.set(1, b.height, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  place(0);
  avatar.add(mesh);

  const from = phase === "out" ? 1 : 0;
  const to = phase === "out" ? 0 : 1;
  setOpacity(avatar, from);

  const start = performance.now();
  try {
    for (;;) {
      if (superseded()) return;
      const elapsed = (performance.now() - start) / 1000;
      const progress = Math.min(elapsed / seconds, 1);

      place(elapsed);
      const fade = progress < FADE_START ? 0 : (progress - FADE_START) / (1 - FADE_START);
      material.uniforms.uGlobalOpacity.value = BEAM_OPACITY * (1 - fade);
      setOpacity(avatar, from + (to - from) * progress);

      if (progress >= 1) break;
      await nextFrame();
    }
  } finally {
    if (!superseded()) setOpacity(avatar, to);
    mesh.removeFromParent();
    geometry.dispose();
    material.dispose();
  }
}
