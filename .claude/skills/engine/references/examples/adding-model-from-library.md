# Adding a 3D Model from library3D.json

## Adding to Scene

Use the MCP `add_model_to_scene` tool — it searches the library, selects optimization URLs, and adds the component in one step. Use `list_models` or `search_assets` to browse available models first.

To add physics, follow up with `set_physics` or `update_component` to add a `collider`.

## Runtime Duplication

To spawn multiple instances of a model at runtime, add it to the scene once (as a hidden template), then duplicate in your game script:

```typescript
// space obtained from engine.createSpace() - see game-script-template.md

const template = space.components.byId("building-template");
template.visible = false; // hide the template

// Duplicate to spawn instances
const building = await template.duplicate({
  overrideOpts: {
    id: "building-1",
    name: "Building 1",
    position: { x: 10, y: 0, z: 5 },
  },
});
```
