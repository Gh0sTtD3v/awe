---
name: engine api usage
description: |
  oncyberio engine usage guide for game development. Use when you need familiarize with oncyber engine and usage patterns
---

# oncyberio Engine Usage

## Core Workflow

1. **Define static components** by editing `static-scene.json` directly
2. **Implement game logic** in a game script file (events, collisions, interactions)
3. **Add UI** in a React component if needed (score, timer, menus)

## Scene Editing

Edit `public/data/static-scene.json` directly for all scene CRUD operations (adding, updating, deleting components, managing assets, physics, lighting).

For compute-heavy tasks, use the CLI:
- `pnpm optimize-model <path>` — optimize a 3D model
- `pnpm optimize-vrm <path>` — optimize a VRM avatar
- `pnpm bake-anim <fbx-path> [name]` — bake a Mixamo FBX animation
- `pnpm upload-asset <source-path>` — upload a local asset
- `pnpm validate-scene` — validate the scene file

### static-scene.json Overview

The scene file maps component IDs to component data. Each component has `id`, `name`, `type`, `position`, `rotation`, `scale`, and type-specific properties at the root level. Use `script.identifier` / `script.tag` for runtime lookups via `byId()` / `byTag()`.

**See:** [references/examples/static-scene-minimal.json](references/examples/static-scene-minimal.json) for a working minimal scene.

## Reference Documentation

For detailed information, read these docs as needed:

- **[references/engine-guide.md](references/engine-guide.md)** - Core API (components, physics, game loop, interactions)
- **[references/assets-guide.md](references/assets-guide.md)** - Loading and managing 3D assets (models, avatars, uploads)
- **[references/vrm-anims.md](references/vrm-anims.md)** - VRM animation system

When working with a component, check its `*-data.ts` file for the data interface (e.g., `MeshComponentData`, `ModelComponentData`).

The guides in this folder focus on **game logic patterns and workflows** (scripts, input, physics, interactions) — the API types are the authoritative reference for exact signatures.

## Examples

Quick-reference examples in `references/examples/`:

| File                            | Description                                          |
| ------------------------------- | ---------------------------------------------------- |
| `static-scene-minimal.json`     | Minimal scene setup                                  |
| `game-script-template.md`       | Game script lifecycle template                       |
| `collision-handling.md`         | Collision and sensor events                          |
| `physics-config.md`             | Physics and rigidbody configuration                  |
| `input-system.md`               | Declarative input system (keyboard, gamepad, touch)  |
| `interaction-lookat.md`         | Interaction prompts                                  |
| `spawn-collectibles.md`         | Spawning items via template duplication              |
| `adding-model-from-library.md`  | Load 3D model from library3D.json                    |
| `adding-avatar-from-library.md` | Load avatar from vrms.json                           |
| `npc-animation.md`             | NPC animation with AnimationStateMachine             |
