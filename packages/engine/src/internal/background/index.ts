import {
    Mesh,
    BoxGeometry,
    Scene,
    SphereGeometry,
    Color,
    Texture,
    ShaderMaterial,
    UniformsUtils,
    ShaderLib,
    BackSide,
    SRGBColorSpace,
    LinearFilter,
} from "three";

import SkyFactory from "../sky";

import Triangle from "../utils/globals/geometries/triangle";

import ColorMaterial from './materials/color';

import SharpMaterial from './materials/sharp';

import PipeLineMesh from "../pipeline/pipeline-mesh";

import { Subsystems } from "../subsystems";
import { ColorBackground } from './color-background';

import BackdropFactory from "../backdrop";

let pipeLineOpts = {
    visibleOnOcclusion: false,
    visibleOnMirror: true,
};

/**
 * @public
 *
 * Configuration for a procedural sky background based on atmospheric
 * scattering. These parameters control sun position and the look of
 * the sky gradient.
 */
export interface SkyOpts {
    /**
     * Atmospheric turbidity — controls haziness of the sky.
     * Higher values produce a more washed-out, hazy look.
     *
     * Range: 0 – 12. Default: `10`.
     */
    turbidity: number;

    /**
     * Rayleigh scattering coefficient — affects the intensity of the
     * blue sky gradient. Higher values produce a stronger blue tint.
     *
     * Range: 0 – 4. Default: `3`.
     */
    rayleigh: number;

    /**
     * Mie scattering coefficient — controls the amount of light
     * scattering by aerosols (e.g., dust, pollen). Higher values
     * intensify the glow around the sun.
     *
     * Range: 0 – 0.1. Default: `0.005`.
     */
    mieCoefficient: number;

    /**
     * Mie directional scattering — controls how focused the sun's
     * glow appears. Higher values tighten the halo effect around the sun.
     *
     * Range: 0 – 0.1. Default: `0.7`.
     */
    mieDirectionalG: number;

    /**
     * Sun azimuth angle in degrees — the horizontal direction of the sun.
     *
     * Range: -180 – 180. Default: `180`.
     */
    azimuth: number;

    /**
     * Sun elevation angle in degrees — the vertical angle of the sun
     * above the horizon. Low values (e.g., 2) create sunrise/sunset
     * lighting; high values create midday lighting.
     *
     * Range: 0 – 90. Default: `2`.
     */
    elevation: number;
}

export type BackgroundOpts =
    | { type: "color"; color?: string }
    | {
          type: "image";
          options: { format: string; image: string; path: string };
      }
    | { type: "sky"; options: SkyOpts }
    | { type: "backdrop"; options: any };

export type BackgroundMesh = Mesh & {
    getRaw: () => Texture | Color;
    backgroundType: "color" | "image" | "sky";
    updateOpts?: (opts: any) => void;
    dispose?: () => void;
};

class BackgroundFactory {
    async get(opts: BackgroundOpts): Promise<BackgroundMesh> {
        let mesh: PipeLineMesh;

        let value: Texture | Color;

        if (opts == null) {
            opts = { type: "color" };
        }

        if (opts.type === "color") {
            value = new Color(opts?.color || "#000");

            mesh = new ColorBackground({ color: value, pipeLineOpts });
        } else if (opts.type === "sky") {
            value = await this.loadSky(opts);

            mesh = this.getTextureMesh(value);
        } else if (opts.type === "image") {
            value = await Subsystems.envmap.loadCubeImage(opts.options);

            mesh = this.getTextureMesh(value);
        } else if (opts.type === "backdrop") {
            mesh = await BackdropFactory.get(opts);

            value = await this.loadBackDrop(mesh, opts);
        }

        mesh.matrixAutoUpdate = false;
        mesh.matrixWorldAutoUpdate = false;

        // render background last of opaque render list
        // making sure its always at the back, needs to be rendered before the rest since some of the materials can be additive now..
        // then it needs to add up to the final color..
        mesh.renderOrder = -Infinity;

        mesh.name = "BACKGROUND";

        mesh.frustumCulled = false;

        // @ts-ignore
        mesh.backgroundType = opts.type;

        // @ts-ignore
        mesh.getRaw = function () {
            return value;
        };

        // @ts-ignore
        return mesh;
    }

    getTextureMesh(value) {
        let mesh;

        if (value.sharp) {
            mesh = new PipeLineMesh(
                new SphereGeometry(2, 32, 32),
                new SharpMaterial({
                    map: value.sharp,
                }),
                pipeLineOpts
            );

            value.sharp.minFilter = LinearFilter;
            value.sharp.magFilter = LinearFilter;
            value.sharp.generateMipmaps = false;
            value.sharp.needsUpdate = true;

            mesh.geometry.deleteAttribute("normal");

            mesh.scale.z = -1;

            mesh.onBeforeRender = function (renderer, scene, camera) {
                this.matrixWorld.copyPosition(camera.matrixWorld);
            };

            mesh.updateMatrixWorld();
        } else {
            mesh = new PipeLineMesh(
                new BoxGeometry(1, 1, 1),
                new ShaderMaterial({
                    name: "BackgroundCubeMaterial",
                    transparent: false,
                    uniforms: UniformsUtils.clone(
                        ShaderLib.backgroundCube.uniforms
                    ),
                    vertexShader: ShaderLib.backgroundCube.vertexShader,
                    fragmentShader: ShaderLib.backgroundCube.fragmentShader,
                    side: BackSide,
                    depthWrite: false,

                    fog: false,
                }),
                pipeLineOpts
            );

            mesh.geometry.deleteAttribute("normal");

            mesh.geometry.deleteAttribute("uv");

            mesh.onBeforeRender = function (renderer, scene, camera) {
                this.matrixWorld.copyPosition(camera.matrixWorld);
            };

            // add "envMap" material property so the renderer can evaluate it like for built-in materials
            Object.defineProperty(mesh.material, "envMap", {
                get: function () {
                    return this.uniforms.envMap.value;
                },
            });

            mesh.material.uniforms.envMap.value = value;

            mesh.material.uniforms.flipEnvMap.value = 1;
        }

        return mesh;
    }

    async loadBackDrop(mesh, opts) {
        const cube = await Subsystems.envmap.loadCubeMapFromScene(mesh, false);

        return cube.texture;
    }

    async loadSky(opts) {
        const skyScene = SkyFactory.get(opts.enableSky, opts.options);

        // console.log(opts.skyOptions)

        // debugger;

        skyScene.rotation.order = "ZYX";

        skyScene.rotation.z = Math.PI / 2;

        skyScene.rotation.x = Math.PI / 2;

        skyScene.updateMatrixWorld(true);

        const cube = await Subsystems.envmap.loadCubeMapFromScene(skyScene, false);

        // @ts-ignore
        cube.sky = true;

        SkyFactory.dispose(skyScene);

        return cube.texture;
    }
}

export default new BackgroundFactory();
