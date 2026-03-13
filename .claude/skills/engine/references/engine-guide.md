# oncyberio Engine Guide

## Getting the Engine/Space

```ts
import { Engine } from "@oncyber/engine";

const engine = Engine.getInstance();

// Create and load a space - returns when fully loaded
const { space, reveal } = await engine.createSpace(opts);

// Components are immediately available after await
// Set up camera, controls, etc. before revealing...

// Reveal the scene (fades out the intro/loading screen)
await reveal();
```

> **Note**: `createSpace()` returns `{ space, reveal }`. The `reveal()` function controls the intro fade — call it after you've set up the camera and controls so the player doesn't see an uninitialized scene.

## Starting/Stopping the Game

```ts
space.start(); // begins game update loop
space.stop(); // stops game update loop
```

---

## Components

Components are the building blocks of scenes. Define them statically via MCP tools (preferred) or `static-scene.json`, or create them dynamically at runtime.

### Creating Components

**Static (scene editing):** Use MCP tools (`add_component`, `add_model_to_scene`, `add_avatar_to_scene`) to add components to the scene. Prefer static scene data over runtime creation when possible.

**Runtime (game script):**

```typescript
const component = await space.components.create({
  type: "mesh",
  id: "my-sphere",
  name: "My Sphere",
  position: { x: 0, y: 2, z: 0 },
  // ... type-specific properties
});
```

Use `component.duplicate()` for spawning multiple instances from a template.

> **Convention**:
>
> - **Mandatory**: The component key in `static-scene.json` must match its `id` property. For example, `"vrm-anims": { "id": "vrm-anims", ... }`. Mismatches will cause lookup failures.
> - **Recommended**: Always include a `name` property for human-readable display. Accessible via `component.componentName`.

### Querying Components

```typescript
space.components.byId("my-id");       // by script.identifier, defaults to id otherwise
space.components.byTag("enemy");      // by script.tag
space.components.byType("model");     // by type
space.components.filter((c) => ...);  // custom filter
```

### Updating & Destroying

```typescript
component.setData({ position: { x: 10, y: 0, z: 0 } });
component.destroy();
```

`Component3D` extends Three.js `Object3D`, so you can modify transforms directly:

```typescript
component.position.set(10, 0, 0);
component.rotation.y = Math.PI / 4;

// WRONG: There is no .object3D property
// component.object3D.position.set(10, 0, 0); // ERROR!
```

> **Gotcha**: If you plan to destroy a template component, duplicate it first — destroying the original before duplicating will fail.

For full component properties and methods, see `packages/engine/api/space/abstract/component-3d.d.ts`.

---

## Available Component Types

### Core Objects

| Type     | Description                                         |
| -------- | --------------------------------------------------- |
| `mesh`   | Basic shapes (box, sphere, cylinder, plane)         |
| `model`  | 3D models (GLB/GLTF)                                |
| `avatar` | VRM avatars (see `public/vrms.json`)                |
| `text`   | 3D text                                             |
| `image`  | 2D images in 3D space                               |
| `video`  | Video planes                                        |
| `audio`  | Spatial/ambient audio                               |
| `iframe` | Embedded web content (YouTube, websites)            |
| `group`  | Container for child components                      |
| `object` | Escape hatch to wrap Three.js objects as components |

### Environment

| Type         | Description                            |
| ------------ | -------------------------------------- |
| `terrain`    | Ground/floor with optional grid shader |
| `water`      | Water surfaces                         |
| `grass`      | Grass with wind animation              |
| `lighting`   | Scene lighting                         |
| `fog`        | Atmospheric fog                        |
| `background` | Sky/background settings                |
| `envmap`     | Environment map / reflections          |
| `reflector`  | Mirror/reflective surfaces             |
| `postpro`    | Post-processing effects                |

### Effects & Particles

| Type     | Description                                |
| -------- | ------------------------------------------ |
| `quarks` | Particle effects (fire, smoke, explosions) |
| `rain`   | Rain particles                             |
| `cloud`  | Cloud effects                              |
| `bird`   | Animated birds                             |
| `dust`   | Dust particles                             |
| `wave`   | Wave/ripple effects                        |
| `godray` | Volumetric light shafts                    |
| `impact` | Impact/hit effects                         |

### Game Systems

| Type        | Description                              |
| ----------- | ---------------------------------------- |
| `spawn`     | Player spawn point (required for player) |
| `vrm-anims` | VRM animation definitions                |
| `camera`    | Camera component                         |
| `navmesh`   | Navigation mesh for pathfinding          |

### Interaction & Navigation

| Type          | Description                        |
| ------------- | ---------------------------------- |
| `interaction` | Standalone interaction prompt      |
| `dialog`      | Dialog / NPC interaction           |
| `destination` | Waypoint / teleport location       |
| `spline`      | Spline curves for paths/animations |

### Avatars

- Based on VRM models, animated with VRM animations
- Use `useCpuAnimation: true` if calling `avatar.getBone(id)`
- Built-in animations: `idle`, `walk`, `run`, `jump`, `fly`, `sitting`

```ts
avatar.animation = "walk";
```

**Facing convention (-Z forward):** Avatars face **-Z** by default. When manually computing a facing angle from a direction vector, you must add `Math.PI` — this is the most common gotcha:

```ts
// dir = normalized movement direction (e.g. from input)
const angle = Math.atan2(dir.x, dir.z) + Math.PI;  // +π required!
avatar.rotation.y = angle;
```

Why `+ Math.PI`? `atan2(x, z)` gives the angle from +Z, but the avatar faces -Z, which is π radians away. Forgetting this flips the avatar 180°.

> **Tip:** If using a `Mover` with `facingMode: "movement"` or `"target"`, the engine handles this automatically — you only need manual rotation when controlling facing yourself (`facingMode: "none"`).

**See:** [vrm-anims.md](./vrm-anims.md)

### Mesh Geometry

The `geometry` property defines the shape and dimensions of a `mesh` component. If omitted, defaults to a 1×1×1 box.

```ts
// Box (default)
geometry: { type: "box", width: 2, height: 1, depth: 3 }

// Sphere
geometry: { type: "sphere", radius: 1.5 }

// Cylinder
geometry: { type: "cylinder", radiusTop: 0.5, radiusBottom: 0.5, height: 2 }

// Plane
geometry: { type: "plane", width: 10, height: 10 }

// Dome (half-sphere)
geometry: { type: "dome", radius: 5 }
```

### Models (GLB)

GLTF animations are auto-loaded and can be played via `play()`/`pause()` methods.

---

## Physics

Enable physics via `collider` config in component data.

```typescript
collider: {
  enabled: true,
  rigidbodyType: "DYNAMIC", // DYNAMIC | KINEMATIC | FIXED | PLAYER
  colliderType: "CUBE",     // CUBE | SPHERE | CAPSULE | CYLINDER | MESH
  isSensor: true,           // trigger volume (no physical response)
  dynamicProps: { mass: 1, friction: 0.5, restitution: 0.3 },
}
```

Access rigid body via `component.rigidBody` and collider via `component.collider`.

### Accessing the Physics Engine

The physics engine is accessed via `space.physics`:

```typescript
const physics = space.physics; // PhysicsEngine | null
```

> **Note**: `physics` is only available after the space is ready (i.e. after `await engine.createSpace()` resolves).

### Raycasting

Use `physics.physicsRaycast()` for hit detection (e.g., shooting, line-of-sight checks):

```typescript
import { Vector3 } from "three";
import { Camera } from "@oncyber/engine";

const physics = space.physics;
if (!physics) return;

// Raycast from camera in look direction
const cam = Camera.current;
const direction = new Vector3(0, 0, -1).applyQuaternion(cam.quaternion);

const hit = physics.physicsRaycast({
  origin: { x: cam.position.x, y: cam.position.y, z: cam.position.z },
  direction: { x: direction.x, y: direction.y, z: direction.z },
  maxDistance: 100, // optional, default varies
  // ignoreRigidbody: playerBody, // optional, exclude specific body
});

if (hit) {
  console.log("Hit at:", hit.point); // { x, y, z }
  console.log("Distance:", hit.distance);
}
```

#### Identifying the Hit Component

The `hit.component` property gives you the `Component3D` that was hit:

```typescript
if (hit) {
  const component = hit.component; // Component3D | undefined
  console.log(component?.name);
  console.log(component?.rigidBody);
}
```

#### FPS Shooting: Ignoring the Player

In first-person shooters, raycasts from the camera will hit the player's own avatar collider first (distance ~0). Use `ignoreRigidbody` to exclude the player:

```typescript
const playerAvatar = space.components.byId("my-avatar");

const hit = physics.physicsRaycast({
  origin: { x: cam.position.x, y: cam.position.y, z: cam.position.z },
  direction: { x: direction.x, y: direction.y, z: direction.z },
  maxDistance: 100,
  ignoreRigidbody: playerAvatar?.rigidBody,
});

if (hit?.component?.tag === "enemy") {
  // Handle enemy hit
}
```

**See:** [examples/physics-config.md](./examples/physics-config.md)

---

## Collision & Sensor Events

```typescript
component.onCollisionEnter((event) => {
  // event.other, event.contactPoints
});

component.onSensorEnter((event) => {
  // trigger zone entered
});
```

**See:** [examples/collision-handling.md](./examples/collision-handling.md)

---

## Game Loop (`space.use()`)

Register event handlers on the space using `space.use()`. Returns a cleanup function.

```typescript
const cleanup = space.use({
  onStart: () => {
    // Called when space.start() is invoked
  },
  onStop: () => {
    // Called when space.stop() is invoked
  },
  onUpdate: (dt, absTimer) => {
    // Main game update - called each frame while game is running
  },
  onFixedUpdate: (dt, absTimer) => {
    // Fixed timestep update - consistent dt, ideal for physics logic
  },
  onLateUpdate: (dt, absTimer) => {
    // Called after onUpdate - use for cameras, state sync, etc.
  },
  onFrame: (dt, absTimer) => {
    // Called every frame, even before space.start()
  },
  onDispose: () => {
    // Cleanup when space is destroyed
  },
});

// Later, remove all handlers:
cleanup();
```

### Input Events

For raw input (keyboard, mouse), use standard DOM events:

```typescript
// In your game script class
init() {
  document.addEventListener("keydown", this.onKeyDown);
  document.addEventListener("mousedown", this.onMouseDown);
}

dispose() {
  document.removeEventListener("keydown", this.onKeyDown);
  document.removeEventListener("mousedown", this.onMouseDown);
}

onKeyDown = (e: KeyboardEvent) => {
  if (e.code === "KeyR") this.reload();
};

onMouseDown = (e: MouseEvent) => {
  if (e.button === 0) this.shoot(); // Left click
};
```

**See:** [examples/input-system.md](./examples/input-system.md), [examples/game-script-template.md](./examples/game-script-template.md)

---

## Interaction System

Use the `interaction` component type to show a proximity-triggered prompt (key hint icon) in 3D space.

```typescript
const interact = await space.components.create({
  type: "interaction",
  position: { x: 5, y: 1, z: 0 },
  distance: 8, // activation range
  atlas: "keyboard_e", // icon to display
  key: "KeyE", // trigger key
  billboard: true, // always face camera
});

interact.onInteraction(() => {
  /* key pressed in range */
});
interact.onInteractEnter(() => {
  /* entered range */
});
interact.onInteractExit(() => {
  /* left range */
});
```

**See:** [examples/interaction-lookat.md](./examples/interaction-lookat.md)

---

## Camera

The engine provides a singleton `Camera` that manages the active Three.js camera.

```typescript
import { Camera } from "@oncyber/engine";

// Access the active camera
const cam = Camera.current; // Three.js Camera

// Check if object is visible
Camera.isInFrustum(object3D);

// Reset to default camera
Camera.reset();
```

### Attaching Objects to Camera (FPS Weapons)

For first-person games, attach weapons/items to the camera so they follow the player's view. Since `Component3D` extends `Object3D`, you can add components directly to the camera:

```typescript
const weapon = space.components.byId("pistol");
const cam = Camera.current;

// Attach to camera - component IS an Object3D
cam.add(weapon);

// Position in view (lower right, typical FPS style)
weapon.position.set(0.3, -0.3, -0.5);
weapon.rotation.set(0, Math.PI, 0);
weapon.scale.set(0.15, 0.15, 0.15);
```

### Camera Rig

Camera rigs provide axis locking for fixed-camera gameplay styles:

```ts
// Lock horizontal rotation — camera stays behind the player
cameraRig.setLockAxis({ x: true });

// Lock vertical rotation — fixed pitch angle
cameraRig.setLockAxis({ y: true });

// Lock both (fully fixed camera angle, e.g. top-down)
cameraRig.setLockAxis({ x: true, y: true });
```

Use `requestPointerLock()` to enter pointer lock programmatically (e.g. on game start instead of waiting for a click):

```ts
cameraRig.requestPointerLock();
```

---

## Player Controls

Build player controls from engine primitives: `Mover` for movement, camera rigs for the camera, `AnimationStateMachine` for animation, and the input system for input. These give you full control over the game loop and are the recommended approach for any game with custom mechanics.

### Mover

`Mover` handles velocity, gravity, ground detection, collision response, and avatar rotation. Wire it into `onFixedUpdate` with input axes:

```ts
import { Mover, ThirdPersonCameraRig } from "@oncyber/engine/controls";

const mover = new Mover({
  body: avatar,                    // Component3D to move
  target: Camera.current,          // Reference for target-relative movement
  movement: { speed: 15, facingMode: "movement" },
  jump: { height: 2, count: 2 },  // optional
});

// In onFixedUpdate:
mover.move(inputX, inputZ);  // -1..1 axes from input
mover.update(dt);
```

### Mover facingMode

Controls how the avatar's rotation is managed. This is the key property for different camera/gameplay styles:

| Mode | Behavior | Use case |
|---|---|---|
| `"movement"` | Face travel direction while moving (default) | Platformer, top-down, sports games |
| `"target"` | Face the target's (camera's) yaw direction, even while idle | Shift-lock, combat, strafing |
| `"none"` | No automatic rotation — caller controls facing | FPS, auto-runner, cutscenes |

```ts
// Switch at runtime (e.g. toggle shift-lock)
mover.facingMode = "target";

// Combine with camera rig axis locking for common patterns:
// Sports/strategy: locked camera + face movement direction
mover.facingMode = "movement";
cameraRig.setLockAxis({ x: true });

// Exploration: free camera + no auto-facing
mover.facingMode = "none";
cameraRig.setLockAxis({ x: false });

// Shift-lock/combat: face camera direction
mover.facingMode = "target";
```

### Example: Inline Platformer Controls

See `examples/starter/src/lib/game-script.ts` for a complete working example of wiring `Mover`, `ThirdPersonCameraRig`, `createMoverAnimStateMachine`, and the input system together in a class-based game script. The `examples/football-demo` shows a sports-game variant with custom `AnimationStateMachine` and camera axis locking.

### Example: Inline FPS Controls

See `examples/zombie-survival/src/lib/game-script.ts` for a complete working example of `Mover` + `FirstPersonCameraRig` with camera-relative movement (`mover.move(x, y, { forward, right, speed })`).
