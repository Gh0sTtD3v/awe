import {  MeshBasicMaterial, Mesh, CatmullRomCurve3, TubeGeometry, Vector3, ShaderMaterial, UniformsLib } from "three"

import InstancedPipelineMesh from "../pipeline/instanced-pipeline-mesh";

import InstancedGeometry from "../pipeline/instanced-geometry";

import VertexShader from './shaders/vertex.glsl.ts'
import FragmentShader from './shaders/fragment.glsl.ts'

import Shared from '../utils/globals/shared'

export class GodrayFactory {

    constructor() {

        this.isInit = false

        this._init = false

        this._instances = {};
    }

    async preload() {

        const HEIGHT = 10

        const curve = new CatmullRomCurve3([

            new Vector3( 0, 0, 0 ),

            new Vector3( 0, HEIGHT / 2, 0 ),

            new Vector3( 0, HEIGHT, 0 ),

        ])

       // TubeGeometry(path : Curve, tubularSegments : Integer, radius : Float, radialSegments : Integer, closed : Boolean)

        this.geometry = new TubeGeometry( curve, 3, 5, 8, false )

    }

    async get(parent, data = {}) {

        if (this._isInit) {
            await this.initialisation;
        }

        if (this._init == false) {
            this._init = true;

            this._isInit = true;

            this.initialisation = this.preload();

            await this.initialisation;
        }

        if (this.mesh == null) {

            const baseGeometry = this.geometry;

            baseGeometry.computeBoundingSphere();

            const opts ={

                name: 'GODRAY_MATERIAL',

                uniforms: {

                    timer: Shared.timer
                },

                vertexShader: VertexShader,

                fragmentShader : FragmentShader,

                transparent: true,

                depthWrite: false,

                side: 2,

                fog: true

            }

            opts.uniforms = Object.assign(opts.uniforms, UniformsLib.fog);


            const diffuseMaterial = new ShaderMaterial(opts)

            const lightingMaterial = new ShaderMaterial(opts)

            this.mesh = new InstancedPipelineMesh(
                new InstancedGeometry(baseGeometry, {
                    scale: true,

                    opacity: true,

                    useNormal: true,

                    transparencySorting: true,

                    color: true,

                    rotation: true,

                    boundingSphere: baseGeometry.boundingSphere,

                    name: "godray_geometry",
                }),

                diffuseMaterial,

                {
                    lightingMaterial: lightingMaterial,

                    visibleOnOcclusion: true,

                    type: "GODRAY",
                },
            );

            this.mesh.renderOrder = 100000

            parent.add(this.mesh);
        }

        const wrapper = this.mesh.add(data);

        wrapper.buildCollisionMesh = this.buildCollisionMesh;

        return wrapper
    }

    onCollision( collision ){
        //
        // player.applyImpulse( collision.normal , 10 )
    }

    buildCollisionMesh = () => {

        if(this._material == null) {

            this._material = new MeshBasicMaterial({ color: 0xff0000, wireframe: true })
        }

        const mesh = new Mesh(
            this.geometry,
            this._material,
        );

        mesh.visible = false;

        mesh.updateMatrixWorld()

        this._collisionMesh = mesh;

        return mesh;
    };

    disposeAll() {
        if (this.mesh) {
            if (this.mesh.parent) {
                this.mesh.parent.remove(this.mesh);
            }

            this.mesh.geometry.dispose();

            this.mesh.dispose();

            this.mesh = null;
        }
    }
}

