# Contributing to oncyberio Engine

Thanks for your interest in contributing to oncyberio! This guide will help you get set up and familiar with the project's conventions.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20.9 or later
- [pnpm](https://pnpm.io/) v8 or later
- [Git](https://git-scm.com/)

### Setup

```bash
git clone https://github.com/oncyberio/awe.git
cd awe
pnpm install
```

### Verify Your Setup

```bash
pnpm engine:check          # Type-check the engine
pnpm engine:test           # Run engine tests
pnpm engine-edit:check     # Type-check engine-edit
pnpm tools:check           # Type-check the tools package
pnpm studio:check          # Type-check the studio package
```

## Project Structure

This is a pnpm workspace monorepo. See the [README](README.md) for a full breakdown of packages. The key areas contributors work in:

| Area            | Path                             | Description                              |
| --------------- | -------------------------------- | ---------------------------------------- |
| Engine          | `packages/engine/`               | Core 3D engine (components, physics, rendering) |
| Editor          | `packages/engine-edit/`          | Visual editing tools (gizmos, selection, undo/redo) |
| Tools           | `packages/tools/`                | Asset pipeline & CLI tools               |
| Studio          | `packages/studio/`               | In-browser studio UI and tools           |
| CLI             | `packages/create-oncyber-app/`   | Project scaffolding tool                 |
| Examples        | `examples/`                      | Reference games and integration demos    |

## Code Style

### File Naming

All new source files should use kebab-case. Some generated files, third-party assets, and legacy data files in the repo are exceptions.

```
game-script.tsx        # correct
editor-events.ts       # correct
GameScript.tsx         # incorrect
editorEvents.ts        # incorrect
```

### TypeScript

- The project uses TypeScript throughout
- Run the relevant type checks before submitting changes:
  ```bash
  pnpm engine:check
  pnpm engine-edit:check
  pnpm tools:check
  pnpm studio:check
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
pnpm engine:test          # Run engine tests
pnpm engine-edit:check    # Type-check engine-edit
pnpm --filter engine-edit test
pnpm tools:check
pnpm tools:test
pnpm studio:check
pnpm --filter create-oncyber-app test

# Run example projects
pnpm --filter starter dev
pnpm --filter football-demo dev
pnpm --filter zombie-survival dev
pnpm --filter multiplayer dev
pnpm --filter auth-multiplayer dev
```

Tests use [Vitest](https://vitest.dev/) across the engine, editor, tools, CLI, and some examples. Write or update tests when you change behavior.

### Branching

- `main` is the primary branch
- Create feature branches from `main` with descriptive names:
  ```bash
  git checkout -b feat/add-water-shader
  git checkout -b fix/avatar-collision-offset
  ```

### Making Changes

1. **Engine changes** — work in `packages/engine/src/`. Run `pnpm engine:check` and `pnpm engine:test` to verify.
2. **Editor changes** — work in `packages/engine-edit/src/`. Run `pnpm engine-edit:check` and `pnpm --filter engine-edit test` when relevant.
3. **Tools changes** — work in `packages/tools/src/`. Run `pnpm tools:check` and `pnpm tools:test`.
4. **Studio changes** — work in `packages/studio/src/`. Run `pnpm studio:check`.
5. **CLI changes** — work in `packages/create-oncyber-app/src/`. Run `pnpm --filter create-oncyber-app test`.
6. **Template changes** — the generated project template lives at `packages/create-oncyber-app/template/`.
7. **Example changes** — work in `examples/*/`. Run the relevant example locally, and run its tests if that example defines them.

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
2. Make sure the relevant tests pass
3. Write a clear description of what changed and why
4. Keep PRs focused — split unrelated changes into separate PRs
5. Link related issues if applicable

## Getting Help

If you're unsure about something or need guidance, open an issue to discuss your approach before starting work on large changes.
