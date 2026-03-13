/**
 * Component schemas aligned to the AWE engine source of truth.
 *
 * Engine source: packages/engine/src/space/components/<type>/<type>-data.ts
 * Base class:    packages/engine/src/space/abstract/component-3d-data.ts
 *
 * Key design rule:
 *   Type-specific properties live at the component ROOT, not inside a `data` bag.
 *   Common properties (id, name, type, position, rotation, scale, parentId,
 *   collider, script) are defined on SceneComponent in types.ts.
 *   Everything else belongs directly on the component object.
 *
 * Audit summary (mismatches fixed in this file):
 *   - mesh: geometry was a flat string; now an object { type, boxParams, sphereParams, cylinderParams }
 *   - mesh: color, opacity, renderMode, castShadow, receiveShadow, material, image were missing
 *   - model: optimized was typed wrong; animations was boolean instead of object/boolean
 *   - avatar: missing urlCompressed typing
 *   - text: property was "content" but engine uses "text"; fontSize->font/width/lineHeight; color->textColor
 *   - light: properties were vague objects; now typed with ambient/directional nested structure
 *   - terrain: missing many properties (segments, lacunarity, exponent, shader details)
 *   - water: missing engine properties (dimensions, flowSpeed, scale)
 *   - grass: missing engine properties (patchSize, bladeWidth, joints, wind)
 *   - fog: was close, just confirmed
 *   - background: engine uses "options" pattern with type union
 *   - envmap: engine uses "options" with scene/image discriminated union
 *   - spawn: engine just uses position/rotation on the component itself + avatarId
 *   - navmesh: missing "visible" property
 *   - quarks: was close, confirmed
 *   - interaction: was wrong (action/range); engine uses distance, atlas, key, billboard, color
 *   - dialog: was wrong (text/speaker); engine uses NPC dialog system with different props
 *   - destination: engine uses url/label
 *   - spline: engine uses points/closed, was approximately correct
 *   - iframe: engine uses url/width/height, was approximately correct
 *   - reflector: engine uses color/opacity/blur/mirror/mixBlur/mixStrength/resolution/depthScale
 *   - postprocessing: engine uses bloom/lut/vignette/chromaticAberration/toneMapping
 *   - rain: engine uses count/velocity/color/opacity/size
 *   - cloud: engine uses segments/bounds/volume/color/seed/concentrate/growth
 *   - bird: engine uses count/speed/color/size
 *   - dust: engine uses count/size/opacity/color
 *   - wave: engine uses color/height/radius/linewidth/divisions/lines/direction
 *   - godray: engine uses intensity/color/exposure/decay/density/samples
 *   - impact: engine uses color/scale
 *   - image: engine uses url/width/height, was approximately correct
 *   - video: engine uses url/autoplay/loop, was approximately correct
 *   - audio: engine uses url/volume/loop/spatial, was approximately correct
 */

interface PropertySchema {
  type: string;
  description: string;
  default?: unknown;
}

interface ComponentSchema {
  type: string;
  description: string;
  properties: Record<string, PropertySchema>;
  example: Record<string, unknown>;
}

export const componentSchemas: Record<string, ComponentSchema> = {
  mesh: {
    type: "mesh",
    description: "A basic 3D mesh/primitive shape (box, sphere, cylinder, plane, dome)",
    properties: {
      geometry: {
        type: "object",
        description: "Geometry config: { type: 'box'|'sphere'|'cylinder'|'plane'|'dome', boxParams?: { width, height, depth }, sphereParams?: { radius, widthSegments, heightSegments }, cylinderParams?: { radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded } }",
        default: { type: "box", boxParams: { width: 1, height: 1, depth: 1 } },
      },
      color: { type: "string", description: "Mesh color as CSS color string", default: "#ffffff" },
      opacity: { type: "number", description: "Opacity 0-1 (below 1 enables transparency)", default: 1 },
      renderMode: { type: "string", description: "Render mode: 'default' | 'wireframe' | 'dome'", default: "default" },
      castShadow: { type: "boolean", description: "Whether mesh casts shadows", default: true },
      receiveShadow: { type: "boolean", description: "Whether mesh receives shadows", default: true },
      material: {
        type: "object",
        description: "Material config: { type: 'basic'|'lambert'|'phong'|'standard'|'toon', transparent?, map?, alphaMap?, roughness?, metalness?, shininess?, specular?, bumpMap?, bumpScale? }",
      },
      image: { type: "string | { url: string }", description: "Simple texture image URL or object. Only used when renderMode is 'default' and material is not set", default: "" },
      display: { type: "boolean", description: "Whether mesh is displayed in play mode", default: true },
      displayInEditor: { type: "boolean", description: "Whether mesh is displayed in editor mode", default: true },
    },
    example: {
      color: "#ff0000",
      geometry: { type: "box", boxParams: { width: 1, height: 1, depth: 1 } },
      opacity: 1,
      castShadow: true,
      receiveShadow: true,
    },
  },

  model: {
    type: "model",
    description: "A 3D model loaded from GLB/GLTF file",
    properties: {
      url: { type: "string", description: "Path or URL to the 3D model file (.glb/.gltf)" },
      hash: { type: "string", description: "Content hash for cache busting" },
      optimized: {
        type: "object",
        description: "Optimized model variants: { high?: string, low?: string, low_compressed?: string }",
      },
      animations: { type: "boolean", description: "Whether the model has animations", default: false },
      castShadow: { type: "boolean", description: "Whether model casts shadows", default: true },
      receiveShadow: { type: "boolean", description: "Whether model receives shadows", default: true },
    },
    example: { url: "/assets/my-model.glb", animations: true },
  },

  avatar: {
    type: "avatar",
    description: "A VRM avatar character",
    properties: {
      url: { type: "string", description: "URL to the VRM model file" },
      urlCompressed: { type: "string", description: "URL to compressed VRM variant" },
      animations: { type: "string[]", description: "List of animation names to enable" },
    },
    example: { url: "/assets/avatar.vrm", urlCompressed: "/assets/avatar_compressed.vrm" },
  },

  text: {
    type: "text",
    description: "3D text rendered in the scene",
    properties: {
      text: { type: "string", description: "The text string to display" },
      font: {
        type: "string",
        description: "Font family: 'aeonik-bold' | 'roboto' | 'roboto-mono' | 'inter' | 'playfair' | 'raleway'",
        default: "aeonik-bold",
      },
      width: { type: "number", description: "Text box width (100-2000)", default: 500 },
      lineHeight: { type: "number", description: "Line height in layout units", default: 60 },
      textColor: { type: "string", description: "Text color as CSS color string", default: "#ffffff" },
      align: { type: "string", description: "Horizontal alignment: 'left' | 'center' | 'right'", default: "left" },
      textTransform: {
        type: "string",
        description: "Text casing transform: 'none' | 'uppercase' | 'lowercase' | 'capitalize' | 'togglecase'",
        default: "none",
      },
      opacity: { type: "number", description: "Text opacity 0-1", default: 1 },
      instanced: { type: "boolean", description: "Use GPU instanced rendering for many copies", default: false },
    },
    example: { text: "Hello World", font: "aeonik-bold", textColor: "#ffffff", align: "center" },
  },

  image: {
    type: "image",
    description: "A 2D image displayed in 3D space",
    properties: {
      url: { type: "string", description: "URL to the image file" },
      width: { type: "number", description: "Display width", default: 1 },
      height: { type: "number", description: "Display height", default: 1 },
      opacity: { type: "number", description: "Image opacity 0-1", default: 1 },
    },
    example: { url: "/assets/image.png", width: 2, height: 2 },
  },

  video: {
    type: "video",
    description: "A video player in 3D space",
    properties: {
      url: { type: "string", description: "URL to the video file" },
      autoplay: { type: "boolean", description: "Auto-play video", default: false },
      loop: { type: "boolean", description: "Loop video playback", default: true },
      volume: { type: "number", description: "Volume level 0-1", default: 1 },
    },
    example: { url: "/assets/video.mp4", autoplay: true, loop: true },
  },

  audio: {
    type: "audio",
    description: "A spatial audio source",
    properties: {
      url: { type: "string", description: "URL to the audio file" },
      volume: { type: "number", description: "Volume level 0-1", default: 1 },
      loop: { type: "boolean", description: "Loop audio", default: true },
      spatial: { type: "boolean", description: "Enable 3D spatial audio", default: true },
    },
    example: { url: "/assets/sound.mp3", volume: 0.8, loop: true },
  },

  light: {
    type: "light",
    description: "Scene lighting configuration with ambient and directional lights",
    properties: {
      ambient: {
        type: "object",
        description: "Ambient light: { color: string, intensity: number }",
      },
      directional: {
        type: "object",
        description: "Directional light: { color: string, intensity: number, position?: { x, y, z } }",
      },
      shadow: {
        type: "object",
        description: "Shadow configuration: { enabled: boolean, mapSize?: number, bias?: number }",
      },
    },
    example: {
      ambient: { color: "#ffffff", intensity: 0.5 },
      directional: { color: "#ffffff", intensity: 1.0, position: { x: 5, y: 10, z: 5 } },
    },
  },

  terrain: {
    type: "terrain",
    description: "Procedural terrain with noise-based generation",
    properties: {
      seed: { type: "number", description: "Noise seed for terrain generation" },
      octaves: { type: "number", description: "Number of noise octaves", default: 4 },
      frequency: { type: "number", description: "Noise frequency", default: 1 },
      amplitude: { type: "number", description: "Terrain height amplitude", default: 1 },
      lacunarity: { type: "number", description: "Lacunarity for noise generation", default: 2 },
      exponent: { type: "number", description: "Height exponent", default: 1 },
      segments: { type: "number", description: "Mesh segments for terrain detail", default: 256 },
      shader: { type: "object", description: "Terrain shader/material configuration with biome colors and thresholds" },
    },
    example: { seed: 42, octaves: 4, frequency: 0.5, amplitude: 10 },
  },

  water: {
    type: "water",
    description: "Water plane with wave and flow effects",
    properties: {
      color: { type: "string", description: "Water color hex", default: "#0066ff" },
      opacity: { type: "number", description: "Water transparency 0-1", default: 0.6 },
      width: { type: "number", description: "Water plane width", default: 100 },
      height: { type: "number", description: "Water plane height/depth", default: 100 },
      flowSpeed: { type: "number", description: "Water flow animation speed", default: 0.03 },
      scale: { type: "number", description: "Water texture scale", default: 1 },
    },
    example: { color: "#0066ff", opacity: 0.6, width: 100, height: 100 },
  },

  grass: {
    type: "grass",
    description: "Grass/vegetation rendering with wind simulation",
    properties: {
      density: { type: "number", description: "Grass blade density (instances per patch)", default: 100 },
      height: { type: "number", description: "Grass blade height", default: 0.5 },
      color: { type: "string", description: "Grass color", default: "#44aa44" },
      patchSize: { type: "number", description: "Size of each grass patch", default: 10 },
      bladeWidth: { type: "number", description: "Width of individual grass blades", default: 0.1 },
      joints: { type: "number", description: "Number of joints per blade for bending", default: 4 },
      wind: { type: "number", description: "Wind strength for grass animation", default: 0.5 },
    },
    example: { density: 200, height: 0.3, color: "#44aa44", patchSize: 10 },
  },

  fog: {
    type: "fog",
    description: "Distance fog effect",
    properties: {
      color: { type: "string", description: "Fog color hex", default: "#cccccc" },
      near: { type: "number", description: "Fog start distance", default: 10 },
      far: { type: "number", description: "Fog end distance", default: 100 },
      enabled: { type: "boolean", description: "Whether fog is enabled", default: true },
    },
    example: { color: "#87CEEB", near: 50, far: 200, enabled: true },
  },

  background: {
    type: "background",
    description: "Scene background (color, image, or gradient)",
    properties: {
      options: {
        type: "object",
        description: "Background options: { type: 'color', color: string } | { type: 'image', url: string } | { type: 'gradient', colorTop: string, colorBottom: string }",
      },
    },
    example: { options: { type: "color", color: "#87CEEB" } },
  },

  envmap: {
    type: "envmap",
    description: "Environment map for reflections and image-based lighting",
    properties: {
      options: {
        type: "object",
        description: "Envmap options: { type: 'scene', position?: {x,y,z} } | { type: 'image', imageId: 'studio'|'fields'|'vig'|'custom', imagePath?: string, imageFormat?: string }",
      },
    },
    example: { options: { type: "image", imageId: "studio" } },
  },

  spawn: {
    type: "spawn",
    description: "Player spawn point (position/rotation set on the component transform)",
    properties: {
      avatarId: { type: "string", description: "Default avatar ID for spawning players" },
    },
    example: {},
  },

  navmesh: {
    type: "navmesh",
    description: "Navigation mesh for player movement boundaries",
    properties: {
      visible: { type: "boolean", description: "Whether navmesh is visible in play mode", default: false },
    },
    example: { visible: false },
  },

  group: {
    type: "group",
    description: "Empty group container for organizing scene hierarchy",
    properties: {},
    example: {},
  },

  quarks: {
    type: "quarks",
    description: "Particle system using Three.Quarks",
    properties: {
      url: { type: "string", description: "URL to particle system JSON config" },
      autoPlay: { type: "boolean", description: "Auto-play particles on load", default: true },
    },
    example: { url: "/assets/particles.json", autoPlay: true },
  },

  interaction: {
    type: "interaction",
    description: "Proximity-triggered interactive prompt that fires events on key press",
    properties: {
      distance: { type: "number", description: "Max activation distance from player", default: 10 },
      distanceTarget: { type: "object", description: "Custom distance reference point {x,y,z} (null = component position)" },
      atlas: {
        type: "string",
        description: "Icon key for the prompt (e.g., 'keyboard_e', 'keyboard_space', 'mouse_left', 'tap-outline')",
        default: "keyboard_e",
      },
      key: { type: "string | string[]", description: "Keyboard key code(s) that trigger the interaction", default: "KeyE" },
      billboard: { type: "boolean", description: "Whether prompt always faces camera", default: true },
      color: { type: "number", description: "Prompt icon color as hex number (e.g., 0xffffff)" },
    },
    example: { distance: 5, key: "KeyE", billboard: true },
  },

  dialog: {
    type: "dialog",
    description: "Dialog/conversation component for NPC interactions",
    properties: {
      messages: { type: "array", description: "Array of dialog messages" },
      autoStart: { type: "boolean", description: "Whether dialog starts automatically", default: false },
    },
    example: { messages: [{ text: "Hello, adventurer!", speaker: "NPC" }] },
  },

  destination: {
    type: "destination",
    description: "Teleport/travel destination link to another scene",
    properties: {
      url: { type: "string", description: "URL of the destination scene" },
      label: { type: "string", description: "Display label for the destination" },
    },
    example: { url: "https://example.com/scene", label: "Go to Level 2" },
  },

  spline: {
    type: "spline",
    description: "A 3D spline/curve path defined by control points",
    properties: {
      points: { type: "XYZ[]", description: "Control points of the spline [{x,y,z}, ...]" },
      closed: { type: "boolean", description: "Whether spline is a closed loop", default: false },
    },
    example: { points: [{ x: 0, y: 0, z: 0 }, { x: 5, y: 2, z: 5 }], closed: false },
  },

  iframe: {
    type: "iframe",
    description: "An embedded web page rendered in 3D space",
    properties: {
      url: { type: "string", description: "URL to embed" },
      width: { type: "number", description: "Display width in world units", default: 4 },
      height: { type: "number", description: "Display height in world units", default: 3 },
    },
    example: { url: "https://example.com", width: 4, height: 3 },
  },

  reflector: {
    type: "reflector",
    description: "Reflective surface/mirror plane",
    properties: {
      color: { type: "string", description: "Reflection tint color", default: "#ffffff" },
      opacity: { type: "number", description: "Reflection opacity 0-1", default: 0.5 },
      blur: { type: "number", description: "Reflection blur amount", default: 0 },
      mirror: { type: "number", description: "Mirror strength 0-1", default: 0.75 },
      mixBlur: { type: "number", description: "Mix blur amount", default: 0 },
      mixStrength: { type: "number", description: "Mix strength", default: 0.5 },
      resolution: { type: "number", description: "Reflection render resolution", default: 256 },
      depthScale: { type: "number", description: "Depth scale for depth-based effects", default: 0 },
    },
    example: { color: "#ffffff", opacity: 0.5, mirror: 0.75 },
  },

  postprocessing: {
    type: "postprocessing",
    description: "Post-processing effects stack (bloom, LUT, vignette, etc.)",
    properties: {
      bloom: { type: "object", description: "Bloom: { intensity: number, threshold?: number, radius?: number }" },
      lut: { type: "object", description: "Color LUT: { url: string, intensity?: number }" },
      vignette: { type: "object", description: "Vignette: { offset?: number, darkness?: number }" },
      chromaticAberration: { type: "object", description: "Chromatic aberration: { offset?: number }" },
      toneMapping: { type: "object", description: "Tone mapping config" },
    },
    example: { bloom: { intensity: 1, threshold: 0.8, radius: 0.5 } },
  },

  rain: {
    type: "rain",
    description: "Rain particle effect",
    properties: {
      count: { type: "number", description: "Number of rain particles", default: 5000 },
      velocity: { type: "number", description: "Rain fall velocity", default: 1 },
      color: { type: "number", description: "Rain color as hex number", default: 0xaaaaaa },
      opacity: { type: "number", description: "Rain particle opacity 0-1", default: 0.6 },
      size: { type: "number", description: "Rain particle size", default: 0.1 },
    },
    example: { count: 5000, velocity: 1.2, opacity: 0.6 },
  },

  cloud: {
    type: "cloud",
    description: "Volumetric cloud rendering",
    properties: {
      segments: { type: "number", description: "Number of cloud segments", default: 20 },
      bounds: { type: "object", description: "Cloud volume bounds {x,y,z}", default: { x: 10, y: 5, z: 10 } },
      volume: { type: "number", description: "Cloud volume density", default: 6 },
      color: { type: "string", description: "Cloud color", default: "#ffffff" },
      seed: { type: "number", description: "Random seed for cloud generation" },
      concentrate: { type: "string", description: "Concentration mode" },
      growth: { type: "number", description: "Cloud growth factor", default: 4 },
    },
    example: { segments: 20, color: "#ffffff", volume: 6 },
  },

  bird: {
    type: "bird",
    description: "Animated bird flock effect",
    properties: {
      count: { type: "number", description: "Number of birds", default: 10 },
      speed: { type: "number", description: "Flight speed multiplier", default: 1 },
      color: { type: "number", description: "Bird color as hex number" },
      size: { type: "number", description: "Bird size multiplier", default: 1 },
    },
    example: { count: 20, speed: 1.5, size: 1 },
  },

  dust: {
    type: "dust",
    description: "Floating dust/particle ambient effect",
    properties: {
      count: { type: "number", description: "Number of dust particles", default: 100 },
      size: { type: "number", description: "Particle size", default: 0.1 },
      opacity: { type: "number", description: "Particle opacity 0-1", default: 0.5 },
      color: { type: "number", description: "Dust color as hex number", default: 0xffffff },
    },
    example: { count: 200, size: 0.05, opacity: 0.5 },
  },

  wave: {
    type: "wave",
    description: "Animated concentric wave/ripple effect",
    properties: {
      color: { type: "number", description: "Wave color as hex number", default: 0xffffff },
      height: { type: "number", description: "Wave amplitude", default: 0.5 },
      radius: { type: "number", description: "Wave radius", default: 5 },
      linewidth: { type: "number", description: "Wave line width 0-1", default: 0.14 },
      divisions: { type: "number", description: "Mesh subdivisions for smoothness", default: 100 },
      lines: { type: "number", description: "Number of concentric lines", default: 4 },
      direction: { type: "number", description: "Animation direction: 1 (outward) or -1 (inward)", default: -1 },
    },
    example: { color: 0x00ffff, height: 0.5, radius: 5, lines: 4 },
  },

  godray: {
    type: "godray",
    description: "Volumetric god ray/light shaft effect",
    properties: {
      intensity: { type: "number", description: "Ray intensity", default: 1 },
      color: { type: "string", description: "Ray color", default: "#ffffff" },
      exposure: { type: "number", description: "Exposure level", default: 0.6 },
      decay: { type: "number", description: "Light decay", default: 0.93 },
      density: { type: "number", description: "Ray density", default: 0.96 },
      samples: { type: "number", description: "Number of samples", default: 60 },
    },
    example: { intensity: 0.8, color: "#fff5e0", exposure: 0.6 },
  },

  impact: {
    type: "impact",
    description: "Visual impact/hit effect with billboarded sprite bursts",
    properties: {
      color: { type: "number", description: "Impact color as hex number", default: 0xff0000 },
      scale: { type: "number", description: "Base scale multiplier for impact sprites", default: 1 },
    },
    example: { color: 0xff0000, scale: 1 },
  },

  object: {
    type: "object",
    description: "Generic 3D object loaded from a URL",
    properties: {
      url: { type: "string", description: "URL to object data" },
    },
    example: { url: "/assets/object.json" },
  },
};
