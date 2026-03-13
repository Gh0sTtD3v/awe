import {
    Scene,
    OrthographicCamera,
    ShaderMaterial,
    Color,
    Mesh,
    WebGLRenderTarget,
    LinearFilter,
    HalfFloatType,
    Texture,
    NearestFilter,
    SRGBColorSpace,
    Vector2,
} from "three";

import Textures from "../../../textures";

import Renderer from "../../../renderer";

import Triangle from "../../../utils/globals/geometries/triangle";

import BlendVert from "./blend/main.vert.ts";

import BlendFrag from "./blend/main.frag.ts";

import LutVert from "./lut/vert.glsl.ts";
import LutFrag from "./lut/frag.glsl.ts";

import TVVert from "./tv/main.vert.ts";

import TVFrag from "./tv/main.frag.ts";

import TrippyVert from "./trippy/main.vert.ts";
import TrippyFrag from "./trippy/main.frag.ts";

import Shared from "../../../utils/globals/shared";

import { POST_TYPES } from "../constants";

import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export default class Quad {
    constructor() {
        this.kernels = new Scene();

        this.kernels.matrixWorldAutoUpdate = false;

        this.kernels.matrixAutoUpdate = false;

        this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

        this.settings = {
            minFilter: LinearFilter,

            magFilter: LinearFilter,

            stencilBuffer: false,

            colorSpace: SRGBColorSpace,

            depthBuffer: false,

            generateMipmaps: false,
        };

        this.width = 1;

        this.height = 1;

        this.initPasses();
    }

    render(source, occlusion, options, t) {
        const effect = options.type;

        const postProValues = options.value;

        if (effect == POST_TYPES.BLOOM) {
            this.bloomPass.threshold = postProValues.threshold;
            this.bloomPass.highPassUniforms['smoothWidth'].value = postProValues.smoothing;
            this.blendKernel.material.uniforms.intensity.value =
                postProValues.intensity;
            this.bloomPass.radius = postProValues.radius;

            this.blendKernel.material.uniforms.tInput2.value =
                this.updateBloom(Renderer, source, true);

            this.blendKernel.material.uniforms.bloomColor.value
                .set(postProValues.color)
                .convertSRGBToLinear();

            this.compute(this.blendKernel, {
                input: source,
                output: t ? t : null,
                toScreen: t ? false : true,
            });
        } else if (effect == 'custom') {

            if(this.customKernel == null ){

                this.customKernel = this.initCustomKernel( options )
            }

            if( options.value.useBloom  == true ) {

                this.bloomPass.radius = postProValues.radius;

                const luminanceEnabled = postProValues.useLuminancePass != null ? postProValues.useLuminancePass : true;

                this.customKernel.material.uniforms.tInput2.value = this.updateBloom(Renderer, source, luminanceEnabled)
            }

            this.compute(this.customKernel, {
                input: source,
                output: t ? t : null,
                toScreen: t ? false : true,
            });

        } else if (effect == POST_TYPES.LOOK_UP_TABLE) {
            const currentLut = postProValues.image.path;

            if (this.lutKernel.currentLut != currentLut) {
                try {
                    if (Textures[currentLut]) {
                        const tex = Textures[currentLut];

                        tex.minFilter = NearestFilter;
                        tex.magFilter = LinearFilter;
                        tex.generateMipmaps = false;
                        tex.needsUpdate = true;

                        this.lutKernel.material.uniforms.lutTexture.value =
                            Textures[currentLut];
                    } else {
                        Textures.loadTexture({
                            name: currentLut,
                            url: currentLut,
                        }).then(() => {
                            if (this.lutKernel.currentLut == currentLut) {
                                const tex = Textures[currentLut];

                                if (tex != null) {
                                    tex.minFilter = NearestFilter;
                                    tex.magFilter = LinearFilter;
                                    tex.generateMipmaps = false;
                                    tex.needsUpdate = true;

                                    this.lutKernel.material.uniforms.lutTexture.value =
                                        tex;
                                }
                            }
                        });
                    }

                    this.lutKernel.currentLut = currentLut;
                } catch (e) {}
            }

            this.compute(this.lutKernel, {
                input: source,
                output: t ? t : null,
                toScreen: t ? false : true,
            });
        } else if (effect == POST_TYPES.TRIPPY) {
            this.trippyKernel.material.uniforms.speed.value =
                postProValues.speed;

            this.compute(this.trippyKernel, {
                input: source,
                output: t ? t : null,
                toScreen: t ? false : true,
            });
        }
        else if (effect == POST_TYPES.TV) {

            this.tvKernel.material.uniforms.vignetteFallOff.value = postProValues.vignetteFallOff
            this.tvKernel.material.uniforms.vignetteStrength.value = postProValues.vignetteStrength
            this.tvKernel.material.uniforms.glitchRatio.value = postProValues.glitchRatio
            this.tvKernel.material.uniforms.amount.value = postProValues.amount
            this.tvKernel.material.uniforms.strength.value = postProValues.strength
            this.tvKernel.material.uniforms.speed.value = postProValues.speed

            this.compute(this.tvKernel, {
                input: source,
                output: t ? t : null,
                toScreen: t ? false : true,
            });
        }
    }

    compute(kernel, opts = {}) {
        kernel.mesh.frustumCulled = false;

        kernel.mesh.matrixAutoUpdate = false;

        if (kernel == null) {
            debugger;
        }

        this.kernels.add(kernel.mesh);

        if (opts.input) {
            kernel.mesh.material.uniforms.tInput.value = opts.input.texture;
        }

        if (opts.toScreen == true) {
            if (Renderer.getRenderTarget() != null) {
                Renderer.setRenderTarget(null);
            }

            if (Renderer.autoClear == false) {
                Renderer.clear(true, true, false);
            }

            Renderer.render(this.kernels, this.camera);
        } else {
            if (opts.output == null) {
                Renderer.setRenderTarget(kernel.output);
            } else {
                Renderer.setRenderTarget(opts.output);
            }

            Renderer.render(this.kernels, this.camera);
        }

        this.kernels.remove(kernel.mesh);
    }
    initPasses() {
        // bloom pass (Three.js UnrealBloomPass)

        this.bloomPass = new UnrealBloomPass(
            new Vector2(256, 256),
            1.0,    // strength
            0.7,    // radius
            0.23    // threshold
        );

        this._clearColor = new Color();

        this.blendKernel = {
            material: new ShaderMaterial({
                uniforms: {
                    tInput: { value: null },

                    tInput2: { value: null },

                    intensity: { value: 5 },

                    bloomColor: { value: new Color(0xffffff) },
                },

                vertexShader: BlendVert,

                fragmentShader: BlendFrag,

                depthTest: false,

                depthWrite: false,

                transparent: false,

                side: 0,
            }),
        };

        this.blendKernel.mesh = new Mesh(Triangle, this.blendKernel.material);

        // TV Kernel

        this.tvKernel = {
            material: new ShaderMaterial({
                uniforms: {

                    vignetteFallOff: {
                        value: 0.5
                    },

                    vignetteStrength: {

                        value: 0.5
                    },

                    dattime: Shared.timer,

                    glitchRatio: {

                        value: 0.5
                    },

                    speed: {

                        value: 1
                    },

                    amount:{

                        value: 1
                    },

                    strength:{

                        value: 1.0
                    },

                    aspect: Shared.aspect,

                    tInput: { value: null },
                },

                vertexShader: TVVert,

                fragmentShader: TVFrag,

                depthTest: false,

                depthWrite: false,

                transparent: false,

                side: 0,
            }),
        };

        this.tvKernel.mesh = new Mesh(Triangle, this.tvKernel.material);

        // LUT kernel

        const neutralBase64 =
            "data:image/png;base64,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";
        const img = new Image();
        img.src = neutralBase64;

        const neutralTexture = new Texture(img);

        neutralTexture.minFilter = NearestFilter;
        neutralTexture.magFilter = LinearFilter;
        neutralTexture.generateMipmaps = false;
        neutralTexture.needsUpdate = true;

        this.lutKernel = {
            material: new ShaderMaterial({
                uniforms: {
                    tInput: { value: null },

                    lutTexture: { value: neutralTexture },
                },

                vertexShader: LutVert,

                fragmentShader: LutFrag,

                depthTest: false,

                depthWrite: false,

                transparent: true,

                side: 0,
            }),

            currentLut: null,
        };

        this.lutKernel.mesh = new Mesh(Triangle, this.lutKernel.material);

        this.trippyKernel = {
            material: new ShaderMaterial({
                uniforms: {
                    tInput: { value: null },

                    timer: Shared.timer,

                    speed: { value: 0.1 },
                },

                vertexShader: TrippyVert,

                fragmentShader: TrippyFrag,

                depthTest: false,

                depthWrite: false,

                transparent: false,

                side: 0,
            }),
        };

        this.trippyKernel.mesh = new Mesh(Triangle, this.trippyKernel.material);
    }

    initCustomKernel( options ){

        const material = options.value.kernel

        const res = {

            material: material,

            mesh : new Mesh(Triangle, material)
        }

        return res
    }

    updateBloom(renderer, inputBuffer, luminanceEnabled = true) {
        const pass = this.bloomPass;

        renderer.getClearColor(this._clearColor);
        const oldClearAlpha = renderer.getClearAlpha();
        const oldAutoClear = renderer.autoClear;
        renderer.autoClear = false;
        renderer.setClearColor(0x000000, 0);

        let inputRT;

        if (luminanceEnabled) {
            pass.highPassUniforms['tDiffuse'].value = inputBuffer.texture;
            pass.highPassUniforms['luminosityThreshold'].value = pass.threshold;
            pass.fsQuad.material = pass.materialHighPassFilter;
            renderer.setRenderTarget(pass.renderTargetBright);
            renderer.clear();
            pass.fsQuad.render(renderer);
            inputRT = pass.renderTargetBright;
        } else {
            inputRT = inputBuffer;
        }

        for (let i = 0; i < pass.nMips; i++) {
            pass.fsQuad.material = pass.separableBlurMaterials[i];

            pass.separableBlurMaterials[i].uniforms['colorTexture'].value = inputRT.texture;
            pass.separableBlurMaterials[i].uniforms['direction'].value = UnrealBloomPass.BlurDirectionX;
            renderer.setRenderTarget(pass.renderTargetsHorizontal[i]);
            renderer.clear();
            pass.fsQuad.render(renderer);

            pass.separableBlurMaterials[i].uniforms['colorTexture'].value = pass.renderTargetsHorizontal[i].texture;
            pass.separableBlurMaterials[i].uniforms['direction'].value = UnrealBloomPass.BlurDirectionY;
            renderer.setRenderTarget(pass.renderTargetsVertical[i]);
            renderer.clear();
            pass.fsQuad.render(renderer);

            inputRT = pass.renderTargetsVertical[i];
        }

        pass.fsQuad.material = pass.compositeMaterial;
        pass.compositeMaterial.uniforms['bloomStrength'].value = pass.strength;
        pass.compositeMaterial.uniforms['bloomRadius'].value = pass.radius;
        renderer.setRenderTarget(pass.renderTargetsHorizontal[0]);
        renderer.clear();
        pass.fsQuad.render(renderer);

        renderer.setClearColor(this._clearColor, oldClearAlpha);
        renderer.autoClear = oldAutoClear;

        return pass.renderTargetsHorizontal[0].texture;
    }

    resize(w, h, dpi) {
        this.width = w;

        this.height = h;

        if (this.bloomPass) {
            this.bloomPass.setSize(w * dpi, h * dpi);
        }
    }

    getFBO() {
        return new WebGLRenderTarget(1, 1, {
            depthBuffer: false,
            stencilBuffer: false,
            generateMipmaps: false,
            minFilter: LinearFilter,
            magFilter: LinearFilter,
        });
    }
}
