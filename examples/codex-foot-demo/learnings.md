# Engine Learnings

Caveats, gotchas, and notable facts discovered while building games with the oncyber engine.

## Scene JSON (`static-scene.json`)

### Hiding meshes in live mode

Use `"display": false` — **not** `"opacity": 0`. Opacity 0 still renders the mesh (causes z-fighting, hides things behind it). `display: false` truly removes it from rendering while keeping the collider active. `"displayInEditor": true/false` controls editor visibility separately.

### Duplicate properties

The editor can write properties at both the top level and inside nested sections of a component (e.g., `"opacity"` appears once near `"color"` and again further down in extended properties). The **last one wins** in JSON parsing, so edits to the first occurrence may be silently overridden.

## Physics

### RigidBody types and collisions

- `PLAYER` (character controller) + `KINEMATIC` colliders cause bad interactions — teleporting, flickering. The physics engine fights to resolve overlaps but kinematic bodies ignore resolution.
- **Fix**: Make the AI collider a sensor (`"isSensor": true`) and handle separation manually (e.g., push-apart in update loop).
- `DYNAMIC` bodies interact naturally with all collider types.

### Sensors for triggers

Set `"isSensor": true` on a collider to make it a trigger volume. Use `component.onSensorEnter(callback)` to detect overlaps. The callback receives `event.other.tag` to identify what entered.

### Accessing velocity

The `RigidBody` interface does **not** expose `linvel()`. To read linear velocity, go through the raw Rapier body:

```ts
const vel = ball.rigidBody.raw.linvel(); // { x, y, z }
```

### Applying impulse off-center (spin)

`applyImpulse(force, relativePoint)` — the second argument is a point **relative to the body center**. Applying at `{ x: 0, y: -0.15, z: 0 }` (below center) generates realistic angular velocity (spin), just like a foot striking the lower half of a ball. Without this offset, the impulse goes through the center of mass and produces zero torque.

### Ball damping

Dynamic balls need explicit damping or they roll/bounce forever:

```ts
ball.rigidBody.setLinearDamping(1.5);
ball.rigidBody.setAngularDamping(2.0);
```

### Kinematic body position

For kinematic bodies moved manually, **always set `rb.position` every frame** — even when not moving. Skipping frames can cause physics drift or visual jitter.

### Teleport and camera

After teleporting a player (`rigidBody.teleport(pos, quat)`), the camera rig does **not** auto-reset. Call `cameraRig.reset()` to snap it back to the configured distance/height, otherwise it drifts further away on each teleport.

## Controls

### `createPlatformer` includes jump/fall states

Even with `jump: { height: 0, maxJumps: 0 }`, the platformer preset still registers jump/fall/landing animation states. If the VRM model doesn't have those clips (`falling`, `drop_idle`, etc.), you get console warnings. Mapping them all to `"idle"` silences warnings but if the player somehow gets airborne (e.g., teleported above ground), they get stuck in idle state.

**Better approach**: Don't use `createPlatformer` for ground-only games. Compose from primitives directly:

```ts
import { Mover, ThirdPersonCameraRig, AnimationStateMachine } from "@oncyberio/engine/controls";
```

This gives full control — define only the inputs, animations, and states you actually need. No jump binding, no fall states, no sprint if not needed.

### Input system

- `createInputs(config)` returns typed input actions.
- Button actions: `.onPerformed(cb)`, `.isPressed`, `.wasJustPressed`, `.wasJustReleased`
- Vector2 actions: `.readValue()` returns `{ x, y }`
- Value actions: `.readValue()` returns a number
- Call `.update(dt)` each frame before reading values.
- `.enable()` / `.disable()` to toggle, `.dispose()` to clean up.

### Shift-lock (Roblox-style camera)

The engine's `ThirdPersonCameraRig` supports `setLockAxis({ x, y })` to lock rotation. Toggle this on Shift keydown for shift-lock behavior. When shift-locked:
- Unlock camera axes: `setLockAxis({ x: false, y: false })`
- Disable mover auto-rotate: `mover.autoRotate = false`
- Manually rotate player to face camera forward direction each frame

Note: This must use a raw `window.addEventListener("keydown", ...)` — not the input system — because the Sprint binding also uses Shift and the input system doesn't distinguish between "toggle" and "hold" on the same key.

## Animation

### AnimationStateMachine

For simple cases, `AnimationStateMachine` with explicit states and transitions is cleaner than `createMoverAnimStateMachine` (which bundles jump/fall states):

```ts
new AnimationStateMachine<{ speed: number }>({
  body: avatar,
  initial: "idle",
  context: { speed: 0 },
  states: {
    idle: { clip: "idle" },
    walk: { clip: "walk" },
    run: { clip: "run" },
  },
  transitions: [
    { from: "idle", to: "walk", when: (ctx) => ctx.speed > 0.5 },
    { from: "walk", to: "run", when: (ctx) => ctx.speed > 6 },
    // ... direct transitions for quick state changes
  ],
});
```

Call `.setContext({ speed: value })` then `.update(dt)` each frame.

### AI animation flickering

When an AI character oscillates between moving/not-moving each frame (e.g., hovering at exactly the kick range boundary), the animation machine rapidly switches between idle/run, causing visible flickering.

**Fixes**:
- Use hysteresis: different thresholds for starting vs stopping movement
- Drive animation from actual displacement rather than intent — measure `sqrt(dx*dx + dz*dz)` of the frame's position change

## AI Behavior

### Kinematic AI and player overlap

Kinematic AI bodies moved via direct position setting don't respect physics collisions. When the AI and player occupy the same space:
- Make AI collider a sensor (no physical collision)
- Apply a manual separation push each frame:

```ts
const dist = distance(ai, player);
if (dist < SEPARATION_DIST) {
  const push = (SEPARATION_DIST - dist) / dist;
  newX += dx * push;
  newZ += dz * push;
}
```

### Goal validation

Goal sensors are boxes — they trigger from any direction. Without validation, a ball entering from the side or back counts as a goal. Check both:
1. Ball x-position is within goal post width
2. Ball velocity direction matches (e.g., `vel.z < 0` for the -z goal)
