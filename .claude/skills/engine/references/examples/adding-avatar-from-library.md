# Adding an Avatar from vrms.json

## Adding to Scene

Use the MCP `add_avatar_to_scene` tool — it searches the avatar library, includes both `url` and `urlCompressed`, and adds the component in one step. Use `list_avatars` or `search_assets` to browse available avatars first.

## Runtime Duplication

To spawn multiple avatar instances at runtime, add one to the scene (as a hidden template), then duplicate in your game script:

```typescript
// space obtained from engine.createSpace() - see game-script-template.md

const template = space.components.byId("npc-template");
template.visible = false; // hide the template

// Duplicate to spawn instances
const npc = await template.duplicate({
  overrideOpts: {
    id: "npc-1",
    name: "Guard",
    position: { x: 5, y: 0, z: 3 },
  },
});
```
