// @ts-check

import {
  Component3D,
  DataChangeOpts,
} from "../../abstract/component-3d";
import { BoxGeometry, Color } from "three";
import PipeLineMesh from "../../../internal/pipeline/pipeline-mesh";
import {
  disposeMaterial,
  disposeThreeResources,
} from "../../../internal/utils/dispose";
import { imageUrl, MeshComponentData } from "./mesh-data";
import {
  IS_EDIT_MODE,
  SET_SHADOW_NEEDS_UPDATE,
} from "../../../internal/constants";

export type {
  MeshComponentData,
  BoxParamsData,
  CylinderParamsData,
  SphereParamsData,
  MeshGeometryData,
} from "./mesh-data";

import { MeshBasicMaterial, MeshLambertMaterial } from "../../../internal/xtend";
import MeshToonMaterial from "../../../internal/rendering/materials/toon";
import MeshOutlineMaterial from "../../../internal/rendering/materials/outline";
import {
  GlitchBasic,
  GlitchLambert,
} from "../../../internal/rendering/materials/glitch";
import {
  GhostBasic,
  GhostLambert,
} from "../../../internal/rendering/materials/ghost";

import { Subsystems } from "../../../internal/subsystems";
import { createMeshGeometry, getMeshColliderType } from "./create-geometry";
import { VisualPluginRegistry } from "../visual-plugin-registry";

/**
 * @public
 *
 * Component for displaying primitive geometry meshes in the scene.
 * Supports box, sphere, cylinder, plane, and dome shapes with configurable
 * materials, textures, opacity, and render modes.
 *
 * Uses the engine's pipeline material system with support for visual plugins,
 * consistent with how model and avatar components render.
 *
 * Physics colliders are automatically matched to the geometry shape when
 * a collider is configured — box geometry uses a box collider, sphere uses
 * sphere, and cylinders with equal radii use a cylinder collider.
 *
 * See {@link MeshComponentData} for the full data schema.
 *
 * @example
 * // Basic red box
 * const box = await space.components.create({
 *   type: "mesh",
 *   geometry: {
 *     type: "box",
 *     boxParams: { width: 2, height: 1, depth: 3 },
 *     sphereParams: { radius: 1, widthSegments: 32, heightSegments: 32 },
 *     cylinderParams: { radiusTop: 1, radiusBottom: 1, height: 1, radialSegments: 32, heightSegments: 1, openEnded: false }
 *   },
 *   color: "#ff0000",
 *   position: { x: 0, y: 1, z: 0 }
 * });
 *
 * @example
 * // Wireframe cylinder
 * const wireframe = await space.components.create({
 *   type: "mesh",
 *   geometry: {
 *     type: "cylinder",
 *     boxParams: { width: 1, height: 1, depth: 1 },
 *     sphereParams: { radius: 1, widthSegments: 32, heightSegments: 32 },
 *     cylinderParams: { radiusTop: 0.5, radiusBottom: 1, height: 3, radialSegments: 16, heightSegments: 1, openEnded: false }
 *   },
 *   color: "#00ff00",
 *   wireframe: true
 * });
 */
export class MeshComponent extends Component3D<MeshComponentData> {
  /**
   * The pipeline mesh instance created and managed by this component.
   */
  mesh: PipeLineMesh = null;

  private _resolvedPlugins: any[] = [];

  /** @internal */
  protected async init() {
    //
    const runtime = this.space.options?.runtime ?? "web";

    if (runtime === "web" && this.data.plugins?.length) {
      const { resolvePlugins } = await import(
        "../../../internal/rendering/libraries/resolve-plugins"
      );
      this._resolvedPlugins = resolvePlugins(this.data.plugins);
    } else {
      this._resolvedPlugins = [];
    }

    this.mesh = new PipeLineMesh(
      new BoxGeometry(),
      new MeshBasicMaterial({ side: 2 }),
      {
        occlusionMaterial: new MeshBasicMaterial({ color: 0x000000, side: 2 }),
      },
    );

    this.mesh.visible = this.data.display;

    this.add(this.mesh);

    this._updateGeometry();
    this._createPipelineMaterials();
    this._applyMaterialProps();
    this._updateImage();

    const castShadow = this.data.castShadow ?? true;
    const receiveShadow = this.data.receiveShadow ?? true;
    this.mesh.castShadow = castShadow;
    this.mesh.receiveShadow = receiveShadow;

    if (IS_EDIT_MODE) {
      this.mesh.visible = this.data.displayInEditor;
    } else {
      this.mesh.visible = this.data.display;
    }
  }

  private _updateGeometry() {
    //
    this.mesh.geometry?.dispose();
    this.mesh.geometry = createMeshGeometry(this.data.geometry);
    return this.mesh.geometry;
  }

  private _createPipelineMaterials() {
    const plugins = this._resolvedPlugins;
    const renderMode = this.data.renderMode ?? "default";
    const wireframe = this.data.wireframe ?? false;

    // Dispose old materials
    if (this.mesh.material) {
      disposeMaterial(this.mesh.material);
    }

    let diffuseMaterial: any;
    let lightingMaterial: any;

    switch (renderMode) {
      case "toon": {
        const toonMat = new MeshToonMaterial({ plugins });
        const outlineMat = new MeshOutlineMaterial({ plugins });
        diffuseMaterial = [toonMat, outlineMat];
        lightingMaterial = [toonMat, outlineMat];

        // Set up geometry groups for toon (2 materials: toon + outline)
        const geo = this.mesh.geometry;
        const count =
          geo.index?.count ?? geo.attributes.position?.count ?? 0;
        geo.groups = [
          { start: 0, count, materialIndex: 0 },
          { start: 0, count, materialIndex: 1 },
        ];
        break;
      }
      case "glitch": {
        diffuseMaterial = new GlitchBasic({ plugins });
        lightingMaterial = new GlitchLambert({ plugins });
        this.mesh.geometry.groups = [];
        break;
      }
      case "ghost":
      case "error": {
        const params = {
          uniforms: {
            rimPower: {
              value: renderMode === "error" ? 0.5 : 1.0,
            },
            minAlpha: {
              value: renderMode === "error" ? 0.2 : 0.05,
            },
          },
          plugins,
        };
        diffuseMaterial = new GhostBasic(params);
        lightingMaterial = new GhostLambert(params);

        diffuseMaterial.transparent = true;
        lightingMaterial.transparent = true;
        diffuseMaterial.side = 0;
        lightingMaterial.side = 0;

        if (renderMode === "error") {
          diffuseMaterial.color.setHex(0xff0000);
          lightingMaterial.color.setHex(0xff0000);
        }

        this.mesh.geometry.groups = [];
        break;
      }
      default: {
        diffuseMaterial = new MeshBasicMaterial({ side: 2, plugins });
        lightingMaterial = new MeshLambertMaterial({ side: 2, plugins });
        this.mesh.geometry.groups = [];
        break;
      }
    }

    // Apply wireframe
    if (wireframe) {
      if (Array.isArray(diffuseMaterial)) {
        diffuseMaterial.forEach((m: any) => (m.wireframe = true));
      } else {
        diffuseMaterial.wireframe = true;
      }
      if (Array.isArray(lightingMaterial)) {
        lightingMaterial.forEach((m: any) => (m.wireframe = true));
      } else {
        lightingMaterial.wireframe = true;
      }
    }

    const occlusionMaterial = new MeshBasicMaterial({
      color: 0x000000,
      side: 2,
    });

    this.mesh.updateMaterials(diffuseMaterial, {
      occlusionMaterial,
      lightingMaterial,
    });
  }

  private _applyMaterialProps() {
    const renderMode = this.data.renderMode ?? "default";

    // ghost/error handle their own color & transparency
    if (renderMode === "ghost" || renderMode === "error") return;

    const applyToMat = (mat: any) => {
      if (!mat || !mat.color) return;
      mat.color.set(this.data.color);
      mat.opacity = this.data.opacity;

      const transparent = this.data.opacity < 1;
      if (transparent !== mat.transparent) {
        mat.transparent = transparent;
        mat.needsUpdate = true;
      }
    };

    const material = this.mesh.material;
    if (Array.isArray(material)) {
      material.forEach(applyToMat);
    } else {
      applyToMat(material);
    }

    // Also apply to lighting materials if different
    const lightingMats = (this.mesh as any).lightingMaterials;
    if (lightingMats && lightingMats.material !== material) {
      const lm = lightingMats.material;
      if (Array.isArray(lm)) {
        lm.forEach(applyToMat);
      } else {
        applyToMat(lm);
      }
    }
  }

  private async _updateImage() {
    const material = this.mesh.material;
    const url = imageUrl(this.data.image);

    // Get the current map's url to check if it changed
    const currentMat = Array.isArray(material) ? material[0] : material;
    const prevUrl = currentMat?.map?.userData?.url;

    if (prevUrl === url) return;

    // Dispose old map
    if (currentMat?.map) {
      currentMat.map.dispose();
    }

    if (!url) {
      const setMap = (mat: any) => {
        if (!mat) return;
        mat.map = null;
        mat.needsUpdate = true;
      };
      if (Array.isArray(material)) {
        material.forEach(setMap);
      } else {
        setMap(material);
      }
      return;
    }

    try {
      const texture = await Subsystems.textures.loadTexture(url);
      // Check if image hasn't changed during async load
      if (url !== imageUrl(this.data.image)) return;
      texture.userData.url = url;

      const setMap = (mat: any) => {
        if (!mat) return;
        mat.map = texture;
        mat.needsUpdate = true;
      };

      const mat = this.mesh.material;
      if (Array.isArray(mat)) {
        mat.forEach(setMap);
      } else {
        setMap(mat);
      }

      // Also set on lighting materials
      const lightingMats = (this.mesh as any).lightingMaterials;
      if (lightingMats && lightingMats.material !== mat) {
        const lm = lightingMats.material;
        if (Array.isArray(lm)) {
          lm.forEach(setMap);
        } else {
          setMap(lm);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * @internal
   * Check if two plugin descriptor arrays have the same plugin ids in the same order.
   */
  private _isSamePluginStructure(prev: any, current: any): boolean {
    if (!prev || !current) return false;
    if (!Array.isArray(prev) || !Array.isArray(current)) return false;
    if (prev.length !== current.length) return false;
    for (let i = 0; i < prev.length; i++) {
      if (prev[i]?.id !== current[i]?.id) return false;
    }
    return true;
  }

  /**
   * @internal
   * Update plugin uniforms in-place on existing materials without rebuilding.
   */
  private _liveUpdatePluginUniforms() {
    if (!this.data.plugins) return;

    const uniformUpdates: Record<string, any> = {};
    for (const descriptor of this.data.plugins as any[]) {
      const Cls = VisualPluginRegistry.get(descriptor.id);
      if (!Cls) continue;

      const plugin = new Cls(descriptor);
      if (!plugin.uniforms) continue;

      for (const [name, uniform] of Object.entries(plugin.uniforms)) {
        uniformUpdates[name] = (uniform as any).value;
      }
    }

    // Update uniforms on the mesh's materials
    const updateMat = (mat: any) => {
      if (!mat?.uniforms) return;
      for (const [name, value] of Object.entries(uniformUpdates)) {
        const existing = mat.uniforms[name];
        if (!existing) continue;
        if (value instanceof Color && existing.value instanceof Color) {
          existing.value.copy(value);
        } else {
          existing.value = value;
        }
      }
    };

    const material = this.mesh.material;
    if (Array.isArray(material)) {
      material.forEach(updateMat);
    } else {
      updateMat(material);
    }

    const lightingMats = (this.mesh as any).lightingMaterials;
    if (lightingMats && lightingMats.material !== material) {
      const lm = lightingMats.material;
      if (Array.isArray(lm)) {
        lm.forEach(updateMat);
      } else {
        updateMat(lm);
      }
    }
  }

  /** @internal */
  getCollisionMesh() {
    return this.mesh;
  }

  /**
   * @internal
   */
  _getCollisionInfo<T>(opts: T): T {
    const colliderType =
      (opts as any).colliderType ??
      getMeshColliderType(this.data.geometry, this.mesh.geometry);

    return super._getCollisionInfo({
      ...opts,
      colliderType,
    } as T);
  }

  /**
   * @internal
   */
  async onDataChange(opts: DataChangeOpts<MeshComponentData>) {
    //
    if (opts?.prev?.geometry !== this.data.geometry) {
      this._updateGeometry();
    }

    const renderModeChanged =
      opts.prev?.renderMode != this.data.renderMode;
    const wireframeChanged =
      opts.prev?.wireframe != this.data.wireframe;
    const pluginsChanged =
      opts.prev?.plugins !== this.data.plugins;

    // Check if full pipeline rebuild is needed
    if (renderModeChanged || wireframeChanged || pluginsChanged) {
      // If only plugin parameters changed (same ids, same order),
      // update uniforms in-place without rebuilding materials.
      if (
        pluginsChanged &&
        !renderModeChanged &&
        !wireframeChanged &&
        this._isSamePluginStructure(opts.prev?.plugins, this.data.plugins)
      ) {
        this._liveUpdatePluginUniforms();
      } else {
        // Full rebuild: re-resolve plugins and recreate pipeline materials
        if (pluginsChanged) {
          const runtime = this.space.options?.runtime ?? "web";
          if (runtime === "web" && this.data.plugins?.length) {
            const { resolvePlugins } = await import(
              "../../../internal/rendering/libraries/resolve-plugins"
            );
            this._resolvedPlugins = resolvePlugins(this.data.plugins);
          } else {
            this._resolvedPlugins = [];
          }
        }

        this._createPipelineMaterials();
        this._applyMaterialProps();
        this._updateImage();
      }
    }

    // Check if only material properties changed (color, opacity, image)
    if (
      !renderModeChanged &&
      !wireframeChanged &&
      !pluginsChanged
    ) {
      if (
        opts.prev?.color != this.data.color ||
        opts.prev?.opacity != this.data.opacity
      ) {
        this._applyMaterialProps();
      }

      if (imageUrl(opts.prev?.image) != imageUrl(this.data.image)) {
        this._updateImage();
      }
    }

    const castShadow = this.data.castShadow ?? true;
    const receiveShadow = this.data.receiveShadow ?? true;
    if (
      castShadow !== this.mesh.castShadow ||
      receiveShadow !== this.mesh.receiveShadow
    ) {
      this.mesh.castShadow = castShadow;
      this.mesh.receiveShadow = receiveShadow;
      SET_SHADOW_NEEDS_UPDATE(true);
    }

    if (IS_EDIT_MODE) {
      this.mesh.visible = this.data.displayInEditor;
    } else {
      this.mesh.visible = this.data.display;
    }
  }

  /** @internal */
  protected dispose() {
    disposeThreeResources(this.mesh);
  }
}
