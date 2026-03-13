# NPC Animation with AnimationStateMachine

The `AnimationStateMachine` from `@oncyberio/engine/controls` works standalone for NPC animation — no `Mover` needed.

```typescript
import { AnimationStateMachine } from "@oncyberio/engine/controls";

// Get or create an avatar component for the NPC
const npcAvatar = space.components.byId("npc-avatar");

// Define a state machine with context-driven transitions
const anim = new AnimationStateMachine<{ moving: boolean }>({
  body: npcAvatar,
  initial: "idle",
  context: { moving: false },
  states: {
    idle: { clip: "idle" },
    run: { clip: "run" },
  },
  transitions: [
    { from: "idle", to: "run", when: (ctx) => ctx.moving },
    { from: "run", to: "idle", when: (ctx) => !ctx.moving },
  ],
});

// In your game loop, update context and tick the state machine
space.use({
  onUpdate: (dt) => {
    // Update context based on NPC logic
    anim.context.moving = isNpcMoving();

    // Tick evaluates transitions and plays the correct animation
    anim.tick(dt);
  },
});
```

## Adding More States

```typescript
const anim = new AnimationStateMachine<{ moving: boolean; kicking: boolean }>({
  body: npcAvatar,
  initial: "idle",
  context: { moving: false, kicking: false },
  states: {
    idle: { clip: "idle" },
    run: { clip: "run" },
    kick: { clip: "kick", loop: false }, // one-shot animation
  },
  transitions: [
    { from: "idle", to: "kick", when: (ctx) => ctx.kicking },
    { from: "run", to: "kick", when: (ctx) => ctx.kicking },
    { from: "kick", to: "idle", when: (ctx) => !ctx.kicking && !ctx.moving },
    { from: "kick", to: "run", when: (ctx) => !ctx.kicking && ctx.moving },
    { from: "idle", to: "run", when: (ctx) => ctx.moving },
    { from: "run", to: "idle", when: (ctx) => !ctx.moving },
  ],
});
```

> **Note**: `AnimationStateMachine` is the same system used for player avatar animation (see `examples/starter`). Using it directly gives you full control over NPC animation.
