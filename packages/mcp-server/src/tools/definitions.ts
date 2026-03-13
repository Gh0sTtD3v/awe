import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const toolDefinitions: Tool[] = [
  {
    name: "get_scene",
    description: "Read the full scene structure including metadata, component summary, and hierarchy",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "list_components",
    description: "List and filter scene components by type, name, tag, or parent",
    inputSchema: {
      type: "object" as const,
      properties: {
        type: { type: "string", description: "Filter by component type (exact match)" },
        name: { type: "string", description: "Filter by name (case-insensitive substring)" },
        tag: { type: "string", description: "Filter by script.tag field" },
        parentId: { type: "string", description: "Filter direct children of this parent" },
      },
    },
  },
  {
    name: "get_component",
    description: "Get full details of a specific component by ID",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Component ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "add_component",
    description: "Add a new component to the scene. Type-specific properties go at the ROOT level (e.g., for mesh: color, geometry, opacity — NOT inside a 'data' object). Use get_component_schema to see the correct properties for each type.",
    inputSchema: {
      type: "object" as const,
      properties: {
        type: { type: "string", description: "Component type (mesh, model, avatar, light, text, etc.)" },
        name: { type: "string", description: "Component display name" },
        position: { type: "object", description: "Position {x, y, z}", properties: { x: { type: "number" }, y: { type: "number" }, z: { type: "number" } } },
        rotation: { type: "object", description: "Rotation {x, y, z}", properties: { x: { type: "number" }, y: { type: "number" }, z: { type: "number" } } },
        scale: { type: "object", description: "Scale {x, y, z}", properties: { x: { type: "number" }, y: { type: "number" }, z: { type: "number" } } },
        parentId: { type: "string", description: "Parent component ID" },
      },
      required: ["type", "name"],
      additionalProperties: true,
    },
  },
  {
    name: "update_component",
    description: "Update properties of an existing component using deep merge. Type-specific properties are at the ROOT level (e.g., updates: { color: '#ff0000', opacity: 0.5 }). Use get_component_schema to see available properties for each type.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Component ID to update" },
        updates: { type: "object", description: "Properties to update (deep merged). Type-specific properties go at root level of this object." },
      },
      required: ["id", "updates"],
    },
  },
  {
    name: "delete_component",
    description: "Remove a component from the scene with optional recursive deletion",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Component ID to delete" },
        recursive: { type: "boolean", description: "Delete children recursively (default: true)" },
      },
      required: ["id"],
    },
  },
  {
    name: "duplicate_component",
    description: "Clone a component with position offset and new IDs",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Component ID to duplicate" },
        offset: { type: "object", description: "Position offset {x, y, z} (default: {x:2, y:0, z:0})", properties: { x: { type: "number" }, y: { type: "number" }, z: { type: "number" } } },
        newName: { type: "string", description: "Name for the duplicate (default: original + ' (copy)')" },
      },
      required: ["id"],
    },
  },
  {
    name: "move_component",
    description: "Reparent a component in the scene hierarchy",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Component ID to move" },
        newParentId: { type: ["string", "null"] as unknown as string, description: "New parent ID (null for root)" },
      },
      required: ["id", "newParentId"],
    },
  },
  {
    name: "list_models",
    description: "Browse the 3D model library with search and pagination",
    inputSchema: {
      type: "object" as const,
      properties: {
        search: { type: "string", description: "Search by model name (case-insensitive)" },
        source: { type: "string", description: "Filter by source slug" },
        limit: { type: "number", description: "Results per page (default: 20, max: 100)" },
        offset: { type: "number", description: "Pagination offset (default: 0)" },
      },
    },
  },
  {
    name: "list_avatars",
    description: "Browse available VRM avatars",
    inputSchema: {
      type: "object" as const,
      properties: {
        search: { type: "string", description: "Search by name or description" },
        includeHidden: { type: "boolean", description: "Include hidden avatars (default: false)" },
      },
    },
  },
  {
    name: "list_uploads",
    description: "Browse uploaded project assets",
    inputSchema: {
      type: "object" as const,
      properties: {
        mimeType: { type: "string", description: "Filter by MIME type prefix (e.g., 'model/', 'image/')" },
        search: { type: "string", description: "Search by asset name" },
      },
    },
  },
  {
    name: "search_assets",
    description: "Search across all asset libraries (models, avatars, uploads) at once",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query" },
        types: { type: "array", items: { type: "string", enum: ["model", "avatar", "upload"] }, description: "Asset types to search (default: all)" },
      },
      required: ["query"],
    },
  },
  {
    name: "upload_asset",
    description: "Register a local file as a game asset by copying it into the project",
    inputSchema: {
      type: "object" as const,
      properties: {
        sourcePath: { type: "string", description: "Path to source file (relative to project)" },
        name: { type: "string", description: "Asset display name (default: filename)" },
      },
      required: ["sourcePath"],
    },
  },
  {
    name: "add_model_to_scene",
    description: "Add a library 3D model to the scene in one step. IMPORTANT: After adding the model, always call optimize_model with the model's URL to generate optimized variants, then update the component with the optimization result using update_component.",
    inputSchema: {
      type: "object" as const,
      properties: {
        modelId: { type: "string", description: "Model ID or hash from library3D.json" },
        name: { type: "string", description: "Override component name" },
        position: { type: "object", description: "Position {x, y, z}", properties: { x: { type: "number" }, y: { type: "number" }, z: { type: "number" } } },
        rotation: { type: "object", description: "Rotation {x, y, z}", properties: { x: { type: "number" }, y: { type: "number" }, z: { type: "number" } } },
        scale: { type: "object", description: "Scale {x, y, z}", properties: { x: { type: "number" }, y: { type: "number" }, z: { type: "number" } } },
        parentId: { type: "string", description: "Parent component ID" },
      },
      required: ["modelId"],
    },
  },
  {
    name: "add_avatar_to_scene",
    description: "Add a VRM avatar to the scene in one step. IMPORTANT: After adding the avatar, always call optimize_vrm with the avatar's URL to generate an optimized version, then update the component's urlCompressed field with the result using update_component.",
    inputSchema: {
      type: "object" as const,
      properties: {
        avatarId: { type: "string", description: "Avatar ID from vrms.json" },
        name: { type: "string", description: "Override component name" },
        position: { type: "object", description: "Position {x, y, z}", properties: { x: { type: "number" }, y: { type: "number" }, z: { type: "number" } } },
        animations: { type: "array", items: { type: "string" }, description: "Animation names to enable" },
      },
      required: ["avatarId"],
    },
  },
  {
    name: "set_physics",
    description: "Add, update, or remove physics/collider settings on a component",
    inputSchema: {
      type: "object" as const,
      properties: {
        componentId: { type: "string", description: "Target component ID" },
        enabled: { type: "boolean", description: "Enable or disable physics" },
        rigidbodyType: { type: "string", enum: ["DYNAMIC", "KINEMATIC", "FIXED", "PLAYER"], description: "Rigidbody type" },
        colliderType: { type: "string", enum: ["CUBE", "SPHERE", "CAPSULE", "CYLINDER", "MESH"], description: "Collider shape" },
        isSensor: { type: "boolean", description: "Whether collider is a sensor (trigger)" },
        mass: { type: "number", description: "Mass (DYNAMIC only)" },
        friction: { type: "number", description: "Friction coefficient (DYNAMIC only)" },
        restitution: { type: "number", description: "Bounciness (DYNAMIC only)" },
        linearDamping: { type: "number", description: "Linear damping (DYNAMIC only)" },
        angularDamping: { type: "number", description: "Angular damping (DYNAMIC only)" },
      },
      required: ["componentId", "enabled"],
    },
  },
  {
    name: "list_physics_components",
    description: "List all components with physics/collider configuration",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_animations",
    description: "View animation configuration and available animation files",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "add_animation",
    description: "Add a new animation clip to the VRM animations config",
    inputSchema: {
      type: "object" as const,
      properties: {
        fileName: { type: "string", description: "Animation file name in public/assets/anims/" },
        name: { type: "string", description: "Animation clip name" },
        loop: { type: "boolean", description: "Loop animation (default: true)" },
        sync: { type: "boolean", description: "Sync animation (default: false)" },
        timeScale: { type: "number", description: "Playback speed (default: 1)" },
      },
      required: ["fileName", "name"],
    },
  },
  {
    name: "get_project_info",
    description: "Get project overview: metadata, dependencies, scripts, assets, and configuration",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "validate_scene",
    description: "Check scene for errors: duplicate IDs, broken references, missing assets, and more",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "group_components",
    description: "Group multiple components under a new parent group",
    inputSchema: {
      type: "object" as const,
      properties: {
        componentIds: { type: "array", items: { type: "string" }, description: "IDs of components to group" },
        groupName: { type: "string", description: "Name for the new group" },
      },
      required: ["componentIds", "groupName"],
    },
  },
  {
    name: "batch_update",
    description: "Update multiple components in a single atomic write (max 50)",
    inputSchema: {
      type: "object" as const,
      properties: {
        updates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "Component ID" },
              changes: { type: "object", description: "Properties to update" },
            },
            required: ["id", "changes"],
          },
          description: "Array of {id, changes} updates",
        },
      },
      required: ["updates"],
    },
  },
  {
    name: "set_lighting",
    description: "Configure scene lighting with presets or custom values",
    inputSchema: {
      type: "object" as const,
      properties: {
        preset: { type: "string", enum: ["day", "night", "sunset", "studio", "custom"], description: "Lighting preset" },
        ambient: { type: "object", description: "Ambient light: {color, intensity}" },
        directional: { type: "object", description: "Directional light: {color, intensity, position}" },
        fog: { type: "object", description: "Fog settings: {enabled, color, near, far}" },
      },
    },
  },
  {
    name: "set_environment",
    description: "Configure background, environment map, and post-processing",
    inputSchema: {
      type: "object" as const,
      properties: {
        background: { type: "object", description: "Background config: {type, color, url}" },
        envmap: { type: "object", description: "Environment map: {url, intensity}" },
        postprocessing: { type: "object", description: "Post-processing effects config" },
      },
    },
  },
  {
    name: "get_component_schema",
    description: "Get the property schema and example for a component type",
    inputSchema: {
      type: "object" as const,
      properties: {
        type: { type: "string", description: "Component type to get schema for" },
      },
      required: ["type"],
    },
  },
  {
    name: "set_spawn",
    description: "Set or update the player spawn point and optional avatar",
    inputSchema: {
      type: "object" as const,
      properties: {
        position: { type: "object", description: "Spawn position {x, y, z}", properties: { x: { type: "number" }, y: { type: "number" }, z: { type: "number" } }, required: ["x", "y", "z"] },
        rotation: { type: "object", description: "Spawn rotation {x, y, z}", properties: { x: { type: "number" }, y: { type: "number" }, z: { type: "number" } } },
        avatarId: { type: "string", description: "Avatar ID from vrms.json" },
      },
      required: ["position"],
    },
  },
  {
    name: "validate_component_data",
    description: "Validate component data against the schema before add_component or update_component. Returns success or specific error messages.",
    inputSchema: {
      type: "object" as const,
      properties: {
        type: { type: "string", description: "Component type to validate against" },
        data: { type: "object", description: "The proposed component data object to validate" },
      },
      required: ["type", "data"],
    },
  },
  {
    name: "capture_screenshot",
    description: "Capture a screenshot of the current scene from the dev server",
    inputSchema: {
      type: "object" as const,
      properties: {
        width: { type: "number", description: "Screenshot width (default: 1280)" },
        height: { type: "number", description: "Screenshot height (default: 720)" },
        cameraPosition: { type: "object", description: "Camera position {x, y, z}", properties: { x: { type: "number" }, y: { type: "number" }, z: { type: "number" } } },
        cameraTarget: { type: "object", description: "Camera look-at target {x, y, z}", properties: { x: { type: "number" }, y: { type: "number" }, z: { type: "number" } } },
      },
    },
  },
  {
    name: "optimize_model",
    description: "Optimize a 3D model (GLB/GLTF) with compression, texture optimization, and multiple quality variants",
    inputSchema: {
      type: "object" as const,
      properties: {
        assetPath: { type: "string", description: "Path to GLB/GLTF file relative to public/ (e.g. /assets/tree.glb)" },
        useWeld: { type: "boolean", description: "Enable vertex welding (default: true)" },
        useDraco: { type: "boolean", description: "Enable Draco mesh compression (default: true)" },
        useMeshOpt: { type: "boolean", description: "Enable MeshOptimizer simplification (default: true)" },
      },
      required: ["assetPath"],
    },
  },
  {
    name: "optimize_vrm",
    description: "Optimize a VRM avatar file with texture compression and material optimization",
    inputSchema: {
      type: "object" as const,
      properties: {
        assetPath: { type: "string", description: "Path to VRM file relative to public/ (e.g. /assets/avatar.vrm)" },
      },
      required: ["assetPath"],
    },
  },
  {
    name: "bake_animation",
    description: "Bake an FBX animation file for use with VRM avatars. Converts FBX to JSON format and writes to public/assets/anims/. After baking, use add_animation to register the clip in the scene.",
    inputSchema: {
      type: "object" as const,
      properties: {
        fbxPath: { type: "string", description: "Path to FBX file relative to public/ (e.g., assets/anims/zombie_attack.fbx)" },
        name: { type: "string", description: "Animation name (defaults to filename without extension)" },
        loop: { type: "boolean", description: "Whether animation should loop (default: true)" },
        sync: { type: "boolean", description: "Whether animation should be synchronized (default: false)" },
        timeScale: { type: "number", description: "Playback speed multiplier (default: 1)" },
      },
      required: ["fbxPath"],
    },
  },
];
