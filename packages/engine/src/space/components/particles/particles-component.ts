import { Component3D, DataChangeOpts } from "../../abstract/component-3d";
import { ParticlesComponentData } from "./particles-data";
export type { ParticlesComponentData } from "./particles-data";

import InstancedBasic from "../../../internal/rendering/materials/instancedbasic";

import InstancedStandard from "../../../internal/rendering/materials/instancedstandard";

import type { ParticleBehavior } from "./particle-behavior";
import { ParticleBehaviorRegistry } from "./particle-behavior";

import {
    Mesh,
    BoxGeometry,
    BufferAttribute,
    MeshStandardMaterial,
    Vector3,
    Quaternion,
    PlaneGeometry,
    BufferGeometry,
} from "three";

import {
    billboardShader,
    normalParticleShader,
    alphatest_fragment_shadow,
} from "./shader-lib";

import emitter from "../../../internal/engine-emitter";
import { EngineEvents } from "../../../internal/engine-events";

import SHARED from "../../../internal/utils/globals/shared";

const tempVec = new Vector3();

const PRIMITIVE_LIST = {
    PLANE: "plane",
    CUBE: "cube",
    POINT: "sphere",
};

const USE_TRIANGLE = false;

const identityQuaternion = new Quaternion();
const identityScale = new Vector3(1, 1, 1);
const identityPosition = new Vector3(0, 0, 0);

/**
 * Options for manually spawning a particle via {@link ParticlesComponent.spawn}.
 * All properties are optional; unspecified values use sensible defaults.
 */
interface ParticleSpawnOpts {
    /** Offset position for the spawned particle relative to the source. Defaults to `{x: 0, y: 0, z: 0}` */
    position?: { x?: number; y?: number; z?: number };
    /** Initial rotation of the spawned particle in radians. Defaults to `{x: 0, y: 0, z: 0}` */
    rotation?: { x?: number; y?: number; z?: number };
    /** Initial opacity of the spawned particle. Defaults to `1` */
    opacity?: number;
    /** Initial scale of the spawned particle. Defaults to `{x: 1, y: 1, z: 1}` */
    scale?: { x?: number; y?: number; z?: number };
}

/** @internal */
interface ParticleSpawnData {
    primitive: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    opacity: number;
    scale: { x: number; y: number; z: number };
    plugins: any[];
    billboard: boolean;
    randomID: number;
    source: Component3D;
    frame: number;
    spawnTimer?: number;
    lifeSpanTimer?: number;
}

/**
 * @public
 *
 * GPU-instanced particle system component for creating visual particle effects in the space.
 * Supports three primitive shapes (`"plane"`, `"cube"`, `"sphere"`), billboard rendering,
 * configurable spawn rates, and two lifecycle modes (finite lifespan or perpetual).
 *
 * Particles can be auto-spawned at a configurable rate or manually spawned via the
 * {@link ParticlesComponent.spawn | spawn} method. When a {@link ParticlesComponentData.source | source}
 * component is provided, particles emit from the source's world position. The
 * {@link ParticlesComponentData.attachToSource | attachToSource} option makes the entire
 * particle system follow the source each frame.
 *
 * ## Behavior System
 *
 * Particle appearance and motion are controlled through composable **behaviors** configured
 * via {@link ParticlesComponentData.behaviors}. Each behavior is an ordered entry with a
 * `type` string and an `options` object. Behaviors are processed in array order during
 * plugin assembly, spawn, and per-frame updates.
 *
 * Built-in behavior types:
 * - `"forces"` — Initial velocity, gravity, wind, drag, and optional source-following.
 * - `"scale"` — Animate-in/out scaling and per-particle scale randomization.
 * - `"rotation"` — Initial rotation, rotation axis over time, and billboard rotation.
 * - `"color"` — Random per-particle color from a palette.
 * - `"noise"` — Curl-noise displacement on the GPU.
 * - `"spawnPosition"` — CPU-side spawn offset, displacement range, and ring spawning.
 * - `"material"` — PBR/unlit material settings, textures, atlas, blending, and emissive.
 * - `"frustumTest"` — Custom frustum culling with a configurable bounding sphere.
 *
 * Custom behaviors can be registered via {@link ParticleBehaviorRegistry.register} before
 * the component is created.
 *
 * See {@link ParticlesComponentData} for the data schema used to configure the particles component.
 *
 * @example
 * ```ts
 * // Basic particle emitter with billboard plane primitives
 * const sparks = await space.components.create({
 *     type: "particles",
 *     position: { x: 0, y: 2, z: 0 },
 *     primitive: "plane",
 *     billboard: true,
 *     autoSpawn: true,
 *     autoSpawnRate: 15,
 *     lifeSpan: 3,
 *     shadowCast: false,
 * });
 *
 * // Perpetual particle pool with sphere primitives (e.g., static floating orbs)
 * const orbs = await space.components.create({
 *     type: "particles",
 *     position: { x: 5, y: 1, z: 0 },
 *     primitive: "sphere",
 *     perpetualLife: true,
 *     maximumSpawn: 50,
 *     instantSpawn: true,
 * });
 *
 * // Manually spawn a particle with custom transform
 * sparks.spawn({
 *     position: { x: 1, y: 0, z: 0 },
 *     scale: { x: 0.5, y: 0.5, z: 0.5 },
 *     opacity: 0.8,
 * });
 *
 * // Particle emitter with behaviors for direction, scale, and material
 * const fire = await space.components.create({
 *     type: "particles",
 *     primitive: "plane",
 *     billboard: true,
 *     autoSpawn: true,
 *     autoSpawnRate: 20,
 *     lifeSpan: 2,
 *     behaviors: [
 *         { type: "forces", options: { initialVelocity: { x: 0, y: 1, z: 0 }, initialVelocityRange: { x: 0.3, y: 0, z: 0.3 } } },
 *         { type: "scale", options: { animateIn: true, animateOut: true, scale: { x: 0.5, y: 0.5, z: 0.5 } } },
 *         { type: "material", options: { color: 0xff4400, mode: "Unlit", blending: 2, transparent: true } },
 *     ],
 * });
 * ```
 */
export class ParticlesComponent extends Component3D<ParticlesComponentData> {
    /** @internal */
    _maximumSpawn = 20;

    /** @internal */
    mesh: any = null;

    /** @internal */
    instancedMesh: any = null;

    /** @internal */
    timeAccumulator = 0;

    /** @internal */
    instances = [];

    /** @internal */
    prePlugin = null;

    /** @internal */
    plugins = [];

    /** @internal */
    frame = -1;

    /** @internal */
    _behaviors: ParticleBehavior[] = [];

    /**
     * @internal
     */
    constructor(opts) {
        //
        super(opts);
    }

    /** @internal */
    protected async init() {}

    /** @internal */
    async _onReady() {
        await this._update3D({ isProgress: false, prev: {} as ParticlesComponentData });
    }

    /**
     * @internal
     */
    async onDataChange(opts: DataChangeOpts): Promise<void> {
        this._update3D(opts);
    }

    /** @internal */
    async _update3D(opts: DataChangeOpts) {
        let needsRebuild =
            this.data.primitive != opts.prev.primitive ||
            this.data.billboard != opts.prev.billboard ||
            this.data.lifeSpan != opts.prev.lifeSpan ||
            this.data.autoSpawnRate != opts.prev.autoSpawnRate ||
            this.data.attachToSource != opts.prev.attachToSource ||
            this.data.useSourceRotation != opts.prev.useSourceRotation ||
            this.data.useSourceScale != opts.prev.useSourceScale ||
            this.data.perpetualLife != opts.prev.perpetualLife ||
            this.data.instantSpawn != opts.prev.instantSpawn;

        let needsMaterialUpdate = false;

        // Check behavior changes
        const prevBehaviors = opts.prev.behaviors ?? [];
        const currBehaviors = this.data.behaviors ?? [];

        // Behavior list changed (added/removed/reordered) → rebuild
        if (!needsRebuild) {
            if (prevBehaviors.length !== currBehaviors.length) {
                needsRebuild = true;
            } else {
                for (let i = 0; i < currBehaviors.length; i++) {
                    if (currBehaviors[i].type !== prevBehaviors[i]?.type) {
                        needsRebuild = true;
                        break;
                    }
                }
            }
        }

        // Behavior config changed → ask each behavior
        if (!needsRebuild) {
            for (let i = 0; i < currBehaviors.length; i++) {
                const behavior = this._behaviors[i];
                if (behavior && prevBehaviors[i] && currBehaviors[i]) {
                    const hint = behavior.onConfigChange?.(
                        currBehaviors[i].options,
                        prevBehaviors[i].options
                    );
                    if (hint === "rebuild") {
                        needsRebuild = true;
                        break;
                    } else if (hint === "material") {
                        needsMaterialUpdate = true;
                    }
                }
            }
        }

        if (needsRebuild) {
            this.timeAccumulator = 0;
            this.dispose();
            await this.create();
        } else if (needsMaterialUpdate) {
            for (const behavior of this._behaviors) {
                await behavior.setupMaterial?.(this.instancedMesh?._instancedMesh);
            }
        }

        if (this.data.perpetualLife != true) {
            this._maximumSpawn = Math.ceil(this.data.autoSpawnRate * this.data.lifeSpan);
        } else {
            this._maximumSpawn = this.data.maximumSpawn;
        }

        if (this.instancedMesh?._instancedMesh) {
            this.instancedMesh._instancedMesh.castShadow = this.data.shadowCast;
            this.instancedMesh._instancedMesh.receiveShadow =
                this.data.receiveShadow;
        }

        this.processInstantSpawn();
    }

    /** @internal */
    async create() {
        if (this.instancedMesh != null) {
            this.dispose();
        }

        this.instances = [];

        this._syncBehaviors();

        this.plugins = this.getPlugin();

        const primitive = this.data.primitive;

        let materials: any = {
            diffuseMaterial: InstancedBasic,

            lightingMaterial: InstancedStandard,

            occlusionMaterial: InstancedBasic,

            lightingOcclusionMaterial: InstancedStandard,
        };

        // Collect material constructors from behaviors
        for (const behavior of this._behaviors) {
            const matCtors = behavior.getMaterialConstructors?.();
            if (matCtors) {
                materials = { ...materials, ...matCtors };
            }
        }

        var chunks = {
            fragment: {},
            vertex: {},
        };

        if (this.data.primitive == PRIMITIVE_LIST.POINT) {
            this.setData({ billboard: false });
        }

        if (this.data.primitive == PRIMITIVE_LIST.CUBE) {
            this.setData({ billboard: false });
        }

        if (this.data.billboard || this.data.primitive == PRIMITIVE_LIST.POINT) {
            chunks.vertex["project_vertex"] = billboardShader;
        }

        if (this.data.primitive == PRIMITIVE_LIST.POINT) {
            chunks.fragment["normal_fragment_begin"] = normalParticleShader;
            //chunks.fragment['uv_pars_vertex'] = uv_pars_vertex_impostor
        }

        chunks.fragment["alphatest_fragment"] = alphatest_fragment_shadow;

        var useFullRotation = this.data.billboard == false;

        if (this.data.primitive == PRIMITIVE_LIST.POINT) {
            useFullRotation = true;
        }

        let geometryOptions: any = {
            type: "instancedmesh",
            baseMesh: new Mesh(this.getPrimitive(), new MeshStandardMaterial()),
            enableRealTimeShadow: true,
            plugins: this.plugins,
            useFrustumCulling: false,
            useSorting: false,
            rotation: useFullRotation,
            rotationY: !useFullRotation,
            atlas: false,
            randomID: true,
            chunks: chunks,
        };

        const matOpts: any = {};

        if (geometryOptions.plugins) {
            matOpts.plugins = geometryOptions.plugins;
        }

        if (geometryOptions.chunks) {
            matOpts.chunks = geometryOptions.chunks;
        }

        (materials as any).diffuseMaterial = new (materials.diffuseMaterial as any)(matOpts);
        (materials as any).lightingMaterial = new (materials.lightingMaterial as any)(matOpts);
        (materials as any).occlusionMaterial = new (materials.occlusionMaterial as any)(matOpts);
        (materials as any).lightingOcclusionMaterial =
            new (materials.lightingOcclusionMaterial as any)(matOpts);

        geometryOptions.material = materials;

        // Collect geometry options from behaviors
        for (const behavior of this._behaviors) {
            const geoOpts = behavior.getGeometryOptions?.();
            if (geoOpts) {
                geometryOptions = Object.assign(geometryOptions, geoOpts);
            }
        }

        this.instancedMesh = await this.container.create(geometryOptions);

        if (this.data.attachToSource) {
            this.instancedMesh._instancedMesh.onBeforeRender = () => {
                let source = this.data.source ? this.data.source : this;

                // if use position

                // and both rotation and scale
                if (this.data.useSourceRotation && this.data.useSourceScale) {
                    this.instancedMesh._instancedMesh.matrixWorld.copy(
                        source.matrixWorld
                    );
                }

                // just rotation
                else if (this.data.useSourceRotation) {
                    this.instancedMesh._instancedMesh.matrixWorld.compose(
                        source.positionWorld,
                        source.rotationWorld,
                        identityScale
                    );
                }

                // just scale
                else if (this.data.useSourceScale) {
                    this.instancedMesh._instancedMesh.matrixWorld.compose(
                        source.positionWorld,
                        identityQuaternion,
                        source.scaleWorld
                    );
                }

                // none of them
                else {
                    this.instancedMesh._instancedMesh.matrixWorld.copyPosition(
                        source.matrixWorld
                    );
                }
            };
        }

        if (this.data.perpetualLife != true) {
            this._maximumSpawn = Math.ceil(this.data.autoSpawnRate * this.data.lifeSpan);
        } else {
            this._maximumSpawn = this.data.maximumSpawn;
        }

        this.instancedMesh._instancedMesh.castShadow = this.data.shadowCast;
        this.instancedMesh._instancedMesh.receiveShadow = this.data.receiveShadow;

        this.add(this.instancedMesh);

        // Post-creation setup (e.g., material textures, frustum test)
        for (const behavior of this._behaviors) {
            await behavior.setupMaterial?.(this.instancedMesh?._instancedMesh);
        }

        this.processInstantSpawn();

        this.addEvents();
    }

    /** @internal */
    onFrame(delta) {
        if (this.data.autoSpawn && this.instancedMesh) {
            let spawnInterval = 1 / this.data.autoSpawnRate;

            this.timeAccumulator = Math.min(this.timeAccumulator + delta, 5);

            // Spawn particles if enough time has passed
            while (this.timeAccumulator >= spawnInterval) {
                this.spawn();
                this.timeAccumulator -= spawnInterval;
            }
        }

        for (const behavior of this._behaviors) {
            behavior.onFrame?.(delta);
        }

        this.frame++;
    }

    /**
     * Spawns a new particle instance with optional custom position, rotation, scale,
     * and opacity. When {@link ParticlesComponentData.autoSpawn | autoSpawn} is enabled,
     * particles are spawned automatically each frame, but this method can also be called
     * manually to emit individual particles on demand.
     *
     * If {@link ParticlesComponentData.attachToSource | attachToSource} is `false`, the
     * particle is placed in world space at the source's current position plus the
     * provided offset. If `attachToSource` is `true`, the offset is relative to the source.
     *
     * In {@link ParticlesComponentData.perpetualLife | perpetualLife} mode, the spawn is
     * silently ignored when the pool has reached {@link ParticlesComponentData.maximumSpawn | maximumSpawn}.
     *
     * @param opts - Optional spawn parameters for position, rotation, opacity, and scale.
     */
    spawn(opts: ParticleSpawnOpts = {}) {
        if (this.data.perpetualLife == true) {
            this.limitInstances();

            if (this.instances.length >= this._maximumSpawn) {
                return;
            }
        }

        if (this.instancedMesh) {
            let _source: Component3D = this;

            if (this.data.source != null) {
                _source = this.data.source;
            }

            if (_source == null || _source.matrixWorld == null) {
                return;
            }

            const data: ParticleSpawnData = {
                primitive: this.data.primitive,
                position: {
                    x: opts?.position?.x ?? 0,
                    y: opts?.position?.y ?? 0,
                    z: opts?.position?.z ?? 0,
                },
                rotation: {
                    x: opts?.rotation?.x ?? 0,
                    y: opts?.rotation?.y ?? 0,
                    z: opts?.rotation?.z ?? 0,
                },
                opacity: opts?.opacity ?? 1,
                scale: {
                    x: opts?.scale?.x ?? 1,
                    y: opts?.scale?.y ?? 1,
                    z: opts?.scale?.z ?? 1,
                },
                plugins: this.plugins,
                billboard: this.data.billboard,
                randomID: Math.random(),
                source: this.data.source,
                frame: this.frame,
            };

            if (this.data.billboard && this.data.primitive != PRIMITIVE_LIST.CUBE) {
                data.rotation.x = 0;
                data.rotation.y = 0;
                data.rotation.z = 0;
            }

            if (this.data.attachToSource == false) {
                tempVec.setFromMatrixPosition(_source.matrixWorld);

                data.position.x += tempVec.x;
                data.position.y += tempVec.y;
                data.position.z += tempVec.z;
            }

            // Apply behavior spawn data
            const ctx = {
                source: this.data.source,
                billboard: this.data.billboard,
                frame: this.frame,
            };
            for (const behavior of this._behaviors) {
                behavior.applySpawnData?.(data as any, ctx);
            }

            data.spawnTimer = SHARED.timer.value;

            data.lifeSpanTimer = SHARED.timer.value + this.data.lifeSpan;

            var wrapper = this.instancedMesh.spawn(data);

            if (wrapper != null) {
                // force a wrapper update manually since the sorting algo is off

                this.instances.push(wrapper);

                if (this.data.perpetualLife != true) {
                    this.limitInstances();
                }
            }
        }
    }

    /** @internal */
    processInstantSpawn() {
        if (this.data.perpetualLife == true && this.data.instantSpawn == true) {
            let i = this.instances.length;

            while (i < this._maximumSpawn) {
                this.spawn();

                i++;
            }
        }
    }

    /** @internal */
    limitInstances() {
        while (this.instances.length > this._maximumSpawn) {
            this.instancedMesh.killWrapper(this.instances[0]);

            this.instances.shift();
        }
    }

    /**
     * Resets the particle system by disposing all current particles and recreating
     * the instanced mesh from scratch. Any existing particles are removed.
     */
    reset() {
        this.create();

        // while( this.instances.length ){

        //     this.instancedMesh.killWrapper( this.instances[0] )

        //     this.instances.shift()
        // }

        // this.processInstantSpawn()
    }

    /** @internal */
    async onChildrenLoaded() {
        await this.create();
    }

    /** @internal */
    getPlugin() {
        var prePlugin = {
            name: "particlePrePlugin",

            uniforms: {
                pluginTimer: SHARED.timer,

                aspect: SHARED.aspect,
            },

            attributes: {
                spawnTimer: {
                    name: "spawnTimer",
                    array: [],
                    length: 1,
                    defaultValue: 5,
                },
                lifeSpanTimer: {
                    name: "lifeSpanTimer",
                    array: [],
                    length: 1,
                    defaultValue: 1,
                },
            },

            vertexShaderHooks: {
                prefix: `
                    float nrand( vec2 n )
                    {
                        return fract(sin(dot(n.xy, vec2(12.9898, 78.233)))* 43758.5453);
                    }

                    #ifndef OVERRIDE_PLUGIN_VERTEX
                        #define OVERRIDE_PLUGIN_VERTEX
                    #endif

                    uniform float aspect;
                    uniform float pluginTimer;
                    attribute float spawnTimer;
                    attribute float lifeSpanTimer;
                    attribute float randomID;
                    varying float vTimerDiff;
                    varying float vLife;
                    varying vec3 vvNormal;
                    varying vec2 particleUV;
                    varying vec2 vvPosition;
                    varying vec4 umvPosition;
                    varying vec3 vScale;


                    #ifdef POINT
                        varying mat3 vRotationMatrix;
                    #endif

                    mat3 quatToMat3(vec4 q) {
                        float qx = q.x, qy = q.y, qz = q.z, qw = q.w;
                        float qx2 = qx + qx, qy2 = qy + qy, qz2 = qz + qz;
                        float xx = qx * qx2, xy = qx * qy2, xz = qx * qz2;
                        float yy = qy * qy2, yz = qy * qz2, zz = qz * qz2;
                        float wx = qw * qx2, wy = qw * qy2, wz = qw * qz2;

                        return mat3(
                            1.0 - (yy + zz), xy - wz, xz + wy,
                            xy + wz, 1.0 - (xx + zz), yz - wx,
                            xz - wy, yz + wx, 1.0 - (xx + yy)
                        );
                    }

                    mat4 rotation3d(vec3 axis, float angle) {
                        axis = normalize(axis);
                        float s = sin(angle);
                        float c = cos(angle);
                        float oc = 1.0 - c;

                        return mat4(
                            oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                            oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                            oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                            0.0,                                0.0,                                0.0,                                1.0
                        );
                    }
                    mat3 mat3rotation3D(vec3 axis, float angle) {
                        axis = normalize(axis);
                        float s = sin(angle);
                        float c = cos(angle);
                        float oc = 1.0 - c;

                        return mat3(
                            oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
                            oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
                            oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c
                        );
                    }
                `,

                main: `

                    particleUV = uv;

                    #ifdef POINT

                        #ifdef USE_TRIANGLE

                            particleUV = position.xy * 0.5 + 0.5;

                        #endif
                    #endif
                    float diff = spawnTimer;
                    vTimerDiff = (pluginTimer - spawnTimer);

                    float life = 1.0 - max(lifeSpanTimer - pluginTimer, 0.0) / (lifeSpanTimer - spawnTimer);

                    vLife = life;

                    vec3 originalPosition  =  position;
                    vec3 particlePosition  =  offset;

                    vec3 particleScale     = scale;

                    vec3 rotationAxis  = vec3(0.0);

                    float rotationSpeed  = 0.0;
                `,

                suffix: `


                    umvPosition = mvPosition;
                `,
            },

            fragmentShaderHooks: {
                prefix: `

                    float transitionValue(float x, float midpoint, float smoothness) {
                        float t1 = smoothstep(0.0, midpoint, x);
                        float t2 = smoothstep(1.0, midpoint, x);
                        return mix(t1, 1.0 - t2, step(midpoint, x));
                    }

                    uniform float pluginTimer;
                    uniform mat3 normalMatrix;
                    varying vec2 particleUV;
                    varying float vTimerDiff;
                    varying vec3 vvNormal;
                    varying float vLife;

                    uniform mat4 projectionMatrix;

                    varying vec4 umvPosition;


                    float cubicOut(float t) {
                        float f = t - 1.0;
                        return f * f * f + 1.0;
                    }

                    float cubicIn(float t) {
                        return t * t * t;
                    }

                    varying vec3 vScale;

                    vec2 calculateSphericalUV(vec3 normal) {
                        float u = 0.5 + atan(normal.z, normal.x) / (2.0 * 3.14159265359);
                        float v = 0.5 - asin(normal.y) / 3.14159265359;
                        return vec2(u, v);
                    }

                    vec3 rotateVector(vec4 q, vec3 v) {
                        return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
                    }


                    #ifdef POINT

                        varying mat3 vRotationMatrix;

                    #endif

                `,
                main: `

                    #ifndef OPAQUE
                        float opacity = opacity;
                    #endif

                    #ifdef POINT

                        vec2 texCoords = particleUV * 2.0 - 1.0;
                        float r2 = dot(texCoords, texCoords);


                        if (r2 > 1.0) {
                            discard;
                        }

                        float z = sqrt(1.0 - r2);

                        vec3 sphereCalc = normalize(vec3(texCoords, z));
                        vec3 spherePosition = sphereCalc * vScale.y;

                        #ifndef SHADOW

                            vec3 rotatedNormal = vRotationMatrix * sphereCalc;

                            vec2 calcUV = calculateSphericalUV(rotatedNormal);

                            vec2 vNormalMapUv = calcUV;

                            vec2 vMapUv = calcUV;

                            vec4 modifiedUMVPosition = -umvPosition;

                            modifiedUMVPosition.xyz -= spherePosition;

                            vec3 vViewPosition = modifiedUMVPosition.xyz;

                            vec4 rr = projectionMatrix * modifiedUMVPosition;

                            float zzz = 0.5 * rr.z / rr.w + 0.5;

                            gl_FragDepth = zzz;

                        #else


                            vec4 modifiedUMVPosition = umvPosition;

                            modifiedUMVPosition.xyz -= spherePosition;

                            vec4 rr = projectionMatrix * modifiedUMVPosition;

                            // Adjust fragCoordZ to account for the spherical depth
                            float zzz = 0.5 * rr.z / rr.w + 0.5;

                             #if DEPTH_PACKING == 3200
                                gl_FragColor = vec4( vec3( 1.0 - zzz ), opacity );
                            #elif DEPTH_PACKING == 3201
                                gl_FragColor = packDepthToRGBA( zzz );
                            #endif

                            return;

                        #endif

                    #endif
                `,

                suffix: `

                 `,
            },
            defines: [],
        };

        if (this.data.billboard == true && this.data.primitive != PRIMITIVE_LIST.CUBE) {
            prePlugin.defines["BILLBOARD"] = "";
        }

        if (USE_TRIANGLE) {
            (prePlugin as any).defines["USE_TRIANGLE"] = "";
        }

        if (this.data.perpetualLife == true) {
            prePlugin.defines["PERPETUAL_LIFE"] = "";
        }

        if (this.data.primitive == PRIMITIVE_LIST.POINT) {
            prePlugin.defines["POINT"] = "";

            (prePlugin as any).replacers = {
                fragment: [
                    {
                        source: "varying vec3 vViewPosition;",
                        replace: "",
                    },
                ],
            };
        }

        var postPlugin = {
            name: "particlePostPlugin",

            vertexShaderHooks: {
                prefix: `

                `,

                main: `

                      vScale = particleScale;

                      #ifdef OVERRIDE_PLUGIN_VERTEX

                        #ifndef POINT

                            #ifndef BILLBOARD

                                mat4 rotationMatrix = rotation3d( rotationAxis, rotationSpeed * vTimerDiff );

                                vec3 position = vec4( rotationMatrix  * vec4(position * vScale, 1.0) ).xyz;

                                position     =  getPositionWithOptions( position, vec3(1.0), rotation, particlePosition);

                                #ifndef SHADOW
                                    vec3 normal = vec4( rotationMatrix * vec4(normal , 1.0) ).xyz;

                                    normal = getNormalWithOptions( normal, vec3(1.0), rotation, vec3(0.0) );
                                #endif

                            #else

                                // billboard here
                                vec3 position = position * vScale + particlePosition;

                                vec3 normal = normalize( vec3(viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2]) );

                            #endif

                        #else

                            vec3 position = position * vScale + particlePosition;

                             // Convert quaternion to rotation matrix
                            mat3 quatRotation = quatToMat3(rotation);

                            // Calculate time-based rotation matrix
                            mat3 timeRotation = mat3rotation3D(rotationAxis, rotationSpeed * vTimerDiff);

                            // Combine rotations (quaternion rotation first, then time-based rotation)
                            vRotationMatrix = timeRotation * quatRotation;

                        #endif

                        vvNormal = normal;

                    #endif
                `,

                suffix: `
                `,
            },
            fragmentShaderHooks: {
                suffix: `


                    `,
            },
        };

        let res: any[] = [prePlugin];

        // Collect behavior plugins (inserted between pre and post)
        for (const behavior of this._behaviors) {
            const plugin = behavior.getPlugin?.();
            if (plugin != null) {
                res.push(plugin);
            }
        }

        this.prePlugin = prePlugin;

        res.push(postPlugin);

        return res;
    }

    /** @internal */
    getMesh() {
        if (this.instancedMesh) {
            return this.instancedMesh._instancedMesh;
        }
    }

    /** @internal */
    getPrimitive() {
        var geometry;

        if (
            this.data.primitive == PRIMITIVE_LIST.PLANE ||
            (this.data.primitive == PRIMITIVE_LIST.POINT && USE_TRIANGLE == false)
        ) {
            geometry = new PlaneGeometry(1, 1);
        } else if (this.data.primitive == PRIMITIVE_LIST.POINT) {
            geometry = new BufferGeometry();

            // Vertices
            const vertices = new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]);
            geometry.setAttribute("position", new BufferAttribute(vertices, 3));

            // Normals (pointing towards positive Z)
            const normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]);
            geometry.setAttribute("normal", new BufferAttribute(normals, 3));

            // UVs
            const uvs = new Float32Array([0, 0, 2, 0, 0, 2]);
            geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
        } else if (this.data.primitive == PRIMITIVE_LIST.CUBE) {
            geometry = new BoxGeometry(1, 1);
        } else {
            // custom primitive
        }

        return geometry;
    }

    /** @internal */
    protected _onCreateCollisionMesh() {
        if (this.mesh == null) {
            this.mesh = new Mesh(
                new BoxGeometry(1, 1, 1),
                new MeshStandardMaterial({ color: "red" })
            );
            this.add(this.mesh);
            this.mesh.visible = false;
        }
        return this.mesh;
    }

    /**
     * @internal
     */
    getCollisionMesh() {
        if (this.mesh == null) {
            this.mesh = new Mesh(
                new BoxGeometry(1, 1, 1),
                new MeshStandardMaterial({ color: "red" })
            );
        }

        this.add(this.mesh);
        this.mesh.visible = false;

        return this.data.source == null ? this.mesh : null;
    }

    // protected _getBBoxImp(target: Box3) {
    //     //
    //     // return target.setFromObject(this.getCollisionMesh());
    // }

    /** @internal */
    updateEvent = null;

    /** @internal */
    onChildrenLoadedEvent = null;

    /** @internal */
    addEvents() {
        if (this.updateEvent == null) {
            this.updateEvent = this.onFrame.bind(this);

            emitter.on(EngineEvents.LATE_UPDATE, this.updateEvent);

            this.onChildrenLoadedEvent = this.onChildrenLoaded.bind(this);

            this.on(this.EVENTS.CHILDREN_LOADED, this.onChildrenLoadedEvent);
        }
    }

    /** @internal */
    removeEvents() {
        if (this.updateEvent != null) {
            emitter.off(EngineEvents.LATE_UPDATE, this.updateEvent);

            this.updateEvent = null;

            this.off(this.EVENTS.CHILDREN_LOADED, this.onChildrenLoadedEvent);

            this.onChildrenLoadedEvent = null;
        }
    }

    protected dispose() {
        // Dispose all behaviors
        for (const behavior of this._behaviors) {
            behavior.dispose?.();
        }
        this._behaviors = [];

        if (this.instancedMesh) {
            if (this.instancedMesh.parent) {
                this.instancedMesh.parent.remove(this.instancedMesh);
            }

            this.instancedMesh.dispose();

            this.instancedMesh = null;
        }

        if (this.mesh) {
            this.mesh.parent.remove(this.mesh);

            this.mesh = null;
        }

        this.removeEvents();
    }

    /** @internal */
    private _syncBehaviors() {
        const desired = this.data.behaviors ?? [];

        // Clear existing behaviors (they'll be recreated)
        for (const behavior of this._behaviors) {
            behavior.dispose?.();
        }
        this._behaviors = [];

        // Create behaviors from data array (preserving order)
        for (const entry of desired) {
            const BehaviorClass = ParticleBehaviorRegistry.get(entry.type);
            if (BehaviorClass) {
                const instance = new BehaviorClass(this, entry.options ?? {});
                instance.init?.();
                this._behaviors.push(instance);
            }
        }
    }
}
