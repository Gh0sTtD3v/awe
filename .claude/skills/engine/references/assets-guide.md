# Assets Guide

This guide covers loading and managing 3D assets in your scene.

## Asset Sources

### Official Avatars (vrms.json)

VRM avatars available for characters (player, zombie ...).

**Location:** `public/vrms.json`

**Structure:**

```json
{
  "sunshine": {
    "id": "sunshine",
    "name": "Summer",
    "url": "https://cyber.mypinata.cloud/ipfs/...",
    "urlCompressed": "https://cyber.mypinata.cloud/ipfs/...",
    "image": "https://cyber.mypinata.cloud/ipfs/...",
    "preview_image": "https://cyber.mypinata.cloud/ipfs/...",
    "description": "Avatar description"
  }
}
```

| Field           | Description                     |
| --------------- | ------------------------------- |
| `id`            | Unique avatar identifier        |
| `name`          | Display name                    |
| `url`           | Full quality VRM/GLB URL        |
| `urlCompressed` | Optimized VRM URL (prefer this) |
| `image`         | Preview image URL               |
| `description`   | Avatar description              |

### Official 3D Models (library3D.json)

Pre-built 3D models with multiple optimization levels.

**Location:** `public/library3D.json`

**Structure:**

```json
{
  "id": "...",
  "name": "...",
  "hash": "...",
  "mimeType": "model/gltf-binary",
  "image": {
    "pinata": "https://cyber.mypinata.cloud/ipfs/..."
  },
  "url": {
    "pinata": "https://cyber.mypinata.cloud/ipfs/..."
  },
  "d_optimized_files": {
    "high": {
      "pinata": "https://..."
    },
    "low": {
      "pinata": "https://..."
    },
    "low_compressed": {
      "pinata": "https://..."
    }
  },
  "source": {
    "name": "VipeKit",
    "slug": "vipekit",
    "nodeName": "Building_03",
    "url": "https://..."
  }
}
```

| Field               | Description                                     |
| ------------------- | ----------------------------------------------- |
| `id` / `hash`       | Unique identifier (SHA256 hash)                 |
| `name`              | Display name                                    |
| `url`               | Default model URL (pinata)                      |
| `d_optimized_files` | Optimization levels (high, low, low_compressed) |
| `image`             | Preview thumbnail                               |
| `source`            | Origin kit metadata                             |

**Optimization Levels:**

- `high` - Full quality, largest file size
- `low` - Reduced quality, smaller file size
- `low_compressed` - Most optimized, smallest file size (recommended for web)

### Game custom assets (uploaded_assets.json)

**Location:** `public/data/uploaded_assets.json`

**Structure:**

```json
{
  "hash": "...",
  "url": "/assets/uploaded-assets-[hash].png",
  "name": "my-asset.png",
  "mimeType": "image/png",
  "createdAt": 1768923704464,
  "lastModified": 1768923704464
}
```

| Field       | Description                          |
| ----------- | ------------------------------------ |
| `hash`      | SHA256 hash of file contents         |
| `url`       | Local path relative to public folder |
| `name`      | Original filename                    |
| `mimeType`  | File MIME type                       |
| `createdAt` | Upload timestamp                     |

## Storage Locations

| Content               | Path                               |
| --------------------- | ---------------------------------- |
| Avatar library        | `public/vrms.json`                 |
| 3D model library      | `public/library3D.json`            |
| User uploads metadata | `public/data/uploaded_assets.json` |
| User upload files     | `public/assets/`                   |
| Scene definition      | `public/data/static-scene.json`    |

## Adding Assets to the Scene

**Use MCP tools** for all scene asset operations:

| Task | MCP Tool |
| --- | --- |
| Add a 3D model | `add_model_to_scene` (searches library, adds with optimized URLs) |
| Add an avatar | `add_avatar_to_scene` (searches library, adds with compressed URLs) |
| Upload a local file | `upload_asset` (hashes, copies, registers in uploaded_assets.json) |
| Browse models | `list_models` or `search_assets` |
| Browse avatars | `list_avatars` or `search_assets` |
| Browse uploads | `list_uploads` |

### Automatic URL Selection

The engine automatically selects the best asset URL based on device capabilities. The MCP tools handle this by including all URL variants when adding assets.

- **Avatars:** `url` + `urlCompressed` (KTX2 textures)
- **Models:** `url` + `optimized.high` / `optimized.low` / `optimized.low_compressed` (GPU-tier based)
