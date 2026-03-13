# oncyberio Engine

A 3D game engine and framework built on [Three.js](https://threejs.org/) and [Next.js](https://nextjs.org/). Build browser-based 3D games with physics, character controls, VRM avatars, particle effects, and a visual editor — all from a single monorepo.

## Features

- **Component-based scene architecture** — meshes, models, avatars, terrain, lights, triggers, and more
- **Physics** — Rapier3D integration with rigidbodies, colliders, and character controllers
- **VRM avatar support** — load and animate VRM characters with springbone physics
- **Multiple control presets** — first-person, third-person, platformer, top-down, side-scroller, auto-runner
- **Particle effects** — three.quarks-based VFX system
- **Visual editor** — embedded studio at `/studio` for scene editing
- **Asset optimization** — Draco compression, KTX2 textures, mesh optimization
- **AI-powered development** — MCP server with 30+ tools for AI-assisted scene editing
- **GPU instancing & LOD** — performance optimizations for large scenes
- **Navigation meshes** — pathfinding via recast-navigation
- **Post-processing** — bloom, SSAO, tone mapping, and more

## Tech Stack

| Category | Technology |
|----------|-----------|
| 3D Rendering | Three.js 0.170 |
| Framework | Next.js 16 (App Router) |
| UI | React 19 |
| Physics | Rapier3D (WebAssembly) |
| Animation | GSAP, @pixiv/three-vrm |
| Particles | three.quarks |
| Language | TypeScript 5 |
| Build | Turborepo + pnpm workspaces |

## Monorepo Structure

```
awe-dev/
├── packages/
│   ├── engine/              # Core 3D game engine (@oncyberio/engine)
│   ├── engine-edit/         # Visual editing tools (@oncyberio/engine-edit)
│   ├── asset-optimizer/     # GLTF/texture optimization (@oncyberio/asset-optimizer)
│   ├── mcp-server/          # MCP server for AI tools (@oncyberio/mcp-server)
│   └── create-oncyber-app/  # CLI project scaffolder
├── apps/
│   └── game/                # Standalone 3D game project
├── examples/                # Example game projects (pep-collector, zombie-survival)
├── scripts/                 # Utility scripts (animation baking, GLTF inspection)
└── docs/                    # Usage guides and architecture docs
```

### Package Overview

| Package | Description |
|---------|-------------|
| `@oncyberio/engine` | Core 3D game engine — components, physics, input, rendering |
| `@oncyberio/engine-edit` | Editor utilities — gizmos, selection, transform controls, undo/redo |
| `@oncyberio/asset-optimizer` | Asset pipeline — Draco, meshoptimizer, KTX2, Sharp, IPFS uploads |
| `@oncyberio/mcp-server` | Model Context Protocol server for AI-assisted scene editing |
| `create-oncyber-app` | Interactive CLI to scaffold new game projects from a template |
| `@oncyberio/scripts` | CLI tools for animation baking and GLTF inspection |

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (v8+)

### Create a New Game

```bash
npx create-oncyber-app my-game
cd my-game
pnpm install
pnpm dev
```

This scaffolds a full Next.js project with the oncyberio engine pre-configured, a sample 3D scene, and an embedded visual editor at `/studio`.

### Monorepo Development

```bash
# Clone and install
git clone <repo-url>
cd awe-dev
pnpm install

# Engine development
pnpm engine:check         # Type-check the engine
pnpm engine:build:api     # Generate public API type definitions
pnpm --filter engine test # Run engine tests

# Editor development
pnpm engine-edit:check    # Type-check engine-edit

# Asset optimizer
pnpm asset-optimizer:check

# Run the template project
pnpm template:dev

# Utility scripts
pnpm bake-anim            # Bake VRM animations from Mixamo FBX files
pnpm inspect-gltf         # Inspect GLTF/GLB model files
```

## Documentation

- **[Engine Usage Guide](docs/engine-usage/README.md)** — how to use the oncyberio engine for game development
- **[Engine API](packages/engine/api/)** — generated TypeScript definitions for the public API (run `pnpm engine:build:api` first)
- **[Engine Architecture](packages/engine/docs/)** — internal docs on the render pipeline, instancing, plugins, events, and component lifecycle
- **[Studio Guide](docs/studio-guide.md)** — workflows for the visual editor and AI automation
- **[Examples](docs/engine-usage/examples/)** — quick-reference examples for common patterns (collisions, input, spawning, control presets)

## How It Works

### Scene Definition

Games are defined by a `static-scene.json` file — a declarative component tree with positions, rotations, scales, and configurations:

```json
{
  "components": {
    "env-01": {
      "type": "environment",
      "name": "Sky",
      "position": [0, 0, 0]
    },
    "avatar-01": {
      "type": "avatar",
      "name": "Player",
      "position": [0, 0, 0],
      "script": { "identifier": "player" }
    }
  }
}
```

### Game Scripts

Game logic lives in a class with lifecycle methods — `init()` to set up the scene, `onUpdate` for the frame loop, and `dispose()` for cleanup:

```tsx
import { Engine, Camera, type Space, AvatarComponent } from "@oncyberio/engine";
import { createGame } from "@/lib/utils";
import { createThirdPerson } from "@/lib/control-presets";

export class GameScript {
  private space: Space | null = null;
  private controls: ControlSystem | null = null;

  async init() {
    const { space, reveal } = await createGame({ baseUrl: "" });
    this.space = space;

    // Look up components by ID
    const player = space.components.byId("player") as AvatarComponent;

    // Setup controls
    this.controls = createThirdPerson(space, player, Camera.current, {
      speed: 10,
      jumpHeight: 3,
    });

    await reveal();

    // Register frame loop
    this.space.use({
      onUpdate: this.onUpdate,
      onDispose: this.onDispose,
    });
  }

  onUpdate = (dt: number) => {
    // Called every frame
  };

  onDispose = () => {
    // Cleanup
  };
}
```

### AI Integration

The MCP server provides 30+ tools for AI assistants to manipulate scenes programmatically — adding components, configuring physics, managing assets, and more. Generated projects come pre-configured with Claude Code skills for engine usage, VFX creation, and asset inspection.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.

## License

All rights reserved.
