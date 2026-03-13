import {
    Texture,
    SRGBColorSpace,
    LinearFilter,
    LinearMipmapLinearFilter,
} from "three";
import type {
    GuiFolderDescriptor,
    GuiValueBinding,
} from "../../../gui-types";
import type { ParticlesComponent } from "../particles-component";
import InstancedBasic from "../../../../internal/rendering/materials/instancedbasic";
import InstancedStandard from "../../../../internal/rendering/materials/instancedstandard";
import type {
    ParticleBehavior,
    BehaviorConfig,
    ParticleSpawnData,
    SpawnContext,
    RebuildHint,
} from "../particle-behavior";
import { AssetResolver } from "../../../../internal/assets";

export class MaterialBehavior implements ParticleBehavior {
    static behaviorName = "material";
    static label = "Material";
    static defaults: BehaviorConfig = {
        color: 0xffffff,
        useEmissiveColor: false,
        emissiveColor: 0xffffff,
        emissiveForce: 1,
        mode: "Standard",
        roughness: 0.9,
        metalness: 0.1,
        envMapIntensity: 0.5,
        blending: 1,
        depthTest: true,
        depthWrite: true,
        transparent: false,
        opacity: 1,
        alphaTest: 0.5,
        shadowAlphaTest: 0.5,
        side: 2,
        forceSinglePass: true,
        image: null,
        textureFilter: LinearMipmapLinearFilter,
        imageUseAtlas: false,
        imageAtlasSize: { x: 1, y: 1 },
        imageNormal: null,
        imageRoughness: null,
        normalScale: { x: 0.3, y: 0.3 },
    };

    private plugin: any = null;
    private texture: Texture | null = null;
    private normalTexture: Texture | null = null;
    private roughnessTexture: Texture | null = null;
    private lastImageUrl: string | null = null;
    private lastNormalUrl: string | null = null;
    private lastRoughnessUrl: string | null = null;

    constructor(
        private host: ParticlesComponent,
        private config: BehaviorConfig
    ) {}

    getPlugin(): any {
        const cfg = this.config;

        const plugin: any = {
            name: "ParticleMaterialPlugin",
            uniforms: {
                alphaTestShadow: {
                    value: cfg.shadowAlphaTest ?? MaterialBehavior.defaults.shadowAlphaTest,
                },
            },
            vertexShaderHooks: {
                prefix: `
                    #if defined(ATLAS) && defined(USE_MAP)
                        attribute vec4 atlas;
                    #endif
                `,
                main: ``,
                suffix: `
                    #if defined(ATLAS) && defined(USE_MAP)
                        vMapUv =  atlas.xy + atlas.zw * vMapUv;
                    #endif
                `,
            },
            fragmentShaderHooks: {
                prefix: `
                    #ifdef SHADOW
                        uniform float alphaTestShadow;
                    #endif
                `,
                suffix: ``,
            },
            defines: [] as any,
        };

        if (cfg.imageUseAtlas) {
            plugin.defines["ATLAS"] = "";
        }

        this.plugin = plugin;
        return plugin;
    }

    getMaterialConstructors(): Record<string, any> {
        const cfg = this.config;
        const isStandard = cfg.mode === "Standard";

        return {
            diffuseMaterial: InstancedBasic,
            occlusionMaterial: InstancedBasic,
            lightingMaterial: isStandard ? InstancedStandard : InstancedBasic,
            lightingOcclusionMaterial: isStandard ? InstancedStandard : InstancedBasic,
        };
    }

    getGeometryOptions(): Record<string, any> | null {
        const cfg = this.config;
        if (cfg.imageUseAtlas) {
            return { atlas: true };
        }
        return null;
    }

    applySpawnData(data: ParticleSpawnData, _context: SpawnContext): void {
        const cfg = this.config;
        if (cfg.imageUseAtlas) {
            const atlasSize = cfg.imageAtlasSize ?? MaterialBehavior.defaults.imageAtlasSize;
            const rdmX = Math.ceil(Math.random() * atlasSize.x) - 1;
            const rdmY = Math.ceil(Math.random() * atlasSize.y) - 1;
            data.atlas = this._getAtlasData(rdmX, rdmY, atlasSize.x, atlasSize.y);
        }
    }

    async setupMaterial(mesh: any): Promise<void> {
        if (mesh == null) return;

        const cfg = this.config;

        // Load main texture
        if (cfg.image?.url != null) {
            if (this.lastImageUrl !== cfg.image.url) {
                this.texture = new Texture();
                this.texture.colorSpace = SRGBColorSpace;
                const tex = this.texture;
                this._loadImage(cfg.image.url).then((rawImage) => {
                    if (rawImage) {
                        tex.image = rawImage;
                        tex.needsUpdate = true;
                    }
                });
            }
            this.lastImageUrl = cfg.image.url;
        } else {
            this.texture = null;
            this.lastImageUrl = null;
        }

        if (this.texture) {
            this.texture.minFilter =
                cfg.textureFilter ?? MaterialBehavior.defaults.textureFilter;
            this.texture.needsUpdate = true;
        }

        // Load normal texture
        if (cfg.imageNormal?.url != null) {
            if (this.lastNormalUrl !== cfg.imageNormal.url) {
                this.normalTexture = new Texture();
                const tex = this.normalTexture;
                this._loadImage(cfg.imageNormal.url).then((rawImage) => {
                    if (rawImage) {
                        tex.image = rawImage;
                        tex.needsUpdate = true;
                    }
                });
            }
            this.lastNormalUrl = cfg.imageNormal.url;
        } else {
            this.normalTexture = null;
            this.lastNormalUrl = null;
        }

        // Load roughness texture
        if (cfg.imageRoughness?.url != null) {
            if (this.lastRoughnessUrl !== cfg.imageRoughness.url) {
                this.roughnessTexture = new Texture();
                const tex = this.roughnessTexture;
                this._loadImage(cfg.imageRoughness.url).then((rawImage) => {
                    if (rawImage) {
                        tex.image = rawImage;
                        tex.needsUpdate = true;
                    }
                });
            }
            this.lastRoughnessUrl = cfg.imageRoughness.url;
        } else {
            this.roughnessTexture = null;
            this.lastRoughnessUrl = null;
        }

        // Apply to all material variants
        this._updateMaterialSettings(mesh.lightingMaterials?.material);
        this._updateMaterialSettings(
            mesh.lightingMaterials?.occlusionMaterial,
            true
        );
        this._updateMaterialSettings(mesh.diffuseMaterials?.material);
        this._updateMaterialSettings(
            mesh.diffuseMaterials?.occlusionMaterial,
            true
        );

        // Update shadow alpha test uniform
        if (this.plugin) {
            this.plugin.uniforms.alphaTestShadow.value =
                cfg.shadowAlphaTest ?? MaterialBehavior.defaults.shadowAlphaTest;
        }
    }

    onConfigChange(config: BehaviorConfig, prev: BehaviorConfig): RebuildHint {
        this.config = config;
        if (
            config.imageUseAtlas !== prev.imageUseAtlas ||
            config.mode !== prev.mode ||
            config.forceSinglePass !== prev.forceSinglePass ||
            config.imageAtlasSize?.x !== prev.imageAtlasSize?.x ||
            config.imageAtlasSize?.y !== prev.imageAtlasSize?.y
        ) {
            return "rebuild";
        }
        return "material";
    }

    getGUI(dataBinding: GuiValueBinding): GuiFolderDescriptor {
        const opts = [...dataBinding, "options"];
        const isStandard = () => this.config.mode === "Standard";
        const hasEmissive = () => this.config.useEmissiveColor === true;
        const hasAtlas = () => this.config.imageUseAtlas === true;

        return {
            type: "folder",
            label: MaterialBehavior.label,
            children: {
                color: {
                    type: "color",
                    label: "Color",
                    value: [...opts, "color"],
                },
                useEmissiveColor: {
                    type: "checkbox",
                    label: "Use Bloom Emissive",
                    value: [...opts, "useEmissiveColor"],
                },
                emissiveColor: {
                    type: "color",
                    label: "Bloom Emissive Color",
                    value: [...opts, "emissiveColor"],
                    visible: hasEmissive,
                },
                emissiveForce: {
                    type: "number",
                    label: "Emissive Force",
                    value: [...opts, "emissiveForce"],
                    step: 0.01,
                    min: 0,
                    max: 10,
                    visible: hasEmissive,
                },
                mode: {
                    type: "select",
                    label: "Mode",
                    value: [...opts, "mode"],
                    items: [
                        { id: "Unlit", label: "Unlit" },
                        { id: "Standard", label: "Standard" },
                    ],
                    mode: "buttons",
                },
                roughness: {
                    type: "number",
                    label: "Roughness",
                    value: [...opts, "roughness"],
                    step: 0.01,
                    min: 0,
                    max: 1,
                    visible: isStandard,
                },
                metalness: {
                    type: "number",
                    label: "Metalness",
                    value: [...opts, "metalness"],
                    step: 0.01,
                    min: 0,
                    max: 1,
                    visible: isStandard,
                },
                envMapIntensity: {
                    type: "number",
                    label: "Env Map Intensity",
                    value: [...opts, "envMapIntensity"],
                    step: 0.01,
                    min: 0,
                    max: 1,
                    visible: isStandard,
                },
                blending: {
                    type: "select",
                    label: "Blending",
                    value: [...opts, "blending"],
                    items: [
                        { id: 1, label: "Normal" },
                        { id: 2, label: "Additive" },
                        { id: 3, label: "Subtractive" },
                        { id: 4, label: "Multiply" },
                    ],
                },
                depthTest: {
                    type: "checkbox",
                    label: "Depth Test",
                    value: [...opts, "depthTest"],
                },
                depthWrite: {
                    type: "checkbox",
                    label: "Depth Write",
                    value: [...opts, "depthWrite"],
                },
                transparent: {
                    type: "checkbox",
                    label: "Transparent",
                    value: [...opts, "transparent"],
                },
                opacity: {
                    type: "number",
                    label: "Opacity",
                    value: [...opts, "opacity"],
                    step: 0.01,
                    min: 0,
                    max: 1,
                },
                alphaTest: {
                    type: "number",
                    label: "Alpha Test",
                    value: [...opts, "alphaTest"],
                    step: 0.01,
                    min: 0,
                    max: 1,
                },
                shadowAlphaTest: {
                    type: "number",
                    label: "Shadow Alpha Test",
                    value: [...opts, "shadowAlphaTest"],
                    step: 0.01,
                    min: 0,
                    max: 1,
                },
                side: {
                    type: "number",
                    label: "Side",
                    value: [...opts, "side"],
                    step: 1,
                    min: 0,
                    max: 2,
                },
                forceSinglePass: {
                    type: "checkbox",
                    label: "Force Single Pass",
                    value: [...opts, "forceSinglePass"],
                },
                image: {
                    type: "resource",
                    label: "Image",
                    value: [...opts, "image"],
                    typeof: "image",
                },
                textureFilter: {
                    type: "select",
                    label: "Texture Filter",
                    value: [...opts, "textureFilter"],
                    items: [
                        {
                            id: LinearMipmapLinearFilter,
                            label: "LinearMipmapLinearFilter",
                        },
                        { id: LinearFilter, label: "LinearFilter" },
                    ],
                },
                imageUseAtlas: {
                    type: "checkbox",
                    label: "Image Use Atlas",
                    value: [...opts, "imageUseAtlas"],
                },
                imageAtlasSize: {
                    type: "xyz",
                    label: "Image Atlas Size",
                    value: [...opts, "imageAtlasSize"],
                    step: 1,
                    min: 1,
                    max: 32,
                    visible: hasAtlas,
                },
                imageNormal: {
                    type: "resource",
                    label: "Normal Map",
                    value: [...opts, "imageNormal"],
                    typeof: "image",
                    visible: isStandard,
                },
                imageRoughness: {
                    type: "resource",
                    label: "Roughness Map",
                    value: [...opts, "imageRoughness"],
                    typeof: "image",
                    visible: isStandard,
                },
                normalScale: {
                    type: "xyz",
                    label: "Normal Scale",
                    value: [...opts, "normalScale"],
                    step: 0.01,
                    visible: isStandard,
                },
            },
        };
    }

    dispose() {
        this.plugin = null;
        this.texture = null;
        this.normalTexture = null;
        this.roughnessTexture = null;
    }

    // ── Private helpers ──

    private _getAtlasData(
        x: number,
        y: number,
        sizeX: number,
        sizeY: number
    ) {
        const cellWidth = 1 / sizeX;
        const cellHeight = 1 / sizeY;
        return {
            x: x * cellWidth,
            y: y * cellHeight,
            z: cellWidth,
            w: cellHeight,
        };
    }

    private _updateMaterialSettings(material: any, occlusion = false) {
        if (material == null) return;

        const cfg = this.config;
        const isBasic = material.type === "MeshBasicMaterial";

        if (!isBasic) {
            material.metalness = cfg.metalness ?? MaterialBehavior.defaults.metalness;
            material.roughness = cfg.roughness ?? MaterialBehavior.defaults.roughness;
            material.envMapIntensity =
                cfg.envMapIntensity ?? MaterialBehavior.defaults.envMapIntensity;
            const ns = cfg.normalScale ?? MaterialBehavior.defaults.normalScale;
            material.normalScale.set(ns.x, ns.y);
        }

        material.alphaTest = cfg.alphaTest ?? MaterialBehavior.defaults.alphaTest;
        material.side = cfg.side ?? MaterialBehavior.defaults.side;
        material.forceSinglePass =
            cfg.forceSinglePass ?? MaterialBehavior.defaults.forceSinglePass;

        if (!occlusion) {
            material.color.setHex(cfg.color ?? MaterialBehavior.defaults.color);
        } else {
            if (cfg.useEmissiveColor) {
                material.color.setHex(
                    cfg.emissiveColor ?? MaterialBehavior.defaults.emissiveColor
                );
                const force =
                    cfg.emissiveForce ?? MaterialBehavior.defaults.emissiveForce;
                material.color.r *= force;
                material.color.g *= force;
                material.color.b *= force;
            } else {
                material.color.setHex(0x000000);
            }
        }

        material.blending = +(cfg.blending ?? MaterialBehavior.defaults.blending);
        material.depthTest = cfg.depthTest ?? MaterialBehavior.defaults.depthTest;
        material.depthWrite = cfg.depthWrite ?? MaterialBehavior.defaults.depthWrite;
        material.transparent =
            cfg.transparent ?? MaterialBehavior.defaults.transparent;
        material.opacity = cfg.opacity ?? MaterialBehavior.defaults.opacity;

        if (material.map !== this.texture) {
            material.map = this.texture;
            material.needsUpdate = true;
        }

        if (!isBasic && material.normalMap !== this.normalTexture) {
            material.normalMap = this.normalTexture;
            material.needsUpdate = true;
        }

        if (!isBasic && material.roughnessMap !== this.roughnessTexture) {
            material.roughnessMap = this.roughnessTexture;
            material.needsUpdate = true;
        }
    }

    private async _loadImage(url: string): Promise<any> {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = AssetResolver.resolve(url, { type: "texture" });
        });
    }
}
