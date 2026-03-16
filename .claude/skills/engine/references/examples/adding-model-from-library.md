# Adding a 3D Model from library3D.json

## Adding to Scene

Look up the model in `public/library3D.json`, then add a component to `public/data/static-scene.json`:

```json
{
  "my-building": {
    "id": "my-building",
    "name": "Building",
    "type": "model",
    "position": { "x": 0, "y": 0, "z": 0 },
    "url": "https://cyber.mypinata.cloud/ipfs/...",
    "optimized": {
      "high": "https://cyber.mypinata.cloud/ipfs/...",
      "low": "https://cyber.mypinata.cloud/ipfs/...",
      "low_compressed": "https://cyber.mypinata.cloud/ipfs/..."
    }
  }
}
```

Copy the `url` and `d_optimized_files` values from the library entry. Map `d_optimized_files.high.pinata` → `optimized.high`, etc.

To add physics, include a `collider` property on the component (see [physics-config.md](./physics-config.md)).

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
