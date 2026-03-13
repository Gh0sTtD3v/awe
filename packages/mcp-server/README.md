# oncyberio MCP Server

An MCP (Model Context Protocol) server that gives AI full parity with the oncyberio Studio editor. It provides tools for scene CRUD, asset management, physics, animations, and project configuration.

## Build

`pnpm install` at the workspace root now runs a conditional postinstall check that builds `@oncyberio/asset-optimizer` and `@oncyberio/mcp-server` when their `dist` outputs are missing.

Manual rebuild commands:

```bash
pnpm --filter @oncyberio/asset-optimizer build
pnpm --filter @oncyberio/mcp-server build
```

## Configure Claude Code

The project root `.mcp.json` auto-discovers this server. After install/build, restart Claude Code and the `oncyberio-engine` MCP server will be available.

If MCP startup fails, rebuild both `@oncyberio/asset-optimizer` and `@oncyberio/mcp-server`, then restart Claude Code.

To manually configure, add to `.mcp.json`:

```json
{
  "mcpServers": {
    "oncyberio-engine": {
      "command": "node",
      "args": ["packages/mcp-server/dist/index.js", "--project-dir", "./template"]
    }
  }
}
```

## Available Tools

### Scene
| Tool | Description |
|------|-------------|
| `get_scene` | Read full scene structure with metadata, summary, and hierarchy |
| `validate_scene` | Check scene for errors: duplicate IDs, broken refs, missing assets |

### Components
| Tool | Description |
|------|-------------|
| `list_components` | List/filter components by type, name, tag, or parent |
| `get_component` | Get full details of a component by ID |
| `add_component` | Add a new component to the scene |
| `update_component` | Update component properties via deep merge |
| `delete_component` | Remove a component (with optional recursive deletion) |
| `duplicate_component` | Clone a component with offset and new IDs |
| `move_component` | Reparent a component in the hierarchy |
| `group_components` | Group multiple components under a new parent |
| `batch_update` | Update multiple components in one atomic write |
| `get_component_schema` | Get property schema for a component type |

### Assets
| Tool | Description |
|------|-------------|
| `list_models` | Browse 3D model library with search and pagination |
| `list_avatars` | Browse available VRM avatars |
| `list_uploads` | Browse uploaded project assets |
| `search_assets` | Search across all asset libraries at once |
| `upload_asset` | Register a local file as a game asset |
| `add_model_to_scene` | Add a library model to the scene in one step |
| `add_avatar_to_scene` | Add a VRM avatar to the scene in one step |

### Physics
| Tool | Description |
|------|-------------|
| `set_physics` | Add/update/remove physics collider on a component |
| `list_physics_components` | List all physics-enabled components |

### Animation
| Tool | Description |
|------|-------------|
| `get_animations` | View animation config and available files |
| `add_animation` | Add an animation clip to VRM animations |

### Environment
| Tool | Description |
|------|-------------|
| `set_lighting` | Configure lighting with presets or custom values |
| `set_environment` | Configure background, envmap, and post-processing |
| `set_spawn` | Set or update the player spawn point |

### Project
| Tool | Description |
|------|-------------|
| `get_project_info` | Get project overview: metadata, deps, scripts, assets |
| `capture_screenshot` | Capture screenshot from running dev server |
