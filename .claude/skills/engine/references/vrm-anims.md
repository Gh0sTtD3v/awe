# VRM Animations Guide

Custom VRM animations can be added from Mixamo FBX files using the **`bake_animation` MCP tool**.

### Adding New Animations

1. **Place FBX file** in `public/assets/anims/` (download from [Mixamo](https://www.mixamo.com/))

2. **Bake the animation** using the `bake_animation` MCP tool:
   - `fbxPath`: path relative to `public/` (e.g., `assets/anims/zombie_attack.fbx`)
   - Optional: `name`, `loop` (default: true), `sync` (default: false), `timeScale` (default: 1)

3. **Register the clip** using the `add_animation` MCP tool with the bake output

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
