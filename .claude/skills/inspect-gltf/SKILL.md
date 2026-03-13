---
name: inspect-gltf
description: |
  Inspect GLTF/GLB 3D model files to extract metadata. Use when you need to:
  (1) See what animations a model contains
  (2) List meshes, materials, or bones in a model
  (3) Check GLTF version, extensions, or file size
  (4) Get model info as JSON for further processing
---

# GLTF Inspection

Inspect GLTF/GLB files using the `inspect-gltf` script.

## Commands

```bash
# Human-readable output
pnpm inspect-gltf <path>

# JSON output
pnpm inspect-gltf <path> --json
```

## Information Extracted

- **File**: path, size
- **Asset**: GLTF version, generator
- **Extensions**: used, required
- **Animations**: name, duration (seconds), track count
- **Meshes**: name, type (Mesh/SkinnedMesh), vertices, faces, material
- **Materials**: name, type, color, roughness, metalness
- **Skeleton**: bone count, bone names

## Examples

```bash
# Inspect a model
pnpm inspect-gltf assets/gltf/Xbot.glb

# Get animations as JSON
pnpm inspect-gltf assets/gltf/Xbot.glb --json | jq '.animations'

# Get bone names
pnpm inspect-gltf assets/gltf/Xbot.glb --json | jq '.skeleton.bones'
```
