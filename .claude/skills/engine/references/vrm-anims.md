# VRM Animations Guide

Custom VRM animations can be added from Mixamo FBX files using the `pnpm bake-anim` CLI command.

### Adding New Animations

1. **Place FBX file** in `public/assets/anims/` (download from [Mixamo](https://www.mixamo.com/))

2. **Bake the animation** using the CLI:
   ```
   pnpm bake-anim <fbx-path> [name]
   ```
   - `fbx-path`: path relative to `public/` (e.g., `assets/anims/zombie_attack.fbx`)
   - `name`: optional animation name (defaults to filename, sanitized to snake_case)

3. **Register the clip** by adding the bake output to the `vrm-anims` component in `static-scene.json`:
   ```json
   {
     "vrm-anims": {
       "id": "vrm-anims",
       "name": "VRM Animations",
       "type": "vrm-anims",
       "anims": {
         "zombie_attack": {
           "name": "zombie_attack",
           "url": "/assets/anims/zombie_attack.json",
           "loop": true,
           "sync": false,
           "timeScale": 1
         }
       }
     }
   }
   ```

4. **Use in game script** (requires `useCpuAnimation: true` on spawn/avatar):
   ```typescript
   // Play animation with fade-in
   avatar.play("zombie_attack", { fadeIn: 0.2 });

   // Stop animation with fade-out
   avatar.stop("zombie_attack", { fadeOut: 0.2 });
   ```

### Bake Options

- `loop` - Whether animation should loop (default: true)
- `sync` - Synchronize across clients (default: false)
- `timeScale` - Playback speed multiplier (default: 1)

### Files

- `public/assets/anims/` - FBX source files and baked JSON animation output
