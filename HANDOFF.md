# Handoff: Remove MCP Server, Add CLI to asset-optimizer

## What was done

Removed `packages/mcp-server/` (31 MCP tools) and `scripts/` (standalone CLI scripts). Ported the ~5 non-CRUD capabilities into `packages/asset-optimizer/` as both a programmatic API and a unified CLI. Updated all docs to reference direct `static-scene.json` editing + CLI commands instead of MCP tools.

## Branch

`dev` — all changes are unstaged.

## Changes summary

### Deleted
- `packages/mcp-server/` — entire package (31 tools, tests, data files)
- `scripts/` — entire workspace (`bake-anim.ts`, `inspect-gltf.ts`, `collect-assets.ts`, `build-kitbash.ts`)
- `scripts/ensure-mcp-build.mjs` — postinstall build script
- `examples/starter/.mcp.json`, `examples/zombie-survival/.mcp.json`

### New files in `packages/asset-optimizer/`
- `src/cli.ts` — unified CLI entry point with 6 subcommands
- `src/file-utils/index.ts` — `readJsonFile`, `writeJsonFile`, `fileExists`, `resolveProjectPath`, `getScenePath`, `getUploadedAssetsPath`
- `src/scene/types.ts` — `SceneComponent`, `SceneData`, `ColliderConfig`
- `src/scene/validate-scene.ts` — `readScene()`, `validateScene()`
- `src/upload/upload-asset.ts` — `uploadAsset()` with SHA256 dedup
- `src/bake/bake-animation.ts` — `bakeAnimation()` inline FBX→JSON (no subprocess)
- `src/inspect/inspect-gltf.ts` — `inspectGltf()` metadata extraction

### Modified
- `packages/asset-optimizer/package.json` — added `"type": "module"`, `bin` field, `tsx` devDep
- `packages/asset-optimizer/tsconfig.build.json` — switched from CJS to ESM (`module: "ESNext"`)
- `packages/asset-optimizer/src/index.ts` — new exports for all ported modules
- `package.json` (root) — replaced broken/MCP scripts with CLI commands via `tsx`, added `tsx` devDep, removed `postinstall`
- `pnpm-workspace.yaml` — removed `scripts/*` workspace
- All 7 skill/reference docs — MCP references → direct editing + CLI
- `README.md`, `CONTRIBUTING.md`, `create-oncyber-app/README.md` — removed MCP mentions
- Example `package.json` files — removed `@oncyberio/mcp-server` and `@oncyberio/asset-optimizer` deps

## Architecture decisions

1. **CLI runs from source via tsx** — root scripts use `tsx packages/asset-optimizer/src/cli.ts <command>` rather than compiled dist. This avoids ESM extensionless-import issues in Node without touching existing import style across the codebase.

2. **Bake inlined, no subprocess** — `bake-animation.ts` uses `createRequire(import.meta.url)` to load `@oncyberio/engine/space/components/vrmanims/fbxtojson/index.js` directly, same as `inspect-gltf.ts` does for engine loaders. No more spawning a tsx worker process.

3. **No postinstall** — nothing imports from `dist/` at runtime anymore. The build step (`tsc -p tsconfig.build.json`) still exists for the `studio` package which imports the programmatic API, but it's not needed for CLI usage.

## CLI commands

All invoked via `pnpm <command>` from repo root:

```
pnpm optimize-model <path> [--no-draco] [--no-meshopt] [--no-weld] [--project-dir=PATH]
pnpm optimize-vrm <path> [--project-dir=PATH]
pnpm bake-anim <fbx-path> [name] [--project-dir=PATH]
pnpm upload-asset <source-path> [--name=NAME] [--project-dir=PATH]
pnpm validate-scene [--project-dir=PATH]
pnpm inspect-gltf <path>
```

All output JSON to stdout. Exit 0 on success, 1 on error.

## Verification done

- `pnpm --filter @oncyberio/asset-optimizer check` — passes
- `pnpm --filter @oncyberio/asset-optimizer build` — passes
- `pnpm validate-scene --project-dir=examples/starter` — works (reports valid with spawn warning)
- `grep -r "mcp-server\|MCP tool\|MCP \`" --include="*.md" --include="*.ts" --include="*.json" --include="*.mjs"` — zero matches

## Not yet verified (needs manual testing)

- `pnpm bake-anim` — requires an FBX file and engine runtime
- `pnpm optimize-model` / `pnpm optimize-vrm` — requires model files
- `pnpm inspect-gltf` — requires a GLB/GLTF file and engine loaders
- `pnpm upload-asset` — requires a source file in a project
- Studio still builds with asset-optimizer as ESM (`packages/studio/` imports `OptimizeService`, `OOAsset`)

## Remaining consumers of asset-optimizer

- **`packages/studio/`** — imports `OptimizeService`, `OOAsset`, `OptimizeAssetResult` from the programmatic API. This is the only real consumer besides the CLI. Verify it still builds after the CJS→ESM switch.
