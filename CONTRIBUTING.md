# Contributing to oncyberio Engine

Thanks for your interest in contributing to oncyberio! This guide will help you get set up and familiar with the project's conventions.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20.9 or later
- [pnpm](https://pnpm.io/) v8 or later
- [Git](https://git-scm.com/)

### Setup

```bash
git clone <repo-url>
cd awe
pnpm install
```

### Verify Your Setup

```bash
pnpm engine:check          # Type-check the engine
pnpm --filter engine test  # Run engine tests
pnpm engine-edit:check     # Type-check engine-edit
```

## Project Structure

This is a pnpm workspace monorepo. See the [README](README.md) for a full breakdown of packages. The key areas you'll work in:

| Area            | Path                             | Description                              |
| --------------- | -------------------------------- | ---------------------------------------- |
| Engine          | `packages/engine/`               | Core 3D engine (components, physics, rendering) |
| Editor          | `packages/engine-edit/`          | Visual editing tools (gizmos, selection, undo/redo) |
| Tools           | `packages/tools/`                | Asset pipeline & CLI tools               |
| Studio          | `packages/studio/`               | In-browser studio UI and tools           |
| CLI             | `packages/create-oncyber-app/`   | Project scaffolding tool                 |

## Code Style

### File Naming

All files **must** use kebab-case:

```
game-script.tsx        # correct
editor-events.ts       # correct
GameScript.tsx         # incorrect
editorEvents.ts        # incorrect
```

### TypeScript

- The project uses TypeScript throughout
- Run type checks before submitting changes:
  ```bash
  pnpm engine:check
  pnpm engine-edit:check
  pnpm tools:check
  ```

### General Guidelines

- Keep changes focused — one concern per PR
- Prefer editing existing files over creating new ones
- Avoid over-engineering; solve the problem at hand
- Don't add comments for self-explanatory code

## Development Workflow

### Common Commands

```bash
# Type-checking
pnpm engine:check         # Type-check the engine
pnpm engine-edit:check    # Type-check engine-edit
pnpm tools:check

# Testing
pnpm --filter engine test
pnpm --filter create-oncyber-app test

# API generation
pnpm engine:build:api     # Generate public API type definitions

# Run an example project
pnpm --filter zombie-survival dev

# Utility scripts
pnpm bake-anim            # Bake VRM animations from Mixamo FBX files
pnpm inspect-gltf         # Inspect GLTF/GLB model files
```

Tests use [Vitest](https://vitest.dev/). Write tests for new functionality when applicable.

### Branching

- `main` is the primary branch
- Create feature branches from `main` with descriptive names:
  ```bash
  git checkout -b feat/add-water-shader
  git checkout -b fix/avatar-collision-offset
  ```

### Making Changes

1. **Engine changes** — work in `packages/engine/src/`. Run `pnpm engine:check` and `pnpm --filter engine test` to verify.
2. **Editor changes** — work in `packages/engine-edit/src/`. Run `pnpm engine-edit:check` to verify.
3. **API changes** — if you modify the engine's public API, regenerate type definitions with `pnpm engine:build:api`.
4. **Template changes** — the project template lives at `packages/create-oncyber-app/template/`.

## Commit Messages

Use clear, descriptive commit messages with a conventional prefix:

```
feat(engine): add water shader component
fix(engine-edit): correct gizmo alignment on rotated objects
docs: update physics configuration examples
chore: update three.js to 0.171
test(engine): add collision detection edge case tests
```

Format: `type(scope): description`

**Types:** `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`

**Scopes:** `engine`, `engine-edit`, `tools`, `studio`, `create-oncyber-app`, `scripts`, or omit for cross-cutting changes.

## Pull Requests

1. Make sure all type checks pass
2. Make sure all tests pass
3. Write a clear description of what changed and why
4. Keep PRs focused — split unrelated changes into separate PRs
5. Link related issues if applicable

## Getting Help

If you're unsure about something or need guidance, open an issue to discuss your approach before starting work on large changes.
