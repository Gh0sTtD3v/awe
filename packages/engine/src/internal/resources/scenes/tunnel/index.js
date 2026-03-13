import {
    ShaderMaterial,
    WebGLRenderTarget,
    Scene,
    PerspectiveCamera,
    LinearFilter,
    SRGBColorSpace,
    CatmullRomCurve3,
    Vector2,
    Mesh,
    Vector3,
    PointLight,
    RepeatWrapping,
    PlaneGeometry,
    Texture,
} from "three";
import Smoothstep from "../../../utils/math/smoothstep";
import VertexShader from "./shaders/vert.glsl.ts";
import FragmentShader from "./shaders/frag.glsl.ts";
import {
    DPI,
    VIEW,
    CANVAS,
    SUPPORT_OFFSCREEN_CANVAS_WEBGL,
    FRONT_END,
} from "../../../constants";
// import FBOHelper 	from 'engine/internal/utils/globals/fbohelper.js'

import emitter from "../../../engine-emitter";
import { EngineEvents } from "../../../engine-events";
import Renderer from "../../../renderer";
import Material from './material/index';
import gsap from "gsap";
import { Assets } from "../../assets";


const normal = FRONT_END ? new Image() : {};

normal.src = Assets.textures.tunnelNormal;


let points = [];

let length = 30;

let dist = 5;
// Define points along Z axis to create a curve
for (let i = 0; i < length; i += 1) {
    points.push(new Vector3(0, 0, dist * i));
}
// Set custom Y position for the last point
// points[4].y = -0.06;

// Create a curve based on the points
let path = new CatmullRomCurve3(points);

let cameraRatioPosition = 0.5;

let speed = 0.4;


export const STARFIELD_STATES = {
    INTRO: "intro",
    GAME: "game",
    TRANSITION: "transition"
}

class StarfieldMaterial extends ShaderMaterial {
    constructor() {
        let renderTarget = new WebGLRenderTarget(1, 1, {
            minFilter: LinearFilter,
            magFilter: LinearFilter,
            colorSpace: SRGBColorSpace,
        });

        if (FRONT_END && Renderer.capabilities.isWebGL2) {
            renderTarget.samples = 4;
        }

        super({
            uniforms: {
                map: {
                    value: renderTarget.texture,
                },
            },

            vertexShader: VertexShader,

            fragmentShader: FragmentShader,

            side: 0,
        });

        this.percent = 0;
        this.percent2 = 0.9;
        this.percent3 = 0.75;

        this.mouse = new Vector2(0, 0);

        this.renderTarget = renderTarget;

        this.scene = new Scene();

        let geometry = new PlaneGeometry(100, 100, 200, 200);

        const normalMap = new Texture();

        normalMap.image = normal;
        normalMap.wrapS = RepeatWrapping;
        normalMap.wrapT = RepeatWrapping;
        normalMap.generateMipmaps = false;
        normalMap.minFilter = LinearFilter;
        normalMap.magFilter = LinearFilter;
        normalMap.repeat.set(4, 4);
        normalMap.needsUpdate = true;

        let material = new Material({
            normalMap: normalMap,

            length: length * dist,

            radius: 4,

            ratioPosition: cameraRatioPosition,

            speed: speed,
        });

        this.transitionValue = 0;

        // Repeat the pattern to prevent the texture being stretched

        // Create a mesh based on tubeGeometry and tubeMaterial
        let tube = new Mesh(geometry, material);

        tube.frustumCulled = false;

        // Add the tube into the scene
        this.scene.add(tube);

        this.tube = tube;

        this.camera = new PerspectiveCamera(90, 1, 0.01, 1000);

        this.camera.up.set(-1, -1, 0);

        this.camera.position.z = 40;

        this.currentState = null;

        this.userData.isShared = true;

        this.pointLight = new PointLight(0xffffff, 1, 60);
        this.pointLight2 = new PointLight(0x34c1ff, 1, 60);
        this.pointLight3 = new PointLight(0x02eef2, 1, 60);

        this.scene.add(this.pointLight);
        this.scene.add(this.pointLight2);

        this.renderOnTop = false;
    }

    async preload() {
        return new Promise((resolve, reject) => {
            if (SUPPORT_OFFSCREEN_CANVAS_WEBGL) {
                this.worker = new Worker(new URL("./offscreen/index.worker.js", import.meta.url));

                const canvas = document.createElement("canvas");

                const offscreenCanvas = canvas.transferControlToOffscreen();

                canvas.id = "loader-canvas";
                canvas.style.position = "absolute";
                canvas.style.top = "0";
                canvas.style.left = "0";
                canvas.style.width = "100%";
                canvas.style.height = "100%";
                canvas.style.pointerEvents = "none";
                canvas.style.zIndex = "100";

                this.worker.addEventListener("message", (res) => {
                    const data = res.data;

                    if (data.type == "init") {
                        resolve();
                    } else if (data.type == "error") {
                        console.error(
                            "support offscreen canvas on intro starfield is wrong"
                        );

                        this.worker = null;

                        resolve();

                        return;
                    }
                });

                this.worker.postMessage(
                    {
                        type: "init",
                        canvas: offscreenCanvas,
                    },
                    [offscreenCanvas]
                );

                this.workerCanvas = canvas;
            } else {
                resolve();
            }
        });
    }

    async setState(STATE, opts) {
        let deactivatePromise;

        if (STATE == STARFIELD_STATES.INTRO) {
            this.renderOnTop = true;
        }

        if (this.currentState == STARFIELD_STATES.INTRO) {
            if (this.worker) {
                deactivatePromise = new Promise((resolve, reject) => {
                    this.worker.addEventListener("message", (res) => {
                        const data = res.data;

                        if (data.type == "desactivate") {
                            this.renderOnTop = false;

                            this.workerCanvas.parentNode.removeChild(
                                this.workerCanvas
                            );

                            setTimeout(() => {
                                this.worker.terminate();

                                this.workerCanvas = null;

                                this.worker = null;
                            }, 1000);

                            resolve(true);
                        }
                    });

                    this.worker.postMessage({ type: "desactivate" });
                });
            } else {
                deactivatePromise = this.desactivate();
            }

            this.addEvents();
        } else if (this.currentState != STARFIELD_STATES.TRANSITION) {
            this.removeEvents();
        }

        this.currentState = STATE;

        switch (STATE) {
            case STARFIELD_STATES.INTRO:
                if (this.worker && this.renderOnTop) {
                    this.worker.postMessage({
                        type: "play",
                    });

                    this.worker.postMessage({ type: "activate" });

                    // console.log(
                    //     "FOO",
                    //     document,
                    //     document.body.querySelector("#sandbox-root")
                    // );
                    const ctx =
                        document.body.querySelector("#sandbox-root") ||
                        document.body.querySelector("#exhibit");

                    ctx.appendChild(this.workerCanvas);
                } else {
                    this.activate();
                }

                this.addEvents();

                this.resize(VIEW.w, VIEW.h);

                await new Promise((resolve) => {
                    setTimeout(() => {
                        resolve();
                    }, 500);
                });

                break;
        }

        if (deactivatePromise) return await deactivatePromise;

        return null;
    }

    addEvents() {
        if (this.updateEvent == null && this.worker == null) {
            this.updateEvent = this.update.bind(this);

            if (this.renderOnTop) {
                emitter.on(EngineEvents.POST_RENDER, this.updateEvent);
            } else {
                emitter.on(EngineEvents.RENDER, this.updateEvent);
            }
        }

        if (this.currentState == STARFIELD_STATES.INTRO || this.renderOnTop) {
            if (this.resizeEvent == null) {
                this.resizeEvent = () => {
                    this.resize(VIEW.w, VIEW.h);
                };

                emitter.on(EngineEvents.RESIZE, this.resizeEvent);
            }
        }
    }

    removeEvents() {
        if (this.updateEvent) {
            emitter.off(EngineEvents.RENDER, this.updateEvent);

            emitter.off(EngineEvents.POST_RENDER, this.updateEvent);

            this.updateEvent = null;
        }

        if (this.resizeEvent) {
            emitter.off(EngineEvents.RESIZE, this.resizeEvent);

            this.resizeEvent = null;
        }
    }

    resize(w, h) {
        this.renderTarget.setSize(w * DPI, h * DPI);

        this.camera.aspect = w / h;

        this.camera.updateProjectionMatrix();

        if (this.worker) {
            this.worker.postMessage({
                type: "resize",
                size: {
                    w: w,
                    h: h,
                    dpi: DPI,
                },
            });
        }
    }

    desactivate() {
        return new Promise((resolve) => {
            if (this.tween) {
                this.tween.kill();

                this.tween = null;
            }

            this.tween = gsap.to(this, {
                transitionValue: 0,

                duration: 2.7,

                ease: "power1.easeOut",

                onComplete: () => {
                    this.renderOnTop = false;

                    this.removeEvents();

                    resolve(true);
                },
            });
        });
    }

    activate(force = false) {
        if (this.tween) {
            this.tween.kill();

            this.tween = null;
        }

        if (force == true) {
            this.transitionValue = 0;
        }

        // this.percent2 = 0.9

        this.tween = gsap.to(this, {
            transitionValue: 1,

            duration: 4.5,

            ease: "power1.easeOut",
        });
    }

    update(delta, total) {
        // console.log('update', this.renderOnTop )

        this.tube.material.uniforms.desactivated.value = this.transitionValue;

        this.mouse.x = Math.sin(total * speed) * this.transitionValue * 0.5;
        this.mouse.y = Math.cos(total * speed) * this.transitionValue * 0.5;

        // this.mouse.set(0,0)
        this.tube.material.update(this.mouse);

        this.pointLight.intensity =
            (Smoothstep(-1, 1, Math.sin(total * speed)) * 0.5 + 0.5) * Math.PI;

        const lightSpeed = 0.05;

        this.percent += delta * 1.0 * lightSpeed;
        this.percent2 += delta * 2.0 * lightSpeed;
        this.percent3 += delta * 2.0 * lightSpeed;

        let p1 = path.getPointAt(0);
        let p2 = path.getPointAt((cameraRatioPosition + 0.2) % 1);

        let p4 = path.getPointAt(0.1);

        const pLightBlue = this.percent2 % 1;

        this.pointLight2.intensity =
            this.smoothstep(0.0, 0.04, pLightBlue) * 2 * Math.PI;

        let p3 = path.getPointAt(pLightBlue);
        let p5 = path.getPointAt(this.percent3 % 1);

        p2.z *= -1;

        this.camera.position.copy(p1);

        this.camera.lookAt(p2);

        this.camera.rotation.z = this.mouse.y;
        this.camera.rotation.y = Math.PI - this.mouse.x * 0.06;

        this.camera.position.x = this.mouse.x * 0.015;
        this.camera.position.y = -this.mouse.y * 0.015;

        this.pointLight.position.copy(p4);
        this.pointLight2.position.copy(p3);
        // this.pointLight3.position.copy(p5)

        let oldXREnabled = Renderer.xr.enabled;

        Renderer.xr.enabled = false;

        // console.log('upd')

        if (this.currentState == STARFIELD_STATES.INTRO) {
            Renderer.setClearColor(0x000000, 1);

            Renderer.clear();

            Renderer.render(this.scene, this.camera);

            Renderer.setClearColor(0x000000, 0);
        } else {
            // render on top

            if (this.renderOnTop) {
                Renderer.clearDepth();

                const prevAutoClear = Renderer.autoClear;

                Renderer.autoClear = false;

                Renderer.render(this.scene, this.camera);

                Renderer.autoClear = prevAutoClear;
            } else {
                let former = Renderer.getRenderTarget();

                Renderer.setRenderTarget(this.renderTarget);

                Renderer.clear();

                Renderer.render(this.scene, this.camera);

                Renderer.setRenderTarget(former);
            }
        }

        Renderer.xr.enabled = oldXREnabled;
    }

    smoothstep(min, max, value) {
        let x = Math.max(0, Math.min(1, (value - min) / (max - min)));
        return x * x * (3 - 2 * x);
    }
}

export default new StarfieldMaterial();
