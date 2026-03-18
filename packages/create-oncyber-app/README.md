# create-oncyber-app

Scaffold a new 3D game powered by the oncyberio engine.

## Quick Start

```bash
npx create-oncyber-app my-game
cd my-game
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see your game, or [http://localhost:3000/_studio](http://localhost:3000/_studio) for the visual editor.

## Usage

```bash
npx create-oncyber-app [project-name] [options]
```

When run without a project name, the CLI starts in interactive mode and prompts for a name and template. The generated project uses pnpm.

## Options

| Flag | Description |
| --- | --- |
| `--skip-install` | Skip automatic dependency installation |
| `--skip-git` | Skip git repository initialization |
| `--help` | Show the help message |
| `--version` | Show the CLI version |

The CLI uses pnpm automatically. If pnpm is missing, it will try to enable it with Corepack.

## Examples

```bash
# Interactive mode — prompts for name and template
npx create-oncyber-app

# Create a project with a specific name
npx create-oncyber-app my-game

# Skip git init
npx create-oncyber-app my-game --skip-git

# Scaffold only — no install, no git
npx create-oncyber-app my-game --skip-install --skip-git
```

## What's Included

- **Next.js app** with the oncyberio 3D game engine pre-configured
- **Embedded studio** at the `/_studio` route for visual scene editing
- **Claude skills** for engine usage, VFX creation, and GLTF inspection
- **CLI tools** for asset optimization and scene validation
- **Sample scene** with a default environment and avatar

## Tech Stack

- React 19 & Next.js
- TypeScript
- Tailwind CSS
- Three.js (via oncyberio engine)
- GSAP (animations)
- Framer Motion (UI transitions)
- Rapier (physics)

## Project Structure

```
my-game/
├── public/
│   ├── assets/          # 3D models, animations, VFX, textures
│   ├── data/
│   │   └── static-scene.json   # Scene definition
│   ├── library3D.json   # 3D model library
│   └── vrms.json        # Avatar library
├── src/
│   ├── components/
│   │   ├── game-canvas.tsx     # Three.js canvas setup
│   │   ├── game-scene.tsx      # Scene loader and renderer
│   │   ├── game-script.tsx     # Main game logic (onReady, onUpdate, onDispose)
│   │   ├── game-store.ts       # Game state management
│   │   └── game-ui.tsx         # HTML UI overlay
│   ├── hooks/           # Custom React hooks
│   └── lib/             # Utilities and control presets
├── .claude/skills/      # Claude skills for engine, VFX, GLTF
├── package.json
└── tsconfig.json
```

## Key Files

| File | Purpose |
| --- | --- |
| `src/components/game-script.tsx` | Main game logic — lifecycle hooks (`onReady`, `onUpdate`, `onDispose`) |
| `src/components/game-scene.tsx` | Loads and renders the 3D scene |
| `src/components/game-store.ts` | Game state management (immer + swr) |
| `src/components/game-ui.tsx` | HTML UI overlay layer |
| `public/data/static-scene.json` | Scene definition with all game objects |

## Next Steps

1. Run `pnpm dev` to start the dev server
2. Open [http://localhost:3000](http://localhost:3000) to see your game
3. Open [http://localhost:3000/_studio](http://localhost:3000/_studio) to edit the scene visually
4. Edit `src/components/game-script.tsx` to add game logic
5. Edit `public/data/static-scene.json` or use CLI tools to add 3D models, avatars, and physics
