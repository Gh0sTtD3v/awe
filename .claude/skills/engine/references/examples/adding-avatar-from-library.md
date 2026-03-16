# Adding an Avatar from vrms.json

## Adding to Scene

Look up the avatar in `public/vrms.json`, then add a component to `public/data/static-scene.json`:

```json
{
  "my-npc": {
    "id": "my-npc",
    "name": "Guard NPC",
    "type": "avatar",
    "position": { "x": 5, "y": 0, "z": 3 },
    "url": "https://cyber.mypinata.cloud/ipfs/...",
    "urlCompressed": "https://cyber.mypinata.cloud/ipfs/..."
  }
}
```

Copy both `url` and `urlCompressed` from the vrms.json entry for the chosen avatar.

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
