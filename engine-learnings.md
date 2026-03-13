# Engine Learnings — Making the API AI-Friendly

Extracted from building the football-demo. General-purpose observations across game genres.

---

## Docs Improvements

Things to add/clarify in the engine guide so AI assistants and developers get it right on the first try.

### ~~Avatar facing convention~~ — DOCUMENTED

Avatars face **-Z** by default. Computing a facing angle requires `Math.atan2(dir.x, dir.z) + Math.PI` — the `+ Math.PI` is consistently missed. Now prominently documented in engine guide Avatars section with explanation of why `+ Math.PI` is needed and a tip about using `facingMode` to avoid manual rotation.

### ~~RigidBody position setter behavior~~ — DOCUMENTED

`rigidBody.position = vec3` dispatches to `setNextKinematicTranslation` for KINEMATIC bodies. This is the correct way to move kinematic NPCs — not raw Rapier calls. Now documented in engine skill `physics-config.md` with correct vs wrong usage examples.

### ~~RigidBody wrapper cheat sheet~~ — DOCUMENTED

Quick-reference table noting differences from raw Rapier. Now documented in engine skill `physics-config.md` RigidBody Wrapper API table.

### ~~Sensor setup recipe~~ — DOCUMENTED

Full pattern: mesh with `isSensor: true`, `opacity: 0`, `script.tag` for identification. Show `onSensorEnter` with `event.other.tag`. Now documented in engine skill `collision-handling.md` with full create + event examples, and reinforced in `spawn-collectibles.md`.

### Camera rig axis locking

Document `setLockAxis({ x?: boolean, y?: boolean })`:
- `x: true` = lock horizontal rotation (camera stays behind player)
- `y: true` = lock vertical rotation (fixed pitch)
- `requestPointerLock()` for entering pointer lock on game start

### ~~Mover + Camera integration patterns~~ — DOCUMENTED

`Mover.facingMode` and camera rig integration now documented in engine guide Player Controls section with a table of modes, code examples, and common camera rig combinations.

### Mesh geometry format by shape

Document the `geometry` property with examples for each shape (box, sphere, cylinder, plane, dome). Note omitting geometry defaults to 1x1x1 box.

### ~~Game lifecycle~~ — DOCUMENTED

Full sequence: `createSpace` → `reveal()` → `space.use({ onFixedUpdate, onUpdate })` → `space.start()` → `cleanup()` → dispose. Now documented in engine skill `game-script-template.md` with complete class structure, callback descriptions, and typical setup order (avatar → Mover → camera rig → inputs).

### Performance: object reuse ✅

Document: "In `onFixedUpdate` / `onUpdate`, never create `new Vector3()` — pre-allocate and reuse." The football demo allocates `_tmpVec` at module scope to avoid GC pressure.

### Performance: fixed vs frame update ✅

Physics-sensitive code (movement, input, collisions) in `onFixedUpdate`. Visual-only code (AI animation, camera smoothing) in `onUpdate`. Getting this wrong causes jitter.

### Touch joystick reference implementation

Add a drop-in `TouchJoystick` React component example to the engine guide. Should cover `sharedControlState.touch.setJoystick` integration, deadzone handling, and pointer capture. The football demo's `touch-joystick.tsx` can serve as the reference.

### Recommended patterns ✅

Document these proven patterns from the football demo:
- **Pure game logic** — AI/decision code with zero engine imports (plain data in, plain data out). Testable, portable across genres.
- **Declarative input mapping** — one definition handles keyboard + gamepad + touch.
- **AnimationStateMachine for NPCs** — works standalone without Mover, context-driven transitions.
- **Reactive store for UI** — bridges game loop state to React without tight coupling.
- **Scene-as-data** — entities in JSON, game code fetches by ID.
- **Tag-based entity identification** — `event.other.tag` in sensor callbacks.

---

## API Improvements

Code changes needed in the engine.

### ~~Add velocity getters to RigidBody wrapper~~ — FIXED

`rigidBody.linearVelocity` and `rigidBody.angularVelocity` now available on the wrapper. Per-instance vectors (no shared globals).

### Add shift-lock / free-look camera mode

`Mover.facingMode` now covers the avatar-facing half of this problem (`"movement" | "target" | "none"`), so the remaining gap is mostly camera-rig ergonomics. A higher-level third-person mode toggle would still be useful because this pattern shows up in almost every third-person game.

```ts
// Needed on ThirdPersonCameraRig
cameraRig.setMode("orbit" | "shift-lock");
// shift-lock auto-handles Mover.facingMode = "target" coordination
```

### ~~Add damping to scene JSON / DynamicProps~~ — FIXED

`linearDamping` and `angularDamping` are now supported in `DynamicProps` and flow through scene JSON into rigid-body creation. The football demo ball now uses JSON config instead of setting damping after load.

```ts
// In DynamicProps interface
linearDamping?: number;
angularDamping?: number;
```

### ~~Add game-aware timer / scheduler~~ — FIXED

`Space.schedule(delaySeconds, callback)` now provides game-time scheduling that advances only while the space is running, so it respects pause/stop and works in headless too. The football demo goal reset now uses `space.schedule(...)` instead of `setTimeout`.

```ts
const handle = space.schedule(2.5, () => {
  /* runs after 2.5 game-seconds */
});

handle.cancel();
```

### ~~Add metadata to sensor events~~ — NOT NEEDED

`CollisionEnterEvent` already provides `contactPoints` with `normal`/`position`/`depth`. For sensors, velocity can now be read via `event.other.rigidBody.linearVelocity` (fixed by the velocity getter above). The football demo's goal direction check no longer needs any API addition.

### ~~Add React canvas lifecycle hook~~ — NOT NEEDED

The `GameCanvas` component is ~35 lines of standard React-canvas boilerplate (mount, resize listener, cleanup). Not meaningfully different from any Three.js/Pixi React integration. The `setTimeout` defer is a standard single-tick layout wait, not a hack.

### ~~Add generic overload to `byId()`~~ — FIXED

`space.components.byId<T>()` now supports a generic return type, so callers can write `space.components.byId<AvatarComponent>("player")` instead of manually casting from `Component3D`.

```ts
// Now supported
space.components.byId<AvatarComponent>("player")
```

### ~~Add built-in TouchJoystick component~~ — MOVED TO DOCS

Reclassified as a documentation item. The engine already provides the integration point (`Touch.joystick()` bindings, `sharedControlState.touch.setJoystick`). The joystick UI itself is game-level code with game-specific tuning. A reference implementation in the engine guide is sufficient.

---

## Previously Fixed

- `colliderType` unified everywhere
- `rigidBody.raw` typed as Rapier's `RigidBody`
- Jump config optional in `MoverConfig`
- Input utilities exported from `@oncyberio/engine`
- `cameraRig` accessible on ControlSystem without casts
- `lateUpdate` type errors resolved in game-utils presets
