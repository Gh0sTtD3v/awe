# Football Demo — Learnings

## Engine API Improvements

Things to fix in the engine to prevent mistakes/confusion for AI coding assistants and developers.

### Fixed

- ~~**Expose `setLinearDamping` / `setAngularDamping` on RigidBody wrapper**~~ — Done. Now callable directly: `rigidBody.setLinearDamping(1.5)`
- ~~**Export input utilities from main entry point**~~ — Done. `createInputs`, `Keyboard`, `Gamepad`, `Interactions` now importable from `@oncyberio/engine`
- ~~**Expose `cameraRig` on ControlSystem type**~~ — Done. `controls.cameraRig.setLockAxis()` and `requestPointerLock()` work without casts

### Remaining

### 1. Unify collider type key in scene JSON

Terrain uses `"type": "MESH"` while mesh components use `"colliderType": "CUBE"` inside the `collider` block. This inconsistency causes silent failures when an AI assistant picks the wrong key. Should be one key everywhere (`colliderType`).

### 2. Type `rigidBody.raw` as Rapier's `RigidBody` instead of `unknown`

Currently typed as `unknown`, forcing `as any` casts for anything not on the wrapper. If escape-hatch usage is expected, a proper type (or a typed `rawRapier` accessor) would eliminate guesswork.

### 3. Fix pre-existing type errors in game-utils

`lateUpdate` property errors in auto-runner, side-scroller, and top-down presets. Every example that type-checks `game-utils` hits these — gives a false impression of broken code.

---

## Documentation Improvements

Things to add to the engine guide / skill docs so AI assistants get it right on the first try.

### 1. Avatar facing convention

Avatars face **-Z by default**. This is a Three.js convention but not obvious. When computing a facing angle for an avatar, add `Math.PI`:

```ts
const angle = Math.atan2(dir.x, dir.z) + Math.PI;
avatar.rotation.y = angle;
```

### 2. Kinematic body movement — use `rigidBody.position` setter

The position setter internally dispatches to `setNextKinematicTranslation` for KINEMATIC bodies. Document this as the correct way to move kinematic NPCs, not raw Rapier calls.

```ts
// Correct
rb.position = new Vector3(x, y, z);

// Wrong (bypasses engine sync)
rb.raw.setNextKinematicTranslation({ x, y, z });
```

### 3. RigidBody wrapper API cheat sheet

Document the key wrapper methods and how they differ from raw Rapier:

| Wrapper method | Notes |
|---|---|
| `applyImpulse({ x, y, z })` | No boolean 2nd arg (unlike Rapier) |
| `resetVelocities()` | Resets both linear + angular |
| `teleport(pos, quat)` | Takes Three.js Vector3 + Quaternion |
| `position` setter | Handles KINEMATIC vs DYNAMIC automatically |

### 4. AnimationStateMachine for NPCs

Document that the base `AnimationStateMachine` (from `@oncyberio/engine/controls`) works standalone for NPC animation — no `Mover` needed. Include a minimal example:

```ts
import { AnimationStateMachine } from "@oncyberio/engine/controls";

const anim = new AnimationStateMachine<{ moving: boolean }>({
  body: npcAvatar,
  initial: "idle",
  context: { moving: false },
  states: { idle: { clip: "idle" }, run: { clip: "run" } },
  transitions: [
    { from: "idle", to: "run", when: (ctx) => ctx.moving },
    { from: "run", to: "idle", when: (ctx) => !ctx.moving },
  ],
});
```

### 5. Sensor setup pattern

Document the full sensor pattern: mesh with `isSensor: true`, `opacity: 0`, and `script.tag` for identification. Show the `onSensorEnter` callback with `event.other.tag`.

### 6. Mesh geometry format

Document the geometry property structure with examples for each shape type (box, sphere, cylinder, plane, dome) and note that omitting geometry defaults to a 1x1x1 box.

### 7. Camera rig axis locking

Document `setLockAxis({ x?: boolean, y?: boolean })` on the camera rig:
- `x: true` = lock horizontal rotation (camera stays behind player)
- `y: true` = lock vertical rotation (fixed pitch angle)

Also document `requestPointerLock()` for entering pointer lock programmatically on game start.
