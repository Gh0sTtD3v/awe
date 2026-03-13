import { Component3D } from "../../space/abstract/component-3d";
import { Plugins } from "../rendering/libraries";
import { BorderPlugin } from "./border-plugin";
import { BoxGeometry, Euler, Object3D, Quaternion, Vector3 } from "three";
import InstancedPipelineMesh from "../pipeline/instanced-pipeline-mesh";
import InstancedBasicMaterial from "../rendering/materials/instancedbasic";
import InstancedStandardMaterial from "../rendering/materials/instancedstandard";
import InstancedShadow from "../rendering/materials/instancedshadow";
import InstancedGeometry from "../pipeline/instanced-geometry";
import { XYZ } from "../../@types/types";
import InstancedMeshWrapper from "../pipeline/instance-mesh-wrapper";
import { disposeObject3D } from "../utils/dispose";

export interface BorderOpts {
    borderSize: number;
    borderColor: number;
    borderOpacity: number;
    borderDepth: number;
    hasBorder: boolean;
    scaleRatio: number;
}

export type BorderWrapper = InstancedMeshWrapper & {
    borderOpts: Partial<BorderOpts>;
};

const DEPTH = 0.1;

class BorderFactory {
    //
    mesh: InstancedPipelineMesh = null;

    get(opts: { component: Component3D; borderOpts: Partial<BorderOpts> }) {
        //
        if (this.mesh === null) {
            //
            const baseGeometry = new BoxGeometry(1, 1, 1);
            baseGeometry.computeBoundingSphere();

            const borderPlugin = BorderPlugin();

            const materialOpts = {
                transparent: true,
                color: 0xffffff,
                plugins: [
                    new Plugins.VISUALS.InstanceOpacityPlugin(),
                    borderPlugin,
                ],
                alphaTest: 0.1,
                polygonOffset: true,
                polygonOffsetFactor: 2,
                polygonOffsetUnits: 8,
            };

            const diffuseMaterial = new InstancedBasicMaterial(materialOpts);

            const lightingMaterial = new InstancedStandardMaterial(
                materialOpts
            );

            this.mesh = new InstancedPipelineMesh(
                new InstancedGeometry(baseGeometry, {
                    scale: true,
                    useNormal: true,
                    opacity: true,
                    color: true,
                    rotation: true,
                    boundingSphere: baseGeometry.boundingSphere,
                    name: "border_geometry",
                    plugins: [borderPlugin],
                }),

                diffuseMaterial,
                {
                    visibleOnOcclusion: true,
                    type: "BORDER",
                    lightingMaterial: lightingMaterial,
                }
            );

            this.mesh.customDepthMaterial = new InstancedShadow();

            this.mesh.castShadow = true;

            this.mesh.receiveShadow = true;

            opts.component.space.add(this.mesh as any);
        }

        const wrapper = this.mesh.add() as BorderWrapper;
        wrapper.borderOpts = opts.borderOpts;

        wrapper.attachTo(opts.component, () => {
            //
            const hasBorder = !!wrapper.borderOpts.hasBorder;
            const scaleRatio = wrapper.borderOpts.scaleRatio || 1;
            const depth = wrapper.borderOpts.borderDepth || DEPTH;
            const borderSize = wrapper.borderOpts.borderSize || 0;

            if (hasBorder) {
                //
                const borderScale = v2.set(
                    scaleRatio * (1 + borderSize),
                    1 + borderSize * scaleRatio,
                    1
                );

                wrapper.scale.x *= borderScale.x;
                wrapper.scale.y *= borderScale.y;
                wrapper.scale.z = depth;

                q1.fromArray(wrapper.rotation);
                v1.set(0, 0, -depth / 2)
                    .applyQuaternion(q1)
                    .add(wrapper.position);

                wrapper.position.x = v1.x;
                wrapper.position.y = v1.y;
                wrapper.position.z = v1.z;
                //
            } else {
                wrapper.visible = false;
                wrapper.scale.x *= scaleRatio;
                wrapper.scale.z = 0.01;
            }
        });

        this.updateBorder(wrapper, opts.borderOpts);

        return wrapper;
    }

    updateBorder(border: BorderWrapper, opts: Partial<BorderOpts>) {
        //
        // const scale = 1 + opts.borderSize;
        border.borderOpts = opts;
        border.setColor(opts.borderColor || 0x000000);
        border.opacity = opts.borderOpacity || 1.0;
        border["borderSize"] = opts.borderSize || 0;
    }

    dispose(border: InstancedMeshWrapper) {
        //
        this.mesh.remove(border);
    }

    disposeAll() {
        //
        this.mesh.dispose();
        this.mesh.removeFromParent();
        disposeObject3D(this.mesh);
    }
}

const v1 = new Vector3();
const v2 = new Vector3();
const q1 = new Quaternion();

export default new BorderFactory();
